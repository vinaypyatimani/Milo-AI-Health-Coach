"""Tracker adapters. Every adapter turns a source format into Milo's common
`Activity` / `RecoveryDay` format, so the rest of the app is device-agnostic.

Supported today (file import, works with almost every device):
    .gpx  .tcx  .fit   - Garmin, Polar, Suunto, Coros, Wahoo, Strava exports, ...
    .zip / .xml        - Apple Health "Export All Health Data"
    .csv               - any other app (see csv_generic.py for columns)

To add a live API integration (e.g. Polar AccessLink, Withings, Oura, an
aggregator such as Terra), write a function that fetches the data and
returns an `ImportResult`, then call it from the API the same way.
"""
from __future__ import annotations

import zipfile
from pathlib import Path
from typing import Callable

from . import apple_health, csv_generic, fit, gpx, tcx
from .base import AdapterError, ImportResult

_BY_EXTENSION: dict[str, Callable[[Path], ImportResult]] = {
    ".gpx": gpx.parse,
    ".tcx": tcx.parse,
    ".fit": fit.parse,
    ".csv": csv_generic.parse,
    ".xml": apple_health.parse,
    ".zip": apple_health.parse,
}

SUPPORTED_EXTENSIONS = sorted(_BY_EXTENSION)


def parse_file(path: Path, original_name: str | None = None) -> ImportResult:
    name = (original_name or path.name).lower()
    ext = Path(name).suffix
    if ext == ".zip" and not zipfile.is_zipfile(path):
        raise AdapterError(f"{original_name} is not a valid zip file.")
    if ext not in _BY_EXTENSION:
        raise AdapterError(
            f"Unsupported file type '{ext}'. Supported: {', '.join(SUPPORTED_EXTENSIONS)}")
    return _BY_EXTENSION[ext](path)


__all__ = ["parse_file", "AdapterError", "ImportResult", "SUPPORTED_EXTENSIONS"]
