"""Analyze mode: a training report from tracker data alone (no plan needed).

Every number Milo mentions is computed here. The model only explains and
suggests; it never calculates. Flags are rule-based so the same data always
gives the same warnings.
"""
from __future__ import annotations

from collections import defaultdict
from datetime import date, timedelta
from statistics import mean
from typing import Optional

from .intensity import ZONE_BOUNDS
from .schemas import Activity, RecoveryDay, UserProfile

ENDURANCE = {"run", "cycling", "swim", "walk"}


def _r(x: Optional[float], digits: int = 1) -> Optional[float]:
    return None if x is None else round(x, digits)


def _pace(min_per_km: Optional[float]) -> Optional[str]:
    if not min_per_km:
        return None
    m, s = divmod(round(min_per_km * 60), 60)
    return f"{m}:{s:02d} /km"


def max_hr_for(profile: Optional[UserProfile], activities: list[Activity]) -> tuple[Optional[int], str]:
    """Max HR from the profile, else age, else the highest value in the data."""
    if profile and profile.max_hr:
        return profile.max_hr, "profile"
    if profile and profile.age:
        return 220 - profile.age, "age (220 - age)"
    # Only endurance workouts get close to max; gym sessions would give zones that are far too high.
    seen = [a.max_hr for a in activities if a.max_hr and a.type in ENDURANCE]
    if len(seen) >= 10:
        return round(max(seen)), "highest heart rate in your workouts (probably a bit low)"
    return None, "unknown"


def _zone(bpm: float, max_hr: int) -> int:
    frac = bpm / max_hr
    for z, (lo, hi) in ZONE_BOUNDS.items():
        if lo <= frac < hi:
            return z
    return 1 if frac < ZONE_BOUNDS[1][0] else 5


def _zone_minutes(acts: list[Activity], max_hr: int) -> dict[int, float]:
    """Minutes per heart-rate zone. Uses the samples when there are any,
    otherwise puts the whole workout in the zone of its average heart rate."""
    out = {z: 0.0 for z in ZONE_BOUNDS}
    for a in acts:
        s = sorted(a.hr_samples, key=lambda x: x.time)
        if len(s) >= 2:
            for prev, cur in zip(s, s[1:], strict=False):
                gap = min((cur.time - prev.time).total_seconds(), 30) / 60   # cap pauses
                out[_zone(prev.bpm, max_hr)] += gap
        elif a.avg_hr:
            out[_zone(a.avg_hr, max_hr)] += a.duration_min
    return out


def period_for(activities: list[Activity], days: Optional[int], today: date) -> tuple[date, date]:
    """The window ends at the latest workout (or today without data), so a
    report still makes sense if the last upload is a while ago."""
    last = max((a.day for a in activities), default=today)
    if days is None:
        first = min((a.day for a in activities), default=today - timedelta(days=27))
        return first, last
    return last - timedelta(days=days - 1), last


def analyze(activities: list[Activity], recovery: list[RecoveryDay], profile: Optional[UserProfile],
            days: Optional[int], today: date) -> dict:
    start, end = period_for(activities, days, today)
    acts = sorted((a for a in activities if start <= a.day <= end), key=lambda a: a.start_time)
    rec = sorted((r for r in recovery if start <= r.day <= end), key=lambda r: r.day)
    n_days = (end - start).days + 1
    weeks = max(n_days / 7, 1)
    max_hr, max_src = max_hr_for(profile, activities)

    result: dict = {
        "period": {"from": start.isoformat(), "to": end.isoformat(), "days": n_days, "weeks": _r(weeks)},
        "data": {"activities": len(acts), "with_heart_rate": sum(1 for a in acts if a.avg_hr or a.hr_samples),
                 "recovery_days": len(rec), "max_hr_used": max_hr, "max_hr_source": max_src,
                 "days_since_last_workout": max(0, (today - end).days) if acts else None},
    }
    if not acts:
        result["flags"] = [{"code": "no_data", "text": "No workouts in this period."}]
        return result

    total_min = sum(a.duration_min for a in acts)
    total_km = sum(a.distance_km or 0 for a in acts)
    active_days = len({a.day for a in acts})
    result["totals"] = {
        "sessions": len(acts), "hours": _r(total_min / 60), "distance_km": _r(total_km),
        "active_days": active_days, "sessions_per_week": _r(len(acts) / weeks),
        "minutes_per_week": round(total_min / weeks),
    }

    # ---- by sport ------------------------------------------------------------
    by: dict[str, list[Activity]] = defaultdict(list)
    for a in acts:
        by[a.type].append(a)
    result["by_sport"] = sorted(({
        "type": t, "sessions": len(v), "minutes": round(sum(a.duration_min for a in v)),
        "distance_km": _r(sum(a.distance_km or 0 for a in v)) or None,
        "avg_hr": _r(mean([a.avg_hr for a in v if a.avg_hr]), 0) if any(a.avg_hr for a in v) else None,
        "share_pct": round(100 * sum(a.duration_min for a in v) / total_min),
    } for t, v in by.items()), key=lambda x: -x["minutes"])

    # ---- weeks (Monday-based) ---------------------------------------------------
    first_monday = start - timedelta(days=start.weekday())
    weekly = []
    wk = first_monday
    while wk <= end:
        in_week = [a for a in acts if wk <= a.day <= wk + timedelta(days=6)]
        by_type: dict[str, int] = defaultdict(int)
        for a in in_week:
            by_type[a.type] += round(a.duration_min)
        easy = None
        if max_hr and any(a.hr_samples or a.avg_hr for a in in_week):
            zm = _zone_minutes(in_week, max_hr)
            easy = round(100 * (zm[1] + zm[2]) / (sum(zm.values()) or 1))
        weekly.append({"week_start": wk.isoformat(), "minutes": round(sum(a.duration_min for a in in_week)),
                       "sessions": len(in_week), "distance_km": _r(sum(a.distance_km or 0 for a in in_week)),
                       "by_type": dict(by_type), "easy_pct": easy,
                       "partial": wk < start or wk + timedelta(days=6) > end})
        wk += timedelta(weeks=1)
    result["weekly"] = weekly

    # ---- load: last 7 days vs the 4 weeks before ---------------------------------
    last7 = sum(a.duration_min for a in activities if end - timedelta(days=6) <= a.day <= end)
    prior = [a for a in activities if end - timedelta(days=34) <= a.day <= end - timedelta(days=7)]
    prior_avg = sum(a.duration_min for a in prior) / 4 if prior else None
    full = [w for w in weekly if not w["partial"]]
    # A spike = clearly more than the most you did in any of the 3 weeks before.
    # Coming back to normal after an easy or sick week is not a spike.
    jump, jump_week = None, None
    for i in range(1, len(full)):
        ref = max(w["minutes"] for w in full[max(0, i - 3):i])
        if ref >= 60:
            pct = round(100 * (full[i]["minutes"] - ref) / ref)
            if jump is None or pct > jump:
                jump, jump_week = pct, full[i]["week_start"]
    result["load"] = {
        "last_7_days_min": round(last7),
        "prior_4_week_avg_min": round(prior_avg) if prior_avg is not None else None,
        "ratio": _r(last7 / prior_avg, 2) if prior_avg else None,
        "largest_week_increase_pct": jump, "largest_week_increase_week": jump_week,
    }

    # ---- intensity ---------------------------------------------------------------
    if max_hr and result["data"]["with_heart_rate"]:
        zm = _zone_minutes(acts, max_hr)
        tot = sum(zm.values()) or 1
        pct = {z: round(100 * m / tot) for z, m in zm.items()}
        result["intensity"] = {
            "zone_minutes": {str(z): round(m) for z, m in zm.items()},
            "zone_pct": {str(z): p for z, p in pct.items()},
            "easy_pct": pct[1] + pct[2], "moderate_pct": pct[3], "hard_pct": pct[4] + pct[5],
        }
    else:
        result["intensity"] = None

    # ---- running -------------------------------------------------------------------
    runs = [a for a in acts if a.type == "run" and a.distance_km]
    if runs:
        longest = max(runs, key=lambda a: a.distance_km or 0)
        five_plus = [a for a in runs if (a.distance_km or 0) >= 5]
        fastest = min(five_plus, key=lambda a: a.pace_min_per_km or 99) if five_plus else None
        eff = None
        with_hr = [a for a in runs if a.avg_hr]
        if len(with_hr) >= 6:   # meters per heartbeat: higher = fitter at the same effort
            k = len(with_hr) // 3

            def mpb(xs):
                return mean((a.distance_km * 1000) / (a.duration_min * a.avg_hr) for a in xs)
            eff = round(100 * (mpb(with_hr[-k:]) - mpb(with_hr[:k])) / mpb(with_hr[:k]), 1)
        result["running"] = {
            "runs": len(runs), "km": _r(sum(a.distance_km for a in runs)),
            "km_per_week": _r(sum(a.distance_km for a in runs) / weeks),
            "avg_pace": _pace(sum(a.duration_min for a in runs) / sum(a.distance_km for a in runs)),
            "longest_run_km": _r(longest.distance_km, 2), "longest_run_date": longest.day.isoformat(),
            "fastest_pace_5k_plus": _pace(fastest.pace_min_per_km) if fastest else None,
            "fastest_run_date": fastest.day.isoformat() if fastest else None,
            "fastest_run_km": _r(fastest.distance_km, 2) if fastest else None,
            "efficiency_change_pct": eff,
        }
    else:
        result["running"] = None

    strength = by.get("strength", [])
    result["strength"] = {"sessions": len(strength), "per_week": _r(len(strength) / weeks)}

    # ---- consistency ---------------------------------------------------------------
    day_list = sorted({a.day for a in acts})
    gaps = [(b - a).days - 1 for a, b in zip(day_list, day_list[1:], strict=False)]
    result["consistency"] = {
        "longest_gap_days": max(gaps, default=0),
        "weeks_with_3_plus_sessions": sum(1 for w in full if w["sessions"] >= 3),
        "full_weeks": len(full),
    }

    # ---- recovery -------------------------------------------------------------------
    if rec:
        sleep = [r.sleep_hours for r in rec if r.sleep_hours]
        rhr = [(r.day, r.resting_hr) for r in rec if r.resting_hr]
        hrv = [(r.day, r.hrv_ms) for r in rec if r.hrv_ms]

        def change(series, pct=False):
            if len(series) < 14:
                return None
            a, b = mean(v for _, v in series[:7]), mean(v for _, v in series[-7:])
            return round(100 * (b - a) / a, 1) if pct else round(b - a, 1)
        result["recovery"] = {
            "avg_sleep_hours": _r(mean(sleep)) if sleep else None,
            "nights_under_6h": sum(1 for s in sleep if s < 6),
            "nights_with_sleep_data": len(sleep),
            "resting_hr_avg": _r(mean(v for _, v in rhr)) if rhr else None,
            "resting_hr_change_bpm": change(rhr),   # last 7 days vs first 7 days of the period
            "hrv_avg_ms": _r(mean(v for _, v in hrv)) if hrv else None,
            "hrv_change_pct": change(hrv, pct=True),
        }
    else:
        result["recovery"] = None

    # ---- highlights ----------------------------------------------------------------
    hl = [{"what": "longest workout", "date": max(acts, key=lambda a: a.duration_min).day.isoformat(),
           "type": max(acts, key=lambda a: a.duration_min).type,
           "minutes": round(max(a.duration_min for a in acts))}]
    if runs:
        hl.append({"what": "longest run", "date": longest.day.isoformat(), "km": _r(longest.distance_km, 2)})
    result["highlights"] = hl

    result["flags"] = _flags(result)
    return result


def _flags(r: dict) -> list[dict]:
    """Rule-based warnings and positives. Thresholds are deliberately simple and
    explainable; the model words them, it doesn't invent new ones."""
    f = []
    load, inten, rec = r["load"], r["intensity"], r["recovery"]
    endurance_share = sum(s["share_pct"] for s in r["by_sport"] if s["type"] in ENDURANCE)
    if load["largest_week_increase_pct"] is not None and load["largest_week_increase_pct"] > 30:
        f.append({"code": "volume_spike", "text": f"The week of {load['largest_week_increase_week']} was "
                  f"{load['largest_week_increase_pct']}% above your biggest week in the 3 weeks before "
                  "(big jumps raise injury risk)."})
    if load["ratio"] is not None and load["ratio"] > 1.3:
        f.append({"code": "load_high", "text": "The last 7 days were much harder than the 4 weeks before."})
    if load["ratio"] is not None and load["ratio"] < 0.6:
        f.append({"code": "load_low", "text": "The last 7 days were much lighter than the 4 weeks before "
                  "(a planned easy week, a taper, or a break)."})
    if inten and endurance_share >= 50:
        if inten["easy_pct"] < 65 and inten["moderate_pct"] + inten["hard_pct"] > 35:
            f.append({"code": "too_little_easy", "text": f"Only {inten['easy_pct']}% of training time was easy "
                      "(Zone 1-2); endurance athletes usually do about 75-80% easy."})
        elif inten["easy_pct"] >= 75:
            f.append({"code": "good_easy_share", "text": f"{inten['easy_pct']}% of training time was easy: "
                      "a good aerobic base."})
        # One week much harder than usual (e.g. easy runs done too fast)
        weeks = [w for w in r["weekly"] if not w["partial"] and w.get("easy_pct") is not None and w["minutes"] >= 60]
        worst = min(weeks, key=lambda w: w["easy_pct"], default=None)
        if worst and inten["easy_pct"] - worst["easy_pct"] >= 15:
            f.append({"code": "hard_week", "text": f"In the week of {worst['week_start']} only {worst['easy_pct']}% "
                      f"of training was easy (usually {inten['easy_pct']}%): easy sessions were probably too fast."})
    if r["running"] and r["running"]["runs"] >= 6 and r["strength"]["sessions"] == 0:
        f.append({"code": "no_strength", "text": "No strength training logged alongside the running."})
    if r["consistency"]["longest_gap_days"] >= 10:
        f.append({"code": "long_gap", "text": f"A {r['consistency']['longest_gap_days']}-day break without workouts."})
    if r["running"] and r["running"]["efficiency_change_pct"] is not None:
        e = r["running"]["efficiency_change_pct"]
        if e >= 3:
            f.append({"code": "fitter", "text": f"Running economy improved {e}%: more distance per heartbeat."})
        elif e <= -5:
            f.append({"code": "less_efficient", "text": f"Running economy dropped {abs(e)}% (fatigue, heat or illness?)."})
    if rec:
        if rec["avg_sleep_hours"] is not None and rec["avg_sleep_hours"] < 7:
            f.append({"code": "short_sleep", "text": f"Average sleep {rec['avg_sleep_hours']} h (under 7 h)."})
        if rec["nights_under_6h"] >= 3:
            f.append({"code": "short_nights", "text": f"{rec['nights_under_6h']} nights under 6 hours."})
        if rec["resting_hr_change_bpm"] is not None and rec["resting_hr_change_bpm"] >= 3:
            f.append({"code": "resting_hr_up", "text": f"Resting heart rate is {rec['resting_hr_change_bpm']} bpm "
                      "higher than at the start of the period (fatigue, stress or illness?)."})
        if rec["hrv_change_pct"] is not None and rec["hrv_change_pct"] <= -10:
            f.append({"code": "hrv_down", "text": f"HRV is {abs(rec['hrv_change_pct'])}% lower than at the start."})
    d = r["data"]
    if d["activities"] and d["with_heart_rate"] / d["activities"] < 0.5:
        f.append({"code": "little_hr", "text": "Most workouts have no heart-rate data, so intensity is uncertain."})
    if d["max_hr_used"] is None:
        f.append({"code": "max_hr_unknown", "text": "Heart-rate zones need your age or max heart rate "
                  "(Profile page), so intensity isn't analyzed."})
    elif d["max_hr_source"] != "profile":
        f.append({"code": "max_hr_estimated", "text": f"Zones use a max heart rate from {d['max_hr_source']}; "
                  "setting your real max HR in Profile makes them accurate."})
    return f
