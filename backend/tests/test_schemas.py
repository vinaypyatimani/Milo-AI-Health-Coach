from datetime import date, datetime

import pytest
from pydantic import ValidationError

from milo.schemas import Activity, TrainingPlan, UserProfile


def make_plan(day="tuesday", start="2026-10-15"):
    return TrainingPlan.model_validate({
        "goal": "Run a 10K",
        "start_date": start,                      # a Thursday on purpose
        "weeks": [{"week_number": 1, "focus": "Base", "sessions": [
            {"day": day, "type": "Run", "title": "Easy run", "duration_min": 30,
             "target_intensity": {"kind": "hr_zone", "value": "Zone 2"}}]}],
    })


def test_plan_cleans_ai_output():
    plan = make_plan()
    s = plan.weeks[0].sessions[0]
    assert plan.start_date == date(2026, 10, 12)          # snapped to Monday
    assert (s.day, s.type) == ("Tuesday", "run")          # cleaned up
    assert plan.session_date(1, "Tuesday") == date(2026, 10, 13)
    assert plan.week_for_date(date(2026, 10, 20)) == 2


def test_plan_rejects_bad_day():
    with pytest.raises(ValidationError):
        make_plan(day="Funday")


def test_activity_and_profile():
    a = Activity(source="manual", type="run", start_time=datetime(2026, 10, 13, 18, 30),
                 duration_min=30, distance_km=5)
    assert a.pace_min_per_km == 6.0                       # 6:00 min/km
    assert UserProfile(name="Alex", age=30).effective_max_hr() == 190