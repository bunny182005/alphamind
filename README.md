# AlphaMind AI: Multi-Agent LLM Financial Trading Framework

## Overview

AlphaMind AI is a multi-agent trading framework that mirrors the dynamics of real-world trading firms. By deploying specialized LLM-powered agents — fundamental analysts, sentiment experts, technical analysts, a trader, and a risk management team — the platform collaboratively evaluates market conditions and informs trading decisions. These agents engage in dynamic discussions to pinpoint the optimal strategy.

> AlphaMind AI is designed for research purposes. Trading performance may vary based on many factors, including the chosen backbone language models, model temperature, trading periods, the quality of data, and other non-deterministic factors. It is not intended as financial, investment, or trading advice.

The framework decomposes complex trading tasks into specialized roles.

### Analyst Team
- **Fundamentals Analyst**: Evaluates company financials and performance metrics, identifying intrinsic values and potential red flags.
- **Sentiment Analyst**: Aggregates news headlines, StockTwits, and Reddit chatter into a single sentiment read to gauge short-term market mood.
- **News Analyst**: Monitors global news and macroeconomic indicators, interpreting the impact of events on market conditions.
- **Technical Analyst**: Utilizes technical indicators (like MACD and RSI) to detect trading patterns and forecast price movements.

### Researcher Team
- Comprises both bullish and bearish researchers who critically assess the insights provided by the Analyst Team. Through structured debates, they balance potential gains against inherent risks.

### Trader Agent
- Composes reports from the analysts and researchers to make informed trading decisions, determining the timing and magnitude of trades.

### Risk Management and Portfolio Manager
- Continuously evaluates portfolio risk by assessing market volatility, liquidity, and other risk factors. The risk management team evaluates and adjusts trading strategies, providing assessment reports to the Portfolio Manager for final decision.
- The Portfolio Manager approves/rejects the transaction proposal. If approved, the order will be sent to the simulated exchange and executed.

## Installation and CLI

### Installation

Clone AlphaMind AI:
```bash
git clone <your-repo-url>
cd AlphaMindAI
```

Create a virtual environment in any of your favorite environment managers:
```bash
conda create -n alphamind python=3.12
conda activate alphamind
```

Install the package and its dependencies:
```bash
pip install .
```

### Docker

Alternatively, run with Docker:
```bash
cp .env.example .env  # add your API keys
docker compose run --rm alphamind
```

For local models with Ollama:
```bash
docker compose --profile ollama run --rm alphamind-ollama
```

### Required APIs

AlphaMind AI supports multiple LLM providers. Set the API key for your chosen provider:

```bash
export OPENAI_API_KEY=...          # OpenAI (GPT)
export GOOGLE_API_KEY=...          # Google (Gemini)
export ANTHROPIC_API_KEY=...       # Anthropic (Claude)
export XAI_API_KEY=...             # xAI (Grok)
export DEEPSEEK_API_KEY=...        # DeepSeek
export DASHSCOPE_API_KEY=...       # Qwen — International
export DASHSCOPE_CN_API_KEY=...    # Qwen — China
export ZHIPU_API_KEY=...           # GLM via Z.AI (international)
export ZHIPU_CN_API_KEY=...        # GLM via BigModel (China)
export MINIMAX_API_KEY=...         # MiniMax — Global
export MINIMAX_CN_API_KEY=...      # MiniMax — China
export OPENROUTER_API_KEY=...      # OpenRouter
export ALPHA_VANTAGE_API_KEY=...   # Alpha Vantage
```

For Azure OpenAI, copy `.env.enterprise.example` to `.env.enterprise` and fill in your credentials.

For AWS Bedrock, install the extra with `pip install ".[bedrock]"`, set `llm_provider: "bedrock"`, configure AWS credentials and `AWS_DEFAULT_REGION`, and use a Bedrock model ID.

For local models, configure Ollama with `llm_provider: "ollama"`. The default endpoint is `http://localhost:11434/v1`.

For any other OpenAI-compatible server (vLLM, LM Studio, llama.cpp, or a custom relay), use `llm_provider: "openai_compatible"` and set the endpoint via `backend_url`.

### CLI Usage

Launch the interactive CLI:
```bash
alphamind             # installed command
python -m cli.main    # alternative: run directly from source
```
You will see a screen where you can select your desired tickers, analysis date, LLM provider, research depth, and more.

### Markets and tickers

AlphaMind AI works with any market Yahoo Finance covers, using the exchange-suffixed ticker.

- US: `AAPL`, `SPY`
- Hong Kong: `0700.HK` · Tokyo: `7203.T` · London: `AZN.L`
- India: `RELIANCE.NS`, `.BO` · Canada: `.TO` · Australia: `.AX`
- China A-shares: Shanghai `.SS`, Shenzhen `.SZ`
- Crypto: `BTC-USD`, `ETH-USD`

## AlphaMind AI Package

### Implementation Details

Built with LangGraph for flexibility and modularity. Supports multiple LLM providers: OpenAI, Google, Anthropic, xAI, DeepSeek, Qwen, GLM, MiniMax, OpenRouter, Ollama (local), and Azure OpenAI (enterprise).

### Python Usage

```python
from alphamind.graph.trading_graph import AlphaMindGraph
from alphamind.default_config import DEFAULT_CONFIG

ta = AlphaMindGraph(debug=True, config=DEFAULT_CONFIG.copy())

# forward propagate
_, decision = ta.propagate("NVDA", "2026-01-15")
print(decision)
```

Custom configuration:

```python
from alphamind.graph.trading_graph import AlphaMindGraph
from alphamind.default_config import DEFAULT_CONFIG

config = DEFAULT_CONFIG.copy()
config["llm_provider"] = "openai"
config["deep_think_llm"] = "gpt-5.6"
config["quick_think_llm"] = "gpt-5.6-luna"
config["max_debate_rounds"] = 2

ta = AlphaMindGraph(debug=True, config=config)
_, decision = ta.propagate("NVDA", "2026-01-15")
print(decision)
```

See `alphamind/default_config.py` for all configuration options.

## Persistence and Recovery

### Decision log
Always on. Each completed run appends its decision to `~/.alphamind/memory/trading_memory.md`. On the next run for the same ticker, AlphaMind AI fetches the realised return, generates a reflection, and injects recent decisions into the Portfolio Manager prompt.

Override the path with `ALPHAMIND_MEMORY_LOG_PATH`.

### Checkpoint resume
Opt-in via `--checkpoint`. LangGraph saves state after each node so a crashed or interrupted run resumes from the last successful step.

```bash
alphamind analyze --checkpoint
alphamind analyze --clear-checkpoints
```

```python
config = DEFAULT_CONFIG.copy()
config["checkpoint_enabled"] = True
ta = AlphaMindGraph(config=config)
_, decision = ta.propagate("NVDA", "2026-01-15")
```

## Reproducibility

Two runs of the same ticker and date can differ — this is expected for an LLM-driven research tool, not a defect.

- **Sampling**: LLM output is non-deterministic even at fixed temperature; reasoning models vary the most.
- **Live data**: news/social inputs change over time even for a fixed historical trade date.
- **Mitigation**: lower `temperature` in your config, and prefer a non-reasoning model for tighter reproducibility.

Backtest results are not guaranteed to match any published figure. Treat this as a research scaffold, not a strategy with a fixed, replicable return.

---
