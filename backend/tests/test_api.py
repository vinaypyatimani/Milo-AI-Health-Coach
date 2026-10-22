"""End-to-end API tests with a fake model (no API key or network needed)."""
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


def test_full_flow(client, fake_llm, plan_json, sample_files):
    assert client.get("/api/health").json()["ok"]
    client.put("/api/profile", json={"name": "Alex", "age": 30})

    # Coaching Mode: question, then a plan
    fake_llm.replies = ["Hi! I'm Milo. What's your main goal?",
                        f"Great, here's your plan.\n```json\n{json.dumps(plan_json)}\n```"]
    r = client.post("/api/coaching/start").json()
    assert "main goal" in r["reply"] and not r["plan_saved"]
    r = client.post("/api/coaching/message", json={"text": "Run a 10K"}).json()
    assert r["plan_saved"] and "```" not in r["reply"]
    assert client.get("/api/plan").json()["current_week"] == 2
    conv = client.get("/api/coaching").json()
    assert [m["role"] for m in conv] == ["assistant", "user", "assistant"]  # trigger hidden

    # Upload tracker files
    files = [("files", (f.name, f.read_bytes())) for f in sorted(sample_files.iterdir())
             if f.suffix != ".json"]
    up = client.post("/api/activities/upload", files=files).json()
    assert all(f["ok"] for f in up["files"])
    assert len(client.get("/api/activities").json()) == 4

    # Duplicate upload is skipped
    up2 = client.post("/api/activities/upload", files=files[:1]).json()
    assert up2["files"][0]["activities_added"] == 0

    # Metrics + check-in. The system prompt must contain the computed metrics.
    m = client.get("/api/weeks/1/metrics").json()
    assert m["summary"]["completion_rate_pct"] == 100
    fake_llm.replies = ["Nice week! How was your energy?"]
    client.post("/api/checkin/1/start")
    system_prompt = fake_llm.calls[-1][0]["content"]
    assert '"completion_rate_pct":100' in system_prompt and "MODE: checkin" in system_prompt

    # Safety: urgent message adds an alert and blocks plan updates in that reply
    fake_llm.replies = [f"Please see a doctor.\n```json\n{json.dumps(plan_json)}\n```"]
    r = client.post("/api/checkin/1/message", json={"text": "I had chest pain on Saturday"}).json()
    assert r["urgent_banner"] and not r["plan_saved"]
    assert "SAFETY_ALERT" in fake_llm.calls[-1][-1]["content"]

    assert len(client.get("/api/progress").json()) == 4

    # GDPR delete
    client.delete("/api/data")
    assert client.get("/api/plan").json()["plan"] is None


def test_checkin_without_plan(client):
    assert client.post("/api/checkin/1/start").status_code == 409


def test_plan_repair(client, fake_llm, plan_json):
    bad = dict(plan_json)
    bad["weeks"] = [{"week_number": 1, "sessions": [{"day": "Mon", "type": "run"}]}]
    fake_llm.replies = [f"Plan:\n```json\n{json.dumps(bad)}\n```",
                        f"```json\n{json.dumps(plan_json)}\n```"]
    r = client.post("/api/coaching/message", json={"text": "make the plan"}).json()
    assert r["plan_saved"] and r["plan_error"] is None


def test_manual_entry_and_recovery(client):
    r = client.post("/api/activities/manual", json={
        "date": "2026-10-13", "type": "run", "duration_min": 30, "distance_km": 5})
    assert r.status_code == 200
    assert client.post("/api/activities/manual", json={
        "date": "2026-10-13", "type": "run", "duration_min": 30}).status_code == 409
    assert client.post("/api/recovery", json={"date": "2026-10-13", "sleep_hours": 7}).status_code == 200


def test_upload_survives_locked_temp_file(client, sample_files, monkeypatch):
    """On Windows, a virus scanner can hold a new file; deleting it then fails."""
    from pathlib import Path

    def locked(self, missing_ok=False):
        raise PermissionError(32, "The process cannot access the file because it is being used by another process")

    monkeypatch.setattr(Path, "unlink", locked)
    f = sample_files / "week1_tue_easy_run.gpx"
    r = client.post("/api/activities/upload", files=[("files", (f.name, f.read_bytes()))])
    assert r.status_code == 200 and r.json()["files"][0]["ok"]
