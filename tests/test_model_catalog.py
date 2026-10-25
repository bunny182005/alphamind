"""Unit tests for LLM provider model catalog registrations."""
from tradingagents.llm_clients.model_catalog import MODEL_OPTIONS


def test_openai_quick_models_contains_nano():
    quick_models = [m[1] for m in MODEL_OPTIONS["openai"]["quick"]]
    assert "gpt-5.4-nano" in quick_models


def test_openai_deep_models_registered():
    deep_models = [m[1] for m in MODEL_OPTIONS["openai"]["deep"]]
    assert len(deep_models) > 0
