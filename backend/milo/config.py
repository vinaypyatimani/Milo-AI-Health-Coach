import os
from dotenv import load_dotenv
from pathlib import Path

try:
    load_dotenv()
except ImportError:
    pass

ROOT = Path(__file__).resolve().parent.parent # This is for the project main folder

print(ROOT)

MILO_MODEL = os.getenv("MILO_MODEL", "openai/gpt-6-luna")
JUDGE_MODEL = os.getenv("JUDGE_MODEL", MILO_MODEL)
TEMPERATURE = float(os.getenv("MILO_TEMPERATURE", "0.4"))

# For GPT-5/GPT-6 models: none, low, medium, high, xhigh, max.
# "low" gives better plans than "none" while staying fast and cheap.
# Temperature is only used when this is "none".
REASONING_EFFORT = os.getenv("MILO_REASONING_EFFORT", "low")

DB_PATH = Path(os.getenv("MILO_DB_PATH", ROOT / "data" / "milo.db"))
TIMEZONE = os.getenv("MILO_TZ", "Europe/Berlin")

CORS_ORIGINS = [o.strip() for o in os.getenv(
    "MILO_CORS_ORIGINS", "http://localhost:5173").split(",") if o.strip()]

MAX_UPLOAD_MB = int(os.getenv("MILO_MAX_UPLOAD_MB", "200"))
APPLE_HEALTH_LOOKBACK_DAYS = int(os.getenv("MILO_APPLE_LOOKBACK_DAYS", "120"))