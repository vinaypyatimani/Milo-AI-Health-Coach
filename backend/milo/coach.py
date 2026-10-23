"""Milo's conversation logic for both modes.

Conversations are stored server-side. Each stored message looks like:
    {"role": "user" | "assistant", "content": str,
     "hidden": bool,            # trigger messages the UI doesn't show
     "safety": [...],           # safety flags found in a user message
     "plan_saved": bool}        # assistant message that created/updated the plan
"""
from __future__ import annotations

import json
import os
from datetime import date, timedelta
from pathlib import Path
from typing import Iterator

from . import llm, safety
from .analysis import analyze
from .metrics import compute_week_metrics, progress_overview
from .plan_parser import find_plan_block, parse_plan, strip_plan_block
from .pricing import add_usage
from .schemas import TrainingPlan, UserProfile
from .storage import Storage

PROMPT_DIR = Path(__file__).parent / "prompts"
COACHING_TRIGGER = "Hi Milo, I'd like to start a new training plan."
ANALYSIS_TRIGGER = "Please analyze my training and write my report."
ANALYSIS_DEFAULT_DAYS = 56


def today() -> date:
    """Today's date; MILO_TODAY can pin it (useful for demos and evaluation)."""
    pinned = os.getenv("MILO_TODAY")
    return date.fromisoformat(pinned) if pinned else date.today()


def render(template_name: str, **values: str) -> str:
    text = (PROMPT_DIR / template_name).read_text(encoding="utf-8")
    for key, value in values.items():
        text = text.replace("{{" + key + "}}", value)
    return text


def _json(obj) -> str:
    """Compact JSON for the prompt: no indentation means fewer tokens,
    which makes every reply faster and cheaper."""
    if obj is None:
        return "null"
    if hasattr(obj, "model_dump_json"):
        return obj.model_dump_json()
    return json.dumps(obj, separators=(",", ":"), default=str)


class Coach:
    def __init__(self, store: Storage):
        self.store = store

    # ---- shared -----------------------------------------------------------
    def _system_prompt(self, mode: str, metrics: dict | None) -> str:
        if mode == "analysis":
            return render("analysis_system.md",
                          today=f"{today().isoformat()} ({today().strftime('%A')})",
                          user_profile_json=_json(self.store.get_profile()),
                          analysis_json=_json(metrics))
        return render(
            "coach_system.md",
            mode=mode,
            today=f"{today().isoformat()} ({today().strftime('%A')})",
            user_profile_json=_json(self.store.get_profile()),
            plan_json=_json(self.store.get_plan()),
            weekly_metrics_json=_json(metrics),
        )

    @staticmethod
    def _llm_messages(system: str, conversation: list[dict]) -> list[dict]:
        msgs = [{"role": "system", "content": system}]
        for m in conversation:
            content = m["content"]
            if m["role"] == "user" and m.get("safety"):
                alert = safety.alert_message([safety.SafetyFlag(**f) for f in m["safety"]])
                content = f"{content}\n\n[{alert}]"
            if m["role"] == "assistant" and m.get("raw"):
                content = m["raw"]  # include the JSON plan the model actually wrote
            msgs.append({"role": m["role"], "content": content})
        return msgs

    def _turn_events(self, key: str, mode: str, text: str, metrics: dict | None,
                     hidden: bool = False, plan_reason: str = "", extra: dict | None = None) -> Iterator[dict]:
        """One conversation turn as a stream of events:
        meta (safety) -> delta (pieces of the reply) ... -> done (result)."""
        conv = self.store.get_conversation(key)
        flags = safety.check(text) if not hidden else []
        urgent = safety.is_urgent(flags)
        conv.append({"role": "user", "content": text, "hidden": hidden,
                     "safety": [f.__dict__ for f in flags], **(extra or {})})
        yield {"type": "meta", "safety": [f.__dict__ for f in flags],
               "urgent_banner": safety.URGENT_BANNER if urgent else None}

        system = self._system_prompt(mode, metrics)
        parts: list[str] = []
        usage: dict = {}
        for piece in llm.chat_stream(self._llm_messages(system, conv), usage=usage):
            parts.append(piece)
            yield {"type": "delta", "text": piece}
        raw = "".join(parts)
        # Analyze mode never changes the plan, even if the model writes JSON.
        plan, error = parse_plan(raw) if mode != "analysis" else (None, None)
        plan_source = raw  # the text the plan was read from

        if error:  # one repair attempt: show the model its mistake
            yield {"type": "status", "text": "Fixing the plan format…"}
            repair = self._llm_messages(system, conv) + [
                {"role": "assistant", "content": raw},
                {"role": "user", "content": f"[SYSTEM: {error}. Output the complete corrected "
                                            "plan JSON in a ```json block, nothing else.]"},
            ]
            repair_usage: dict = {}
            fixed = llm.chat(repair, temperature=0, usage=repair_usage)
            usage = add_usage(usage, repair_usage) or {}
            plan, error = parse_plan(fixed)
            plan_source = fixed
            if plan:
                raw = strip_plan_block(raw) + "\n\n```json\n" + plan.model_dump_json(indent=2) + "\n```"

        plan_saved = False
        if plan and not urgent:
            plan = self._keep_first_day(self._keep_nutrition(plan, plan_source))
            self.store.save_plan(plan, reason=plan_reason)
            plan_saved = True

        display = strip_plan_block(raw) if plan or error else raw
        msg = {"role": "assistant", "content": display, "raw": raw, "plan_saved": plan_saved,
               "usage": usage or None}
        conv.append(msg)
        self.store.save_conversation(key, conv)
        yield {
            "type": "done",
            "reply": display,
            "plan_saved": plan_saved,
            "plan_error": error,
            "safety": [f.__dict__ for f in flags],
            "urgent_banner": safety.URGENT_BANNER if urgent else None,
            "message": {"role": "assistant", "content": display,
                        "plan_saved": plan_saved, "safety": [], "usage": usage or None},
        }

    def _keep_nutrition(self, plan: TrainingPlan, raw: str) -> TrainingPlan:
        """If the model updated the training part but left out the "nutrition"
        key, keep the existing nutrition plan. An explicit null removes it."""
        if plan.nutrition is not None:
            return plan
        block = find_plan_block(raw)
        try:
            mentions_nutrition = block is not None and "nutrition" in json.loads(block)
        except json.JSONDecodeError:
            mentions_nutrition = False
        current = self.store.get_plan()
        if not mentions_nutrition and current and current.nutrition:
            plan = plan.model_copy(update={"nutrition": current.nutrition})
        return plan

    def _keep_first_day(self, plan: TrainingPlan) -> TrainingPlan:
        """An update of a "start today" plan that keeps the same start_date
        but forgets "first_day" would turn week 1's early days into misses."""
        current = self.store.get_plan()
        if (plan.first_day is None and current and current.first_day
                and current.start_date == plan.start_date):
            return plan.model_copy(update={"first_day": current.first_day})
        return plan

    def _turn(self, key: str, mode: str, text: str, metrics: dict | None,
              hidden: bool = False, plan_reason: str = "") -> dict:
        """The same turn without streaming: returns only the final result."""
        done: dict = {}
        for event in self._turn_events(key, mode, text, metrics, hidden, plan_reason):
            if event["type"] == "done":
                done = event
        return {k: done[k] for k in ("reply", "plan_saved", "plan_error", "safety", "urgent_banner")}

    def stream(self, mode: str, week: int | None = None, text: str | None = None,
               days: int | None = ANALYSIS_DEFAULT_DAYS) -> Iterator[dict]:
        """Streaming entry point for both modes. text=None starts a new conversation.

        Checks (plan exists, week is valid) run before the stream starts, so the
        API can answer with a normal error code instead of a broken stream."""
        if mode == "analysis":
            return self._analysis_stream(text, days)
        if mode == "coaching":
            if text is None:
                self.store.delete_conversation("coaching")
                return self._turn_events("coaching", "coaching", COACHING_TRIGGER, None,
                                         hidden=True, plan_reason="created in Coaching Mode")
            return self._turn_events("coaching", "coaching", text, None,
                                     plan_reason="updated in Coaching Mode")
        if week is None:
            raise ValueError("A check-in needs a week number.")
        key = f"checkin:{week}"
        metrics = self.week_metrics(week)
        if text is None:
            self.store.delete_conversation(key)
            return self._turn_events(key, "checkin", f"Let's do my check-in for week {week}.",
                                     metrics, hidden=True, plan_reason=f"check-in week {week}")
        return self._turn_events(key, "checkin", text, metrics,
                                 plan_reason=f"check-in week {week}")

    @staticmethod
    def public_conversation(conv: list[dict]) -> list[dict]:
        return [{"role": m["role"], "content": m["content"],
                 "plan_saved": m.get("plan_saved", False),
                 "safety": m.get("safety", []),
                 "usage": m.get("usage")}
                for m in conv if not m.get("hidden")]

    # ---- Analyze mode -----------------------------------------------------------
    def analysis(self, days: int | None = ANALYSIS_DEFAULT_DAYS) -> dict:
        """Report numbers from all tracker data; days=None means everything."""
        acts = [a for _, a in self.store.get_activities()]
        rec = self.store.get_recovery(date(1970, 1, 1), date(2999, 12, 31))
        return analyze(acts, rec, self.store.get_profile(), days, today())

    def _analysis_stream(self, text: str | None, days: int | None) -> Iterator[dict]:
        """A new report (text=None) computes the numbers once and stores them with
        the conversation, so follow-up questions use exactly the same numbers."""
        if text is None:
            stats = self.analysis(days)
            if not stats["data"]["activities"]:
                raise LookupError("No workouts to analyze yet. Upload some files first.")
            self.store.delete_conversation("analysis")
            return self._turn_events("analysis", "analysis", ANALYSIS_TRIGGER, stats, hidden=True,
                                     extra={"analysis": stats, "days": days})
        conv = self.store.get_conversation("analysis")
        stats = next((m["analysis"] for m in conv if m.get("analysis")), None) or self.analysis(days)
        return self._turn_events("analysis", "analysis", text, stats)

    def analysis_conversation(self) -> list[dict]:
        return self.public_conversation(self.store.get_conversation("analysis"))

    def analysis_report(self) -> tuple[dict, str] | None:
        """The numbers and Milo's written report from the latest analysis."""
        conv = self.store.get_conversation("analysis")
        stats = next((m["analysis"] for m in conv if m.get("analysis")), None)
        report = next((m["content"] for m in conv if m["role"] == "assistant"), None)
        return (stats, report) if stats and report else None

    # ---- starting over ---------------------------------------------------------
    def clear_conversation(self, mode: str, week: int | None = None) -> None:
        key = {"coaching": "coaching", "analysis": "analysis"}.get(mode, f"checkin:{week}")
        self.store.delete_conversation(key)

    def clear_plan(self) -> None:
        """Remove every plan version and all conversations (they refer to the plan).
        Profile and tracker data stay."""
        self.store.delete_plans()
        self.store.delete_conversations(keep=("analysis",))  # the analysis doesn't use the plan

    # ---- Coaching Mode ------------------------------------------------------
    def coaching_conversation(self) -> list[dict]:
        return self.public_conversation(self.store.get_conversation("coaching"))

    def coaching_start(self) -> dict:
        self.store.delete_conversation("coaching")
        return self._turn("coaching", "coaching", COACHING_TRIGGER, None,
                          hidden=True, plan_reason="created in Coaching Mode")

    def coaching_message(self, text: str) -> dict:
        return self._turn("coaching", "coaching", text, None,
                          plan_reason="updated in Coaching Mode")

    # ---- Check-in Mode --------------------------------------------------------
    def week_metrics(self, week_number: int) -> dict:
        plan = self._require_plan()
        start = plan.week_start(week_number)
        end = start + timedelta(days=6)
        acts = [a for _, a in self.store.get_activities(start, end)]
        rec = self.store.get_recovery(start, end)
        base = self.store.get_recovery(start - timedelta(days=21), start - timedelta(days=1))
        profile = self.store.get_profile() or UserProfile(name="")
        return compute_week_metrics(plan, week_number, acts, rec, base, profile.effective_max_hr())

    def checkin_conversation(self, week_number: int) -> list[dict]:
        return self.public_conversation(self.store.get_conversation(f"checkin:{week_number}"))

    def checkin_start(self, week_number: int) -> dict:
        key = f"checkin:{week_number}"
        self.store.delete_conversation(key)
        metrics = self.week_metrics(week_number)
        return self._turn(key, "checkin", f"Let's do my check-in for week {week_number}.",
                          metrics, hidden=True, plan_reason=f"check-in week {week_number}")

    def checkin_message(self, week_number: int, text: str) -> dict:
        metrics = self.week_metrics(week_number)
        return self._turn(f"checkin:{week_number}", "checkin", text, metrics,
                          plan_reason=f"check-in week {week_number}")

    # ---- Progress ------------------------------------------------------------
    def progress(self) -> list[dict]:
        plan = self._require_plan()
        acts = [a for _, a in self.store.get_activities()]
        rec_by_week = {}
        for w in plan.weeks:
            s = plan.week_start(w.week_number)
            rec_by_week[w.week_number] = self.store.get_recovery(s, s + timedelta(days=6))
        profile = self.store.get_profile() or UserProfile(name="")
        return progress_overview(plan, acts, rec_by_week, profile.effective_max_hr(), today())

    def current_week(self) -> int | None:
        plan = self.store.get_plan()
        if not plan:
            return None
        n = plan.week_for_date(today())
        return max(1, min(n, len(plan.weeks)))

    def _require_plan(self) -> TrainingPlan:
        plan = self.store.get_plan()
        if plan is None:
            raise LookupError("No training plan yet. Create one in Coaching Mode first.")
        return plan
