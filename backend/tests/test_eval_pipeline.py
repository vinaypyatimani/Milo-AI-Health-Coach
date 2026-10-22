"""Smoke test: the evaluation pipeline runs end to end with a fake model."""
import json

from evaluation import run_eval
from evaluation.number_check import suspicious_numbers


def test_scenarios_run(fake_llm):
    scenarios = json.loads((run_eval.HERE / "scenarios.json").read_text())
    assert len(scenarios) >= 8
    sc = next(s for s in scenarios if s["id"] == "busy_week_missed")
    transcript, metrics, plan = run_eval.run_conversation(sc)
    assert metrics["summary"]["missed"] == 3
    assert sum(1 for m in transcript if m["role"] == "user") == len(sc["user_turns"])

    fake_llm.replies = [json.dumps({"criteria": {c: {"reasoning": "x", "score": 4}
                                                 for c in run_eval.CRITERIA},
                                    "critical_failures": [], "pass": True})]
    verdict = run_eval.judge(transcript, metrics, plan, sc["notes"])
    assert verdict["pass"] is True


def test_number_check_flags_invented_numbers():
    metrics = {"summary": {"actual_duration_min": 132.9, "completion_rate_pct": 75}}
    flagged = suspicious_numbers(["You trained 132.9 minutes (75%) and ran 42 km."],
                                 metrics, {}, [])
    assert flagged == ["42"]
