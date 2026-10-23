export type SessionType =
  | "run" | "strength" | "cycling" | "swim" | "walk" | "mobility" | "rest" | "other";

export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

export interface PlannedSession {
  day: (typeof DAYS)[number];
  type: SessionType;
  title: string;
  duration_min: number;
  distance_km: number | null;
  target_intensity: { kind: "hr_zone" | "pace" | "rpe" | "none"; value: string };
  notes: string;
  exercises?: Exercise[];
}

/** One step of a session: a move with sets/reps, or a run segment. */
export interface Exercise { name: string; detail: string; video_query: string }

export interface Video { id: string; title: string; channel: string; thumbnail: string }
export interface VideoResult { query: string; search_url: string; items: Video[]; source: "youtube" | "link" }

export interface PlanWeek { week_number: number; focus: string; sessions: PlannedSession[] }
export interface Meal { meal: string; timing: string; suggestion: string }
export interface NutritionPlan {
  summary: string;
  principles: string[];
  training_day: Meal[];
  rest_day: Meal[];
  hydration: string;
  notes: string;
}
export interface TrainingPlan {
  goal: string;
  start_date: string;          // always a Monday
  first_day?: string | null;   // "start today": week 1 days before this don't count
  weeks: PlanWeek[];
  nutrition?: NutritionPlan | null;
}

/** Tokens and cost of one reply (estimated when the provider reports nothing). */
export interface Usage { model: string; input_tokens: number; output_tokens: number; cost_usd: number | null; estimated: boolean }

export interface PlanResponse {
  plan: TrainingPlan | null;
  current_week: number | null;
  history: { id: number; created_at: string; reason: string }[];
}

export interface SafetyFlag { category: string; severity: "urgent" | "caution"; matched: string }

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  plan_saved?: boolean;
  safety?: SafetyFlag[];
  usage?: Usage | null;
}

export interface TurnResponse {
  reply: string;
  plan_saved: boolean;
  plan_error: string | null;
  safety: SafetyFlag[];
  urgent_banner: string | null;
}

export interface Intensity {
  target: string | null;
  time_in_target_min: number | null;
  pct_time_in_target: number | null;
  avg_hr_in_target: boolean | null;
  pace_in_target: boolean | null;
  note: string | null;
}

export interface SessionRow {
  planned_day: string;
  planned_date: string;
  type: SessionType;
  title: string;
  status: "completed" | "moved" | "missed";
  planned_duration_min: number;
  actual_duration_min: number | null;
  planned_distance_km: number | null;
  actual_distance_km: number | null;
  actual_date: string | null;
  avg_hr: number | null;
  pace: string | null;
  intensity: Intensity | null;
}

export interface WeekMetrics {
  week_number: number;
  week_start: string;
  week_end: string;
  week_focus: string;
  summary: {
    planned_sessions: number;
    completed_on_planned_day: number;
    completed_on_other_day: number;
    missed: number;
    extra_unplanned_activities: number;
    completion_rate_pct: number | null;
    planned_duration_min: number;
    actual_duration_min: number;
    duration_vs_plan_pct: number | null;
    planned_distance_km: number | null;
    actual_distance_km: number | null;
    time_in_target_hr_zone_min: number | null;
    pct_time_in_target_hr_zone: number | null;
  };
  sessions: SessionRow[];
  extra_activities: { date: string; type: SessionType; duration_min: number; distance_km: number | null; avg_hr: number | null }[];
  recovery: {
    days_with_data: number;
    avg_sleep_hours: number | null;
    nights_under_6h_sleep: number | null;
    avg_resting_hr: number | null;
    baseline_resting_hr: number | null;
    resting_hr_change_vs_baseline: number | null;
    avg_hrv_ms: number | null;
    baseline_hrv_ms: number | null;
    hrv_change_vs_baseline_pct: number | null;
  };
  data_warnings: string[];
  has_tracker_data: boolean;
}

export interface ActivityItem {
  id: number;
  source: string;
  type: SessionType;
  start_time: string;
  duration_min: number;
  distance_km: number | null;
  avg_hr: number | null;
  max_hr: number | null;
  hr_samples: number;
  notes: string;
}

export interface UploadReport {
  files: ({ file: string; ok: true; activities_added: number; duplicates_skipped: number; recovery_days: number; warnings: string[] }
    | { file: string; ok: false; error: string })[];
  supported: string[];
}

export interface ProgressWeek {
  week_number: number;
  status: "done" | "current" | "upcoming";
  planned_duration_min: number;
  actual_duration_min: number | null;
  completion_rate_pct: number | null;
  pct_time_in_target_hr_zone: number | null;
  avg_resting_hr: number | null;
  avg_sleep_hours: number | null;
}

export interface Profile { name: string; age: number | null; max_hr: number | null; tracker: string; notes: string }

export interface ManualActivity {
  date: string; time: string; type: SessionType; duration_min: number;
  distance_km: number | null; avg_hr: number | null; notes: string;
}

// ---- streaming chat -----------------------------------------------------------
export type ChatTarget =
  | { mode: "coaching" }
  | { mode: "checkin"; week: number }
  | { mode: "analysis"; days: number };   // days = 0: all data

/** Analyze page: every number is computed by the backend (milo/analysis.py). */
export interface AnalysisFlag { code: string; text: string }
export interface AnalysisWeek { week_start: string; minutes: number; sessions: number; distance_km: number; by_type: Record<string, number>; easy_pct: number | null; partial: boolean }
export interface Analysis {
  period: { from: string; to: string; days: number; weeks: number };
  data: { activities: number; with_heart_rate: number; recovery_days: number; max_hr_used: number | null; max_hr_source: string; days_since_last_workout: number | null };
  totals?: { sessions: number; hours: number; distance_km: number; active_days: number; sessions_per_week: number; minutes_per_week: number };
  by_sport?: { type: SessionType; sessions: number; minutes: number; distance_km: number | null; avg_hr: number | null; share_pct: number }[];
  weekly?: AnalysisWeek[];
  load?: { last_7_days_min: number; prior_4_week_avg_min: number | null; ratio: number | null; largest_week_increase_pct: number | null; largest_week_increase_week: string | null };
  intensity?: { zone_minutes: Record<string, number>; zone_pct: Record<string, number>; easy_pct: number; moderate_pct: number; hard_pct: number } | null;
  running?: { runs: number; km: number; km_per_week: number; avg_pace: string | null; longest_run_km: number; longest_run_date: string; fastest_pace_5k_plus: string | null; fastest_run_date: string | null; fastest_run_km: number | null; efficiency_change_pct: number | null } | null;
  strength?: { sessions: number; per_week: number };
  consistency?: { longest_gap_days: number; weeks_with_3_plus_sessions: number; full_weeks: number };
  recovery?: { avg_sleep_hours: number | null; nights_under_6h: number; nights_with_sleep_data: number; resting_hr_avg: number | null; resting_hr_change_bpm: number | null; hrv_avg_ms: number | null; hrv_change_pct: number | null } | null;
  highlights?: { what: string; date: string; type?: string; minutes?: number; km?: number }[];
  flags: AnalysisFlag[];
}

export interface Connections {
  polar: { available: boolean; connected: boolean; connected_at: string | null; last_sync: string | null; imported: number };
}
export interface SyncReport { new_workouts: number; skipped: number; recovery_days: number; warnings: string[] }

export interface StreamMeta { safety: SafetyFlag[]; urgent_banner: string | null }

export interface StreamDone {
  reply: string;
  plan_saved: boolean;
  plan_error: string | null;
  safety: SafetyFlag[];
  urgent_banner: string | null;
  message: ChatMessage;
}

export interface StreamHandlers {
  onMeta?: (meta: StreamMeta) => void;
  onDelta?: (text: string) => void;
  onStatus?: (text: string) => void;
}
