"""Milo API (FastAPI).

Run locally:  uvicorn main:app --reload        (from the backend/ folder)
API docs:     http://localhost:8000/docs
"""
from __future__ import annotations

import json
import queue
import shutil
import tempfile
import threading
from datetime import date, datetime
from pathlib import Path
from typing import Literal, Optional

from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse, Response, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from milo import config
from milo.adapters import SUPPORTED_EXTENSIONS, AdapterError, parse_file
from milo.coach import Coach, today
from milo.exports import plan_to_pdf, plan_to_xlsx
from milo.llm import LLMError
from milo.schemas import Activity, RecoveryDay, SessionType, UserProfile
from milo.storage import Storage
from milo.videos import find_videos

app = FastAPI(title="Milo API", version="1.0.0",
              description="AI fitness coach: plan in Coaching Mode, review in Check-in Mode.")
app.add_middleware(CORSMiddleware, allow_origins=config.CORS_ORIGINS,
                   allow_methods=["*"], allow_headers=["*"])

store = Storage()
coach = Coach(store)

# LiteLLM takes several seconds to import. Loading it in the background at
# startup means the first chat message doesn't have to wait for it.
if config.WARMUP:
    threading.Thread(target=lambda: __import__("litellm"), daemon=True).start()

if config.SEED_DEMO and store.get_plan() is None:
    from scripts.seed_demo import seed  # noqa: E402

    seed(store)


# ---- request bodies ----------------------------------------------------------
class MessageIn(BaseModel):
    text: str = Field(min_length=1, max_length=4000)


class ChatIn(BaseModel):
    mode: Literal["coaching", "checkin"]
    week: Optional[int] = Field(default=None, ge=1)
    text: Optional[str] = Field(default=None, max_length=4000)  # None = start a new conversation


class ManualActivityIn(BaseModel):
    date: date
    time: str = "12:00"
    type: SessionType
    duration_min: float = Field(gt=0, le=1440)
    distance_km: Optional[float] = Field(default=None, ge=0)
    avg_hr: Optional[float] = Field(default=None, gt=20, lt=250)
    notes: str = ""


class RecoveryIn(BaseModel):
    date: date
    sleep_hours: Optional[float] = Field(default=None, ge=0, le=24)
    resting_hr: Optional[float] = Field(default=None, gt=20, lt=150)
    hrv_ms: Optional[float] = Field(default=None, gt=0, lt=400)


def _llm_guard(fn, *args):
    try:
        return fn(*args)
    except LLMError as e:
        raise HTTPException(502, f"The AI model could not be reached: {e}") from e
    except LookupError as e:
        raise HTTPException(409, str(e)) from e
    except ValueError as e:
        raise HTTPException(400, str(e)) from e


# ---- status & profile -----------------------------------------------------------
@app.get("/api/health")
def health():
    return {"ok": True, "model": config.MILO_MODEL, "today": today().isoformat()}


@app.get("/api/profile")
def get_profile():
    return store.get_profile()


@app.put("/api/profile")
def put_profile(profile: UserProfile):
    store.save_profile(profile)
    return profile


# ---- plan --------------------------------------------------------------------------
@app.get("/api/plan")
def get_plan():
    plan = store.get_plan()
    return {"plan": plan, "current_week": coach.current_week(),
            "history": store.plan_history()}


@app.get("/api/plan/export.{fmt}")
def export_plan(fmt: Literal["pdf", "xlsx"]):
    """Download the plan: PDF to read or print, Excel to track offline."""
    plan = store.get_plan()
    if plan is None:
        raise HTTPException(404, "No plan to download yet.")
    profile = store.get_profile()
    if fmt == "pdf":
        data, media = plan_to_pdf(plan, profile), "application/pdf"
    else:
        data = plan_to_xlsx(plan, profile)
        media = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    name = f"milo-plan-{plan.start_date.isoformat()}.{fmt}"
    return Response(data, media_type=media, headers={"Content-Disposition": f'attachment; filename="{name}"'})


@app.delete("/api/plan")
def clear_plan():
    """Start over: removes every plan version and all conversations.
    Profile and tracker data are kept."""
    coach.clear_plan()
    return {"ok": True}


@app.delete("/api/conversations/{mode}")
def clear_conversation(mode: Literal["coaching", "checkin"], week: Optional[int] = None):
    if mode == "checkin" and week is None:
        raise HTTPException(400, "A check-in conversation needs ?week=")
    coach.clear_conversation(mode, week)
    return {"ok": True}


# ---- Coaching Mode -------------------------------------------------------------------
@app.get("/api/coaching")
def coaching_conversation():
    return coach.coaching_conversation()


@app.post("/api/coaching/start")
def coaching_start():
    return _llm_guard(coach.coaching_start)


@app.post("/api/coaching/message")
def coaching_message(body: MessageIn):
    return _llm_guard(coach.coaching_message, body.text)


# ---- Check-in Mode ---------------------------------------------------------------------
@app.get("/api/weeks/{week}/metrics")
def week_metrics(week: int):
    return _llm_guard(coach.week_metrics, week)


@app.get("/api/checkin/{week}")
def checkin_conversation(week: int):
    return coach.checkin_conversation(week)


@app.post("/api/checkin/{week}/start")
def checkin_start(week: int):
    return _llm_guard(coach.checkin_start, week)


@app.post("/api/checkin/{week}/message")
def checkin_message(week: int, body: MessageIn):
    return _llm_guard(coach.checkin_message, week, body.text)


# ---- streaming chat (both modes) ------------------------------------------------------
def _sse(event: dict) -> str:
    return f"event: {event['type']}\ndata: {json.dumps(event)}\n\n"


@app.post("/api/chat/stream")
def chat_stream(body: ChatIn):
    """Server-sent events: meta -> delta ... -> done (or error).

    The reply is generated in a background thread that always runs to the end,
    so the turn (and any plan change) is saved even if the browser disconnects
    halfway, for example when the page is reloaded."""
    if body.text is not None and not body.text.strip():
        raise HTTPException(400, "Message is empty.")
    events = _llm_guard(coach.stream, body.mode, body.week, body.text)
    q: queue.Queue = queue.Queue()

    def produce():
        try:
            for event in events:
                q.put(event)
        except LLMError as e:
            q.put({"type": "error", "detail": f"The AI model could not be reached: {e}"})
        except Exception as e:  # noqa: BLE001 - always end the stream with a readable error
            q.put({"type": "error", "detail": f"Something went wrong: {e}"})
        finally:
            q.put(None)  # end of stream

    threading.Thread(target=produce, daemon=True).start()

    def generate():
        while (event := q.get()) is not None:
            yield _sse(event)

    return StreamingResponse(generate(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


# ---- tracker data ------------------------------------------------------------------------
@app.get("/api/activities")
def list_activities():
    return [{"id": i, **a.model_dump(exclude={"hr_samples"}),
             "hr_samples": len(a.hr_samples)} for i, a in store.get_activities()]


def _remove_quietly(path: Path) -> None:
    """Delete a temporary upload. On Windows, another program (often the virus
    scanner) can briefly hold a new file; a leftover temp file is harmless."""
    try:
        path.unlink(missing_ok=True)
    except OSError:
        pass


@app.post("/api/activities/upload")
async def upload(files: list[UploadFile] = File(...)):
    report = []
    for f in files:
        suffix = Path(f.filename or "").suffix.lower()
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            shutil.copyfileobj(f.file, tmp)
            tmp_path = Path(tmp.name)
        try:
            if tmp_path.stat().st_size > config.MAX_UPLOAD_MB * 1024 * 1024:
                raise AdapterError(f"File is larger than {config.MAX_UPLOAD_MB} MB.")
            result = parse_file(tmp_path, f.filename)
            added = store.add_activities(result.activities)
            store.upsert_recovery(result.recovery)
            report.append({"file": f.filename, "ok": True, "activities_added": added,
                           "duplicates_skipped": len(result.activities) - added,
                           "recovery_days": len(result.recovery),
                           "warnings": result.warnings})
        except AdapterError as e:
            report.append({"file": f.filename, "ok": False, "error": str(e)})
        finally:
            _remove_quietly(tmp_path)
    return {"files": report, "supported": SUPPORTED_EXTENSIONS}


@app.post("/api/activities/manual")
def add_manual(body: ManualActivityIn):
    start = datetime.combine(body.date, datetime.strptime(body.time, "%H:%M").time())
    act = Activity(source="manual", type=body.type, start_time=start,
                   duration_min=body.duration_min, distance_km=body.distance_km,
                   avg_hr=body.avg_hr, notes=body.notes)
    if store.add_activities([act]) == 0:
        raise HTTPException(409, "This activity already exists.")
    return {"ok": True}


@app.delete("/api/activities/{activity_id}")
def delete_activity(activity_id: int):
    if not store.delete_activity(activity_id):
        raise HTTPException(404, "Activity not found")
    return {"ok": True}


@app.post("/api/recovery")
def add_recovery(body: RecoveryIn):
    store.upsert_recovery([RecoveryDay(day=body.date, sleep_hours=body.sleep_hours,
                                       resting_hr=body.resting_hr, hrv_ms=body.hrv_ms,
                                       source="manual")])
    return {"ok": True}


# ---- progress & privacy ----------------------------------------------------------------------
@app.get("/api/progress")
def progress():
    return _llm_guard(coach.progress)


@app.get("/api/videos")
def videos(q: str = Query(..., min_length=2, max_length=120)):
    """How-to videos for one exercise (cached). Falls back to a YouTube search link."""
    return find_videos(store, q)


@app.delete("/api/data")
def delete_all_data():
    """GDPR: permanently delete the profile, plans, tracker data and chats."""
    store.delete_all()
    return {"ok": True}


# ---- serve the built React app (single-service deployment) ---------------------------------------
_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if _DIST.exists():
    app.mount("/assets", StaticFiles(directory=_DIST / "assets"), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def spa(full_path: str):
        file = _DIST / full_path
        return FileResponse(file if file.is_file() else _DIST / "index.html")
else:
    # No frontend built yet: send visitors of the root URL to the API docs.
    @app.get("/", include_in_schema=False)
    def root():
        return RedirectResponse("/docs")
