import type {
  ActivityItem, ChatMessage, ChatTarget, ManualActivity, PlanResponse, Profile, ProgressWeek,
  StreamDone, StreamHandlers, StreamMeta, UploadReport, VideoResult, WeekMetrics,
} from "./types";
import { postEvents } from "./sse";
import { mockApi } from "./mock";

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

/** One chat turn, streamed. text = null starts a new conversation. Resolves with the final result. */
function chatStream(target: ChatTarget, text: string | null, handlers: StreamHandlers): Promise<StreamDone> {
  return new Promise<StreamDone>((resolve, reject) => {
    let finished = false;
    const body = { mode: target.mode, week: target.mode === "checkin" ? target.week : null, text };
    postEvents(`${BASE}/api/chat/stream`, body, (type, data) => {
      if (type === "meta") handlers.onMeta?.(data as unknown as StreamMeta);
      else if (type === "delta") handlers.onDelta?.(String(data.text ?? ""));
      else if (type === "status") handlers.onStatus?.(String(data.text ?? ""));
      else if (type === "done") { finished = true; resolve(data as unknown as StreamDone); }
      else if (type === "error") { finished = true; reject(new Error(String(data.detail ?? "Unknown error"))); }
    })
      .then(() => { if (!finished) reject(new Error("The connection closed before Milo finished.")); })
      .catch(reject);
  });
}

export const realApi = {
  health: () => request<{ ok: boolean; model: string; today: string }>("/api/health"),
  getProfile: () => request<Profile | null>("/api/profile"),
  saveProfile: (p: Profile) => request<Profile>("/api/profile", { method: "PUT", body: json(p) }),
  getPlan: () => request<PlanResponse>("/api/plan"),

  conversation: (target: ChatTarget) =>
    request<ChatMessage[]>(target.mode === "coaching" ? "/api/coaching" : `/api/checkin/${target.week}`),
  chatStream,

  weekMetrics: (week: number) => request<WeekMetrics>(`/api/weeks/${week}/metrics`),

  activities: () => request<ActivityItem[]>("/api/activities"),
  upload: (files: File[]) => {
    const form = new FormData();
    files.forEach((f) => form.append("files", f));
    return request<UploadReport>("/api/activities/upload", { method: "POST", body: form });
  },
  addManual: (a: ManualActivity) =>
    request<{ ok: boolean }>("/api/activities/manual", { method: "POST", body: json(a) }),
  deleteActivity: (id: number) => request<{ ok: boolean }>(`/api/activities/${id}`, { method: "DELETE" }),

  progress: () => request<ProgressWeek[]>("/api/progress"),
  deleteAll: () => request<{ ok: boolean }>("/api/data", { method: "DELETE" }),

  /** Start over: remove the plan (all versions) and every conversation. */
  clearPlan: () => request<{ ok: boolean }>("/api/plan", { method: "DELETE" }),
  /** Start over: clear one conversation, keep the plan. */
  clearConversation: (t: ChatTarget) =>
    request<{ ok: boolean }>(t.mode === "coaching" ? "/api/conversations/coaching" : `/api/conversations/checkin?week=${t.week}`, { method: "DELETE" }),
  /** How-to videos for one exercise (YouTube, cached on the server). */
  videos: (q: string) => request<VideoResult>(`/api/videos?q=${encodeURIComponent(q)}`),
  /** Link for downloading the plan as a PDF or an Excel file. */
  exportUrl: (fmt: "pdf" | "xlsx") => `${BASE}/api/plan/export.${fmt}`,
};

export type Api = typeof realApi;
export const isDemo = import.meta.env.VITE_DEMO === "true";
export const api: Api = isDemo ? mockApi : realApi;
