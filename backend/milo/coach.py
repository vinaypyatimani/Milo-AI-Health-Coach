"""Milo's conversation logic for both modes.

Each stored message looks like:
    {"role": "user" | "assistant", "content": str,
     "hidden": bool,            # trigger messages the UI doesn't show
     "safety": [...],           # safety flags found in a user message
     "raw": str,                # the model's full reply, including plan JSON
     "plan_saved": bool}        # assistant message that created/updated the plan
"""
from __future__ import annotations

import json
import os
from datetime import date, timedelta
from pathlib import Path

from . import llm, safety
from .metrics import compute_week_metrics, progress_overview
from .plan_parser import parse_plan, strip_plan_block
from .schemas import TrainingPlan, UserProfile
from .storage import Storage

PROMPT_DIR = Path(__file__).parent / "prompts"


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
    if obj is None:
        return "null"
    if hasattr(obj, "model_dump_json"):
        return obj.model_dump_json(indent=2)
    return json.dumps(obj, indent=2, default=str)


class Coach:
    def __init__(self, store: Storage):
        self.store = store

    # ---- shared -----------------------------------------------------------
    def _system_prompt(self, mode: str, metrics: dict | None) -> str:
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

    def _turn(self, key: str, mode: str, text: str, metrics: dict | None,
              hidden: bool = False, plan_reason: str = "") -> dict:
        conv = self.store.get_conversation(key)
        flags = safety.check(text) if not hidden else []
        conv.append({"role": "user", "content": text, "hidden": hidden,
                     "safety": [f.__dict__ for f in flags]})

        system = self._system_prompt(mode, metrics)
        raw = llm.chat(self._llm_messages(system, conv))
        plan, error = parse_plan(raw)

        if error:  # one repair attempt: show the model its mistake
            repair = self._llm_messages(system, conv) + [
                {"role": "assistant", "content": raw},
                {"role": "user", "content": f"[SYSTEM: {error}. Output the complete corrected "
                                            "plan JSON in a ```json block, nothing else.]"},
            ]
            fixed = llm.chat(repair, temperature=0)
            plan, error = parse_plan(fixed)
            if plan:
                raw = strip_plan_block(raw) + "\n\n```json\n" + plan.model_dump_json(indent=2) + "\n```"

        plan_saved = False
        if plan and not safety.is_urgent(flags):
            self.store.save_plan(plan, reason=plan_reason)
            plan_saved = True

        display = strip_plan_block(raw) if plan or error else raw
        msg = {"role": "assistant", "content": display, "raw": raw, "plan_saved": plan_saved}
        conv.append(msg)
        self.store.save_conversation(key, conv)
        return {
            "reply": display,
            "plan_saved": plan_saved,
            "plan_error": error,
            "safety": [f.__dict__ for f in flags],
            "urgent_banner": safety.URGENT_BANNER if safety.is_urgent(flags) else None,
        }

    @staticmethod
    def public_conversation(conv: list[dict]) -> list[dict]:
        return [{"role": m["role"], "content": m["content"],
                 "plan_saved": m.get("plan_saved", False),
                 "safety": m.get("safety", [])}
                for m in conv if not m.get("hidden")]

    # ---- Coaching Mode ------------------------------------------------------
    def coaching_conversation(self) -> list[dict]:
        return self.public_conversation(self.store.get_conversation("coaching"))

    def coaching_start(self) -> dict:
        self.store.delete_conversation("coaching")
        return self._turn("coaching", "coaching",
                          "Hi Milo, I'd like to start a new training plan.", None,
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