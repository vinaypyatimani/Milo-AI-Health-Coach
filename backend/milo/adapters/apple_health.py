"""Apple Health export (Health app > profile > Export All Health Data).

Accepts the export.zip as downloaded, or the export.xml inside it. Reads:
- Workouts (type, duration, distance, average/max HR)
- Heart-rate samples during each workout (for time in zone)
- Resting heart rate, HRV (SDNN) and sleep, as daily recovery data

Exports can be very large, so the file is streamed and only the last
APPLE_HEALTH_LOOKBACK_DAYS days are read.
"""
from __future__ import annotations

import xml.etree.ElementTree as ET
import zipfile
from collections import defaultdict
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import IO

from .. import config
from ..schemas import Activity, HRSample, RecoveryDay
from .base import AdapterError, ImportResult, normalize_type, to_local

_HR = "HKQuantityTypeIdentifierHeartRate"
_RHR = "HKQuantityTypeIdentifierRestingHeartRate"
_HRV = "HKQuantityTypeIdentifierHeartRateVariabilitySDNN"
_SLEEP = "HKCategoryTypeIdentifierSleepAnalysis"
_DIST_TYPES = ("DistanceWalkingRunning", "DistanceCycling", "DistanceSwimming")


def _dt(text: str) -> datetime:
    # Apple format: "2026-10-12 07:01:00 +0200"
    return to_local(datetime.strptime(text, "%Y-%m-%d %H:%M:%S %z"))


def _open(path: Path) -> IO[bytes]:
    if zipfile.is_zipfile(path):
        z = zipfile.ZipFile(path)
        name = next((n for n in z.namelist()
                     if n.endswith("export.xml") and "cda" not in n.lower()), None)
        if not name:
            raise AdapterError("No export.xml found in the zip. Upload Apple Health's export.zip.")
        return z.open(name)
    return open(path, "rb")


def _to_km(value: float, unit: str) -> float:
    unit = (unit or "km").lower()
    return {"km": value, "m": value / 1000, "mi": value * 1.609344,
            "yd": value * 0.0009144}.get(unit, value)


def _to_min(value: float, unit: str) -> float:
    unit = (unit or "min").lower()
    return {"min": value, "s": value / 60, "h": value * 60, "hr": value * 60}.get(unit, value)


def parse(path: Path) -> ImportResult:
    since = datetime.now() - timedelta(days=config.APPLE_HEALTH_LOOKBACK_DAYS)
    workouts: list[dict] = []
    rhr: dict[date, list[float]] = defaultdict(list)
    hrv: dict[date, list[float]] = defaultdict(list)
    sleep: dict[date, float] = defaultdict(float)
    hr_records: list[tuple[datetime, int]] = []

    try:
        with _open(path) as f:
            for _, el in ET.iterparse(f, events=("end",)):
                tag = el.tag
                if tag == "Record":
                    rtype = el.get("type")
                    if rtype in (_HR, _RHR, _HRV, _SLEEP):
                        start = _dt(el.get("startDate"))
                        if start >= since:
                            if rtype == _HR:
                                hr_records.append((start, int(float(el.get("value")))))
                            elif rtype == _RHR:
                                rhr[start.date()].append(float(el.get("value")))
                            elif rtype == _HRV:
                                hrv[start.date()].append(float(el.get("value")))
                            elif "Asleep" in (el.get("value") or ""):
                                end = _dt(el.get("endDate"))
                                # Sleep counts toward the morning you wake up.
                                sleep[end.date()] += (end - start).total_seconds() / 3600
                    el.clear()
                elif tag == "Workout":
                    start = _dt(el.get("startDate"))
                    if start >= since:
                        w = {
                            "type": el.get("workoutActivityType", ""),
                            "start": start,
                            "end": _dt(el.get("endDate")),
                            "duration": _to_min(float(el.get("duration") or 0),
                                                el.get("durationUnit")),
                            "distance": (_to_km(float(el.get("totalDistance")),
                                                el.get("totalDistanceUnit"))
                                         if el.get("totalDistance") else None),
                            "avg_hr": None, "max_hr": None,
                        }
                        # Newer exports put distance and HR in WorkoutStatistics.
                        for st in el.iter("WorkoutStatistics"):
                            stype = st.get("type", "")
                            if w["distance"] is None and any(t in stype for t in _DIST_TYPES):
                                w["distance"] = _to_km(float(st.get("sum") or 0), st.get("unit"))
                            if stype == _HR:
                                w["avg_hr"] = float(st.get("average")) if st.get("average") else None
                                w["max_hr"] = float(st.get("maximum")) if st.get("maximum") else None
                        workouts.append(w)
                    el.clear()
    except AdapterError:
        raise
    except Exception as e:  # noqa: BLE001
        raise AdapterError(f"Could not read Apple Health export: {e}") from e

    result = ImportResult()
    hr_records.sort()
    for w in workouts:
        samples = [HRSample(time=t, bpm=b) for t, b in hr_records if w["start"] <= t <= w["end"]]
        bpms = [s.bpm for s in samples]
        result.activities.append(Activity(
            source="apple_health",
            type=normalize_type(w["type"].replace("HKWorkoutActivityType", "")),
            start_time=w["start"],
            duration_min=w["duration"] or (w["end"] - w["start"]).total_seconds() / 60,
            distance_km=w["distance"] or None,
            avg_hr=w["avg_hr"] or (sum(bpms) / len(bpms) if bpms else None),
            max_hr=w["max_hr"] or (max(bpms) if bpms else None),
            hr_samples=samples,
        ))

    for d in sorted(set(rhr) | set(hrv) | set(sleep)):
        result.recovery.append(RecoveryDay(
            day=d,
            resting_hr=round(sum(rhr[d]) / len(rhr[d]), 1) if rhr.get(d) else None,
            hrv_ms=round(sum(hrv[d]) / len(hrv[d]), 1) if hrv.get(d) else None,
            sleep_hours=round(sleep[d], 2) if sleep.get(d) else None,
            source="apple_health",
        ))

    if not result.activities and not result.recovery:
        raise AdapterError(
            f"No workouts or recovery data from the last "
            f"{config.APPLE_HEALTH_LOOKBACK_DAYS} days found in the export.")
    return result
