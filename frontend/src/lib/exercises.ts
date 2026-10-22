import type { Exercise, PlannedSession } from "./types";
import { fmtMin, typeLabel } from "./format";

const FORM_TYPES = new Set(["strength", "mobility"]);

/**
 * The exercises of a session. Plans made before exercises existed only have
 * notes like "Squats, lunges, push-ups", so those are split into a list.
 */
export function exercisesFor(s: PlannedSession): Exercise[] {
  if (s.exercises?.length) return s.exercises;
  const parts = s.notes.split(/[,;]/).map((x) => x.trim()).filter(Boolean);
  if (FORM_TYPES.has(s.type) && parts.length > 1) {
    return parts.map((p) => ({ name: p[0].toUpperCase() + p.slice(1), detail: "", video_query: "" }));
  }
  const detail = [fmtMin(s.duration_min), s.target_intensity.kind !== "none" ? s.target_intensity.value : ""].filter(Boolean).join(", ");
  return [{ name: s.title || typeLabel[s.type], detail, video_query: "" }];
}

/** What to search for a how-to video, or null when a video wouldn't help (a cool-down walk). */
export function videoQuery(e: Exercise, s: PlannedSession): string | null {
  if (e.video_query.trim()) return e.video_query.trim();
  if (FORM_TYPES.has(s.type)) return `${e.name} proper form`;
  return null;
}
