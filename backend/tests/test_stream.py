"""Streaming chat endpoint (server-sent events), with the fake model."""
import json

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client(fake_llm):
    import main
    from milo.coach import Coach
    from milo.storage import Storage

    main.store = Storage(":memory:")
    main.coach = Coach(main.store)
    return TestClient(main.app)


def events(response) -> list[dict]:
    out = []
    for block in response.text.strip().split("\n\n"):
        data = next(line[6:] for line in block.splitlines() if line.startswith("data: "))
        out.append(json.loads(data))
    return out


def test_coaching_stream_saves_plan(client, fake_llm, plan_json):
    fake_llm.replies = ["Hi! What's your goal?",
                        f"Here is your plan.\n```json\n{json.dumps(plan_json)}\n```"]
    ev = events(client.post("/api/chat/stream", json={"mode": "coaching"}))
    assert ev[0]["type"] == "meta" and ev[-1]["type"] == "done"
    assert "".join(e["text"] for e in ev if e["type"] == "delta") == "Hi! What's your goal?"
    assert ev[-1]["plan_saved"] is False

    ev = events(client.post("/api/chat/stream", json={"mode": "coaching", "text": "Run a 10K"}))
    done = ev[-1]
    assert done["plan_saved"] and "```" not in done["message"]["content"]
    assert client.get("/api/plan").json()["plan"]["goal"].startswith("Run a 10K")
    # the conversation is stored exactly as with the non-streaming endpoints
    assert [m["role"] for m in client.get("/api/coaching").json()] == ["assistant", "user", "assistant"]


def test_stream_safety_meta_comes_first(client, fake_llm, plan_json):
    client.post("/api/chat/stream", json={"mode": "coaching"})
    fake_llm.replies = [f"Please see a doctor.\n```json\n{json.dumps(plan_json)}\n```"]
    ev = events(client.post("/api/chat/stream",
                            json={"mode": "coaching", "text": "I had chest pain yesterday"}))
    assert ev[0]["type"] == "meta" and ev[0]["urgent_banner"]
    assert ev[-1]["plan_saved"] is False


def test_checkin_stream_needs_plan(client):
    r = client.post("/api/chat/stream", json={"mode": "checkin", "week": 1})
    assert r.status_code == 409


def test_checkin_stream_bad_week(client, fake_llm, plan_json):
    fake_llm.replies = [f"```json\n{json.dumps(plan_json)}\n```"]
    client.post("/api/chat/stream", json={"mode": "coaching", "text": "plan please"})
    assert client.post("/api/chat/stream", json={"mode": "checkin", "week": 9}).status_code == 400
    assert client.post("/api/chat/stream", json={"mode": "checkin"}).status_code == 400


def test_stream_model_error_becomes_error_event(client, fake_llm):
    from milo import llm

    def broken(messages, model, temperature):
        raise llm.LLMError("offline")

    llm.set_override(broken)
    ev = events(client.post("/api/chat/stream", json={"mode": "coaching"}))
    assert ev[-1]["type"] == "error" and "offline" in ev[-1]["detail"]
