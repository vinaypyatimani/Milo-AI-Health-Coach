import { useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";
import { api } from "../api/client";
import type { ActivityItem, ManualActivity, SessionType, UploadReport } from "../api/types";
import { IconUpload } from "../components/icons";
import { fmtDate, fmtMin, fmtNum, typeLabel } from "../format";

const FORMATS = [".fit", ".gpx", ".tcx", ".csv"];
const TYPES: SessionType[] = ["run", "walk", "cycling", "swim", "strength", "mobility", "other"];
const today = () => new Date().toISOString().slice(0, 10);

export function DataView({ notify }: { notify: (msg: string) => void }) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [report, setReport] = useState<UploadReport | null>(null);
  const [uploading, setUploading] = useState(false);
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<ManualActivity>({ date: today(), time: "18:00", type: "run", duration_min: 30, distance_km: null, avg_hr: null, notes: "" });

  const refresh = () => api.activities().then(setItems).catch((e) => setError(e.message));
  useEffect(() => { refresh(); }, []);

  const upload = async (files: File[]) => {
    if (!files.length) return;
    setUploading(true); setError(null);
    try {
      const r = await api.upload(files);
      setReport(r);
      const added = r.files.reduce((n, f) => n + (f.ok ? f.activities_added : 0), 0);
      notify(`${added} workout${added === 1 ? "" : "s"} imported`);
      refresh();
    } catch (e) { setError((e as Error).message); } finally { setUploading(false); }
  };

  const onDrop = (e: DragEvent) => { e.preventDefault(); setOver(false); upload(Array.from(e.dataTransfer.files)); };

  const addManual = async (e: FormEvent) => {
    e.preventDefault(); setError(null);
    try { await api.addManual(form); notify("Workout added"); refresh(); }
    catch (err) { setError((err as Error).message); }
  };

  const remove = async (id: number) => { await api.deleteActivity(id); notify("Workout removed"); refresh(); };

  const set = <K extends keyof ManualActivity>(k: K, v: ManualActivity[K]) => setForm((f) => ({ ...f, [k]: v }));
  const num = (v: string) => (v === "" ? null : Number(v));

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Tracker data</h1>
          <p>Export workouts from your watch or app and drop them here. Milo uses them to compare your week with the plan.</p>
        </div>
      </header>

      <div className="grid-2">
        <section>
          <div
            className={`drop${over ? " over" : ""}`} role="button" tabIndex={0}
            onClick={() => fileRef.current?.click()}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={onDrop}
            aria-label="Upload workout files"
          >
            <IconUpload />
            <strong>{uploading ? "Importing…" : "Drop files or choose from your computer"}</strong>
            <span className="muted small">Works with Garmin, Polar, Suunto, Coros, Wahoo and more</span>
            <div className="formats">{FORMATS.map((f) => <span className="chip" key={f}>{f}</span>)}</div>
            <input ref={fileRef} type="file" multiple hidden accept=".fit,.gpx,.tcx,.csv"
                   onChange={(e) => { upload(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
          </div>

          {report && (
            <ul className="rows" style={{ marginTop: 14 }}>
              {report.files.map((f) => (
                <li key={f.file}>
                  <span>{f.file}</span>
                  {f.ok
                    ? <span className="muted small">{f.activities_added} added{f.duplicates_skipped ? `, ${f.duplicates_skipped} already here` : ""}{f.recovery_days ? `, ${f.recovery_days} days of recovery data` : ""}</span>
                    : <span className="small" style={{ color: "var(--urgent)" }}>{f.error}</span>}
                </li>
              ))}
            </ul>
          )}
          {error && <div className="banner banner-error" style={{ marginTop: 14 }}>{error}</div>}

          <h2 style={{ margin: "36px 0 14px" }}>Imported workouts</h2>
          {items.length === 0 ? (
            <p className="muted">No workouts yet. Upload a file or add one by hand.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Date</th><th>Type</th><th className="r">Time</th><th className="r">Distance</th><th className="r">Avg HR</th><th>Source</th><th /></tr></thead>
                <tbody>
                  {[...items].reverse().map((a) => (
                    <tr key={a.id}>
                      <td>{fmtDate(a.start_time)}</td>
                      <td>{typeLabel[a.type]}</td>
                      <td className="r">{fmtMin(a.duration_min)}</td>
                      <td className="r">{fmtNum(a.distance_km, "km")}</td>
                      <td className="r">{a.avg_hr ? Math.round(a.avg_hr) : "–"}</td>
                      <td className="muted">{a.source.replace("_", " ")}</td>
                      <td className="r"><button className="btn btn-ghost small" onClick={() => remove(a.id)} aria-label={`Remove ${typeLabel[a.type]} on ${fmtDate(a.start_time)}`}>Remove</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-head"><h3>Add a workout by hand</h3></div>
          <p className="muted small" style={{ marginBottom: 16 }}>For days without your watch.</p>
          <form className="form-grid" onSubmit={addManual}>
            <div className="field"><label htmlFor="m-date">Date</label><input id="m-date" className="input" type="date" value={form.date} onChange={(e) => set("date", e.target.value)} required /></div>
            <div className="field"><label htmlFor="m-time">Start time</label><input id="m-time" className="input" type="time" value={form.time} onChange={(e) => set("time", e.target.value)} /></div>
            <div className="field"><label htmlFor="m-type">Type</label>
              <select id="m-type" className="select" value={form.type} onChange={(e) => set("type", e.target.value as SessionType)}>
                {TYPES.map((t) => <option key={t} value={t}>{typeLabel[t]}</option>)}
              </select></div>
            <div className="field"><label htmlFor="m-dur">Duration (min)</label><input id="m-dur" className="input" type="number" min={1} value={form.duration_min} onChange={(e) => set("duration_min", Number(e.target.value))} required /></div>
            <div className="field"><label htmlFor="m-dist">Distance (km)</label><input id="m-dist" className="input" type="number" step="0.01" min={0} value={form.distance_km ?? ""} onChange={(e) => set("distance_km", num(e.target.value))} /></div>
            <div className="field"><label htmlFor="m-hr">Average heart rate</label><input id="m-hr" className="input" type="number" min={30} max={240} value={form.avg_hr ?? ""} onChange={(e) => set("avg_hr", num(e.target.value))} /></div>
            <div className="field full"><label htmlFor="m-notes">Notes</label><input id="m-notes" className="input" value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="How did it feel?" /></div>
            <div className="full"><button className="btn btn-primary" type="submit">Add workout</button></div>
          </form>
        </section>
      </div>
    </div>
  );
}