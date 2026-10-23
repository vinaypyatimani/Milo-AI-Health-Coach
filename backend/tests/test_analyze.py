"""Analyze mode: the numbers, the report conversation, the PDF, and Polar."""
import json
from datetime import date, datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from milo.analysis import analyze, max_hr_for
from milo.schemas import Activity, HRSample, RecoveryDay, UserProfile

TODAY = date(2026, 10, 19)


def act(day, type="run", minutes=40, km=None, avg_hr=None, max_hr=None, bpm=None):
    start = datetime.combine(day, datetime.min.time()).replace(hour=18)
    samples = [HRSample(time=start + timedelta(seconds=10 * i), bpm=bpm) for i in range(int(minutes * 6))] if bpm else []
    return Activity(source="test", type=type, start_time=start, duration_min=minutes, distance_km=km,
                    avg_hr=avg_hr or bpm, max_hr=max_hr or bpm, hr_samples=samples)


def weeks_of(minutes_per_week, first=date(2026, 8, 31)):
    """Three runs a week (Mon, Thu, Sun, so every week is complete) giving the wanted weekly minutes."""
    out = []
    for i, m in enumerate(minutes_per_week):
        monday = first + timedelta(weeks=i)
        out += [act(monday + timedelta(days=d), minutes=m / 3, km=m / 3 / 6, bpm=120) for d in (0, 3, 6)]
    return out


@pytest.fixture
def client(fake_llm):
    import main
    from milo.coach import Coach
    from milo.storage import Storage

    main.store = Storage(":memory:")
    main.coach = Coach(main.store)
    return TestClient(main.app)


# ---- the numbers --------------------------------------------------------------
def test_totals_sports_and_weeks():
    acts = weeks_of([150, 150, 150, 150]) + [act(date(2026, 9, 2), "strength", 45)]
    r = analyze(acts, [], UserProfile(name="A", max_hr=190), 28, TODAY)
    assert r["period"] == {"from": "2026-08-31", "to": "2026-09-27", "days": 28, "weeks": 4.0}
    assert r["totals"]["sessions"] == 13 and r["totals"]["minutes_per_week"] == round(645 / 4)
    assert [s["type"] for s in r["by_sport"]] == ["run", "strength"]
    assert r["strength"]["sessions"] == 1 and r["running"]["runs"] == 12


def test_returning_after_an_easy_week_is_not_a_spike():
    r = analyze(weeks_of([200, 210, 90, 210, 215]), [], UserProfile(name="A", max_hr=190), None, TODAY)
    assert r["load"]["largest_week_increase_pct"] <= 5
    assert "volume_spike" not in {f["code"] for f in r["flags"]}
    r = analyze(weeks_of([150, 150, 150, 240]), [], UserProfile(name="A", max_hr=190), None, TODAY)
    assert r["load"]["largest_week_increase_pct"] == 60 and "volume_spike" in {f["code"] for f in r["flags"]}


def test_intensity_and_easy_share():
    easy = weeks_of([180, 180])                          # 120 bpm of 190 = 63% -> Zone 2
    r = analyze(easy, [], UserProfile(name="A", max_hr=190), None, TODAY)
    assert r["intensity"]["zone_pct"]["2"] == 100 and "good_easy_share" in {f["code"] for f in r["flags"]}
    hard = [act(date(2026, 9, d), minutes=40, km=8, bpm=165) for d in range(1, 15, 2)]   # 87% -> Zone 4
    r = analyze(hard, [], UserProfile(name="A", max_hr=190), None, TODAY)
    assert r["intensity"]["hard_pct"] == 100 and "too_little_easy" in {f["code"] for f in r["flags"]}


def test_max_hr_sources():
    gym = [act(date(2026, 9, d), "strength", 50, max_hr=140) for d in range(1, 20)]
    assert max_hr_for(UserProfile(name="A"), gym) == (None, "unknown")    # gym never reaches max
    r = analyze(gym, [], UserProfile(name="A"), None, TODAY)
    assert r["intensity"] is None and "max_hr_unknown" in {f["code"] for f in r["flags"]}
    assert max_hr_for(UserProfile(name="A", age=40), gym) == (180, "age (220 - age)")
    runs = [act(date(2026, 9, d), max_hr=178) for d in range(1, 12)]
    assert max_hr_for(None, runs)[0] == 178


def test_recovery_flags():
    acts = weeks_of([150, 150, 150])
    rec = [RecoveryDay(day=date(2026, 8, 31) + timedelta(days=i), sleep_hours=5.5 if i > 14 else 7.5,
                       resting_hr=52 + (6 if i > 13 else 0), hrv_ms=70 - (15 if i > 13 else 0)) for i in range(21)]
    r = analyze(acts, rec, UserProfile(name="A", max_hr=190), None, TODAY)
    codes = {f["code"] for f in r["flags"]}
    assert {"short_nights", "resting_hr_up", "hrv_down"} <= codes
    assert r["recovery"]["resting_hr_change_bpm"] == 6.0


def test_running_economy_improves():
    runs = [act(date(2026, 9, 1) + timedelta(days=2 * i), minutes=40, km=6 + 0.15 * i, avg_hr=140) for i in range(12)]
    r = analyze(runs, [], UserProfile(name="A", max_hr=190), None, TODAY)
    assert r["running"]["efficiency_change_pct"] > 3 and "fitter" in {f["code"] for f in r["flags"]}


# ---- the conversation -----------------------------------------------------------
def events(response):
    return [json.loads(next(line[6:] for line in b.splitlines() if line.startswith("data: ")))
            for b in response.text.strip().split("\n\n") if b.strip()]


def upload(client, sample_files, scope="analysis"):
    files = [("files", (f.name, f.read_bytes())) for f in sorted(sample_files.iterdir())
             if f.is_file() and f.suffix not in (".json", ".md")]
    r = client.post(f"/api/activities/upload?scope={scope}", files=files).json()
    assert all(f["ok"] for f in r["files"])
    return r


def test_analysis_needs_data(client):
    r = client.post("/api/chat/stream", json={"mode": "analysis", "text": None})
    assert r.status_code == 409 and "Upload" in r.json()["detail"]
    assert client.get("/api/analysis").json()["data"]["activities"] == 0


def test_report_conversation_and_pdf(client, fake_llm, sample_files, plan_json):
    upload(client, sample_files)
    client.put("/api/profile", json={"name": "Alex", "age": 30})
    assert client.get("/api/analysis/report.pdf").status_code == 404
    fake_llm.replies = ["## Summary\nSolid start.\n\n## Suggestions\n1. **Sleep** more\n2. Keep runs easy\n\n"
                        f"```json\n{json.dumps(plan_json)}\n```"]
    ev = events(client.post("/api/chat/stream", json={"mode": "analysis", "text": None, "days": 0}))
    assert ev[-1]["type"] == "done" and not ev[-1]["plan_saved"]
    assert client.get("/api/plan").json()["plan"] is None          # analysis never saves a plan
    system = fake_llm.calls[-1][0]["content"]
    assert "ANALYZE" in system and '"sessions":4' in system
    conv = client.get("/api/analysis/conversation").json()
    assert [m["role"] for m in conv] == ["assistant"]               # trigger hidden

    # follow-ups reuse the stored numbers, even after new data arrives
    client.post("/api/activities/manual", json={"date": "2026-10-16", "type": "run", "duration_min": 30})
    fake_llm.replies = ["Because of sleep."]
    client.post("/api/chat/stream", json={"mode": "analysis", "text": "Why?"})
    assert '"sessions":4' in fake_llm.calls[-1][0]["content"]

    pdf = client.get("/api/analysis/report.pdf")
    assert pdf.status_code == 200 and pdf.content[:4] == b"%PDF"

    # clearing the plan keeps the analysis; clearing the analysis removes it
    client.delete("/api/plan")
    assert client.get("/api/analysis/conversation").json()
    client.delete("/api/conversations/analysis")
    assert client.get("/api/analysis/conversation").json() == []


# ---- Polar --------------------------------------------------------------------------
class FakePolar:
    def __init__(self, fit_bytes):
        self.fit, self.calls = fit_bytes, []

    def __call__(self, method, url, headers, data=None):
        self.calls.append((method, url))
        if url.endswith("/oauth2/token"):
            return 200, json.dumps({"access_token": "tok", "x_user_id": 42}).encode()
        if url.endswith("/v3/users") and method == "POST":
            return 409, b""                                          # already registered: fine
        if url.endswith("/v3/exercises"):
            return 200, json.dumps([{"id": "AB1"}]).encode()
        if url.endswith("/exercises/AB1/fit"):
            return 200, self.fit
        if url.endswith("/users/sleep"):
            return 200, json.dumps({"nights": [{"date": "2026-10-17", "light_sleep": 14400,
                                                "deep_sleep": 5400, "rem_sleep": 6300}]}).encode()
        if url.endswith("/users/nightly-recharge"):
            return 200, json.dumps({"recharges": [{"date": "2026-10-17", "heart_rate_avg": 51,
                                                   "heart_rate_variability_avg": 68}]}).encode()
        if method == "DELETE":
            return 204, b""
        return 404, b""


@pytest.fixture
def polar_setup(monkeypatch, sample_files):
    from milo import config
    from milo.connect import polar

    monkeypatch.setattr(config, "POLAR_CLIENT_ID", "cid")
    monkeypatch.setattr(config, "POLAR_CLIENT_SECRET", "secret")
    monkeypatch.setattr(config, "PUBLIC_URL", "https://milo.example")
    fake = FakePolar((sample_files / "week1_sat_long_run.fit").read_bytes())
    monkeypatch.setattr(polar, "http", fake)
    return fake


def test_polar_connect_sync_disconnect(client, polar_setup):
    from milo.connect import polar

    assert client.get("/api/connect/polar/start", follow_redirects=False).status_code == 400   # no consent
    r = client.get("/api/connect/polar/start?consent=yes", follow_redirects=False)
    assert r.status_code in (302, 307) and r.headers["location"].startswith(polar.AUTH_URL)
    assert "redirect_uri=https%3A%2F%2Fmilo.example%2Fapi%2Fconnect%2Fpolar%2Fcallback" in r.headers["location"]
    state = r.headers["location"].split("state=")[1]

    bad = client.get("/api/connect/polar/callback?code=x&state=forged", follow_redirects=False)
    assert "polar_error" in bad.headers["location"]
    ok = client.get(f"/api/connect/polar/callback?code=x&state={state}", follow_redirects=False)
    assert ok.headers["location"] == "/#analyze?connected=polar"
    assert client.get("/api/connect").json()["polar"]["connected"]

    rep = client.post("/api/connect/polar/sync").json()
    assert rep["new_workouts"] == 1 and rep["recovery_days"] == 1
    assert client.post("/api/connect/polar/sync").json()["new_workouts"] == 0    # remembered
    import main
    day = main.store.get_recovery(date(2026, 10, 17), date(2026, 10, 17), scope="analysis")[0]
    assert main.store.get_recovery(date(2026, 10, 17), date(2026, 10, 17)) == []   # not in the plan's data
    assert (day.sleep_hours, day.resting_hr, day.hrv_ms) == (7.25, 51, 68)

    client.delete("/api/connect/polar")
    assert ("DELETE", "https://www.polaraccesslink.com/v3/users/42") in polar_setup.calls
    assert not client.get("/api/connect").json()["polar"]["connected"]


def test_polar_not_configured(client, monkeypatch):
    from milo import config

    monkeypatch.setattr(config, "POLAR_CLIENT_ID", "")
    assert client.get("/api/connect").json()["polar"]["available"] is False
    assert client.get("/api/connect/polar/start?consent=yes", follow_redirects=False).status_code == 503


def test_one_hard_week_is_flagged():
    easy = weeks_of([180, 180, 180, 180])
    first = date(2026, 8, 31) + timedelta(weeks=4)
    hard = [act(first + timedelta(days=d), minutes=60, km=11, bpm=150) for d in (0, 3, 6)]   # 79% -> Zone 3
    r = analyze(easy + hard + weeks_of([180], first + timedelta(weeks=1)), [],
                UserProfile(name="A", max_hr=190), None, TODAY)
    flag = next(f for f in r["flags"] if f["code"] == "hard_week")
    assert "2026-09-28" in flag["text"] and r["weekly"][4]["easy_pct"] == 0


# ---- plan data and Analyze data are separate ------------------------------------------------
def test_analyze_and_plan_data_are_separate(client, fake_llm, sample_files, plan_json):
    """Someone can analyze marathon training while following a weight-loss plan:
    the Week page shows only the plan's workouts, Analyze only its own."""
    fake_llm.replies = [f"Plan.\n```json\n{json.dumps(plan_json)}\n```"]
    client.post("/api/coaching/message", json={"text": "plan"})
    upload(client, sample_files, scope="analysis")
    assert client.get("/api/activities").json() == []                       # Data page: nothing
    assert client.get("/api/weeks/1/metrics").json()["summary"]["actual_duration_min"] == 0
    assert all(w["actual_duration_min"] in (0, None) for w in client.get("/api/progress").json())
    assert client.get("/api/analysis?days=0").json()["data"]["activities"] == 4

    # the same files on the Data page count for the plan (not duplicates of Analyze's)
    r = upload(client, sample_files, scope="plan")
    assert sum(f["activities_added"] for f in r["files"]) == 4
    assert client.get("/api/weeks/1/metrics").json()["summary"]["completion_rate_pct"] == 100
    assert client.get("/api/analysis?days=0").json()["data"]["activities"] == 4    # unchanged
    assert len(client.get("/api/activities?scope=analysis").json()) == 4


def test_reset_analysis_keeps_the_plan(client, fake_llm, sample_files, plan_json, polar_setup):
    fake_llm.replies = [f"Plan.\n```json\n{json.dumps(plan_json)}\n```"]
    client.post("/api/coaching/message", json={"text": "plan"})
    upload(client, sample_files, scope="plan")
    upload(client, sample_files, scope="analysis")
    fake_llm.replies = ["## Summary\nGood."]
    client.post("/api/chat/stream", json={"mode": "analysis", "text": None})
    r = client.get("/api/connect/polar/start?consent=yes", follow_redirects=False)
    client.get(f"/api/connect/polar/callback?code=x&state={r.headers['location'].split('state=')[1]}")
    client.post("/api/connect/polar/sync")

    assert client.delete("/api/analysis").json()["ok"]
    a = client.get("/api/analysis?days=0").json()
    assert a["data"]["activities"] == 0 and a["data"]["recovery_days"] == 0
    assert client.get("/api/analysis/conversation").json() == []
    assert len(client.get("/api/activities").json()) == 4                    # plan data untouched
    assert client.get("/api/plan").json()["plan"] is not None
    assert client.get("/api/connect").json()["polar"]["connected"]           # still connected...
    assert client.post("/api/connect/polar/sync").json()["new_workouts"] == 1   # ...and re-imports


def test_old_database_is_upgraded(tmp_path):
    """A database from before Analyze existed: its data becomes the plan's."""
    import sqlite3

    from milo.storage import Storage

    db = tmp_path / "old.db"
    con = sqlite3.connect(db)
    con.executescript("""
        CREATE TABLE activities (id INTEGER PRIMARY KEY AUTOINCREMENT, start_time TEXT NOT NULL,
                                 data TEXT NOT NULL, fingerprint TEXT NOT NULL UNIQUE);
        CREATE TABLE recovery (day TEXT PRIMARY KEY, data TEXT NOT NULL);
    """)
    a = act(date(2026, 10, 13))
    con.execute("INSERT INTO activities (start_time, data, fingerprint) VALUES (?, ?, ?)",
                (a.start_time.isoformat(), a.model_dump_json(), "run|2026-10-13T18:00|40"))
    con.execute("INSERT INTO recovery VALUES (?, ?)",
                ("2026-10-13", RecoveryDay(day=date(2026, 10, 13), sleep_hours=7).model_dump_json()))
    con.commit()
    con.close()

    store = Storage(db)
    assert len(store.get_activities()) == 1 and store.get_activities(scope="analysis") == []
    assert store.get_recovery(date(2026, 10, 1), date(2026, 10, 31))[0].sleep_hours == 7
    assert store.add_activities([a]) == 0                    # still a duplicate in the plan
    assert store.add_activities([a], scope="analysis") == 1  # but new for Analyze
    Storage(db)                                              # opening it again changes nothing
