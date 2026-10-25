"""Typed schemas for server API requests and responses."""
from typing import Any

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = "ok"
    service: str = "Apex Quant API"
    version: str = "1.0.0"


class StreamEvent(BaseModel):
    type: str
    data: dict[str, Any] = Field(default_factory=dict)
