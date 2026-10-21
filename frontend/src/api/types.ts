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
}

export interface PlanWeek { week_number: number; focus: string; sessions: PlannedSession[] }
export interface TrainingPlan { goal: string; start_date: string; weeks: PlanWeek[] }

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
