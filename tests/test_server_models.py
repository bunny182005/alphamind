"""Unit tests for server schemas and models."""
from server.models import HealthResponse, StreamEvent
from server.constants import EVENT_DONE


def test_health_response_defaults():
    res = HealthResponse()
    assert res.status == "ok"
    assert res.service == "Apex Quant API"


def test_stream_event_serialization():
    ev = StreamEvent(type=EVENT_DONE, data={"message": "success"})
    assert ev.type == "done"
    assert ev.data["message"] == "success"
