"""Settings, read from environment variables (or a .env file)."""
from __future__ import annotations

import os
from pathlib import Path

try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:  # python-dotenv is optional
    pass

ROOT = Path(__file__).resolve().parent.parent

# Any model string LiteLLM understands, for example:
#   openai/gpt-6-luna           (paid, very cheap: OPENAI_API_KEY)
#   github/gpt-4o-mini          (free with a GitHub token: GITHUB_API_KEY)
#   ollama/qwen3:8b             (free, runs locally)
#   gemini/gemini-2.5-flash     (free tier: GEMINI_API_KEY)
#   anthropic/claude-haiku-5-5  (paid: ANTHROPIC_API_KEY)
MILO_MODEL = os.getenv("MILO_MODEL", "openai/gpt-6-luna")
JUDGE_MODEL = os.getenv("JUDGE_MODEL", "github/gpt-4o-mini")
TEMPERATURE = float(os.getenv("MILO_TEMPERATURE", "0.4"))

# For GPT-5/GPT-6 models: none, low, medium, high, xhigh, max.
# "low" gives better plans than "none" while staying fast and cheap.
# Temperature is only used when this is "none".
REASONING_EFFORT = os.getenv("MILO_REASONING_EFFORT", "low")

DB_PATH = Path(os.getenv("MILO_DB_PATH", ROOT / "data" / "milo.db"))

# Tracker files store times in UTC; they are converted to this zone so that
# "Monday's run" means Monday where the user lives.
TIMEZONE = os.getenv("MILO_TZ", "Europe/Berlin")

# Comma-separated origins allowed to call the API (the React dev server).
CORS_ORIGINS = [o.strip() for o in os.getenv(
    "MILO_CORS_ORIGINS", "http://localhost:5173").split(",") if o.strip()]

# Load the sample plan and tracker files at startup when the database is empty.
# Useful on hosts whose disk resets on every restart (e.g. free tiers).
SEED_DEMO = os.getenv("MILO_SEED_DEMO", "").lower() in ("1", "true", "yes")

# Load LiteLLM in the background at startup, so the first reply is faster.
WARMUP = os.getenv("MILO_WARMUP", "1").lower() in ("1", "true", "yes")

# Upload limits
MAX_UPLOAD_MB = int(os.getenv("MILO_MAX_UPLOAD_MB", "200"))
APPLE_HEALTH_LOOKBACK_DAYS = int(os.getenv("MILO_APPLE_LOOKBACK_DAYS", "120"))

# How-to videos for exercises. With a YouTube Data API key the app shows the
# top video inline; without one it links to a YouTube search instead.
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY", "").strip()
