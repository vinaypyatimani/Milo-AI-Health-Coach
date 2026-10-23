import { useState } from "react";
import { api, isDemo } from "../lib/api";
import { invalidate, useQuery } from "../lib/query";
import { fmtDate } from "../lib/format";
import { Banner, Card } from "../components/ui";
import { analysisDataChanged } from "./DataModules";

/** Connect a Polar account. The checkbox is the explicit permission Polar's licence asks for. */
export function PolarCard({ notify }: { notify: (m: string) => void }) {
  const { data } = useQuery("connect", api.connections);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const p = data?.polar;

  const sync = async () => {
    setBusy(true); setError(null);
    try {
      const r = await api.polarSync();
      notify(`Polar: ${r.new_workouts} new workout${r.new_workouts === 1 ? "" : "s"}${r.recovery_days ? `, ${r.recovery_days} nights` : ""}`);
      if (r.warnings.length) setError(r.warnings.slice(0, 3).join(" "));
      analysisDataChanged(); invalidate("connect");
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  const disconnect = async () => {
    setBusy(true);
    try { await api.polarDisconnect(); notify("Polar disconnected"); invalidate("connect"); } finally { setBusy(false); }
  };

  return (
    <Card title="Polar" aside={p?.connected ? <span className="chip">Connected</span> : undefined}>
      {!p ? <p className="muted small">Checking…</p> : p.connected ? (
        <>
          <p className="muted small">
            Connected {p.connected_at ? `on ${fmtDate(p.connected_at)}` : ""} · {p.imported} workout{p.imported === 1 ? "" : "s"} imported
            {p.last_sync ? ` · last sync ${fmtDate(p.last_sync)}, ${p.last_sync.slice(11, 16)}` : ""}
          </p>
          <p className="muted small">Polar shares the last 30 days, so sync now and then.</p>
          <div className="row-actions">
            <button className="btn btn-sm btn-primary" type="button" disabled={busy} onClick={sync}>{busy ? "Syncing…" : "Sync now"}</button>
            <button className="btn btn-sm" type="button" disabled={busy} onClick={disconnect}>Disconnect</button>
          </div>
        </>
      ) : !p.available ? (
        <p className="muted small">
          {isDemo ? "Not available in the demo." : <>Not set up on this server yet. The owner adds <code>POLAR_CLIENT_ID</code> and <code>POLAR_CLIENT_SECRET</code> (see README).</>}
        </p>
      ) : (
        <>
          <p className="muted small">Imports your workouts, sleep and overnight heart rate from Polar Flow (last 30 days) into Analyze.</p>
          <label className="consent">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <span>I agree that Milo copies my Polar workouts and sleep data and sends them to the AI model to write my analysis. I can disconnect and delete them any time.</span>
          </label>
          {agree
            ? <a className="btn btn-sm btn-primary" href={api.polarConnectUrl()}>Connect Polar</a>
            : <button className="btn btn-sm btn-primary" type="button" disabled title="Tick the box first">Connect Polar</button>}
        </>
      )}
      {error && <div style={{ marginTop: 10 }}><Banner tone="warn">{error}</Banner></div>}
    </Card>
  );
}

const GUIDES: { brand: string; steps: string }[] = [
  { brand: "Garmin", steps: "Garmin Connect on the web → open an activity → gear icon → Export Original (.fit). For everything: Account settings → Data Management → Export Your Data." },
  { brand: "Apple Watch", steps: "iPhone Health app → your picture → Export All Health Data → upload the export.zip here." },
  { brand: "Strava", steps: "Open an activity → ⋯ → Export Original. For everything: Settings → My Account → Download or Delete Your Account → Request Your Archive." },
  { brand: "Coros", steps: "Coros app → open the workout → share icon → export as .fit." },
  { brand: "Suunto", steps: "Suunto app → open the workout → ⋯ → export or share the .fit / .gpx file." },
  { brand: "Polar Flow", steps: "flow.polar.com → open a training session → ⋯ → Export session (TCX or GPX)." },
  { brand: "Wahoo", steps: "Wahoo app → workout history → open a workout → share → .fit file." },
];

/** Why most brands are upload-only, and how to get the files. */
export function OtherDevices() {
  return (
    <Card title="Other watches and apps">
      <p className="muted small">
        Garmin isn't accepting new app connections right now, and Strava's rules don't allow apps to pass its data to an AI.
        Exporting your own files works with every brand:
      </p>
      <div className="guides">
        {GUIDES.map((g) => (
          <details key={g.brand}>
            <summary>{g.brand}</summary>
            <p className="small">{g.steps}</p>
          </details>
        ))}
      </div>
    </Card>
  );
}
