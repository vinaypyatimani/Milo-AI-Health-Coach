export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function shortDay(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-GB", { weekday: "short" });
}

export function fmtDate(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function fmtRange(startIso: string): string {
  return `${fmtDate(startIso)} – ${fmtDate(addDays(startIso, 6))}`;
}

export function fmtMin(min: number | null | undefined): string {
  if (min == null) return "–";
  const m = Math.round(min);
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60 ? `${m % 60} min` : ""}`.trim() : `${m} min`;
}

export function fmtNum(n: number | null | undefined, unit = "", digits = 1): string {
  if (n == null) return "–";
  const s = Number.isInteger(n) ? String(n) : n.toFixed(digits);
  return unit ? `${s} ${unit}` : s;
}

export const typeLabel: Record<string, string> = {
  run: "Run", strength: "Strength", cycling: "Ride", swim: "Swim", walk: "Walk",
  mobility: "Mobility", rest: "Rest", other: "Other",
};