"""Plan-vs-actual metrics.

All numbers Milo talks about in a check-in come from here. The LLM never
calculates anything itself; it only interprets this output. That keeps the
analysis accurate and lets us test it with ordinary unit tests.
"""
from __future__ import annotations

from datetime import date, timedelta
from statistics import mean
from typing import Optional

from .intensity import evaluate_intensity, format_pace
from .schemas import Activity, PlannedSession, RecoveryDay, TrainingPlan

# Activity types that can stand in for each other when matching to the plan.
_COMPATIBLE = {
    "run": {"run"},
    "walk": {"walk", "run"},
    "cycling": {"cycling"},
    "swim": {"swim"},
    "strength": {"strength", "other"},
    "mobility": {"mobility", "other", "strength"},
    "other": {"other", "strength", "mobility"},
}


def _r(x: Optional[float], nd: int = 1) -> Optional[float]:
    return None if x is None else round(x, nd)


def _avg(values: list[Optional[float]]) -> Optional[float]:
    vals = [v for v in values if v is not None]
    return mean(vals) if vals else None


def _match(plan: TrainingPlan, week_number: int, planned: list[PlannedSession],
           activities: list[Activity]):
    """Match activities to planned sessions.

    Pass 1: same day, compatible type  -> "completed"
    Pass 2: other day in the same week -> "moved"
    Leftover planned sessions -> "missed"; leftover activities -> "extra".
    """
    remaining = list(activities)
    matches: list[tuple[PlannedSession, Optional[Activity], str]] = []
    unmatched: list[PlannedSession] = []

    for s in planned:
        d = plan.session_date(week_number, s.day)
        hit = next((a for a in remaining
                    if a.day == d and a.type in _COMPATIBLE.get(s.type, {s.type})), None)
        if hit:
            remaining.remove(hit)
            matches.append((s, hit, "completed"))
        else:
            unmatched.append(s)

    for s in unmatched:
        hit = next((a for a in remaining if a.type in _COMPATIBLE.get(s.type, {s.type})), None)
        if hit:
            remaining.remove(hit)
            matches.append((s, hit, "moved"))
        else:
            matches.append((s, None, "missed"))

    order = {day: i for i, day in enumerate(
        ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"])}
    matches.sort(key=lambda m: order[m[0].day])
    return matches, remaining


def _warnings(planned: Optional[PlannedSession], a: Activity, max_hr: Optional[int]) -> list[str]:
    w = []
    if planned and planned.duration_min and a.duration_min > 2.5 * planned.duration_min:
        w.append(f"{a.type} on {a.day.isoformat()} lasted {a.duration_min:.0f} min, "
                 f"more than 2.5x the planned {planned.duration_min:.0f} min")
    if a.duration_min > 360:
        w.append(f"{a.type} on {a.day.isoformat()} lasted over 6 hours")
    if max_hr and a.max_hr and a.max_hr > max_hr + 15:
        w.append(f"max HR {a.max_hr:.0f} bpm on {a.day.isoformat()} is far above the "
                 f"profile max HR {max_hr} (possible sensor error or wrong max HR)")
    pace = a.pace_min_per_km
    if a.type == "run" and pace and pace < 2.5:
        w.append(f"run on {a.day.isoformat()} has an implausible pace ({format_pace(pace)}); "
                 "possibly a GPS error or a cycling activity recorded as a run")
    return w


def _recovery(recovery: list[RecoveryDay], baseline: list[RecoveryDay]) -> dict:
    sleep = _avg([r.sleep_hours for r in recovery])
    rhr = _avg([r.resting_hr for r in recovery])
    hrv = _avg([r.hrv_ms for r in recovery])
    base_rhr = _avg([r.resting_hr for r in baseline])
    base_hrv = _avg([r.hrv_ms for r in baseline])
    days = len([r for r in recovery
                if any(v is not None for v in (r.sleep_hours, r.resting_hr, r.hrv_ms))])
    return {
        "days_with_data": days,
        "avg_sleep_hours": _r(sleep),
        "nights_under_6h_sleep": (sum(1 for r in recovery
                                      if r.sleep_hours is not None and r.sleep_hours < 6)
                                  if sleep is not None else None),
        "avg_resting_hr": _r(rhr),
        "baseline_resting_hr": _r(base_rhr),
        "resting_hr_change_vs_baseline": _r(rhr - base_rhr) if rhr and base_rhr else None,
        "avg_hrv_ms": _r(hrv),
        "baseline_hrv_ms": _r(base_hrv),
        "hrv_change_vs_baseline_pct": (_r(100 * (hrv - base_hrv) / base_hrv)
                                       if hrv and base_hrv else None),
        "baseline_period": "previous 21 days",
    }


def compute_week_metrics(plan: TrainingPlan, week_number: int,
                         activities: list[Activity], recovery: list[RecoveryDay],
                         baseline_recovery: list[RecoveryDay] | None = None,
                         max_hr: Optional[int] = None) -> dict:
    week = plan.week(week_number)
    if week is None:
        raise ValueError(f"Week {week_number} is not in the plan")

    start = plan.week_start(week_number)
    end = start + timedelta(days=6)
    first = max(start, plan.begins)  # "start today": earlier days of week 1 don't count
    week_acts = [a for a in activities if first <= a.day <= end]
    planned = [s for s in week.sessions if s.type != "rest" and plan.is_active(week_number, s.day)]

    matches, extras = _match(plan, week_number, planned, week_acts)

    sessions, warnings = [], []
    for s, a, status in matches:
        row = {
            "planned_day": s.day,
            "planned_date": plan.session_date(week_number, s.day).isoformat(),
            "type": s.type,
            "title": s.title,
            "status": status,
            "planned_duration_min": _r(s.duration_min),
            "actual_duration_min": _r(a.duration_min) if a else None,
            "planned_distance_km": _r(s.distance_km, 2),
            "actual_distance_km": _r(a.distance_km, 2) if a else None,
            "actual_date": a.day.isoformat() if a else None,
            "avg_hr": _r(a.avg_hr, 0) if a else None,
            "pace": format_pace(a.pace_min_per_km) if a and a.type in ("run", "walk") else None,
            "intensity": None,
        }
        if a:
            row["intensity"] = evaluate_intensity(a, s.target_intensity, max_hr)
            warnings += _warnings(s, a, max_hr)
        sessions.append(row)

    extra_rows = []
    for a in extras:
        extra_rows.append({
            "date": a.day.isoformat(), "type": a.type,
            "duration_min": _r(a.duration_min), "distance_km": _r(a.distance_km, 2),
            "avg_hr": _r(a.avg_hr, 0),
        })
        warnings += _warnings(None, a, max_hr)

    done = [m for m in matches if m[2] != "missed"]
    planned_dur = sum(s.duration_min for s in planned)
    actual_dur = sum(a.duration_min for _, a, _ in done if a) + sum(a.duration_min for a in extras)
    planned_dist = sum(s.distance_km or 0 for s in planned)
    actual_dist = (sum((a.distance_km or 0) for _, a, _ in done if a) +
                   sum((a.distance_km or 0) for a in extras))

    # Time in target zone, over sessions that had a zone target and HR samples.
    hr_in_target = hr_total = 0.0
    for row in sessions:
        it = row["intensity"]
        if it and it["hr_data_min"]:
            hr_in_target += it["time_in_target_min"]
            hr_total += it["hr_data_min"]

    return {
        "week_number": week_number,
        "week_start": start.isoformat(),
        "week_end": end.isoformat(),
        "week_focus": week.focus,
        "summary": {
            "planned_sessions": len(planned),
            "completed_on_planned_day": sum(1 for m in matches if m[2] == "completed"),
            "completed_on_other_day": sum(1 for m in matches if m[2] == "moved"),
            "missed": sum(1 for m in matches if m[2] == "missed"),
            "extra_unplanned_activities": len(extras),
            "completion_rate_pct": round(100 * len(done) / len(planned)) if planned else None,
            "planned_duration_min": _r(planned_dur),
            "actual_duration_min": _r(actual_dur),
            "duration_vs_plan_pct": round(100 * actual_dur / planned_dur) if planned_dur else None,
            "planned_distance_km": _r(planned_dist, 2) if planned_dist else None,
            "actual_distance_km": _r(actual_dist, 2) if actual_dist else None,
            "time_in_target_hr_zone_min": _r(hr_in_target) if hr_total else None,
            "pct_time_in_target_hr_zone": round(100 * hr_in_target / hr_total) if hr_total else None,
        },
        "sessions": sessions,
        "extra_activities": extra_rows,
        "recovery": _recovery(recovery, baseline_recovery or []),
        "data_warnings": warnings,
        "has_tracker_data": bool(week_acts),
    }


def progress_overview(plan: TrainingPlan, activities: list[Activity],
                      recovery_by_week: dict[int, list[RecoveryDay]],
                      max_hr: Optional[int], today: date) -> list[dict]:
    """Compact per-week summary for the Progress charts."""
    out = []
    for w in plan.weeks:
        start = plan.week_start(w.week_number)
        logged = any(max(start, plan.begins) <= a.start_time.date() <= start + timedelta(days=6) for a in activities)
        # A future week still counts once workouts are logged for it (e.g. when
        # the server's clock is pinned with MILO_TODAY or the user logs ahead).
        if start > today and not logged:
            planned = [s for s in w.sessions if s.type != "rest" and plan.is_active(w.week_number, s.day)]
            out.append({"week_number": w.week_number, "status": "upcoming",
                        "planned_duration_min": sum(s.duration_min for s in planned),
                        "actual_duration_min": None, "completion_rate_pct": None,
                        "pct_time_in_target_hr_zone": None, "avg_resting_hr": None,
                        "avg_sleep_hours": None})
            continue
        m = compute_week_metrics(plan, w.week_number, activities,
                                 recovery_by_week.get(w.week_number, []), [], max_hr)
        s = m["summary"]
        in_progress = start <= today <= start + timedelta(days=6)
        out.append({
            "week_number": w.week_number,
            "status": "current" if in_progress else "done",
            "planned_duration_min": s["planned_duration_min"],
            "actual_duration_min": s["actual_duration_min"],
            "completion_rate_pct": s["completion_rate_pct"],
            "pct_time_in_target_hr_zone": s["pct_time_in_target_hr_zone"],
            "avg_resting_hr": m["recovery"]["avg_resting_hr"],
            "avg_sleep_hours": m["recovery"]["avg_sleep_hours"],
        })
    return out
