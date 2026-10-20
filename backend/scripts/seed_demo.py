"""Load the sample plan, profile and tracker files into the database."""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from milo.adapters import AdapterError, parse_file  # noqa: E402
from milo.schemas import TrainingPlan, UserProfile  # noqa: E402
from milo.storage import Storage  # noqa: E402

SAMPLES = Path(__file__).resolve().parent.parent.parent / "sample_data"


def seed(store: Storage) -> None:
    store.delete_all()
    store.save_profile(UserProfile(name="Alex", age=30, tracker="Garmin Forerunner"))
    plan = TrainingPlan.model_validate(json.loads((SAMPLES / "sample_plan.json").read_text()))
    store.save_plan(plan, reason="demo seed")
    for f in sorted(SAMPLES.iterdir()):
        if f.suffix == ".json":
            continue
        try:
            result = parse_file(f)
        except AdapterError as e:   # e.g. the Apple Health zip, until you add that adapter
            print(f"Skipped {f.name}: {e}")
            continue
        store.add_activities(result.activities)
        store.upsert_recovery(result.recovery)


if __name__ == "__main__":
    s = Storage()
    seed(s)
    print(f"Seeded demo data into {s.path}")