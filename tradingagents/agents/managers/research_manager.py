"""Research Manager: turns the bull/bear debate into a structured investment plan for the trader."""

from __future__ import annotations

from tradingagents.agents.schemas import ResearchPlan, render_research_plan
from tradingagents.agents.utils.agent_utils import (
    get_instrument_context_from_state,
    get_language_instruction,
)
from tradingagents.agents.utils.structured import (
    NO_EXTERNAL_TOOLS,
    bind_structured,
    invoke_structured_or_freetext,
)


def create_research_manager(llm):
    structured_llm = bind_structured(llm, ResearchPlan, "Research Manager")

    def research_manager_node(state) -> dict:
        instrument_context = get_instrument_context_from_state(state)
        history = state["investment_debate_state"].get("history", "")

        investment_debate_state = state["investment_debate_state"]

        prompt = f"""As the Research Manager and debate facilitator, your role is to critically evaluate this round of debate and deliver a decisive, conviction-led investment plan for the trader.

{instrument_context}

---

**Rating Scale** (use exactly one, based on asymmetric expected value):
- **Buy**: Strong conviction in the bull thesis; bull catalysts and long-term fundamentals clearly outweigh near-term risks — recommend taking or growing the position aggressively with defined risk stops
- **Overweight**: Constructive skew; primary trend and weight of evidence favor bulls, even if minor headwinds exist — recommend gradually increasing exposure
- **Hold**: Strict market indifference ONLY — reserve for situations where bull and bear arguments are mathematically equivalent in probability AND magnitude; do NOT declare a stalemate on minor conflicting points
- **Underweight**: Bearish skew — negative technical structure, macro headwinds, or fundamental deterioration make reducing exposure the rational risk-adjusted action
- **Sell**: Strong conviction in the bear thesis; recommend exiting or avoiding the position with urgency

**Decision Framework** (apply before choosing a rating):
1. Identify the single STRONGEST argument from the bull side and the single STRONGEST argument from the bear side.
2. Assess: which scenario — the bull case or the bear case — has higher probability × magnitude of outcome?
3. If the bull expected value is higher → **Buy** or **Overweight**.
4. If the bear expected value is higher → **Underweight** or **Sell**.
5. Reserve **Hold** ONLY when the two sides are genuinely equivalent — not when conflicting signals exist but one side clearly has better asymmetry.
6. Minor contradictions (e.g., strong fundamentals plus a short-term technical pullback) should NOT produce a Hold unless they are equally strong and unresolvable.

---

**Debate History:**
{history}

{NO_EXTERNAL_TOOLS}""" + get_language_instruction()

        investment_plan = invoke_structured_or_freetext(
            structured_llm,
            llm,
            prompt,
            render_research_plan,
            "Research Manager",
        )

        new_investment_debate_state = {
            "judge_decision": investment_plan,
            "history": investment_debate_state.get("history", ""),
            "bear_history": investment_debate_state.get("bear_history", ""),
            "bull_history": investment_debate_state.get("bull_history", ""),
            "current_response": investment_plan,
            "count": investment_debate_state["count"],
        }

        return {
            "investment_debate_state": new_investment_debate_state,
            "investment_plan": investment_plan,
        }

    return research_manager_node
