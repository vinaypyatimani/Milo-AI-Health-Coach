import { useRef, useState, type DragEvent, type FormEvent } from "react";
import { api } from "../lib/api";
import { invalidate, useQuery } from "../lib/query";
import type { ActivityItem, ManualActivity, SessionType, UploadReport } from "../lib/types";
import { addDays, fmtDate, fmtMin, fmtNum, localToday, planBegins, typeLabel } from "../lib/format";
import { Banner, Card } from "../components/ui";
import { IconUpload } from "../components/icons";

const FORMATS = [".fit", ".gpx", ".tcx", "Apple Health .zip", ".csv"];
const TYPES: SessionType[] = ["run", "walk", "cycling", "swim", "strength", "mobility", "other"];
const today = localToday; // the user's date, not UTC (matters just after midnight)

/** After new data arrives, everything that depends on it refreshes itself. */
export const dataChanged = () => invalidate("activities", "metrics:", "progress", "analysis:");

export function UploadCard({ notify }: { notify: (m: string) => void }) {
  const [report, setReport] = useState<UploadReport | null>(null);
  const [uploading, setUploading] = useState(false);
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = async (files: File[]) => {
    if (!files.length) return;
    setUploading(true); setError(null);
    try {
      const r = await api.upload(files);
      setReport(r);
      const added = r.files.reduce((n, f) => n + (f.ok ? f.activities_added : 0), 0);
      notify(`${added} workout${added === 1 ? "" : "s"} imported`);
      dataChanged();
    } catch (e) { setError((e as Error).message); } finally { setUploading(false); }
  };

  const onDrop = (e: DragEvent) => { e.preventDefault(); setOver(false); upload(Array.from(e.dataTransfer.files)); };

  return (
    <Card title="Import workouts">
      <div className={`drop${over ? " over" : ""}${uploading ? " busy" : ""}`} role="button" tabIndex={0}
           onClick={() => fileRef.current?.click()}
           onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && fileRef.current?.click()}
           onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={onDrop}
           aria-label="Upload workout files">
        <IconUpload width={26} height={26} />
        <strong>{uploading ? "Importing…" : "Drop files or choose from your computer"}</strong>
        <span className="muted small">Garmin, Polar, Suunto, Coros, Wahoo, Apple Watch and more</span>
        <div className="formats">{FORMATS.map((f) => <span className="chip" key={f}>{f}</span>)}</div>
        <input ref={fileRef} type="file" multiple hidden accept=".fit,.gpx,.tcx,.zip,.xml,.csv"
               onChange={(e) => { upload(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
      </div>
      {report && (() => {
        const ok = report.files.filter((f) => f.ok);
        const added = ok.reduce((n, f) => n + f.activities_added, 0);
        const dupes = ok.reduce((n, f) => n + f.duplicates_skipped, 0);
        const days = ok.reduce((n, f) => n + f.recovery_days, 0);
        const failed = report.files.length - ok.length;
        const list = (
          <ul className="rows" style={{ marginTop: 12 }}>
            {report.files.map((f) => (
              <li key={f.file}>
                <span className="grow">{f.file}</span>
                {f.ok
                  ? <span className="muted small">{f.activities_added} added{f.duplicates_skipped ? `, ${f.duplicates_skipped} already here` : ""}{f.recovery_days ? `, ${f.recovery_days} days of recovery data` : ""}</span>
                  : <span className="small tone-urgent">{f.error}</span>}
              </li>
            ))}
          </ul>
        );
        // Many files at once (a whole folder): one summary line, details on demand.
        return report.files.length <= 5 ? list : (
          <details className="upload-summary">
            <summary>
              {report.files.length} files: {added} workout{added === 1 ? "" : "s"} added
              {dupes ? `, ${dupes} already here` : ""}{days ? `, ${days} days of recovery data` : ""}
              {failed ? <span className="tone-urgent">, {failed} couldn't be read</span> : ""}
            </summary>
            {list}
          </details>
        );
      })()}
      {error && <div style={{ marginTop: 12 }}><Banner tone="error">{error}</Banner></div>}
    </Card>
  );
}

export function ManualEntryCard({ notify }: { notify: (m: string) => void }) {
  const [form, setForm] = useState<ManualActivity>({ date: today(), time: "18:00", type: "run", duration_min: 30, distance_km: null, avg_hr: null, notes: "" });
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof ManualActivity>(k: K, v: ManualActivity[K]) => setForm((f) => ({ ...f, [k]: v }));
  const num = (v: string) => (v === "" ? null : Number(v));
  const { data: plan } = useQuery("plan", api.getPlan);
  const p = plan?.plan;
  const planEnd = p ? addDays(p.start_date, p.weeks.length * 7 - 1) : null;
  const outside = p && planEnd && (form.date < planBegins(p) || form.date > planEnd);

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setError(null);
    try { await api.addManual(form); notify("Workout added"); dataChanged(); }
    catch (err) { setError((err as Error).message); }
  };

  return (
    <Card title="Add a workout by hand" aside={<span className="muted small">for days without your watch</span>}>
      <form className="form-grid" onSubmit={submit}>
        <div className="field"><label htmlFor="m-date">Date</label><input id="m-date" className="input" type="date" value={form.date} onChange={(e) => set("date", e.target.value)} required /></div>
        <div className="field"><label htmlFor="m-time">Start time</label><input id="m-time" className="input" type="time" value={form.time} onChange={(e) => set("time", e.target.value)} /></div>
        <div className="field"><label htmlFor="m-type">Type</label>
          <select id="m-type" className="input" value={form.type} onChange={(e) => set("type", e.target.value as SessionType)}>
            {TYPES.map((t) => <option key={t} value={t}>{typeLabel[t]}</option>)}
          </select></div>
        <div className="field"><label htmlFor="m-dur">Duration (min)</label><input id="m-dur" className="input" type="number" min={1} value={form.duration_min} onChange={(e) => set("duration_min", Number(e.target.value))} required /></div>
        <div className="field"><label htmlFor="m-dist">Distance (km)</label><input id="m-dist" className="input" type="number" step="0.01" min={0} value={form.distance_km ?? ""} onChange={(e) => set("distance_km", num(e.target.value))} /></div>
        <div className="field"><label htmlFor="m-hr">Average heart rate</label><input id="m-hr" className="input" type="number" min={30} max={240} value={form.avg_hr ?? ""} onChange={(e) => set("avg_hr", num(e.target.value))} /></div>
        <div className="field full"><label htmlFor="m-notes">Notes</label><input id="m-notes" className="input" value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="How did it feel?" /></div>
        {outside && <p className="full small tone-warn">This date is outside your plan ({fmtDate(planBegins(p!))} – {fmtDate(planEnd!)}), so it will be saved but won't count on the Progress page.</p>}
        <div className="full"><button className="btn btn-primary" type="submit">Add workout</button></div>
        {error && <div className="full"><Banner tone="error">{error}</Banner></div>}
      </form>
    </Card>
  );
}

export function ActivityTable({ items, notify }: { items: ActivityItem[]; notify: (m: string) => void }) {
  const remove = async (id: number) => { await api.deleteActivity(id); notify("Workout removed"); dataChanged(); };
  if (!items.length) {
    return <Card title="Imported workouts"><p className="muted">No workouts yet. Upload a file or add one by hand.</p></Card>;
  }
  return (
    <Card title="Imported workouts" aside={<span className="muted small">{items.length} total</span>}>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Type</th><th className="r">Time</th><th className="r">Distance</th><th className="r">Avg HR</th><th>Source</th><th><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>
            {[...items].reverse().map((a) => (
              <tr key={a.id}>
                <td>{fmtDate(a.start_time)}</td>
                <td>{typeLabel[a.type]}</td>
                <td className="r">{fmtMin(a.duration_min)}</td>
                <td className="r">{fmtNum(a.distance_km, "km")}</td>
                <td className="r">{a.avg_hr ? Math.round(a.avg_hr) : "–"}</td>
                <td className="muted">{a.source.replace("_", " ")}</td>
                <td className="r"><button className="link-btn" type="button" onClick={() => remove(a.id)} aria-label={`Remove ${typeLabel[a.type]} on ${fmtDate(a.start_time)}`}>Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
