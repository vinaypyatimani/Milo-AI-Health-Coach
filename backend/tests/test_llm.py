"""Checks the parameters sent to each kind of model, without calling any API."""
import pytest

from milo import config, llm


def test_classic_model_gets_temperature():
    assert llm.build_params("github/gpt-4o-mini", 0.0) == {"model": "github/gpt-4o-mini", "temperature": 0.0}


def test_reasoning_model_gets_effort_not_temperature(monkeypatch):
    monkeypatch.setattr(config, "REASONING_EFFORT", "low")
    assert llm.build_params("openai/gpt-6-luna", 0.4) == {"model": "openai/gpt-6-luna", "reasoning_effort": "low"}


def test_reasoning_off_allows_temperature(monkeypatch):
    monkeypatch.setattr(config, "REASONING_EFFORT", "none")
    p = llm.build_params("openai/gpt-6-luna", 0.4)
    assert p["reasoning_effort"] == "none" and p["temperature"] == 0.4


def test_bad_request_is_not_retried(monkeypatch):
    import litellm

    calls = []

    def fake_completion(**kwargs):
        calls.append(kwargs)
        raise litellm.BadRequestError("unsupported parameter", model="x", llm_provider="openai")

    monkeypatch.setattr(litellm, "completion", fake_completion)
    with pytest.raises(llm.LLMError):
        llm.chat([{"role": "user", "content": "hi"}], model="openai/gpt-6-luna")
    assert len(calls) == 1
