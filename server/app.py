"""
server/app.py — Zero-intrusion bridge between TradingAgentsGraph and the React UI.

Treats `tradingagents` as a pure external library. No files inside `tradingagents/`
are modified or monkey-patched — we only import the public API exactly as main.py does.
"""

from __future__ import annotations

import asyncio
import json
import logging
import queue
import threading
import traceback
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager, suppress
from typing import Any

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from langchain_core.callbacks import BaseCallbackHandler
from pydantic import BaseModel

# ── TradingAgents public API (unchanged, identical to main.py) ──
from tradingagents.default_config import DEFAULT_CONFIG
from tradingagents.graph.trading_graph import TradingAgentsGraph

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("apex.server")

# ─────────────────────────────────────────────────────────────────────────────
# SSE event queue per run-id
# ─────────────────────────────────────────────────────────────────────────────

_run_queues: dict[str, queue.Queue] = {}
_run_lock = threading.Lock()


def _get_queue(run_id: str) -> queue.Queue:
    with _run_lock:
        if run_id not in _run_queues:
            _run_queues[run_id] = queue.Queue()
        return _run_queues[run_id]


def _push(run_id: str, event_type: str, data: dict):
    q = _get_queue(run_id)
    q.put({"type": event_type, "data": data})


# ─────────────────────────────────────────────────────────────────────────────
# Streaming callback handler (LangChain BaseCallbackHandler)
# ─────────────────────────────────────────────────────────────────────────────

class StreamingCallbackHandler(BaseCallbackHandler):
    """Intercepts LLM token streams, tool calls, and agent events; pushes them
    to the per-run SSE queue. The tradingagents library is never modified.

    Explicit ``node_start`` / ``node_end`` events are pushed when LangGraph
    node names are recognised so the UI can progress the DAG animation without
    relying on fragile text-chunk guessing.

    Node mapping rationale:
    - ``Trader`` runs BEFORE the risk debate (bridges debate→risk layer) so it
      maps to ``risk-assess``, not ``decision``.
    - The three risk debators (Aggressive/Conservative/Neutral Analyst) also map
      to ``risk-assess`` — they all belong to the same UI step.
    - ``Portfolio Manager`` is the only node that maps to ``decision``.
    """

    # Map every LangGraph node name (as seen in serialized["name"]) to the
    # canonical UI pipeline node ID.
    _LANGGRAPH_NODE_MAP: dict[str, str] = {
        # Analyst layer
        "Market Analyst":         "analyst-market",
        "Social Analyst":         "analyst-social",
        "News Analyst":           "analyst-news",
        "Fundamentals Analyst":   "analyst-fundamentals",
        # Debate layer
        "Bull Researcher":        "debate-bull",
        "Bear Researcher":        "debate-bear",
        "Research Manager":       "debate-judge",
        # Risk layer — Trader bridges debate→risk; risk debators are all risk-assess
        "Trader":                 "risk-assess",
        "Aggressive Analyst":     "risk-assess",
        "Conservative Analyst":   "risk-assess",
        "Neutral Analyst":        "risk-assess",
        # Decision layer — Portfolio Manager only
        "Portfolio Manager":      "decision",
    }

    def __init__(self, run_id: str):
        super().__init__()
        self.run_id = run_id
        self._current_agent: str = "unknown"
        # Track the last UI node we emitted so we never emit node_start twice
        # for the same node in a single run (risk debators re-enter risk-assess).
        self._current_node: str | None = None

    def _emit_node_start(self, agent_name: str) -> None:
        """Push a node_start event if the agent name maps to a known UI node
        and it is different from the currently-active node (monotonic forward)."""
        node_id = self._LANGGRAPH_NODE_MAP.get(agent_name)
        if node_id and node_id != self._current_node:
            self._current_node = node_id
            _push(self.run_id, "node_start", {"node": node_id, "agent": agent_name})

    def _emit_node_end(self, agent_name: str) -> None:
        """Push a node_end event when a known agent's LLM call finishes."""
        node_id = self._LANGGRAPH_NODE_MAP.get(agent_name)
        if node_id:
            _push(self.run_id, "node_end", {"node": node_id, "agent": agent_name})

    # ── LLM lifecycle ────────────────────────────────────────────────────────

    def on_llm_start(self, serialized: dict, prompts: list[str], **kwargs):
        agent = serialized.get("name", "LLM")
        self._current_agent = agent
        self._emit_node_start(agent)
        _push(self.run_id, "llm_start", {"agent": agent})

    def on_llm_new_token(self, token: str, **kwargs):
        _push(self.run_id, "token", {"agent": self._current_agent, "token": token})

    def on_llm_end(self, response: Any, **kwargs):
        content = ""
        with suppress(Exception):
            content = response.generations[0][0].text
        self._emit_node_end(self._current_agent)
        _push(self.run_id, "llm_end", {"agent": self._current_agent, "content": content})

    def on_llm_error(self, error: Exception, **kwargs):
        _push(self.run_id, "error", {"agent": self._current_agent, "error": str(error)})

    # ── Tool lifecycle ───────────────────────────────────────────────────────

    def on_tool_start(self, serialized: dict, input_str: str, **kwargs):
        tool_name = serialized.get("name", "tool")
        _push(self.run_id, "tool_start", {"tool": tool_name, "input": input_str[:300]})

    def on_tool_end(self, output: str, **kwargs):
        _push(self.run_id, "tool_end", {"output": str(output)[:600]})

    def on_tool_error(self, error: Exception, **kwargs):
        _push(self.run_id, "tool_error", {"error": str(error)})

    # ── Chain / agent lifecycle ──────────────────────────────────────────────

    def on_chain_start(self, serialized: dict, inputs: dict, **kwargs):
        name = serialized.get("name", "chain")
        _push(self.run_id, "chain_start", {"name": name})

    def on_chain_end(self, outputs: dict, **kwargs):
        _push(self.run_id, "chain_end", {})

    def on_agent_action(self, action: Any, **kwargs):
        _push(self.run_id, "agent_action", {
            "tool": getattr(action, "tool", ""),
            "input": str(getattr(action, "tool_input", ""))[:400],
            "log": getattr(action, "log", "")[:400],
        })

    def on_agent_finish(self, finish: Any, **kwargs):
        _push(self.run_id, "agent_finish", {
            "output": str(getattr(finish, "return_values", {}))[:600],
        })


# ─────────────────────────────────────────────────────────────────────────────
# Pydantic request/response schemas
# ─────────────────────────────────────────────────────────────────────────────

class PropagateRequest(BaseModel):
    ticker: str
    date: str
    selected_analysts: list[str] = ["market", "social", "news", "fundamentals"]
    run_id: str


class ReflectRequest(BaseModel):
    ticker: str
    returns: float


# ─────────────────────────────────────────────────────────────────────────────
# FastAPI app
# ─────────────────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("AlphaMind server starting on :8000")
    yield
    logger.info("AlphaMind server shutting down.")


app = FastAPI(title="AlphaMind API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────────────────────────────────────
# SSE stream endpoint
# ─────────────────────────────────────────────────────────────────────────────

async def _event_generator(run_id: str) -> AsyncGenerator[str, None]:
    q = _get_queue(run_id)
    loop = asyncio.get_event_loop()

    try:
        while True:
            try:
                item = await loop.run_in_executor(None, lambda: q.get(timeout=0.1))
            except Exception:
                await asyncio.sleep(0.05)
                continue

            payload = json.dumps(item)
            yield f"data: {payload}\n\n"

            if item["type"] in ("done", "fatal_error"):
                break
    finally:
        # Evict the queue to prevent unbounded memory growth
        with _run_lock:
            _run_queues.pop(run_id, None)


@app.get("/api/stream/{run_id}")
async def stream_events(run_id: str):
    return StreamingResponse(
        _event_generator(run_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


# ─────────────────────────────────────────────────────────────────────────────
# Propagate endpoint
# ─────────────────────────────────────────────────────────────────────────────

def _run_propagate_sync(req: PropagateRequest) -> dict:
    run_id = req.run_id
    try:
        _push(run_id, "status", {"message": "Initialising agents…", "node": "init"})

        config = DEFAULT_CONFIG.copy()
        callback = StreamingCallbackHandler(run_id)

        _push(run_id, "status", {"message": "Loading TradingAgentsGraph…", "node": "init"})
        ta = TradingAgentsGraph(
            selected_analysts=req.selected_analysts,
            debug=False,
            config=config,
            callbacks=[callback],
        )

        _push(run_id, "status", {
            "message": f"Running analysis: {req.ticker} @ {req.date}",
            "node": "propagate",
        })
        final_state, signal = ta.propagate(req.ticker, req.date)

        result = {
            "run_id": run_id,
            "decision": signal,
            "signal": signal,
            "market_report": final_state.get("market_report", ""),
            "sentiment_report": final_state.get("sentiment_report", ""),
            "news_report": final_state.get("news_report", ""),
            "fundamentals_report": final_state.get("fundamentals_report", ""),
            "bull_history": final_state.get("investment_debate_state", {}).get("bull_history", ""),
            "bear_history": final_state.get("investment_debate_state", {}).get("bear_history", ""),
            "judge_decision": final_state.get("investment_debate_state", {}).get("judge_decision", ""),
            "risk_judge_decision": final_state.get("risk_debate_state", {}).get("judge_decision", ""),
            "investment_plan": final_state.get("investment_plan", ""),
            "final_trade_decision": final_state.get("final_trade_decision", ""),
        }
        _push(run_id, "done", result)
        return result
    except Exception as exc:
        tb = traceback.format_exc()
        logger.error("Propagation error: %s\n%s", exc, tb)
        _push(run_id, "fatal_error", {"error": str(exc), "traceback": tb})
        raise


@app.post("/api/propagate")
async def propagate(req: PropagateRequest):
    _get_queue(req.run_id)
    loop = asyncio.get_event_loop()
    try:
        result = await loop.run_in_executor(None, _run_propagate_sync, req)
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


# ─────────────────────────────────────────────────────────────────────────────
# Reflect endpoint
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/api/reflect")
async def reflect(req: ReflectRequest):
    loop = asyncio.get_event_loop()

    def _reflect_sync():
        config = DEFAULT_CONFIG.copy()
        ta = TradingAgentsGraph(config=config)
        ta.ticker = req.ticker
        ta.memory_log.store_decision(
            ticker=req.ticker,
            trade_date="manual",
            final_trade_decision=f"Manual reflection. Returns: {req.returns}",
        )
        return {"status": "reflected", "ticker": req.ticker, "returns": req.returns}

    try:
        result = await loop.run_in_executor(None, _reflect_sync)
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/health")
async def health():
    return {"status": "ok", "service": "AlphaMind API"}


if __name__ == "__main__":
    uvicorn.run("server.app:app", host="0.0.0.0", port=8000, reload=False)
