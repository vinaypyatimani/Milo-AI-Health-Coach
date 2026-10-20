import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parent.parent
SAMPLES = BACKEND.parent / "sample_data"
sys.path.insert(0, str(BACKEND))

os.environ["MILO_TODAY"] = "2026-10-19"   # pins "today" so week 1 is always last week
os.environ["MILO_DB_PATH"] = ":memory:"   # tests never touch your real database


@pytest.fixture(scope="session", autouse=True)
def sample_files():
    if not (SAMPLES / "sample_plan.json").exists():
        subprocess.run([sys.executable, str(BACKEND / "scripts" / "generate_samples.py")], check=True)
    return SAMPLES


@pytest.fixture
def plan_json(sample_files) -> dict:
    return json.loads((sample_files / "sample_plan.json").read_text())


@pytest.fixture
def fake_llm():
    """Replace the model with a scripted fake. Push replies onto `.replies`."""
    from milo import llm

    class Fake:
        def __init__(self):
            self.replies: list[str] = []
            self.calls: list[list[dict]] = []

        def __call__(self, messages, model, temperature):
            self.calls.append(messages)
            return self.replies.pop(0) if self.replies else "OK."

    fake = Fake()
    llm.set_override(fake)
    yield fake
    llm.set_override(None)