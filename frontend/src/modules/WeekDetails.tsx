import type { WeekMetrics } from "../lib/types";
import { fmtMin, fmtNum, typeLabel } from "../lib/format";
import { Banner, Card } from "../components/ui";

export function SessionsCard({ m }: { m: WeekMetrics }) {
  return (
    <Card title="Sessions" aside={<span className="muted small">done / planned</span>}>
      <ul className="rows">
        {m.sessions.map((row) => {
          const pct = row.intensity?.pct_time_in_target;
          return (
            <li key={row.planned_day}>
              <span className={`dot dot-${row.status}`} aria-hidden="true" />
              <span className="grow">
                {row.title}
                <span className="muted small block">
                  {pct != null ? `${pct}% in ${row.intensity?.target?.split(": ")[1]}`
                    : row.pace ?? (row.status === "missed" ? "Not recorded" : typeLabel[row.type])}
                </span>
              </span>
              <span className="num">
                {row.actual_duration_min != null ? fmtMin(row.actual_duration_min) : "–"}
                <span className="muted"> / {fmtMin(row.planned_duration_min)}</span>
              </span>
            </li>
          );
        })}
        {m.extra_activities.map((e) => (
          <li key={`${e.date}-${e.type}`}>
            <span className="dot dot-extra" aria-hidden="true" />
            <span className="grow">{typeLabel[e.type]}<span className="muted small block">Not in the plan</span></span>
            <span className="num">{fmtMin(e.duration_min)}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function RecoveryCard({ m }: { m: WeekMetrics }) {
  const r = m.recovery;
  const hrv = r.hrv_change_vs_baseline_pct;
  if (!r.days_with_data) {
    return (
      <Card title="Recovery">
        <p className="muted small">No sleep or heart-rate data for this week. Upload an export that includes it to see trends here.</p>
      </Card>
    );
  }
  return (
    <Card title="Recovery" aside={<span className="muted small">vs previous 3 weeks</span>}>
      <ul className="rows">
        <li><span className="grow k">Average sleep</span><span className="num">{fmtNum(r.avg_sleep_hours, "h")}</span></li>
        <li><span className="grow k">Nights under 6 h</span><span className={`num${(r.nights_under_6h_sleep ?? 0) >= 3 ? " tone-warn" : ""}`}>{r.nights_under_6h_sleep ?? "–"}</span></li>
        <li><span className="grow k">Resting heart rate</span><span className="num">{fmtNum(r.avg_resting_hr)} <span className="muted">/ {fmtNum(r.baseline_resting_hr)} bpm</span></span></li>
        <li><span className="grow k">HRV</span><span className="num">{fmtNum(r.avg_hrv_ms, "ms")} {hrv != null && <span className={hrv < -10 ? "tone-warn" : "muted"}>({hrv > 0 ? "+" : ""}{hrv}%)</span>}</span></li>
      </ul>
    </Card>
  );
}

export function DataWarnings({ m }: { m: WeekMetrics }) {
  if (!m.data_warnings.length) return null;
  return (
    <div className="stack">
      {m.data_warnings.map((w) => <Banner key={w} tone="warn">Check this: {w}</Banner>)}
    </div>
  );
}
