"""Polar AccessLink: connect a Polar account and import workouts and sleep.

Why only Polar? Garmin has paused new developer applications, and Strava's
API policy (June 2026) forbids putting Strava data into an AI model's
context. Polar's AccessLink is free and open; its licence requires the
user's explicit permission before data goes to another service (here: the
AI model) and a privacy policy that says so. The consent checkbox in the
UI covers the first part; the README reminds you of the second.

Setup: create a client at https://admin.polaraccesslink.com with the
callback URL {PUBLIC_URL}/api/connect/polar/callback, then set
POLAR_CLIENT_ID, POLAR_CLIENT_SECRET and PUBLIC_URL.
"""
from __future__ import annotations

import base64
import json
import secrets
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, datetime
from pathlib import Path
from typing import Callable

from .. import config
from ..adapters import AdapterError, parse_file
from ..schemas import RecoveryDay

AUTH_URL = "https://flow.polar.com/oauth2/authorization"
TOKEN_URL = "https://polarremote.com/v2/oauth2/token"
API = "https://www.polaraccesslink.com/v3"
PROVIDER = "polar"
SCOPE = "analysis"   # Polar is connected on the Analyze page, so its data goes there


class PolarError(Exception):
    pass


def _http(method: str, url: str, headers: dict, data: bytes | None = None) -> tuple[int, bytes]:
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:  # noqa: S310 (fixed https URLs)
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()


# Tests replace this to avoid the network.
http: Callable[[str, str, dict, bytes | None], tuple[int, bytes]] = _http


def available() -> bool:
    return bool(config.POLAR_CLIENT_ID and config.POLAR_CLIENT_SECRET)


# ---- OAuth -------------------------------------------------------------------
_states: dict[str, float] = {}   # CSRF protection: state -> created


def auth_url(redirect_uri: str) -> str:
    state = secrets.token_urlsafe(16)
    now = time.time()
    for s, t in list(_states.items()):
        if now - t > 600:
            _states.pop(s, None)
    _states[state] = now
    return AUTH_URL + "?" + urllib.parse.urlencode({
        "response_type": "code", "client_id": config.POLAR_CLIENT_ID, "redirect_uri": redirect_uri,
        "scope": "accesslink.read_all", "state": state,
    })


def check_state(state: str) -> bool:
    return _states.pop(state, None) is not None


def exchange_code(code: str, redirect_uri: str) -> dict:
    basic = base64.b64encode(f"{config.POLAR_CLIENT_ID}:{config.POLAR_CLIENT_SECRET}".encode()).decode()
    status, body = http("POST", TOKEN_URL, {
        "Authorization": f"Basic {basic}", "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
    }, urllib.parse.urlencode({"grant_type": "authorization_code", "code": code,
                               "redirect_uri": redirect_uri}).encode())
    if status != 200:
        raise PolarError(f"Polar refused the sign-in (HTTP {status}).")
    token = json.loads(body)
    _register(token["access_token"], str(token["x_user_id"]))
    return {"access_token": token["access_token"], "user_id": str(token["x_user_id"]),
            "connected_at": datetime.now().isoformat(timespec="seconds"), "imported": [], "last_sync": None}


def _auth(token: str, accept: str = "application/json") -> dict:
    return {"Authorization": f"Bearer {token}", "Accept": accept}


def _register(token: str, user_id: str) -> None:
    status, _ = http("POST", f"{API}/users", {**_auth(token), "Content-Type": "application/json"},
                     json.dumps({"member-id": f"milo-{user_id}"}).encode())
    if status == 403:
        raise PolarError("Accept Polar's data-sharing consents in Polar Flow (account.polar.com), then try again.")
    if status not in (200, 204, 409):   # 409 = already registered: fine
        raise PolarError(f"Polar didn't register the account (HTTP {status}).")


def disconnect(conn: dict) -> None:
    """De-register at Polar (this also revokes the token). Errors are ignored:
    the local copy of the token is deleted either way."""
    try:
        http("DELETE", f"{API}/users/{conn['user_id']}", _auth(conn["access_token"]), None)
    except OSError:
        pass


# ---- sync --------------------------------------------------------------------
def _get_json(token: str, path: str):
    status, body = http("GET", f"{API}{path}", _auth(token), None)
    if status == 204 or not body:
        return None
    if status == 401:
        raise PolarError("The Polar connection expired. Disconnect and connect again.")
    if status != 200:
        raise PolarError(f"Polar returned HTTP {status} for {path}.")
    return json.loads(body)


def _list(data, *keys) -> list:
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        for k in keys:
            if isinstance(data.get(k), list):
                return data[k]
    return []


def _sleep_hours(n: dict) -> float | None:
    """Total sleep from the stage durations (seconds), else start/end time."""
    stages = [n.get(k) for k in ("light_sleep", "deep_sleep", "rem_sleep")]
    if any(isinstance(s, (int, float)) for s in stages):
        return round(sum(s for s in stages if isinstance(s, (int, float))) / 3600, 2)
    try:
        start = datetime.fromisoformat(str(n["sleep_start_time"]))
        end = datetime.fromisoformat(str(n["sleep_end_time"]))
        gap = n.get("total_interruption_duration") or 0
        return round(((end - start).total_seconds() - (gap if isinstance(gap, (int, float)) else 0)) / 3600, 2)
    except (KeyError, ValueError, TypeError):
        return None


def _recovery(sleep, recharge) -> list[RecoveryDay]:
    days: dict[date, dict] = {}
    for n in _list(sleep, "nights"):
        try:
            d = date.fromisoformat(str(n["date"])[:10])
        except (KeyError, ValueError):
            continue
        days.setdefault(d, {})["sleep_hours"] = _sleep_hours(n)
    for r in _list(recharge, "recharges"):
        try:
            d = date.fromisoformat(str(r["date"])[:10])
        except (KeyError, ValueError):
            continue
        # Overnight average heart rate is the closest thing Polar gives to resting HR.
        days.setdefault(d, {})["resting_hr"] = r.get("heart_rate_avg")
        days[d]["hrv_ms"] = r.get("heart_rate_variability_avg")
    return [RecoveryDay(day=d, source="polar", **{k: v for k, v in vals.items() if isinstance(v, (int, float))})
            for d, vals in sorted(days.items())]


def sync(store, conn: dict) -> dict:
    """Import new exercises (as FIT files, so they go through the same adapter
    as uploads) and the sleep / Nightly Recharge data Polar keeps (about 30 days)."""
    token = conn["access_token"]
    imported = set(conn.get("imported", []))
    report = {"new_workouts": 0, "skipped": 0, "recovery_days": 0, "warnings": []}
    for ex in _list(_get_json(token, "/exercises"), "exercises"):
        ex_id = str(ex.get("id", "")) if isinstance(ex, dict) else ""
        if not ex_id or ex_id in imported:
            continue
        status, body = http("GET", f"{API}/exercises/{ex_id}/fit", _auth(token, "*/*"), None)
        if status != 200 or not body:
            report["warnings"].append(f"Exercise {ex_id}: no FIT file (HTTP {status}).")
            continue
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / f"polar-{ex_id}.fit"
            path.write_bytes(body)
            try:
                result = parse_file(path)
            except AdapterError as e:
                report["warnings"].append(f"Exercise {ex_id}: {e}")
                continue
        added = store.add_activities(result.activities, scope=SCOPE)
        report["new_workouts"] += added
        report["skipped"] += len(result.activities) - added
        imported.add(ex_id)
    try:
        days = _recovery(_get_json(token, "/users/sleep"), _get_json(token, "/users/nightly-recharge"))
        if days:
            store.upsert_recovery(days, scope=SCOPE)
        report["recovery_days"] = len(days)
    except PolarError as e:  # sleep data is a bonus; workouts were imported anyway
        report["warnings"].append(f"Sleep data: {e}")
    conn.update(imported=sorted(imported), last_sync=datetime.now().isoformat(timespec="seconds"))
    store.save_connection(PROVIDER, conn)
    return report
