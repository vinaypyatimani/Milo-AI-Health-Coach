# Milo, an AI fitness coach

Milo builds a personalized training plan through conversation, then checks in
with you each week: it compares what you planned with what your fitness
tracker recorded, asks how you felt, and adapts next week's plan.

> Named after Milo of Croton, the ancient wrestler who grew stronger by carrying
> a calf every day as it grew into a bull: steady progress that adapts to you.

| Mode | What it does |
|---|---|
| **Coaching Mode** | Interviews you one question at a time (goal, fitness, schedule, equipment, injuries) and creates a structured weekly plan |
| **Check-in Mode** | Imports tracker data, calculates plan vs. actual (adherence, volume, time in heart-rate zone, sleep, resting HR, HRV), discusses the week and updates the plan after you approve |

**Stack:** FastAPI · React + TypeScript (Vite) · SQLite · LiteLLM

**Models:** GPT-6 Luna (OpenAI API) runs Milo; gpt-4o-mini (GitHub Models, free) is the evaluation judge. Any LiteLLM model can be swapped in via `.env`.

---

## Project structure

```
milo-coach/
├── backend/
│   ├── main.py                 FastAPI app (REST API + serves the built frontend)
│   ├── milo/
│   │   ├── coach.py            conversation logic for both modes
│   │   ├── metrics.py          plan-vs-actual calculations (all numbers Milo uses)
│   │   ├── intensity.py        heart-rate zones, pace targets, time in zone
│   │   ├── safety.py           deterministic red-flag check before every model call
│   │   ├── plan_parser.py      extracts + validates the JSON plan, with one repair retry
│   │   ├── schemas.py          Pydantic models (plan, activity, recovery, profile)
│   │   ├── storage.py          SQLite
│   │   ├── llm.py              LiteLLM wrapper (swap models via .env)
│   │   ├── adapters/           tracker formats: FIT, GPX, TCX, Apple Health, CSV
│   │   └── prompts/            coach_system.md, judge.md
│   ├── evaluation/             scenarios, LLM-as-a-judge, hallucinated-number check
│   ├── scripts/                sample data generator, demo seeding
│   └── tests/                  50 tests, run without an API key
├── frontend/
│   └── src/
│       ├── App.tsx             shell: top bar, pages, start over
│       ├── chat/               central chat: start button, streaming, usage meter, start over
│       ├── modules/            plan calendar, exercise videos, week strip, stats, nutrition, uploads, chart
│       ├── pages/              Plan (start page), Week, Data, Progress, Profile
│       ├── lib/                API client, streaming (SSE), data cache, routing, plan diff
│       └── styles/             design tokens, shell, modules, chat
├── sample_data/                synthetic tracker files (no real health data)
└── Dockerfile                  single container: API + frontend
```

## Design decisions

- **The model never calculates.** `metrics.py` computes every number; the model only interprets them. This makes the analysis exact and unit-testable, and the evaluation checks that Milo doesn't invent numbers.
- **Any tracker via adapters.** Every source is converted to one common format. File import covers nearly every device today (FIT/GPX/TCX from Garmin, Polar, Suunto, Coros, Wahoo; Apple Health's export; CSV for anything else). A live API (Polar, Withings, Oura, an aggregator like Terra) is one more adapter returning the same `ImportResult`.
- **Two layers of safety.** The system prompt has strict medical rules, and `safety.py` scans every user message first. Urgent symptoms (chest pain, fainting, dizziness, breathing problems) add a `SAFETY_ALERT` to the model's input, show a fixed banner, and block plan changes in that reply.
- **Nothing changes without approval.** Plans are only updated after the user agrees, and every version is kept.
- **Privacy.** Single-user, local SQLite by default, a "delete all my data" endpoint (GDPR), and only synthetic data in the repo.

---

## Speed

- **Streaming replies:** Milo's answer appears word by word as the model writes it (`/api/chat/stream`), instead of after the whole reply is finished.
- **Compact prompts:** plan and metrics are sent to the model as compact JSON, which means fewer tokens and faster replies.
- **Warm start:** LiteLLM is loaded in the background when the server starts, so the first message doesn't wait for it.
- **Data cache in the frontend:** pages show cached data instantly and refresh in the background; less-used pages load on demand.
- **Reasoning effort:** `MILO_REASONING_EFFORT=none` makes GPT-6 Luna answer faster, at some cost to plan quality (default: `low`).

## Run it locally

**Requirements:** Python 3.11+, Node 20+, an OpenAI API key (for Milo) and a GitHub token with the Models permission (for the judge). See `backend/.env.example`.

```bash
# 1. Backend
cd backend
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
cp .env.example .env                                     # add your model + key
uvicorn main:app --reload                                # http://localhost:8000/docs

# 2. Frontend (new terminal)
cd frontend
npm install
npm run dev                                              # http://localhost:5173
```

**Try it with sample data** (skips the plan interview):

```bash
cd backend
python scripts/generate_samples.py    # writes sample_data/
python scripts/seed_demo.py           # loads plan, profile and tracker files
MILO_TODAY=2026-10-19 uvicorn main:app --reload
```

You can also upload the files in `sample_data/` through the Tracker data page.

**Frontend demo mode** (no backend, scripted replies):

```bash
cd frontend
npm run dev:demo           # or: npm run build:demo -> one self-contained dist-demo/index.html
```

## Tests

```bash
cd backend
pytest                     # adapters, metrics, safety, plan parsing, full API flow, eval pipeline
```

All tests use a fake model, so they run offline and for free.

## Evaluation

Eight scripted check-in scenarios in `backend/evaluation/scenarios.json` (perfect week, busy week, poor recovery, missing heart-rate data, suspicious data, knee pain, chest pain, wants to double training). Each run:

1. Plays the conversation with your configured model
2. Flags numbers in Milo's replies that don't appear in the metrics (deterministic)
3. Grades the conversation with an LLM judge on 7 criteria plus critical failures

```bash
cd backend
python -m evaluation.run_eval                       # all scenarios
python -m evaluation.run_eval --only chest_pain     # one scenario
MILO_MODEL=github/gpt-4o-mini python -m evaluation.run_eval   # compare models
```

Results go to `evaluation/results/<timestamp>/report.md`. The judge input is kept compact (about 3,500 tokens) to stay under the GitHub Models free-tier limit of about 8,000 input tokens per request. Run it before and after prompt changes to show the effect, and compare models (e.g. a small local model vs. a larger API model).

## Supported tracker files

| Format | From | Notes |
|---|---|---|
| `.fit` | Garmin, Coros, Wahoo, Suunto, Polar | Best detail: per-second heart rate |
| `.gpx` | Almost any GPS watch or app | Heart rate if the device writes the Garmin extension |
| `.tcx` | Garmin, Polar, Wahoo | Laps + heart rate |
| `.zip` / `.xml` | Apple Health → profile → Export All Health Data | Workouts, heart rate, resting HR, HRV, sleep (last 120 days) |
| `.csv` | Anything else | Columns: `date, type, duration_min` (+ optional `time, distance_km, avg_hr, max_hr, notes`); recovery rows: `date, sleep_hours, resting_hr, hrv_ms` |

Heart-rate zones use % of max HR (Zone 2 = 60–70%). Max HR comes from the profile, or is estimated as 220 − age.

---

## API overview

Interactive docs at `/docs`.

| Method | Path | Purpose |
|---|---|---|
| GET / PUT | `/api/profile` | Name, age, max HR, tracker |
| GET | `/api/plan` | Current plan, current week, version history |
| POST | `/api/chat/stream` | Streaming chat for both modes (server-sent events); the frontend uses this |
| POST | `/api/coaching/start`, `/api/coaching/message` | Coaching Mode (non-streaming) |
| GET | `/api/weeks/{n}/metrics` | Plan vs. actual for week *n* |
| POST | `/api/checkin/{n}/start`, `/api/checkin/{n}/message` | Check-in Mode |
| POST | `/api/activities/upload` | Upload tracker files (multipart) |
| POST | `/api/activities/manual`, `/api/recovery` | Manual entry |
| GET | `/api/progress` | Per-week summary for charts |
| GET | `/api/plan/export.pdf`, `/api/plan/export.xlsx` | Download the plan (PDF to print, Excel to track offline) |
| DELETE | `/api/plan` | Start over and clear the plan (plan versions + conversations; profile and activities stay) |
| DELETE | `/api/conversations/{mode}` | Start over and keep the plan (`?week=N` for a check-in) |
| GET | `/api/videos?q=` | How-to videos for an exercise (YouTube, cached; a search link without a key) |
| DELETE | `/api/data` | Delete everything (GDPR) |

---

## Hosting

The app needs a server for the API and **persistent storage** for SQLite (or a switch to Postgres). Free tiers and prices change often, so check each provider's current terms. Since this handles health data, pick an **EU region** (e.g. Frankfurt) where offered.

### Option A: one container (simplest)
The `Dockerfile` builds the React app and serves it from FastAPI, so you deploy a single service.

| Platform | Why choose it | Storage for SQLite |
|---|---|---|
| **Render** | Deploy from GitHub in a few clicks, Frankfurt region | Persistent disk on paid plans; otherwise use Postgres |
| **Railway** | Very fast setup from a repo, usage-based pricing | Volumes |
| **Fly.io** | Runs close to users, Frankfurt region | Volumes |
| **Hugging Face Spaces** (Docker) | Popular for AI demos, free CPU tier, easy to share | Ephemeral by default; fine for a demo with seeded data |
| **Google Cloud Run** | Scales to zero, generous free tier | Ephemeral; use Cloud SQL or a managed Postgres |

Set `MILO_MODEL` and the matching API key as environment variables on the platform, and mount the volume at `/data`.

### Option B: split frontend and backend
- **Frontend** on **Vercel**, **Netlify** or **Cloudflare Pages** (free static hosting): build with `VITE_API_URL=https://your-api.example.com npm run build`.
- **Backend** on Render, Railway or Fly.io; set `MILO_CORS_ORIGINS` to the frontend's URL.

### Option C: static demo only
`npm run build:demo` produces one HTML file that runs without a backend. Host it anywhere (GitHub Pages, Netlify drop) as a portfolio preview.

### How-to videos

Every session in the plan lists its exercises, and the Plan page shows a
how-to video for each one. Set `YOUTUBE_API_KEY` (free, from the Google Cloud
console with "YouTube Data API v3" enabled) to play the top video in the app;
without it, each exercise links to a YouTube search. Results are cached in
SQLite because the free key allows about 100 searches a day. Videos load
from youtube-nocookie.com only when you press play.

### Notes for production
- **Model hosting:** free hosting tiers can't run Ollama models; use an API model (GitHub Models, Gemini, Claude).
- **Database:** for more than one user or ephemeral hosts, move from SQLite to Postgres (e.g. Neon or Supabase have free tiers).
- **Going multi-user:** add authentication (e.g. Clerk, Auth0, Supabase Auth), a `user_id` column on every table, and per-user rate limits on the chat endpoints.
- **Privacy:** add a privacy notice and explicit consent before collecting health data, and keep server logs free of message content.

---

Milo is a coaching tool, not medical advice. Users with pain, symptoms or health conditions should consult a doctor.
