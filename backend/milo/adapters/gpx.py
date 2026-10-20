"""GPX files (exported by Garmin, Polar, Suunto, Coros, Wahoo, Strava, ...)."""
from __future__ import annotations

from pathlib import Path

import gpxpy

from ..schemas import Activity, HRSample
from .base import AdapterError, ImportResult, normalize_type, to_local


def _hr_from_extensions(point) -> int | None:
    # Heart rate lives in a vendor extension, e.g. <gpxtpx:TrackPointExtension><gpxtpx:hr>
    for ext in point.extensions:
        for el in ext.iter():
            if el.tag.split("}")[-1].lower() in ("hr", "heartrate") and el.text:
                try:
                    return int(float(el.text))
                except ValueError:
                    return None
    return None


def parse(path: Path) -> ImportResult:
    try:
        with open(path, encoding="utf-8") as f:
            gpx = gpxpy.parse(f)
    except Exception as e:  # noqa: BLE001
        raise AdapterError(f"Could not read GPX file: {e}") from e

    result = ImportResult()
    for track in gpx.tracks:
        points = [p for seg in track.segments for p in seg.points if p.time]
        if len(points) < 2:
            result.warnings.append(f"Skipped a track in {path.name} without timestamps.")
            continue
        start, end = points[0].time, points[-1].time
        samples = []
        for p in points:
            hr = _hr_from_extensions(p)
            if hr:
                samples.append(HRSample(time=to_local(p.time), bpm=hr))
        bpms = [s.bpm for s in samples]
        result.activities.append(Activity(
            source="gpx",
            type=normalize_type(track.type or track.name or gpx.name or "run"),
            start_time=to_local(start),
            duration_min=(end - start).total_seconds() / 60,
            distance_km=track.length_2d() / 1000,
            avg_hr=sum(bpms) / len(bpms) if bpms else None,
            max_hr=max(bpms) if bpms else None,
            hr_samples=samples,
        ))
    if not result.activities:
        raise AdapterError(f"No activities with timestamps found in {path.name}.")
    return result