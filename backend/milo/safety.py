"""Deterministic safety pre-check.

Runs on every user message before the model is called. If it finds a red
flag, a SAFETY_ALERT note is added so the model addresses it first, and the
UI shows a fixed safety banner for urgent symptoms.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

# (category, severity, pattern). "urgent" = stop training and see a doctor.
_RULES: list[tuple[str, str, str]] = [
    ("cardiac", "urgent",
     r"chest (pain|tightness|pressure)|pain in (my )?chest|heart (attack|condition|problem)|"
     r"palpitation|irregular heart ?beat|arrhythmi"),
    ("fainting", "urgent", r"faint(ed|ing)?|passed out|black(ed)? out|lost consciousness|collapsed?"),
    ("dizziness", "urgent", r"dizz(y|iness)|light-?headed"),
    ("breathing", "urgent", r"can'?t breathe|couldn'?t breathe|short(ness)? of breath|struggl\w* to breathe"),
    ("injury", "caution",
     r"\b(pain|painful|hurts?|hurting|injur(y|ed|ies)|sprain\w*|strain(ed)?|swollen|swelling|"
     r"tendinitis|shin splints?|stress fracture|torn|tear)\b"),
    ("pregnancy", "caution", r"pregnan\w*|gave birth|postpartum|post-partum"),
    ("disordered_eating", "caution",
     r"starv\w*|skip(ping)? (all )?meals|not eating|purg\w*|throw(ing)? up after|"
     r"burn off (what|everything) i ate|make up for (eating|what i ate)|binge\w*"),
    ("extreme_goal", "caution",
     r"lose \d{2,} ?(kg|kilos|pounds|lbs) in (a|one|two|\d) (week|weeks)|"
     r"\d{3} ?(kcal|calories) a day"),
]

_COMPILED = [(c, s, re.compile(p, re.IGNORECASE)) for c, s, p in _RULES]

_GUIDANCE = {
    "cardiac": "possible heart-related symptom",
    "fainting": "possible fainting or loss of consciousness",
    "dizziness": "dizziness or light-headedness",
    "breathing": "unusual breathing difficulty",
    "injury": "pain or a possible injury",
    "pregnancy": "pregnancy or recent birth",
    "disordered_eating": "possible signs of disordered eating or compensatory exercise",
    "extreme_goal": "an extreme or unsafe goal",
}


@dataclass
class SafetyFlag:
    category: str
    severity: str  # "urgent" or "caution"
    matched: str


def check(text: str) -> list[SafetyFlag]:
    flags: list[SafetyFlag] = []
    for category, severity, pattern in _COMPILED:
        m = pattern.search(text)
        if m:
            flags.append(SafetyFlag(category, severity, m.group(0)))
    return flags


def alert_message(flags: list[SafetyFlag]) -> str | None:
    if not flags:
        return None
    parts = [f"{_GUIDANCE[f.category]} ('{f.matched}', {f.severity})" for f in flags]
    return ("SAFETY_ALERT: The user's last message may mention " + "; ".join(parts) +
            ". Address this first, following your safety rules, before anything else.")


def is_urgent(flags: list[SafetyFlag]) -> bool:
    return any(f.severity == "urgent" for f in flags)


URGENT_BANNER = (
    "⚠️ You mentioned a symptom that can be serious. Please stop training and talk "
    "to a doctor before continuing. If symptoms are severe or happening now, call "
    "your local emergency number (112 in the EU)."
)