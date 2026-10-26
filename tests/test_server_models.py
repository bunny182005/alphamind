"""Unit tests for server schemas and models."""
from server.constants import EVENT_DONE
from server.models import HealthResponse, StreamEvent


def test_health_response_defaults():
    res = HealthResponse()
    assert res.status == "ok"
    assert res.service == "AlphaMind API"


def test_stream_event_serialization():
    ev = StreamEvent(type=EVENT_DONE, data={"message": "success"})
    assert ev.type == "done"
    assert ev.data["message"] == "success"
