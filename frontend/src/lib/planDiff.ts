import type { PlannedSession, TrainingPlan } from "./types";

/** Key for one day of the plan, e.g. "2-Saturday". */
export const dayKey = (week: number, day: string) => `${week}-${day}`;

const fingerprint = (s?: PlannedSession) =>
  s ? [s.type, s.title, s.duration_min, s.distance_km, s.target_intensity.kind, s.target_intensity.value,
       (s.exercises ?? []).map((e) => `${e.name}:${e.detail}`).join(",")].join("|") : "";

/** Which days changed between two plan versions, so the UI can highlight them. */
export function diffPlans(before: TrainingPlan | null | undefined, after: TrainingPlan | null | undefined): Set<string> {
  const changed = new Set<string>();
  if (!before || !after) return changed;
  for (const w of after.weeks) {
    const old = before.weeks.find((x) => x.week_number === w.week_number);
    const days = new Set([...w.sessions.map((s) => s.day), ...(old?.sessions.map((s) => s.day) ?? [])]);
    for (const day of days) {
      const a = old?.sessions.find((s) => s.day === day && s.type !== "rest");
      const b = w.sessions.find((s) => s.day === day && s.type !== "rest");
      if (fingerprint(a) !== fingerprint(b)) changed.add(dayKey(w.week_number, day));
    }
  }
  return changed;
}
