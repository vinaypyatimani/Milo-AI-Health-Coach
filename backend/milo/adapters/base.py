"""Common helpers for tracker adapters.

An adapter takes a file path and returns an `ImportResult` with activities
and/or recovery days in Milo's common format.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from zoneinfo import ZoneInfo

from .. import config
from ..schemas import Activity, RecoveryDay, SessionType

_LOCAL = ZoneInfo(config.TIMEZONE)


@dataclass
class ImportResult:
    activities: list[Activity] = field(default_factory=list)
    recovery: list[RecoveryDay] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


class AdapterError(ValueError):
    pass


def to_local(dt: datetime) -> datetime:
    """Convert an aware datetime to naive local time (naive input is kept)."""
    if dt.tzinfo is None:
        return dt
    return dt.astimezone(_LOCAL).replace(tzinfo=None)


_TYPE_WORDS: list[tuple[SessionType, tuple[str, ...]]] = [
    ("run", ("run", "jog", "trail")),
    ("cycling", ("cycl", "bik", "ride", "spin")),
    ("swim", ("swim",)),
    ("walk", ("walk", "hik")),
    ("strength", ("strength", "weight", "gym", "functional", "crossfit", "hiit")),
    ("mobility", ("yoga", "pilates", "stretch", "mobility", "flexibility")),
]


def normalize_type(raw: str | None) -> SessionType:
    """Map any device's activity name to Milo's session types."""
    s = (raw or "").lower()
    for t, words in _TYPE_WORDS:
        if any(w in s for w in words):
            return t
    return "other"