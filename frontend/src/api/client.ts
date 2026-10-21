import type {
  ActivityItem, ChatMessage, ManualActivity, PlanResponse, Profile, ProgressWeek,
  TurnResponse, UploadReport, WeekMetrics,
} from "./types";

const BASE = import.meta.env.VITE_API_URL ?? "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: init?.body instanceof FormData ? init?.headers : { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    let detail = res.statusText;
    try { detail = (await res.json()).detail ?? detail; } catch { /* not JSON */ }
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  return res.json() as Promise<T>;
}

const json = (body: unknown) => JSON.stringify(body);

export const api = {
  health: () => request<{ ok: boolean; model: string; today: string }>("/api/health"),
  getProfile: () => request<Profile | null>("/api/profile"),
  saveProfile: (p: Profile) => request<Profile>("/api/profile", { method: "PUT", body: json(p) }),
  getPlan: () => request<PlanResponse>("/api/plan"),

  coachingConversation: () => request<ChatMessage[]>("/api/coaching"),
  coachingStart: () => request<TurnResponse>("/api/coaching/start", { method: "POST" }),
  coachingMessage: (text: string) =>
    request<TurnResponse>("/api/coaching/message", { method: "POST", body: json({ text }) }),

  weekMetrics: (week: number) => request<WeekMetrics>(`/api/weeks/${week}/metrics`),
  checkinConversation: (week: number) => request<ChatMessage[]>(`/api/checkin/${week}`),
  checkinStart: (week: number) => request<TurnResponse>(`/api/checkin/${week}/start`, { method: "POST" }),
  checkinMessage: (week: number, text: string) =>
    request<TurnResponse>(`/api/checkin/${week}/message`, { method: "POST", body: json({ text }) }),

  activities: () => request<ActivityItem[]>("/api/activities"),
  upload: (files: File[]) => {
    const form = new FormData();
    files.forEach((f) => form.append("files", f));
    return request<UploadReport>("/api/activities/upload", { method: "POST", body: form });
  },
  addManual: (a: ManualActivity) =>
    request<{ ok: boolean }>("/api/activities/manual", { method: "POST", body: json(a) }),
  deleteActivity: (id: number) => request<{ ok: boolean }>(`/api/activities/${id}`, { method: "DELETE" }),
  addRecovery: (r: { date: string; sleep_hours: number | null; resting_hr: number | null; hrv_ms: number | null }) =>
    request<{ ok: boolean }>("/api/recovery", { method: "POST", body: json(r) }),

  progress: () => request<ProgressWeek[]>("/api/progress"),
  deleteAll: () => request<{ ok: boolean }>("/api/data", { method: "DELETE" }),
};