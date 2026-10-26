import { useCallback, useRef, useState } from 'react';
import type { LogEntry, NodeStatus, PropagateResult, RunState, AnalystKey } from '../types';

const API_BASE = 'http://localhost:8000';

function ts() {
  return new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function uid() {
  return Math.random().toString(36).slice(2);
}

// ── Ordered list of node IDs exactly as they execute ──────────────
const NODE_ORDER = [
  'analyst-market',
  'analyst-social',
  'analyst-news',
  'analyst-fundamentals',
  'debate-bull',
  'debate-bear',
  'debate-judge',
  'risk-assess',
  'decision',
];

// ── Content-based keyword detection ───────────────────────────────
// Because LangChain emits model class names (e.g. "NormalizedChatOpenAI")
// rather than agent names, we parse the actual text content/log messages
// to figure out which pipeline node is currently active.
function detectNodeFromText(text: string): string | null {
  const t = text.toLowerCase();

  // Market analyst signals
  if (/(market analyst|technical analysis|price action|moving average|rsi|macd|candlestick|ohlc|support.{0,10}resistance|bollinger|volume analysis)/i.test(t))
    return 'analyst-market';

  // Social / sentiment signals
  if (/(social analyst|sentiment analysis|reddit|twitter|social media|public sentiment|investor sentiment|retail sentiment)/i.test(t))
    return 'analyst-social';

  // News / macro signals
  if (/(news analyst|macro analysis|headline|breaking news|economic indicator|interest rate|fed|geopoliti|macro-economic|news impact)/i.test(t))
    return 'analyst-news';

  // Fundamentals signals
  if (/(fundamental|balance sheet|income statement|earnings per share|p\/e ratio|revenue|ebitda|free cash flow|profit margin|quarterly report)/i.test(t))
    return 'analyst-fundamentals';

  // Bull researcher
  if (/(bull analyst|bull researcher|bull case|long thesis|bullish|upside case|growth catalyst|buy thesis)/i.test(t))
    return 'debate-bull';

  // Bear researcher
  if (/(bear analyst|bear researcher|bear case|short thesis|bearish|downside risk|short case|sell thesis)/i.test(t))
    return 'debate-bear';

  // Debate judge / research manager / investment plan synthesis
  if (/(debate judge|research manager|investment plan|verdict|synthesis|conviction.{0,20}thesis)/i.test(t))
    return 'debate-judge';

  // Risk assessment — includes Trader (bridges debate→risk) and all risk debators
  if (/(risk assess|position siz|risk.{0,10}reward|max drawdown|stop loss|volatility|var |portfolio risk|aggressive analyst|conservative analyst|neutral analyst|trade proposal|transaction proposal)/i.test(t))
    return 'risk-assess';

  // Final decision — Portfolio Manager only (Trader is already mapped to risk-assess)
  if (/(portfolio manager|final position rating|final recommendation|executive summary.*rating|rating: (buy|sell|hold|overweight|underweight))/i.test(t))
    return 'decision';

  return null;
}

// Map explicit agent name strings to node IDs (fallback for llm_start).
// NOTE: Trader runs BEFORE the risk debate (it bridges debate→risk), so it
// maps to risk-assess.  Portfolio Manager is the ONLY 'decision' entry.
const AGENT_NODE_MAP: Record<string, string> = {
  market:                   'analyst-market',
  market_analyst:           'analyst-market',
  marketanalyst:            'analyst-market',
  social:                   'analyst-social',
  social_analyst:           'analyst-social',
  socialanalyst:            'analyst-social',
  news:                     'analyst-news',
  news_analyst:             'analyst-news',
  newsanalyst:              'analyst-news',
  fundamentals:             'analyst-fundamentals',
  fundamentals_analyst:     'analyst-fundamentals',
  fundamentalanalyst:       'analyst-fundamentals',
  bull:                     'debate-bull',
  bull_researcher:          'debate-bull',
  bullresearcher:           'debate-bull',
  bear:                     'debate-bear',
  bear_researcher:          'debate-bear',
  bearresearcher:           'debate-bear',
  // Research Manager synthesises the debate → maps to debate-judge
  research_manager:         'debate-judge',
  researchmanager:          'debate-judge',
  debate:                   'debate-judge',
  debate_judge:             'debate-judge',
  debatejudge:              'debate-judge',
  // Trader + all three risk debators → risk-assess
  trader:                   'risk-assess',
  trader_node:              'risk-assess',
  risk:                     'risk-assess',
  risk_assess:              'risk-assess',
  riskassess:               'risk-assess',
  aggressive_analyst:       'risk-assess',
  aggressiveanalyst:        'risk-assess',
  conservative_analyst:     'risk-assess',
  conservativeanalyst:      'risk-assess',
  neutral_analyst:          'risk-assess',
  neutralanalyst:           'risk-assess',
  // Portfolio Manager ONLY → decision
  portfolio_manager:        'decision',
  portfoliomanager:         'decision',
};

export function useApexStream() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [nodeStatus, setNodeStatus] = useState<Record<string, NodeStatus>>({});
  const [runState, setRunState] = useState<RunState>({ phase: 'idle', runId: '', ticker: '', date: '' });
  const sseRef = useRef<EventSource | null>(null);
  const tokenBufferRef = useRef<string>('');
  // Track the current active node so we can propagate "done" sequentially
  const activeNodeRef = useRef<string | null>(null);

  const pushLog = useCallback((entry: Omit<LogEntry, 'id' | 'time'>) => {
    setLogs(prev => [...prev.slice(-500), { ...entry, id: uid(), time: ts() }]);
  }, []);

  // ── Resolve a node ID from any name/content string ──────────────
  const resolveNode = useCallback((nameOrContent: string): string | null => {
    const key = nameOrContent.toLowerCase().replace(/[\s-]/g, '_');
    if (AGENT_NODE_MAP[key]) return AGENT_NODE_MAP[key];
    // Try partial match on map keys
    for (const [k, v] of Object.entries(AGENT_NODE_MAP)) {
      if (key.includes(k) || k.includes(key)) return v;
    }
    // Fall back to content keyword detection
    return detectNodeFromText(nameOrContent);
  }, []);

  // The index of the furthest node we have ever activated this run.
  // Used to enforce strictly monotonic forward progression — the DAG can
  // never jump backwards even if the server emits an out-of-order event.
  const highWaterRef = useRef<number>(-1);

  // Mark a node thinking; automatically marks all prior nodes as done.
  // Respects the high-water mark: if the new node is earlier in the pipeline
  // than the furthest node we've already activated, it is silently ignored.
  const activateNode = useCallback((nodeId: string) => {
    const idx = NODE_ORDER.indexOf(nodeId);
    if (idx < 0) return; // unknown node ID
    setNodeStatus(prev => {
      const currentHigh = highWaterRef.current;
      if (idx <= currentHigh) return prev; // never go backwards
      highWaterRef.current = idx;
      const next = { ...prev };
      // All nodes before this one are done
      for (let i = 0; i < idx; i++) {
        if (next[NODE_ORDER[i]] !== 'done') next[NODE_ORDER[i]] = 'done';
      }
      next[nodeId] = 'thinking';
      return next;
    });
    activeNodeRef.current = nodeId;
  }, []);

  // Mark a node done; activate the next one in sequence
  const completeNode = useCallback((nodeId: string) => {
    setNodeStatus(prev => {
      const next = { ...prev };
      next[nodeId] = 'done';
      const idx = NODE_ORDER.indexOf(nodeId);
      // Mark all previous as done too (belt-and-suspenders)
      for (let i = 0; i <= idx; i++) next[NODE_ORDER[i]] = 'done';
      // Activate the next one
      if (idx >= 0 && idx < NODE_ORDER.length - 1) {
        next[NODE_ORDER[idx + 1]] = 'thinking';
        activeNodeRef.current = NODE_ORDER[idx + 1];
      }
      return next;
    });
  }, []);

  const handleSseEvent = useCallback((raw: string) => {
    let event: { type: string; data: Record<string, unknown> };
    try { event = JSON.parse(raw); } catch { return; }

    const { type, data } = event;

    switch (type) {
      case 'status': {
        const msg = data.message as string ?? '';
        pushLog({ type: 'status', agent: data.node as string, content: msg });
        // Try to detect node from status message content
        if (data.node === 'propagate') {
          // Analysis started — light up first node
          activateNode('analyst-market');
        } else {
          const detected = detectNodeFromText(msg);
          if (detected) activateNode(detected);
        }
        break;
      }

      case 'llm_start': {
        const agentName = data.agent as string ?? '';
        pushLog({ type: 'chain_start', agent: agentName, content: `▶ ${agentName} started` });
        // Try to resolve from explicit name first
        const resolved = resolveNode(agentName);
        if (resolved) activateNode(resolved);
        break;
      }

      case 'token':
        tokenBufferRef.current += data.token as string;
        break;

      case 'llm_end': {
        const content = (data.content as string) || tokenBufferRef.current;
        tokenBufferRef.current = '';
        if (content) {
          const snippet = content.slice(0, 400);
          pushLog({ type: 'llm_end', agent: data.agent as string, content: snippet });

          // Detect completed node from rich content text
          const detected = detectNodeFromText(content);
          if (detected) {
            completeNode(detected);
          } else if (activeNodeRef.current) {
            // If we can't detect from content, mark the currently-active node done
            completeNode(activeNodeRef.current);
          }
        }
        break;
      }

      case 'tool_start':
        pushLog({ type: 'tool_start', content: `⚡ ${data.tool}: ${data.input}` });
        break;

      case 'tool_end':
        pushLog({ type: 'tool_end', content: `✓ Tool: ${(data.output as string).slice(0, 200)}` });
        break;

      case 'tool_error':
        pushLog({ type: 'error', content: `✗ Tool error: ${data.error}` });
        break;

      case 'chain_start': {
        const chainName = data.name as string ?? '';
        pushLog({ type: 'chain_start', content: `⟳ ${chainName}` });
        // Try to detect node from chain name
        const resolved = resolveNode(chainName);
        if (resolved) activateNode(resolved);
        break;
      }

      case 'agent_action': {
        const log = data.log as string ?? '';
        pushLog({ type: 'chain_start', content: `→ ${log.slice(0, 200)}` });
        const detected = detectNodeFromText(log);
        if (detected) activateNode(detected);
        break;
      }

      case 'agent_finish':
        pushLog({ type: 'agent_finish', content: `◉ Agent finished: ${(data.output as string ?? '').slice(0, 100)}` });
        if (activeNodeRef.current) completeNode(activeNodeRef.current);
        break;

      case 'error':
        pushLog({ type: 'error', content: `ERROR: ${data.error}` });
        // Mark active node as error
        if (activeNodeRef.current) {
          const errNode = activeNodeRef.current;
          setNodeStatus(prev => ({ ...prev, [errNode]: 'error' }));
        }
        break;

      case 'node_start': {
        // Explicit pipeline node activation from server — highest priority signal.
        const nodeId = data.node as string;
        if (nodeId) activateNode(nodeId);
        break;
      }

      case 'node_end': {
        // Explicit pipeline node completion from server.
        const nodeId = data.node as string;
        if (nodeId) completeNode(nodeId);
        break;
      }

      case 'done': {
        const result = data as unknown as PropagateResult;
        // Close SSE before updating state so onerror is never triggered
        if (sseRef.current) {
          sseRef.current.close();
          sseRef.current = null;
        }
        // Smooth completion: briefly show the final 'decision' node as
        // thinking (if it isn't already done) so its pulse animation fires,
        // then flip everything to done one frame later.
        setNodeStatus(prev => {
          const next = { ...prev };
          if (next['decision'] !== 'done') next['decision'] = 'thinking';
          return next;
        });
        setTimeout(() => {
          setNodeStatus(() => {
            const all: Record<string, NodeStatus> = {};
            NODE_ORDER.forEach(id => { all[id] = 'done'; });
            return all;
          });
          activeNodeRef.current = null;
        }, 600);
        setRunState(prev => ({ ...prev, phase: 'done', result }));
        pushLog({ type: 'status', content: `✅ Analysis complete — ${result.signal}` });
        break;
      }

      case 'fatal_error':
        // Close SSE before updating state so onerror is never triggered
        if (sseRef.current) {
          sseRef.current.close();
          sseRef.current = null;
        }
        setRunState(prev => ({ ...prev, phase: 'error', error: data.error as string }));
        pushLog({ type: 'error', content: `FATAL: ${data.error}` });
        if (activeNodeRef.current) {
          const errNode = activeNodeRef.current;
          setNodeStatus(prev => ({ ...prev, [errNode]: 'error' }));
        }
        break;
    }
  }, [pushLog, resolveNode, activateNode, completeNode]);

  const run = useCallback(async (
    ticker: string,
    date: string,
    selectedAnalysts: AnalystKey[],
  ) => {
    const runId = uid() + uid();

    // Reset state
    setLogs([]);
    setNodeStatus({});
    highWaterRef.current = -1;
    tokenBufferRef.current = '';
    activeNodeRef.current = null;
    setRunState({ phase: 'running', runId, ticker, date });

    // Open SSE before POST
    if (sseRef.current) { sseRef.current.close(); }
    const sse = new EventSource(`${API_BASE}/api/stream/${runId}`);
    sseRef.current = sse;

    sse.onmessage = (e) => handleSseEvent(e.data);
    sse.onerror = () => {
      // If the run finished normally, the server closes the stream which
      // fires onerror — suppress spurious errors when already done/closed.
      if (sse.readyState === EventSource.CLOSED) return;
      setRunState(prev => (prev.phase === 'running' ? { ...prev, phase: 'error', error: 'Connection to server lost or failed' } : prev));
      pushLog({ type: 'error', content: 'SSE connection error' });
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }
    };

    try {
      const res = await fetch(`${API_BASE}/api/propagate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker, date, selected_analysts: selectedAnalysts, run_id: runId }),
      });
      if (!res.ok) {
        let detail = `Server error ${res.status}`;
        try {
          const body = await res.json();
          if (body?.detail) detail = String(body.detail);
        } catch { /* ignore parse failure */ }
        throw new Error(detail);
      }
    } catch (err) {
      setRunState(prev => ({ ...prev, phase: 'error', error: String(err) }));
      pushLog({ type: 'error', content: `Network error: ${err}` });
    }
  }, [handleSseEvent, pushLog]);

  const postReflect = useCallback(async (ticker: string, returns: number) => {
    await fetch(`${API_BASE}/api/reflect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticker, returns }),
    });
  }, []);

  return { logs, nodeStatus, runState, run, postReflect };
}
