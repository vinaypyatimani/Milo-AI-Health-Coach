"""Heart-rate zones and pace targets.

Uses a simple 5-zone model based on % of max heart rate:
    Zone 1: 50-60%   very easy
    Zone 2: 60-70%   easy, conversational
    Zone 3: 70-80%   moderate
    Zone 4: 80-90%   hard
    Zone 5: 90-100%  maximum
"""
from __future__ import annotations

import re
from typing import Optional

from .schemas import Activity, TargetIntensity

ZONE_BOUNDS = {1: (0.50, 0.60), 2: (0.60, 0.70), 3: (0.70, 0.80), 4: (0.80, 0.90), 5: (0.90, 1.10)}
MAX_SAMPLE_GAP_S = 30  # longer gaps (pauses) are capped so they don't inflate zone time


def parse_zone_range(value: str) -> Optional[tuple[int, int]]:
    """'Zone 2' -> (2, 2); 'Zone 2-3' / 'Z2-Z3' -> (2, 3)."""
    nums = [int(n) for n in re.findall(r"[1-5]", value or "")]
    if not nums:
        return None
    lo, hi = min(nums[:2]), max(nums[:2])
    return lo, hi


def zone_bpm_range(zones: tuple[int, int], max_hr: int) -> tuple[float, float]:
    lo = ZONE_BOUNDS[zones[0]][0] * max_hr
    hi = ZONE_BOUNDS[zones[1]][1] * max_hr
    return lo, hi


def parse_pace_range(value: str) -> Optional[tuple[float, float]]:
    """'6:00-6:30 min/km' -> (6.0, 6.5) in minutes per km."""
    found = re.findall(r"(\d{1,2}):(\d{2})", value or "")
    if not found:
        return None
    paces = [int(m) + int(s) / 60 for m, s in found]
    return min(paces), max(paces)


def time_in_bpm_range(activity: Activity, lo: float, hi: float) -> Optional[tuple[float, float]]:
    """Return (minutes in range, minutes with HR data) from HR samples."""
    samples = sorted(activity.hr_samples, key=lambda s: s.time)
    if len(samples) < 2:
        return None
    in_range = total = 0.0
    for a, b in zip(samples, samples[1:], strict=False):  # each sample with the next one
        dt = min((b.time - a.time).total_seconds(), MAX_SAMPLE_GAP_S)
        if dt <= 0:
            continue
        total += dt
        if lo <= a.bpm <= hi:
            in_range += dt
    if total == 0:
        return None
    return in_range / 60, total / 60


def evaluate_intensity(activity: Activity, target: TargetIntensity,
                       max_hr: Optional[int]) -> dict:
    """Compare one activity with its target. Every value may be None if the
    data needed to compute it is not available."""
    result: dict = {
        "target": f"{target.kind}: {target.value}" if target.kind != "none" else None,
        "time_in_target_min": None,
        "pct_time_in_target": None,
        "avg_hr_in_target": None,
        "pace_in_target": None,
        "hr_data_min": None,
        "note": None,
    }
    if target.kind == "hr_zone":
        zones = parse_zone_range(target.value)
        if not zones:
            result["note"] = "target zone could not be read"
        elif not max_hr:
            result["note"] = "max heart rate unknown (add age or max HR to profile)"
        else:
            lo, hi = zone_bpm_range(zones, max_hr)
            tir = time_in_bpm_range(activity, lo, hi)
            if tir:
                minutes, total = tir
                result["time_in_target_min"] = round(minutes, 1)
                result["pct_time_in_target"] = round(100 * minutes / total)
                result["hr_data_min"] = round(total, 1)
            elif activity.avg_hr:
                result["avg_hr_in_target"] = lo <= activity.avg_hr <= hi
                result["note"] = "no detailed HR samples; judged on average HR only"
            else:
                result["note"] = "no heart-rate data recorded"
    elif target.kind == "pace":
        rng = parse_pace_range(target.value)
        pace = activity.pace_min_per_km
        if rng and pace:
            # 5 s/km tolerance either side
            result["pace_in_target"] = rng[0] - 0.08 <= pace <= rng[1] + 0.08
        else:
            result["note"] = "pace target or distance not available"
    return result


def format_pace(min_per_km: Optional[float]) -> Optional[str]:
    if not min_per_km:
        return None
    m = int(min_per_km)
    s = round((min_per_km - m) * 60)
    if s == 60:
        m, s = m + 1, 0
    return f"{m}:{s:02d} min/km"
