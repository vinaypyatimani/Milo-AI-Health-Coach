"""Extract and validate the JSON training plan from Milo's replies."""
from __future__ import annotations

import json
import re

from pydantic import ValidationError

from .schemas import TrainingPlan

_JSON_BLOCK = re.compile(r"```json\s*(\{.*?\})\s*```", re.DOTALL)


def find_plan_block(text: str) -> str | None:
    """Return the last ```json block in the text, if any."""
    blocks = _JSON_BLOCK.findall(text)
    return blocks[-1] if blocks else None


def strip_plan_block(text: str) -> str:
    """Remove JSON blocks so the chat shows prose; the UI renders a table."""
    return _JSON_BLOCK.sub("", text).strip()


def parse_plan(text: str) -> tuple[TrainingPlan | None, str | None]:
    """Return (plan, error). Both are None if the text contains no plan."""
    block = find_plan_block(text)
    if block is None:
        return None, None
    try:
        data = json.loads(block)
    except json.JSONDecodeError as e:
        return None, f"The plan is not valid JSON: {e}"
    try:
        plan = TrainingPlan.model_validate(data)
    except ValidationError as e:
        return None, f"The plan does not match the schema: {e}"
    if not plan.weeks:
        return None, "The plan has no weeks."
    return plan, None
