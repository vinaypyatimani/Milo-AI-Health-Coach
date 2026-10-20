"""Parse the sample files and print week 1's plan-vs-actual metrics."""
import json
import sys
from datetime import timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from milo.adapters import parse_file
from milo.metrics import compute_week_metrics
from milo.schemas import TrainingPlan

SAMPLES = Path(__file__).resolve().parent.parent.parent / "sample_data"
plan = TrainingPlan.model_validate_json((SAMPLES / "sample_plan.json").read_text())

activities, recovery = [], []
for name in ["week1_tue_easy_run.gpx", "week1_fri_strength.tcx",
             "week1_sat_long_run.fit", "recovery.csv"]:
    result = parse_file(SAMPLES / name)
    activities += result.activities
    recovery += result.recovery

start = plan.week_start(1)
week = [d for d in recovery if start <= d.day <= start + timedelta(days=6)]
baseline = [d for d in recovery if start - timedelta(days=21) <= d.day < start]
m = compute_week_metrics(plan, 1, activities, week, baseline, max_hr=190)

for s in m["sessions"]:
    pct = s["intensity"]["pct_time_in_target"] if s["intensity"] else None
    zone = f"{pct}% in zone" if pct is not None else ""
    print(f'{s["planned_day"]:<10} {s["title"]:<20} {s["status"]:<10} '
          f'{s["actual_duration_min"]} / {s["planned_duration_min"]} min  {zone}')
print(json.dumps(m["summary"], indent=2))
print(json.dumps(m["recovery"], indent=2))