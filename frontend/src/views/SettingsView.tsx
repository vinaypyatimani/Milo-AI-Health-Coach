import { useEffect, useState, type FormEvent } from "react";
import { api } from "../api/client";
import type { Profile } from "../api/types";
import { ConfirmButton } from "../components/ConfirmButton";

const EMPTY: Profile = { name: "", age: null, max_hr: null, tracker: "", notes: "" };

export function SettingsView({ notify, onDeleted }: { notify: (m: string) => void; onDeleted: () => void }) {
  const [p, setP] = useState<Profile>(EMPTY);
  const [model, setModel] = useState("");
  useEffect(() => {
    api.getProfile().then((x) => x && setP(x));
    api.health().then((h) => setModel(h.model)).catch(() => setModel("not reachable"));
  }, []);

  const save = async (e: FormEvent) => { e.preventDefault(); await api.saveProfile(p); notify("Profile saved"); };
  const del = async () => {
    await api.deleteAll(); setP(EMPTY); notify("All data deleted"); onDeleted();
  };
  const num = (v: string) => (v === "" ? null : Number(v));
  const estMax = p.age ? 220 - p.age : null;

  return (
    <div className="page" style={{ maxWidth: 760 }}>
      <header className="page-head">
        <div>
          <h1>Profile</h1>
          <p>Milo uses your age or max heart rate to work out your heart-rate zones.</p>
        </div>
      </header>

      <form className="panel form-grid" onSubmit={save}>
        <div className="field full"><label htmlFor="p-name">Name</label><input id="p-name" className="input" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} required /></div>
        <div className="field"><label htmlFor="p-age">Age</label><input id="p-age" className="input" type="number" min={10} max={100} value={p.age ?? ""} onChange={(e) => setP({ ...p, age: num(e.target.value) })} /></div>
        <div className="field"><label htmlFor="p-max">Max heart rate (optional)</label>
          <input id="p-max" className="input" type="number" min={120} max={230} value={p.max_hr ?? ""} placeholder={estMax ? `About ${estMax}, estimated from age` : ""} onChange={(e) => setP({ ...p, max_hr: num(e.target.value) })} /></div>
        <div className="field full"><label htmlFor="p-tracker">Fitness tracker</label><input id="p-tracker" className="input" value={p.tracker} onChange={(e) => setP({ ...p, tracker: e.target.value })} placeholder="e.g. Garmin Forerunner 265" /></div>
        <div className="full"><button className="btn btn-primary" type="submit">Save profile</button></div>
      </form>

      <section className="panel" style={{ marginTop: 20 }}>
        <ul className="rows">
          <li><span className="k">AI model</span><span>{model}</span></li>
          <li><span className="k">Where your data lives</span><span>On this server, in a local database</span></li>
        </ul>
      </section>

      <section style={{ marginTop: 36 }}>
        <h2>Delete your data</h2>
        <p className="muted" style={{ margin: "6px 0 14px", maxWidth: "60ch" }}>Permanently removes your profile, every plan version, all tracker data and your conversations with Milo.</p>
        <ConfirmButton className="btn btn-danger" label="Delete all my data" question="This can't be undone." confirmLabel="Yes, delete everything" onConfirm={del} />
      </section>
    </div>
  );
}
