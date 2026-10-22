"""SQLite storage. Simple single-user design: one profile, one active plan.

For a multi-user deployment, add a user_id column to every table and an
auth layer in the API (see README, "Going multi-user").
"""
from __future__ import annotations

import json
import sqlite3
import threading
from contextlib import contextmanager
from datetime import date, datetime
from pathlib import Path
from typing import Iterator

from . import config
from .schemas import Activity, RecoveryDay, TrainingPlan, UserProfile

_SCHEMA = """
CREATE TABLE IF NOT EXISTS profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    data TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    data TEXT NOT NULL,
    reason TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    start_time TEXT NOT NULL,
    data TEXT NOT NULL,
    fingerprint TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS recovery (
    day TEXT PRIMARY KEY,
    data TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS video_cache (
    query TEXT PRIMARY KEY,
    items TEXT NOT NULL,
    fetched_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS conversations (
    key TEXT PRIMARY KEY,          -- "coaching" or "checkin:<week>"
    messages TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
"""


class Storage:
    def __init__(self, path: Path | str | None = None):
        self.path = Path(path or config.DB_PATH)
        if str(self.path) != ":memory:":
            self.path.parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(str(self.path), check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        # One connection is shared by the server's worker threads. SQLite
        # connections aren't safe for parallel use, so every access takes this
        # lock (several video lookups at once used to fail with "API misuse").
        self._lock = threading.RLock()
        self._conn.executescript(_SCHEMA)

    @contextmanager
    def _tx(self) -> Iterator[sqlite3.Connection]:
        with self._lock, self._conn:
            yield self._conn

    def _one(self, sql: str, args: tuple | list = ()) -> sqlite3.Row | None:
        with self._lock:
            return self._conn.execute(sql, args).fetchone()

    def _all(self, sql: str, args: tuple | list = ()) -> list[sqlite3.Row]:
        with self._lock:
            return self._conn.execute(sql, args).fetchall()

    # ---- profile ---------------------------------------------------------
    def get_profile(self) -> UserProfile | None:
        row = self._one("SELECT data FROM profile WHERE id = 1")
        return UserProfile.model_validate_json(row["data"]) if row else None

    def save_profile(self, profile: UserProfile) -> None:
        with self._tx() as c:
            c.execute("INSERT OR REPLACE INTO profile (id, data) VALUES (1, ?)",
                      (profile.model_dump_json(),))

    # ---- plans (every version is kept, latest is active) -----------------
    def save_plan(self, plan: TrainingPlan, reason: str = "") -> int:
        with self._tx() as c:
            cur = c.execute(
                "INSERT INTO plans (created_at, data, reason) VALUES (?, ?, ?)",
                (datetime.now().isoformat(timespec="seconds"), plan.model_dump_json(), reason),
            )
            return int(cur.lastrowid)

    def get_plan(self) -> TrainingPlan | None:
        row = self._one("SELECT data FROM plans ORDER BY id DESC LIMIT 1")
        return TrainingPlan.model_validate_json(row["data"]) if row else None

    def plan_history(self) -> list[dict]:
        return [dict(r) for r in self._all("SELECT id, created_at, reason FROM plans ORDER BY id DESC")]

    # ---- activities --------------------------------------------------------
    def add_activities(self, activities: list[Activity]) -> int:
        """Insert activities, skipping duplicates. Returns number added."""
        added = 0
        with self._tx() as c:
            for a in activities:
                fp = f"{a.type}|{a.start_time.isoformat(timespec='minutes')}|{round(a.duration_min)}"
                cur = c.execute(
                    "INSERT OR IGNORE INTO activities (start_time, data, fingerprint) VALUES (?, ?, ?)",
                    (a.start_time.isoformat(), a.model_dump_json(), fp),
                )
                added += cur.rowcount
        return added

    def get_activities(self, start: date | None = None, end: date | None = None
                       ) -> list[tuple[int, Activity]]:
        q, args = "SELECT id, data FROM activities", []
        if start and end:
            q += " WHERE substr(start_time, 1, 10) BETWEEN ? AND ?"
            args = [start.isoformat(), end.isoformat()]
        q += " ORDER BY start_time"
        return [(r["id"], Activity.model_validate_json(r["data"])) for r in self._all(q, args)]

    def delete_activity(self, activity_id: int) -> bool:
        with self._tx() as c:
            return c.execute("DELETE FROM activities WHERE id = ?", (activity_id,)).rowcount > 0

    # ---- recovery ----------------------------------------------------------
    def upsert_recovery(self, days: list[RecoveryDay]) -> int:
        with self._tx() as c:
            for d in days:
                existing = c.execute("SELECT data FROM recovery WHERE day = ?",
                                     (d.day.isoformat(),)).fetchone()
                if existing:  # merge: keep old values where the new one is missing
                    old = RecoveryDay.model_validate_json(existing["data"])
                    d = RecoveryDay(
                        day=d.day,
                        sleep_hours=d.sleep_hours if d.sleep_hours is not None else old.sleep_hours,
                        resting_hr=d.resting_hr if d.resting_hr is not None else old.resting_hr,
                        hrv_ms=d.hrv_ms if d.hrv_ms is not None else old.hrv_ms,
                        source=d.source or old.source,
                    )
                c.execute("INSERT OR REPLACE INTO recovery (day, data) VALUES (?, ?)",
                          (d.day.isoformat(), d.model_dump_json()))
        return len(days)

    def get_recovery(self, start: date, end: date) -> list[RecoveryDay]:
        rows = self._all("SELECT data FROM recovery WHERE day BETWEEN ? AND ? ORDER BY day",
                         (start.isoformat(), end.isoformat()))
        return [RecoveryDay.model_validate_json(r["data"]) for r in rows]

    # ---- conversations -------------------------------------------------------
    def get_conversation(self, key: str) -> list[dict]:
        row = self._one("SELECT messages FROM conversations WHERE key = ?", (key,))
        return json.loads(row["messages"]) if row else []

    def save_conversation(self, key: str, messages: list[dict]) -> None:
        with self._tx() as c:
            c.execute(
                "INSERT OR REPLACE INTO conversations (key, messages, updated_at) VALUES (?, ?, ?)",
                (key, json.dumps(messages), datetime.now().isoformat(timespec="seconds")),
            )

    def delete_conversation(self, key: str) -> None:
        with self._tx() as c:
            c.execute("DELETE FROM conversations WHERE key = ?", (key,))

    def delete_plans(self) -> None:
        with self._tx() as c:
            c.execute("DELETE FROM plans")

    def delete_conversations(self) -> None:
        with self._tx() as c:
            c.execute("DELETE FROM conversations")

    # ---- how-to video search results (saves the YouTube quota) ---------------
    def get_video_cache(self, query: str) -> list[dict] | None:
        row = self._one("SELECT items FROM video_cache WHERE query = ?", (query,))
        return json.loads(row["items"]) if row else None

    def save_video_cache(self, query: str, items: list[dict]) -> None:
        with self._tx() as c:
            c.execute("INSERT OR REPLACE INTO video_cache (query, items, fetched_at) VALUES (?, ?, ?)",
                      (query, json.dumps(items), datetime.now().isoformat(timespec="seconds")))

    # ---- GDPR: delete everything ---------------------------------------------
    def delete_all(self) -> None:
        with self._tx() as c:
            for table in ("profile", "plans", "activities", "recovery", "conversations", "video_cache"):
                c.execute(f"DELETE FROM {table}")
