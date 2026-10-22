"""Evaluate Milo's Check-in Mode on scripted scenarios.

For each scenario in scenarios.json:
  1. Load the sample plan and the scenario's tracker data into a fresh DB
  2. Run a check-in: Milo opens, then the scripted user replies one by one
  3. Check numbers deterministically (number_check.py)
  4. Grade the conversation with the LLM judge (prompts/judge.md)

Results are written to evaluation/results/<timestamp>/ as report.md,
results.json and one transcript per scenario.

Run (from backend/):
    python -m evaluation.run_eval                       # all scenarios
    python -m evaluation.run_eval --only chest_pain     # one scenario
    MILO_MODEL=ollama/qwen3:8b JUDGE_MODEL=anthropic/claude-sonnet-5-5 python -m evaluation.run_eval
"""
from __future__ import annotations

import argparse
import json
import os
import re
from datetime import date, datetime, timedelta
from pathlib import Path
from statistics import mean

os.environ.setdefault("MILO_TODAY", "2026-10-19")

from milo import config, llm  # noqa: E402
from milo.coach import Coach, render  # noqa: E402
from milo.schemas import Activity, RecoveryDay, TrainingPlan, UserProfile  # noqa: E402
from milo.storage import Storage  # noqa: E402

from .number_check import suspicious_numbers  # noqa: E402

HERE = Path(__file__).resolve().parent
SAMPLES = HERE.parent.parent / "sample_data"
CRITERIA = ["data_accuracy", "grounded_interpretation", "plan_change_quality",
            "personalization", "conversation_process", "tone", "safety"]


def build_store(scenario: dict) -> Storage:
    store = Storage(":memory:")
    store.save_profile(UserProfile(name="Alex", age=30))
    plan = TrainingPlan.model_validate(json.loads((SAMPLES / "sample_plan.json").read_text()))
    store.save_plan(plan, reason="eval")
    acts = []
    for a in scenario["activities"]:
        acts.append(Activity(
            source="eval", type=a["type"],
            start_time=datetime.fromisoformat(a["date"] + "T18:00"),
            duration_min=a["duration_min"], distance_km=a.get("distance_km"),
            avg_hr=a.get("avg_hr")))
    store.add_activities(acts)
    rec = scenario.get("recovery")
    if rec:
        days = []
        start = plan.week_start(1)
        for i in range(21):  # baseline
            s, r, h = rec["baseline"]
            days.append(RecoveryDay(day=start - timedelta(days=21 - i),
                                    sleep_hours=s, resting_hr=r, hrv_ms=h))
        for i, (s, r, h) in enumerate(rec["week"]):
            days.append(RecoveryDay(day=start + timedelta(days=i),
                                    sleep_hours=s, resting_hr=r, hrv_ms=h))
        store.upsert_recovery(days)
    return store


def run_conversation(scenario: dict) -> tuple[list[dict], dict, dict]:
    store = build_store(scenario)
    coach = Coach(store)
    metrics = coach.week_metrics(1)
    plan_before = json.loads(store.get_plan().model_dump_json())
    coach.checkin_start(1)
    for turn in scenario["user_turns"]:
        coach.checkin_message(1, turn)
    raw_conv = store.get_conversation("checkin:1")
    transcript = [{"role": m["role"], "content": m.get("raw") or m["content"]}
                  for m in raw_conv if not m.get("hidden")]
    return transcript, metrics, plan_before


def _compact(obj) -> str:
    return json.dumps(obj, separators=(",", ":"))  # no indentation: about 40% fewer tokens


def _relevant_weeks(plan: dict, week: int) -> dict:
    """Only the reviewed week and the next one: enough to judge the changes."""
    return {**plan, "weeks": [w for w in plan.get("weeks", [])
                              if w.get("week_number") in (week, week + 1)]}


def _shrink_plan_blocks(text: str, week: int) -> str:
    """Replace a full plan JSON in Milo's reply with just next week's sessions.
    Keeps the position in the conversation, so the judge can still tell
    whether the plan was updated before or after the user approved."""
    def repl(m: re.Match) -> str:
        try:
            nxt = _relevant_weeks(json.loads(m.group(1)), week)["weeks"][-1]
            return f"[Milo output an updated plan. Week {nxt['week_number']}: {_compact(nxt)}]"
        except (json.JSONDecodeError, KeyError, IndexError):
            return "[Milo output an updated plan that could not be read]"
    return re.sub(r"```json\s*(\{.*?\})\s*```", repl, text, flags=re.DOTALL)


def judge(transcript: list[dict], metrics: dict, plan: dict, notes: str) -> dict:
    # Kept small on purpose: GitHub Models' free tier accepts about 8,000 input
    # tokens per request. The full version was right at that limit.
    week = metrics.get("week_number", 1)
    convo = "\n\n".join(
        f"{'USER' if m['role'] == 'user' else 'MILO'}: {_shrink_plan_blocks(m['content'], week)}"
        for m in transcript)
    prompt = render("judge.md", plan_json=_compact(_relevant_weeks(plan, week)),
                    weekly_metrics_json=_compact(metrics),
                    conversation_transcript=convo, scenario_notes=notes)
    raw = llm.chat([{"role": "user", "content": prompt}], model=config.JUDGE_MODEL, temperature=0)
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    try:
        return json.loads(match.group(0)) if match else {"error": "no JSON", "raw": raw}
    except json.JSONDecodeError as e:
        return {"error": f"invalid JSON: {e}", "raw": raw}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", help="run a single scenario id")
    args = ap.parse_args()

    scenarios = json.loads((HERE / "scenarios.json").read_text())
    if args.only:
        scenarios = [s for s in scenarios if s["id"] == args.only]

    out_dir = HERE / "results" / datetime.now().strftime("%Y%m%d-%H%M%S")
    out_dir.mkdir(parents=True)
    results = []
    for sc in scenarios:
        print(f"→ {sc['id']}")
        transcript, metrics, plan = run_conversation(sc)
        suspicious = suspicious_numbers(
            [m["content"] for m in transcript if m["role"] == "assistant"], metrics, plan,
            [m["content"] for m in transcript if m["role"] == "user"])
        verdict = judge(transcript, metrics, plan, sc["notes"])
        results.append({"id": sc["id"], "suspicious_numbers": suspicious, "judge": verdict})
        (out_dir / f"{sc['id']}.md").write_text(
            f"# {sc['id']}\n\n_{sc['notes']}_\n\n" +
            "\n\n".join(f"**{'User' if m['role'] == 'user' else 'Milo'}:** {m['content']}"
                        for m in transcript) +
            f"\n\n---\n\n```json\n{json.dumps(verdict, indent=2)}\n```\n")

    (out_dir / "results.json").write_text(json.dumps(results, indent=2))
    write_report(results, out_dir)
    print(f"\nReport: {out_dir / 'report.md'}")


def write_report(results: list[dict], out_dir: Path) -> None:
    ok = [r for r in results if "criteria" in r["judge"]]
    lines = [f"# Milo check-in evaluation\n",
             f"Model: `{config.MILO_MODEL}` · Judge: `{config.JUDGE_MODEL}` · "
             f"Date: {date.today().isoformat()}\n"]
    if ok:
        passed = sum(1 for r in ok if r["judge"].get("pass"))
        crit = sum(len(r["judge"].get("critical_failures", [])) for r in ok)
        lines += [f"**Pass rate:** {passed}/{len(ok)}  ·  **Critical failures:** {crit}\n",
                  "## Average score per criterion\n", "| Criterion | Avg (1–5) |", "|---|---|"]
        for c in CRITERIA:
            vals = [r["judge"]["criteria"][c]["score"] for r in ok if c in r["judge"]["criteria"]]
            lines.append(f"| {c.replace('_', ' ')} | {mean(vals):.2f} |" if vals else f"| {c} | – |")
    lines += ["\n## Scenarios\n", "| Scenario | Pass | Critical failures | Suspicious numbers |",
              "|---|---|---|---|"]
    for r in results:
        j = r["judge"]
        lines.append(f"| {r['id']} | {'✅' if j.get('pass') else '❌'} | "
                     f"{', '.join(j.get('critical_failures', [])) or '–'} | "
                     f"{', '.join(r['suspicious_numbers']) or '–'} |")
    (out_dir / "report.md").write_text("\n".join(lines) + "\n")


if __name__ == "__main__":
    main()
