# REST & SSE API Reference

## Endpoints

### `GET /health`
Returns service liveness and version telemetry.

### `POST /api/propagate`
Initiates asynchronous market analysis workflow.
- **Request Body**:
  - `ticker` (string)
  - `date` (ISO 8601 string)
  - `selected_analysts` (list of string)
  - `run_id` (uuid string)

### `GET /api/stream/{run_id}`
Server-Sent Events (SSE) stream yielding real-time node state and LLM tokens.
