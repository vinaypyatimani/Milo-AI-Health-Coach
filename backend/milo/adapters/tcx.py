"""TCX files (Garmin Training Center XML; exported by Garmin, Polar, Wahoo, ...)."""
from __future__ import annotations

import xml.etree.ElementTree as ET
from datetime import datetime
from pathlib import Path

from ..schemas import Activity, HRSample
from .base import AdapterError, ImportResult, normalize_type, to_local


def _local(tag: str) -> str:
    return tag.split("}")[-1]


def _find(el, name):
    return next((c for c in el.iter() if _local(c.tag) == name), None)


def _children(el, name):
    return [c for c in el if _local(c.tag) == name]


def _time(text: str) -> datetime:
    return datetime.fromisoformat(text.strip().replace("Z", "+00:00"))


def parse(path: Path) -> ImportResult:
    try:
        root = ET.parse(path).getroot()
    except ET.ParseError as e:
        raise AdapterError(f"Could not read TCX file: {e}") from e

    result = ImportResult()
    for act in (c for c in root.iter() if _local(c.tag) == "Activity"):
        laps = _children(act, "Lap")
        if not laps:
            continue
        duration_s = distance_m = 0.0
        samples: list[HRSample] = []
        for lap in laps:
            t = _find(lap, "TotalTimeSeconds")
            d = _find(lap, "DistanceMeters")
            duration_s += float(t.text) if t is not None and t.text else 0
            distance_m += float(d.text) if d is not None and d.text else 0
            for tp in (c for c in lap.iter() if _local(c.tag) == "Trackpoint"):
                tt, hr = _find(tp, "Time"), _find(tp, "HeartRateBpm")
                val = _find(hr, "Value") if hr is not None else None
                if tt is not None and val is not None and val.text:
                    samples.append(HRSample(time=to_local(_time(tt.text)), bpm=int(float(val.text))))
        start_attr = laps[0].get("StartTime")
        id_el = _find(act, "Id")
        start_text = start_attr or (id_el.text if id_el is not None else None)
        if not start_text:
            result.warnings.append(f"Skipped an activity in {path.name} without a start time.")
            continue
        bpms = [s.bpm for s in samples]
        kind = normalize_type(act.get("Sport", ""))
        if kind == "other":
            # TCX only knows Running, Biking and Other, so devices save gym
            # workouts as "Other"; the activity's notes often say what it was.
            notes = _find(act, "Notes")
            if notes is not None and notes.text:
                kind = normalize_type(notes.text)
        result.activities.append(Activity(
            source="tcx",
            type=kind,
            start_time=to_local(_time(start_text)),
            duration_min=duration_s / 60,
            distance_km=distance_m / 1000 if distance_m else None,
            avg_hr=sum(bpms) / len(bpms) if bpms else None,
            max_hr=max(bpms) if bpms else None,
            hr_samples=samples,
        ))
    if not result.activities:
        raise AdapterError(f"No activities found in {path.name}.")
    return result
