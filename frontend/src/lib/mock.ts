/**
 * Demo mode: an in-browser stand-in for the API, so the UI can be previewed
 * without a backend or API key. The plan, metrics and activities are real
 * output from the backend run on the sample data; Milo's replies are scripted
 * and streamed word by word like the real thing.
 */
import type {
  ActivityItem, ChatMessage, ChatTarget, ManualActivity, PlanResponse, Profile, ProgressWeek,
  StreamDone, StreamHandlers, TrainingPlan, UploadReport, WeekMetrics,
} from "./types";
import data from "./demoData";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

let profile: Profile | null = data.profile as Profile;
let plan: TrainingPlan | null = /* @__PURE__ */ clone(data.plan) as unknown as TrainingPlan;
let history = [{ id: 1, created_at: "2026-10-11T19:04:00", reason: "created in Coaching Mode" }];
let activities: ActivityItem[] = data.activities as unknown as ActivityItem[];
const metrics = data.metrics as unknown as Record<string, WeekMetrics>;

const PLAN_REPLY =
  "Here's your 4-week plan. Two runs a week build your aerobic base: an easy run on Tuesday and a long run on Saturday, both in **Zone 2** (an easy pace where you can still hold a conversation). Thursday is full-body strength to protect your knees and hips, and Sunday is light mobility. Week 4 is lighter so your body can absorb the work.\n\nTell me if anything should change.";

const COACHING_SCRIPT = [
  "Hi, I'm Milo. I'll ask a few questions to build a plan that fits your life. What's your main goal right now?",
  "Great goal. How much are you training at the moment?",
  "How many days a week can you train, and for how long each time?",
  "Any injuries, pain or health conditions I should know about?",
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
const steps: Record<string, number> = { coaching: COACHING_SCRIPT.length };

const URGENT = /chest|faint|dizz|breath/i;

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

  conversation: async (t: ChatTarget) => clone(conversations[t.mode === "coaching" ? "coaching" : `checkin:${t.week}`] ?? []),

  chatStream: async (t: ChatTarget, text: string | null, handlers: StreamHandlers): Promise<StreamDone> => {
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
    const message: ChatMessage = { role: "assistant", content: reply, plan_saved: saved };
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
  upload: async (files: File[]): Promise<UploadReport> => {
    await wait(900);
    return {
      supported: [".csv", ".fit", ".gpx", ".tcx"],
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
  deleteAll: async () => {
    await wait(300);
    plan = null; activities = []; profile = null; history = [];
    for (const k of Object.keys(conversations)) delete conversations[k];
    return { ok: true };
  },
};
