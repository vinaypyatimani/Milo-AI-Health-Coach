"""Generic CSV, for any tracker or app that can export a table.

Activities - required columns: date, type, duration_min
             optional: time (HH:MM), distance_km, avg_hr, max_hr, notes
Recovery   - required column: date, plus any of sleep_hours, resting_hr, hrv_ms

A file can contain both: rows with a `type` are activities, rows without
one are recovery days.
"""
from __future__ import annotations

import csv
from datetime import date, datetime
from pathlib import Path

from ..schemas import Activity, RecoveryDay
from .base import AdapterError, ImportResult, normalize_type


def _num(v: str | None) -> float | None:
    v = (v or "").strip().replace(",", ".")
    return float(v) if v else None


def parse(path: Path) -> ImportResult:
    result = ImportResult()
    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        if not reader.fieldnames or "date" not in [h.strip().lower() for h in reader.fieldnames]:
            raise AdapterError("CSV needs a 'date' column. See the README for the format.")
        for i, raw in enumerate(reader, start=2):
            row = {k.strip().lower(): (v or "").strip() for k, v in raw.items() if k}
            try:
                d = date.fromisoformat(row["date"])
                if row.get("type"):
                    t = row.get("time") or "12:00"
                    result.activities.append(Activity(
                        source="csv",
                        type=normalize_type(row["type"]),
                        start_time=datetime.combine(d, datetime.strptime(t, "%H:%M").time()),
                        duration_min=_num(row.get("duration_min")) or 0,
                        distance_km=_num(row.get("distance_km")),
                        avg_hr=_num(row.get("avg_hr")),
                        max_hr=_num(row.get("max_hr")),
                        notes=row.get("notes", ""),
                    ))
                elif any(row.get(k) for k in ("sleep_hours", "resting_hr", "hrv_ms")):
                    result.recovery.append(RecoveryDay(
                        day=d, sleep_hours=_num(row.get("sleep_hours")),
                        resting_hr=_num(row.get("resting_hr")),
                        hrv_ms=_num(row.get("hrv_ms")), source="csv"))
            except (ValueError, KeyError) as e:
                result.warnings.append(f"Row {i} skipped: {e}")
    if not result.activities and not result.recovery:
        raise AdapterError("No valid rows found in the CSV.")
    return result
