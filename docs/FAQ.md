# Frequently Asked Questions

### Which LLM models provide the best latency vs depth?
For fast real-time scans, `gpt-5.4-nano` or `gpt-5.6-luna` provide optimal throughput. For deep hedge-fund style debate and risk synthesis, choose `gpt-5.6`.

### How can I inspect active SSE streams?
Open Chrome DevTools > Network tab > filter by EventStream or connect to `/api/stream/{run_id}`.
