import json

from milo import safety
from milo.plan_parser import parse_plan, strip_plan_block


def test_urgent_flags():
    for text in ["I had chest pain on my run", "I felt dizzy and almost fainted",
                 "couldn't breathe properly on the hill"]:
        assert safety.is_urgent(safety.check(text)), text


def test_caution_flags():
    cats = {f.category for f in safety.check("My knee hurts and I'm pregnant")}
    assert {"injury", "pregnancy"} <= cats
    assert not safety.is_urgent(safety.check("My knee hurts"))


def test_no_false_alarm():
    assert safety.check("Great week, felt strong, legs a bit tired after the long run") == []


def test_alert_message():
    msg = safety.alert_message(safety.check("chest pain"))
    assert msg.startswith("SAFETY_ALERT")


def test_parse_plan_ok(plan_json):
    text = f"Here is your plan.\n\n```json\n{json.dumps(plan_json)}\n```\nGood luck!"
    plan, err = parse_plan(text)
    assert err is None and plan.goal.startswith("Run a 10K") and len(plan.weeks) == 4
    assert "```" not in strip_plan_block(text)


def test_parse_plan_none():
    assert parse_plan("What is your main goal?") == (None, None)


def test_parse_plan_invalid(plan_json):
    plan_json["weeks"][0]["sessions"][0]["day"] = "Funday"
    plan, err = parse_plan(f"```json\n{json.dumps(plan_json)}\n```")
    assert plan is None and "schema" in err


def test_start_date_snaps_to_monday(plan_json):
    plan_json["start_date"] = "2026-10-15"  # a Thursday
    plan, _ = parse_plan(f"```json\n{json.dumps(plan_json)}\n```")
    assert plan.start_date.isoformat() == "2026-10-12"