/**
 * Demo mode: an in-browser stand-in for the API, so the UI can be previewed
 * without a backend or API key. The plan, metrics and activities are real
 * output from the backend run on the sample data; Milo's replies are scripted
 * and streamed word by word like the real thing.
 */
import type {
  ActivityItem, Analysis, ChatMessage, ChatTarget, Connections, ManualActivity, NutritionPlan, PlanResponse, Profile, ProgressWeek,
  StreamDone, StreamHandlers, TrainingPlan, UploadReport, Usage, VideoResult, WeekMetrics,
} from "./types";
import data from "./demoData";
import demoAnalysis from "./demoAnalysis";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

let profile: Profile | null = data.profile as Profile;
let plan: TrainingPlan | null = /* @__PURE__ */ clone(data.plan) as unknown as TrainingPlan;
let history = [{ id: 1, created_at: "2026-10-11T19:04:00", reason: "created in Coaching Mode" }];
let activities: ActivityItem[] = data.activities as unknown as ActivityItem[];
const metrics = data.metrics as unknown as Record<string, WeekMetrics>;

const PLAN_REPLY =
  "Here's your 4-week plan. Two runs a week build your aerobic base: an easy run on Tuesday and a long run on Saturday, both in **Zone 2** (an easy pace where you can still hold a conversation). Thursday is full-body strength to protect your knees and hips, and Sunday is light mobility. Week 4 is lighter so your body can absorb the work.\n\nWould you also like a simple nutrition plan to go with your training?";

const NUTRITION_REPLY =
  "Done, your plan now includes a simple nutrition guide: a balanced plate at each meal, a carb-rich snack before your long run, and protein soon after strength sessions. It's in the plan below and in the downloads.\n\nThis is general guidance, not a diet. If you have a medical condition, a registered dietitian can tailor it.";

const NUTRITION: NutritionPlan = {
  summary: "Eat regular, balanced meals and fuel the harder sessions. No counting needed.",
  principles: [
    "Half the plate vegetables, a quarter protein, a quarter whole grains",
    "A palm-sized portion of protein at every meal",
    "Eat something light 1–2 hours before runs",
  ],
  training_day: [
    { meal: "Breakfast", timing: "7:00", suggestion: "Oats with yogurt, berries and a handful of nuts" },
    { meal: "Pre-run snack", timing: "1–2 h before", suggestion: "Banana or toast with honey" },
    { meal: "After training", timing: "within 1 h", suggestion: "Rice bowl with chicken or tofu and vegetables" },
    { meal: "Dinner", timing: "19:00", suggestion: "Salmon or lentils, potatoes, a big salad" },
  ],
  rest_day: [
    { meal: "Breakfast", timing: "", suggestion: "Eggs on wholegrain toast with tomatoes" },
    { meal: "Lunch", timing: "", suggestion: "Bean soup with bread" },
    { meal: "Dinner", timing: "", suggestion: "Stir-fry with vegetables and noodles" },
  ],
  hydration: "Drink water through the day; a glass before and after each session.",
  notes: "General guidance, not medical advice.",
};

/** Pretend usage, sized like the real model's (about 4 characters per token). */
function usageFor(conv: ChatMessage[], reply: string): Usage {
  const input = 2600 + Math.round(conv.reduce((n, m) => n + m.content.length, 0) / 4);
  const output = Math.round(reply.length / 4) + 180;
  return { model: "openai/gpt-6-luna", input_tokens: input, output_tokens: output, cost_usd: input * 1e-7 + output * 5e-7, estimated: false };
}

const COACHING_SCRIPT = [
  "Hi, I'm Milo. I'll ask a few questions to build a plan that fits your life. What's your main goal right now?",
  "Great goal. How much are you training at the moment?",
  "How many days a week can you train, and for how long each time?",
  "Any injuries, pain or health conditions I should know about?",
  "Got it. Would you like to start today or next Monday?",
];

const CHECKIN_SCRIPT = [
  "Solid first week, Alex. You completed all **4 sessions** (strength moved from Thursday to Friday) and trained **132.9 of 135 planned minutes**.\n\nYour Tuesday easy run was spot on: 89% of the time in Zone 2. Saturday's long run was harder: only 19% in Zone 2, with an average heart rate of 136 bpm.\n\nYour recovery stands out too. Average sleep was 6.2 hours, with 4 nights under 6 hours, and your resting heart rate averaged 57.3 bpm, 3.3 above your usual 54.0.\n\nHow was your energy this week?",
  "That fits the data. Short sleep and a higher resting heart rate usually mean your body is still recovering, so the same pace feels harder. Did anything feel sore or painful after the long run?",
  "Good to hear. What got in the way of sleep this week, and does next week look calmer?",
  "Here's what I'd change for week 2:\n\n- **Keep the volume at week 1 levels** instead of the planned increase: easy run 30 min, long run 45 min.\n- **Slow the long run down to stay in Zone 2.** Walk briefly on hills if your heart rate climbs.\n- **Move strength to Friday**, since that's where it actually fit your week.\n\nShould I update the plan with these changes?",
  "Done, week 2 is updated. Sleep is the best training tool you have right now, so aim for an earlier night before Saturday's long run.",
];

const conversations: Record<string, ChatMessage[]> = {
  coaching: [
    { role: "assistant", content: COACHING_SCRIPT[0] },
    { role: "user", content: "I want to run a 10K comfortably by December." },
    { role: "assistant", content: "Great goal. How much are you running at the moment, and how long since you last trained regularly?" },
    { role: "user", content: "About twice a week, 20–25 minutes. I started again in September." },
    { role: "assistant", content: "That's a good base. How many days a week can you train, and how much time do you have per session?" },
    { role: "user", content: "4 days, around 45 minutes max." },
    { role: "assistant", content: PLAN_REPLY, plan_saved: true },
  ],
};
{
  const c = conversations.coaching;
  c.forEach((m, i) => { if (m.role === "assistant") m.usage = usageFor(c.slice(0, i), m.content); });
}
const steps: Record<string, number> = { coaching: COACHING_SCRIPT.length };

const URGENT = /chest|faint|dizz|breath/i;

// Analyze page: written from the real numbers in demoAnalysis["56"] (running test set).
const REPORT = `## Summary
You're training steadily for a 10K: about **3.9 sessions and 173 minutes a week** over 8 weeks, mostly running with some strength work. Three quarters of your time was easy, which is a strong base, but in one week your easy runs crept too fast.

## At a glance
- **31 sessions, 23.1 hours**: 3.9 sessions and 173 minutes a week
- **Mix:** running 85% (24 runs, 192.1 km, 24 km a week), strength 15% (7 sessions)
- **Intensity:** 75% easy, 13% moderate, 12% hard
- **Running:** average pace 6:07 /km, longest run 11.66 km on 12 Dec, fastest 10.04 km at 5:19 /km on 19 Dec
- **Recovery:** 7.1 h of sleep on average, resting heart rate 54.7 bpm and steady

## What's going well
- **Consistency:** 3 or more sessions in 7 of 7 full weeks, and never more than 2 days off in a row.
- **A good aerobic base:** 75% of your training was easy, right where endurance coaches want it.
- **Steady load:** the last 7 days (164 min) were close to your 4-week average (175 min), and your biggest weekly increase was a safe 10%.

## What to watch
- **Week of 30 Nov:** only 60% of your training was easy (usually 75%). Easy runs done too fast add fatigue without much extra fitness.
- **Running economy is flat (-1.4%):** not a problem, but more truly easy running usually improves it over time.

## Suggestions
1. **Keep easy runs truly easy:** Zone 2, where you can talk in full sentences. Slow down on hills rather than letting your heart rate climb.
2. **Keep the 10% rule:** grow weekly time by no more than about 10% (from 173 minutes, that's under 20 extra minutes).
3. **Keep one strength session a week** (you average 0.9): it protects knees and hips as the running grows.
4. **Protect your sleep** before long runs and races. Your 7.1 h average is fine; don't let it slip.

## Next week
- **Mon:** rest
- **Tue:** easy run, 40 min, Zone 2
- **Wed:** strength, 30 min
- **Thu:** intervals: 5 × 3 min hard, 2 min easy jog
- **Fri:** rest or a 20-minute walk
- **Sat:** long run, 70 min, easy
- **Sun:** mobility, 20 min

Want a full plan built from this? Open the Plan page and choose *Build a plan with Milo*.`;

const analysisConv: ChatMessage[] = [];
let analysisCleared = false;   // demo: after Reset, Analyze shows its empty state

function applyWeek2Changes() {
  if (!plan) return;
  plan = clone(plan);
  const w2 = plan.weeks.find((w) => w.week_number === 2);
  if (!w2) return;
  w2.focus = "Hold steady, recover";
  for (const s of w2.sessions) {
    if (s.title === "Easy run") { s.duration_min = 30; s.distance_km = 4.8; }
    if (s.title === "Long run") { s.duration_min = 45; s.distance_km = 7; s.notes = "Stay in Zone 2; walk on hills if needed"; }
  }
  const thu = w2.sessions.find((s) => s.day === "Thursday");
  const fri = w2.sessions.find((s) => s.day === "Friday");
  if (thu && fri) { thu.day = "Friday"; fri.day = "Thursday"; }
  history = [{ id: history.length + 1, created_at: "2026-10-19T19:30:00", reason: "check-in week 1" }, ...history];
}

async function streamText(text: string, handlers: StreamHandlers) {
  await wait(500);
  for (const piece of text.match(/\S+\s*|\s+/g) ?? []) {
    handlers.onDelta?.(piece);
    await wait(18 + Math.random() * 30);
  }
}

export const mockApi = {
  health: async () => ({ ok: true, model: "demo (scripted replies)", today: "2026-10-19" }),
  getProfile: async () => profile,
  saveProfile: async (p: Profile) => { await wait(250); profile = p; return p; },
  getPlan: async (): Promise<PlanResponse> => ({ plan, current_week: plan ? 2 : null, history }),

  conversation: async (t: ChatTarget) =>
    clone(t.mode === "analysis" ? analysisConv : conversations[t.mode === "coaching" ? "coaching" : `checkin:${t.week}`] ?? []),

  chatStream: async (t: ChatTarget, text: string | null, handlers: StreamHandlers): Promise<StreamDone> => {
    if (t.mode === "analysis") {
      if (text === null) analysisConv.length = 0;
      else analysisConv.push({ role: "user", content: text });
      handlers.onMeta?.({ safety: [], urgent_banner: null });
      const reply = text === null ? REPORT
        : "Good question. In this demo the replies are scripted, so I can't answer that one, but with the real backend I'd answer from the same numbers as the report.";
      await streamText(reply, handlers);
      const message: ChatMessage = { role: "assistant", content: reply, usage: usageFor(analysisConv, reply + JSON.stringify(demoAnalysis["56"])) };
      analysisConv.push(message);
      return { reply, plan_saved: false, plan_error: null, safety: [], urgent_banner: null, message };
    }
    const key = t.mode === "coaching" ? "coaching" : `checkin:${t.week}`;
    if (text === null) { conversations[key] = []; steps[key] = 0; }
    const conv = (conversations[key] ??= []);
    if (text) conv.push({ role: "user", content: text });
    const urgent = text && URGENT.test(text)
      ? "⚠️ You mentioned a symptom that can be serious. Please stop training and talk to a doctor before continuing. If symptoms are severe or happening now, call your local emergency number (112 in the EU)."
      : null;
    handlers.onMeta?.({ safety: [], urgent_banner: urgent });

    let reply: string;
    let saved = false;
    if (urgent) {
      reply = "Thank you for telling me. Chest tightness or dizziness during exercise needs a doctor's check before you train again, even if you feel fine now. Please pause your training and book an appointment. I'll keep your plan as it is until you have the all-clear.";
    } else if (t.mode === "coaching" && plan && text && /nutrition|^yes/i.test(text) && !/^no/i.test(text)) {
      reply = NUTRITION_REPLY; saved = true;
      plan = { ...clone(plan), nutrition: NUTRITION };
      history = [{ id: history.length + 1, created_at: "2026-10-19T19:40:00", reason: "nutrition added" }, ...history];
    } else if (t.mode === "coaching" && plan && text && /^no/i.test(text)) {
      reply = "No problem. You can add it later from the plan page. Anything else you'd like to change?";
    } else if (t.mode === "coaching") {
      const step = steps[key] ?? 0;
      if (step < COACHING_SCRIPT.length) reply = COACHING_SCRIPT[step];
      else { reply = PLAN_REPLY; saved = true; plan = clone(data.plan) as unknown as TrainingPlan; }
      steps[key] = step + 1;
    } else if (t.week !== 1) {
      reply = "This week has only just started, so there's no tracker data yet. Come back on Sunday evening and we'll review it together.";
    } else {
      const step = steps[key] ?? 0;
      reply = step < CHECKIN_SCRIPT.length ? CHECKIN_SCRIPT[step] : "Anything else you'd like to adjust?";
      saved = step === CHECKIN_SCRIPT.length - 1;
      steps[key] = step + 1;
      if (saved) applyWeek2Changes();
    }
    await streamText(reply, handlers);
    const message: ChatMessage = { role: "assistant", content: reply, plan_saved: saved, usage: usageFor(conv, reply) };
    conv.push(message);
    return { reply, plan_saved: saved, plan_error: null, safety: [], urgent_banner: urgent, message };
  },

  weekMetrics: async (week: number) => {
    await wait(120);
    const m = metrics[String(week)];
    if (!m) throw new Error("In the demo, only weeks 1 and 2 have data.");
    return m;
  },

  activities: async () => activities,
  upload: async (files: File[], _scope: "plan" | "analysis" = "plan"): Promise<UploadReport> => {
    await wait(900);
    return {
      supported: [".csv", ".fit", ".gpx", ".tcx", ".xml", ".zip"],
      files: files.map((f) => ({ file: f.name, ok: true as const, activities_added: 0, duplicates_skipped: 1, recovery_days: 0, warnings: ["Demo mode: files aren't processed."] })),
    };
  },
  addManual: async (a: ManualActivity) => {
    await wait(250);
    activities = [...activities, {
      id: Date.now(), source: "manual", type: a.type, start_time: `${a.date}T${a.time}:00`,
      duration_min: a.duration_min, distance_km: a.distance_km, avg_hr: a.avg_hr, max_hr: null,
      hr_samples: 0, notes: a.notes,
    }];
    return { ok: true };
  },
  deleteActivity: async (id: number) => { activities = activities.filter((a) => a.id !== id); return { ok: true }; },

  progress: async () => data.progress as unknown as ProgressWeek[],
  clearPlan: async () => {
    await wait(200);
    plan = null; history = [];
    for (const k of Object.keys(conversations)) { delete conversations[k]; delete steps[k]; }
    return { ok: true };
  },
  clearConversation: async (t: ChatTarget) => {
    if (t.mode === "analysis") { analysisConv.length = 0; return { ok: true }; }
    const key = t.mode === "coaching" ? "coaching" : `checkin:${t.week}`;
    delete conversations[key]; delete steps[key];
    return { ok: true };
  },
  exportUrl: (fmt: "pdf" | "xlsx") => `#download-${fmt}`,
  analysis: async (days: number): Promise<Analysis> => {
    await wait(150);
    return analysisCleared ? { ...demoAnalysis[String(days)], data: { ...demoAnalysis[String(days)].data, activities: 0, recovery_days: 0 }, flags: [] }
      : demoAnalysis[String(days)];
  },
  resetAnalysis: async () => { await wait(200); analysisCleared = true; analysisConv.length = 0; return { ok: true }; },
  reportPdfUrl: () => "#report-pdf",
  connections: async (): Promise<Connections> => ({ polar: { available: false, connected: false, connected_at: null, last_sync: null, imported: 0 } }),
  polarConnectUrl: () => "#analyze",
  polarSync: async () => ({ new_workouts: 0, skipped: 0, recovery_days: 0, warnings: [] }),
  polarDisconnect: async () => ({ ok: true }),
  // The demo has no server (and no YouTube key), so it links to a YouTube search.
  videos: async (q: string): Promise<VideoResult> => ({
    query: q, items: [], source: "link",
    search_url: `https://www.youtube.com/results?search_query=${encodeURIComponent(q).replace(/%20/g, "+")}`,
  }),
  deleteAll: async () => {
    await wait(300);
    plan = null; activities = []; profile = null; history = [];
    for (const k of Object.keys(conversations)) delete conversations[k];
    return { ok: true };
  },
};
