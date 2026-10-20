"""Tracker adapters. Every adapter turns a source format into Milo's common
`Activity` / `RecoveryDay` format, so the rest of the app is device-agnostic."""
from __future__ import annotations

from pathlib import Path
from typing import Callable

from . import csv_generic, fit, gpx, tcx
from .base import AdapterError, ImportResult

_BY_EXTENSION: dict[str, Callable[[Path], ImportResult]] = {
    ".gpx": gpx.parse,
    ".tcx": tcx.parse,
    ".fit": fit.parse,
    ".csv": csv_generic.parse,
    # Add later: ".zip" and ".xml" -> apple_health.parse
}

SUPPORTED_EXTENSIONS = sorted(_BY_EXTENSION)


def parse_file(path: Path, original_name: str | None = None) -> ImportResult:
    name = (original_name or path.name).lower()
    ext = Path(name).suffix
    if ext not in _BY_EXTENSION:
        raise AdapterError(
            f"Unsupported file type '{ext}'. Supported: {', '.join(SUPPORTED_EXTENSIONS)}")
    return _BY_EXTENSION[ext](path)


__all__ = ["parse_file", "AdapterError", "ImportResult", "SUPPORTED_EXTENSIONS"]