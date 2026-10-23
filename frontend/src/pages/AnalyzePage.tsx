import { useEffect, useRef, useState } from "react";
import { api, isDemo } from "../lib/api";
import { invalidate, useQuery } from "../lib/query";
import { fmtDate, typeLabel } from "../lib/format";
import { Banner, Card, Segmented, Skeleton } from "../components/ui";
import { ChatPanel } from "../chat/ChatPanel";
import { useConversation } from "../chat/useConversation";
import { UploadCard, dataChanged } from "../modules/DataModules";
import { OtherDevices, PolarCard } from "../modules/ConnectCards";
import { Findings, StatTiles, WeeklyBars, ZoneBar } from "../modules/AnalysisCharts";

const PERIODS = [
  { value: 28, label: "4 weeks" },
  { value: 56, label: "8 weeks" },
  { value: 84, label: "12 weeks" },
  { value: 0, label: "All" },
];

/** After Polar sends the user back: "#analyze?connected=polar" or "#analyze?polar_error=...". */
function readReturn(): { connected: boolean; error: string | null } {
  const q = new URLSearchParams(window.location.hash.split("?")[1] ?? "");
  return { connected: q.get("connected") === "polar", error: q.get("polar_error") };
}

/**
 * Analyze: upload or connect, see the numbers, and let Milo write a report.
 * No plan needed. The numbers come from the backend; Milo explains them.
 */
export default function AnalyzePage({ notify }: { notify: (m: string) => void }) {
  const [days, setDays] = useState(56);
  const { data: a, error } = useQuery(`analysis:${days}`, () => api.analysis(days));
  const conv = useConversation({ mode: "analysis", days }, () => {});
  const [polarError, setPolarError] = useState<string | null>(() => readReturn().error);
  const handled = useRef(false);

  // Coming back from Polar's sign-in: import right away, then tidy the URL.
  useEffect(() => {
    if (handled.current) return;
    handled.current = true;
    const ret = readReturn();
    if (!ret.connected && !ret.error) return;
    window.history.replaceState(null, "", "#analyze");
    if (ret.connected) {
      notify("Polar connected, importing…");
      api.polarSync()
        .then((r) => { notify(`Polar: ${r.new_workouts} workout${r.new_workouts === 1 ? "" : "s"} imported`); dataChanged(); invalidate("connect"); })
        .catch((e: Error) => setPolarError(e.message));
    }
  }, [notify]);

  const hasData = !!a && a.data.activities > 0;
  const hasReport = conv.messages.length > 0;

  const sources = (
    <div className="analyze-sources">
      <UploadCard notify={notify} />
      <PolarCard notify={notify} />
      <OtherDevices />
    </div>
  );

  if (!a && !error) return <div className="page"><Skeleton height={48} /><div style={{ height: 20 }} /><Skeleton height={260} /></div>;

  // Nothing uploaded yet: just the ways to get data in.
  if (!hasData) {
    return (
      <div className="page">
        <header className="page-head">
          <h1>Analyze your training</h1>
          <p className="lede">Upload workouts from any watch or app, or connect Polar. Milo looks at volume, intensity, consistency and recovery, then writes a report with suggestions. No plan needed.</p>
        </header>
        {error && <Banner tone="error">{error.message}</Banner>}
        {a && days !== 0 && <p className="muted small" style={{ marginBottom: 12 }}>No workouts found yet.</p>}
        {polarError && <div style={{ marginBottom: 12 }}><Banner tone="error">Polar: {polarError}</Banner></div>}
        {sources}
      </div>
    );
  }

  return (
    <div className="page page-wide plan-layout">
      <aside className="plan-chat">
        <ChatPanel conv={conv} title="Analysis" hasPlan={false}
          onStartOver={async () => { await api.clearConversation({ mode: "analysis", days }); }}
          intro={{ text: `Milo reads the numbers for ${PERIODS.find((p) => p.value === days)?.label.toLowerCase() ?? "this period"} and writes a report: what's going well, what to watch, and what to do next.`, button: "Analyze my training" }}
          placeholder="Ask about your report, e.g. Why is my resting HR up?" savedLabel="" />
        {hasReport && !isDemo && (
          <a className="btn btn-sm report-pdf" href={api.reportPdfUrl()} download>Download report (PDF)</a>
        )}
      </aside>

      <div className="plan-main">
        <header className="section-head">
          <div>
            <h1 className="plan-goal">Your training</h1>
            <p className="muted small">
              {fmtDate(a.period.from)} – {fmtDate(a.period.to)} · {a.data.activities} workouts
              {a.data.recovery_days ? ` · ${a.data.recovery_days} nights of recovery data` : ""}
              {a.data.days_since_last_workout ? ` · last workout ${a.data.days_since_last_workout} days ago` : ""}
            </p>
          </div>
          <Segmented<number> label="Period" value={days} onChange={setDays} options={PERIODS} />
        </header>
        {hasReport && <p className="muted small period-note">Changed the period? Use <em>Start over</em> in the chat for a new report.</p>}
        {polarError && <Banner tone="error">Polar: {polarError}</Banner>}

        <StatTiles a={a} />

        <section className="section">
          <div className="section-head"><h2>Minutes per week</h2></div>
          <WeeklyBars weeks={a.weekly ?? []} />
        </section>

        <div className="two-col section">
          <section>
            <h2 className="sub-h">Intensity</h2>
            <ZoneBar a={a} />
          </section>
          <section>
            <h2 className="sub-h">Sports</h2>
            <ul className="sport-list">
              {a.by_sport!.map((s) => (
                <li key={s.type}>
                  <span className="grow"><i className="swatch" style={{ background: `var(--sport-${s.type})` }} />{typeLabel[s.type] ?? s.type}</span>
                  <span className="muted small num">{s.sessions}× · {Math.round(s.minutes / 60 * 10) / 10} h{s.distance_km ? ` · ${s.distance_km} km` : ""}</span>
                  <b className="num">{s.share_pct}%</b>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="section">
          <div className="section-head"><h2>What the numbers say</h2></div>
          <Findings flags={a.flags} />
        </section>

        <details className="section add-data">
          <summary>Add more data</summary>
          {sources}
        </details>

        <Card className="section-card">
          <p className="muted small">Every number here is calculated by the app from your files; Milo only explains them. Milo is a coach, not a doctor.</p>
        </Card>
      </div>
    </div>
  );
}
