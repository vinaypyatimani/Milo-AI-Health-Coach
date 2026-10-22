"""Deterministic check for hallucinated numbers.

Collects every number in the metrics, plan and user messages, then flags
numbers in Milo's replies that don't match any of them. It is a heuristic
(small counts like "2 sessions" or "Zone 2" are ignored), so it complements
the LLM judge rather than replacing it.
"""
from __future__ import annotations

import json
import re

_NUM = re.compile(r"(?<![\w.])(\d+(?:[.,]\d+)?)(?![\w])")


def _collect(obj, out: set[float]) -> None:
    if isinstance(obj, bool) or obj is None:
        return
    if isinstance(obj, (int, float)):
        out.add(round(float(obj), 1))
        out.add(float(round(obj)))
    elif isinstance(obj, str):
        for m in _NUM.findall(obj):
            _collect(float(m.replace(",", ".")), out)
        for mm, ss in re.findall(r"(\d+):(\d{2})", obj):  # paces like 6:11
            out.add(float(mm))
            out.add(float(ss))
    elif isinstance(obj, dict):
        for v in obj.values():
            _collect(v, out)
    elif isinstance(obj, (list, tuple)):
        for v in obj:
            _collect(v, out)


def suspicious_numbers(assistant_texts: list[str], metrics: dict, plan: dict,
                       user_texts: list[str]) -> list[str]:
    allowed: set[float] = set()
    _collect(metrics, allowed)
    _collect(plan, allowed)
    _collect(user_texts, allowed)
    # Values derivable by simple, safe arithmetic Milo may legitimately state
    allowed |= {float(x) for x in range(0, 11)}       # small counts, zones, RPE
    allowed |= {10.0, 100.0, 7.0, 21.0}                # "10%", "100%", days, baseline

    flagged = []
    for text in assistant_texts:
        clean = re.sub(r"```json.*?```", "", text, flags=re.DOTALL)
        clean = re.sub(r"\b20\d\d-\d\d-\d\d\b", "", clean)  # dates
        for raw in _NUM.findall(clean):
            v = float(raw.replace(",", "."))
            if round(v, 1) not in allowed and float(round(v)) not in allowed:
                flagged.append(raw)
    return sorted(set(flagged), key=lambda x: float(x.replace(",", ".")))


if __name__ == "__main__":  # tiny self-check
    m = {"summary": {"actual_duration_min": 132.9, "completion_rate_pct": 75}}
    print(suspicious_numbers(["You trained 132.9 min, 75% of plan, and ran 42 km"], m, {}, []))
    print(json.dumps("ok"))
