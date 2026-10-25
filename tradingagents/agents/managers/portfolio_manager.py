"""Portfolio Manager: synthesises the risk-analyst debate into the final decision.

Uses LangChain's ``with_structured_output`` so the LLM produces a typed
``PortfolioDecision`` directly, in a single call.  The result is rendered
back to markdown for storage in ``final_trade_decision`` so memory log,
CLI display, and saved reports continue to consume the same shape they do
today.  When a provider does not expose structured output, the agent falls
back gracefully to free-text generation.
"""

from __future__ import annotations

from tradingagents.agents.schemas import PortfolioDecision, render_pm_decision
from tradingagents.agents.utils.agent_utils import (
    get_instrument_context_from_state,
    get_language_instruction,
)
from tradingagents.agents.utils.structured import (
    NO_EXTERNAL_TOOLS,
    bind_structured,
    invoke_structured_or_freetext,
)


def create_portfolio_manager(llm):
    structured_llm = bind_structured(llm, PortfolioDecision, "Portfolio Manager")

    def portfolio_manager_node(state) -> dict:
        instrument_context = get_instrument_context_from_state(state)

        history = state["risk_debate_state"]["history"]
        risk_debate_state = state["risk_debate_state"]
        research_plan = state["investment_plan"]
        trader_plan = state["trader_investment_plan"]

        past_context = state.get("past_context", "")
        lessons_line = (
            f"- Lessons from prior decisions and outcomes:\n{past_context}\n"
            if past_context
            else ""
        )

        prompt = f"""As the Portfolio Manager, synthesize the risk analysts' debate and deliver a decisive, conviction-led trading decision.

{instrument_context}

---

**Rating Scale** (use exactly one, based on asymmetric risk-reward):
- **Buy**: Strong conviction; bull catalysts and long-term fundamentals clearly outweigh near-term risks — enter or add aggressively with defined stop levels
- **Overweight**: Favorable risk-reward skew; primary trend and evidence favor bulls — gradually increase exposure with risk management
- **Hold**: Strict market indifference ONLY — where bull and bear evidence are truly equivalent in weight and no actionable skew exists; do NOT choose Hold simply because some conflicting signals exist
- **Underweight**: Bearish skew — technicals, macro headwinds, high debt or negative catalysts represent active downside risk — reduce exposure and take partial profits
- **Sell**: Clear negative expected value — evidence strongly supports imminent underperformance — exit or avoid

**Decision Framework** (apply in order):
1. Identify the STRONGEST argument on each side, ignoring minor noise.
2. Weigh asymmetric risk-reward: which scenario (bull or bear) offers higher probability × magnitude?
3. If bull expected value > bear expected value → **Buy** or **Overweight**.
4. If bear expected value > bull expected value → **Underweight** or **Sell**.
5. Reserve **Hold** ONLY when the two sides are mathematically equivalent in probability and magnitude — not merely when minor conflicting signals exist.
6. When uncertain between two adjacent ratings (e.g., Buy vs Overweight), pick the more actionable one.

**Context:**
- Research Manager's investment plan: **{research_plan}**
- Trader's transaction proposal: **{trader_plan}**
{lessons_line}**Risk Analysts Debate History:**
{history}

---

Ground every conclusion in specific evidence from the analysts. Be decisive — markets reward conviction backed by evidence, not cautious neutrality. A wrong directional call with a defined stop-loss is far more useful than a perpetual Hold.

{NO_EXTERNAL_TOOLS}{get_language_instruction()}"""

        final_trade_decision = invoke_structured_or_freetext(
            structured_llm,
            llm,
            prompt,
            render_pm_decision,
            "Portfolio Manager",
        )

        new_risk_debate_state = {
            "judge_decision": final_trade_decision,
            "history": risk_debate_state["history"],
            "aggressive_history": risk_debate_state["aggressive_history"],
            "conservative_history": risk_debate_state["conservative_history"],
            "neutral_history": risk_debate_state["neutral_history"],
            "latest_speaker": "Judge",
            "current_aggressive_response": risk_debate_state["current_aggressive_response"],
            "current_conservative_response": risk_debate_state["current_conservative_response"],
            "current_neutral_response": risk_debate_state["current_neutral_response"],
            "count": risk_debate_state["count"],
        }

        return {
            "risk_debate_state": new_risk_debate_state,
            "final_trade_decision": final_trade_decision,
        }

    return portfolio_manager_node
