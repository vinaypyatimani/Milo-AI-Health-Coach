"""FIT files (the native format of Garmin, Coros, Wahoo, Suunto, Polar, ...)."""
from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

import fitdecode

from ..schemas import Activity, HRSample
from .base import AdapterError, ImportResult, normalize_type, to_local


def _aware(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)  # FIT times are UTC


def parse(path: Path) -> ImportResult:
    sessions: list[dict] = []
    records: list[tuple[datetime, int]] = []
    try:
        with fitdecode.FitReader(str(path)) as fit:
            for frame in fit:
                if not isinstance(frame, fitdecode.FitDataMessage):
                    continue
                if frame.name == "session":
                    sessions.append({f.name: f.value for f in frame.fields})
                elif frame.name == "record":
                    ts = frame.get_value("timestamp", fallback=None)
                    hr = frame.get_value("heart_rate", fallback=None)
                    if ts and hr:
                        records.append((_aware(ts), int(hr)))
    except Exception as e:  # noqa: BLE001
        raise AdapterError(f"Could not read FIT file: {e}") from e

    result = ImportResult()
    for s in sessions:
        start = s.get("start_time")
        seconds = s.get("total_timer_time") or s.get("total_elapsed_time")
        if not start or not seconds:
            continue
        start = _aware(start)
        end_ts = start.timestamp() + float(s.get("total_elapsed_time") or seconds)
        samples = [HRSample(time=to_local(t), bpm=b) for t, b in records
                   if start.timestamp() <= t.timestamp() <= end_ts]
        dist = s.get("total_distance")
        result.activities.append(Activity(
            source="fit",
            type=normalize_type(str(s.get("sport", ""))),
            start_time=to_local(start),
            duration_min=float(seconds) / 60,
            distance_km=float(dist) / 1000 if dist else None,
            avg_hr=s.get("avg_heart_rate"),
            max_hr=s.get("max_heart_rate"),
            hr_samples=samples,
        ))
    if not result.activities:
        raise AdapterError(f"No activity sessions found in {path.name}.")
    return result
