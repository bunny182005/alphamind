"""Domain constants for SSE events and execution lifecycle."""

EVENT_STEP_START = "step_start"
EVENT_STEP_DONE = "step_done"
EVENT_LLM_START = "llm_start"
EVENT_LLM_CHUNK = "llm_chunk"
EVENT_LLM_END = "llm_end"
EVENT_DONE = "done"
EVENT_FATAL_ERROR = "fatal_error"

ALL_STREAM_EVENTS = {
    EVENT_STEP_START,
    EVENT_STEP_DONE,
    EVENT_LLM_START,
    EVENT_LLM_CHUNK,
    EVENT_LLM_END,
    EVENT_DONE,
    EVENT_FATAL_ERROR,
}
