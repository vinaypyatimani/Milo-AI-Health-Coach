from datetime import date, datetime, timedelta

from milo.intensity import parse_pace_range, parse_zone_range, zone_bpm_range
from milo.metrics import compute_week_metrics
from milo.schemas import Activity, HRSample, RecoveryDay, TrainingPlan


def act(day, type_, minutes, km=None, hr=None, samples=None):
    start = datetime.fromisoformat(f"{day}T18:00")
    hs = [HRSample(time=start + timedelta(seconds=5 * i), bpm=b) for i, b in enumerate(samples or [])]
    return Activity(source="test", type=type_, start_time=start, duration_min=minutes,
                    distance_km=km, avg_hr=hr, hr_samples=hs)


def test_zone_parsing():
    assert parse_zone_range("Zone 2") == (2, 2)
    assert parse_zone_range("Z2-Z3") == (2, 3)
    assert zone_bpm_range((2, 2), 190) == (114.0, 133.0)
    assert parse_pace_range("6:00-6:30 min/km") == (6.0, 6.5)


def test_completed_moved_missed_extra(plan_json):
    plan = TrainingPlan.model_validate(plan_json)
    acts = [
        act("2026-10-13", "run", 30, 4.8),          # Tue easy run -> completed
        act("2026-10-16", "strength", 35),          # Thu strength done Fri -> moved
        act("2026-10-14", "cycling", 60, 20),       # not in plan -> extra
        # Sat long run and Sun mobility missing -> missed
    ]
    m = compute_week_metrics(plan, 1, acts, [], max_hr=190)
    s = m["summary"]
    assert (s["planned_sessions"], s["completed_on_planned_day"], s["completed_on_other_day"],
            s["missed"], s["extra_unplanned_activities"]) == (4, 1, 1, 2, 1)
    assert s["completion_rate_pct"] == 50
    assert s["planned_duration_min"] == 135
    assert s["actual_duration_min"] == 125  # 30 + 35 + 60 (extras count toward volume)
    statuses = {r["planned_day"]: r["status"] for r in m["sessions"]}
    assert statuses == {"Tuesday": "completed", "Thursday": "moved",
                        "Saturday": "missed", "Sunday": "missed"}


def test_time_in_zone(plan_json):
    plan = TrainingPlan.model_validate(plan_json)
    # 10 min at 125 bpm (Zone 2 for max 190), then 10 min at 150 (Zone 3-4)
    samples = [125] * 120 + [150] * 121
    m = compute_week_metrics(plan, 1, [act("2026-10-13", "run", 20, 3.2, 137, samples)], [],
                             max_hr=190)
    it = m["sessions"][0]["intensity"]
    assert it["time_in_target_min"] == 10.0
    assert it["pct_time_in_target"] == 50
    assert m["summary"]["pct_time_in_target_hr_zone"] == 50


def test_missing_max_hr_is_reported(plan_json):
    plan = TrainingPlan.model_validate(plan_json)
    m = compute_week_metrics(plan, 1, [act("2026-10-13", "run", 30, 5, 130, [130] * 100)], [],
                             max_hr=None)
    assert m["sessions"][0]["intensity"]["time_in_target_min"] is None
    assert "max heart rate unknown" in m["sessions"][0]["intensity"]["note"]


def test_recovery_vs_baseline(plan_json):
    plan = TrainingPlan.model_validate(plan_json)
    start = date(2026, 10, 12)
    base = [RecoveryDay(day=start - timedelta(days=i + 1), sleep_hours=7.5, resting_hr=54, hrv_ms=60)
            for i in range(21)]
    week = [RecoveryDay(day=start + timedelta(days=i), sleep_hours=5.5, resting_hr=59, hrv_ms=48)
            for i in range(7)]
    r = compute_week_metrics(plan, 1, [], week, base, 190)["recovery"]
    assert r["avg_sleep_hours"] == 5.5 and r["nights_under_6h_sleep"] == 7
    assert r["resting_hr_change_vs_baseline"] == 5.0
    assert r["hrv_change_vs_baseline_pct"] == -20.0


def test_data_warning_for_long_activity(plan_json):
    plan = TrainingPlan.model_validate(plan_json)
    m = compute_week_metrics(plan, 1, [act("2026-10-17", "run", 190, 7.2, 98)], [], max_hr=190)
    assert any("2.5x" in w for w in m["data_warnings"])


def test_no_data_week(plan_json):
    plan = TrainingPlan.model_validate(plan_json)
    m = compute_week_metrics(plan, 2, [], [], max_hr=190)
    assert m["has_tracker_data"] is False and m["summary"]["missed"] == 4
    assert m["recovery"]["avg_sleep_hours"] is None
