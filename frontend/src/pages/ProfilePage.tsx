import { useState, type FormEvent } from "react";
import { api } from "../lib/api";
import { setQueryData, useQuery } from "../lib/query";
import type { Profile } from "../lib/types";
import { Card, Skeleton } from "../components/ui";
import { ConfirmButton } from "../components/ConfirmButton";

const EMPTY: Profile = { name: "", age: null, max_hr: null, tracker: "", notes: "" };

export default function ProfilePage({ notify, onDeleted }: { notify: (m: string) => void; onDeleted: () => void }) {
  const { data: saved, loading } = useQuery("profile", api.getProfile);
  const { data: health } = useQuery("health", api.health);
  return (
    <div className="page page-narrow">
      <header className="page-head">
        <div>
          <h1>Profile</h1>
          <p className="lede">Milo uses your age or max heart rate to work out your heart-rate zones.</p>
        </div>
      </header>
      <div className="modules one-col">
        {/* key: the form starts from the saved profile once it has loaded */}
        {loading ? <Skeleton height={260} /> : <ProfileForm key={saved ? "saved" : "new"} initial={saved ?? EMPTY} notify={notify} />}
        <Card title="About this app">
          <ul className="rows">
            <li><span className="grow k">AI model</span><span>{health?.model ?? "…"}</span></li>
            <li><span className="grow k">Where your data lives</span><span>On this server, in a local database</span></li>
          </ul>
        </Card>
        <Card title="Delete your data" className="card-danger">
          <p className="muted" style={{ marginBottom: 14 }}>Permanently removes your profile, every plan version, all tracker data and your conversations with Milo.</p>
          <ConfirmButton className="btn btn-danger" label="Delete all my data" question="This can't be undone." confirmLabel="Yes, delete everything"
            onConfirm={async () => { await api.deleteAll(); notify("All data deleted"); onDeleted(); }} />
        </Card>
      </div>
    </div>
  );
}

function ProfileForm({ initial, notify }: { initial: Profile; notify: (m: string) => void }) {
  const [p, setP] = useState<Profile>(initial);
  const num = (v: string) => (v === "" ? null : Number(v));
  const estMax = p.age ? 220 - p.age : null;
  const save = async (e: FormEvent) => {
    e.preventDefault();
    const s = await api.saveProfile(p);
    setQueryData("profile", s);
    notify("Profile saved");
  };
  return (
    <Card title="Your details">
      <form className="form-grid" onSubmit={save}>
        <div className="field full"><label htmlFor="p-name">Name</label><input id="p-name" className="input" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} required /></div>
        <div className="field"><label htmlFor="p-age">Age</label><input id="p-age" className="input" type="number" min={10} max={100} value={p.age ?? ""} onChange={(e) => setP({ ...p, age: num(e.target.value) })} /></div>
        <div className="field"><label htmlFor="p-max">Max heart rate (optional)</label>
          <input id="p-max" className="input" type="number" min={120} max={230} value={p.max_hr ?? ""} placeholder={estMax ? `About ${estMax}, from your age` : ""} onChange={(e) => setP({ ...p, max_hr: num(e.target.value) })} /></div>
        <div className="field full"><label htmlFor="p-tracker">Fitness tracker</label><input id="p-tracker" className="input" value={p.tracker} onChange={(e) => setP({ ...p, tracker: e.target.value })} placeholder="e.g. Garmin Forerunner 265" /></div>
        <div className="full"><button className="btn btn-primary" type="submit">Save profile</button></div>
      </form>
    </Card>
  );
}
