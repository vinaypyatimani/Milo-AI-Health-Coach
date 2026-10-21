import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import type { ChatMessage, PlanResponse, WeekMetrics } from "../api/types";
import { Chat } from "../components/Chat";
import { WeekStrip } from "../components/WeekStrip";
import { IconAlert } from "../components/icons";
import { addDays, fmtMin, fmtNum, fmtRange, typeLabel } from "../format";

interface Props { plan: PlanResponse; onPlanChanged: () => void; goTo: (view: "data" | "coach") => void }

export function CheckinView({ plan, onPlanChanged, goTo }: Props) {
  const p = plan.plan!;
  const current = plan.current_week ?? 1;
  // Default to last week: that's the one with a full week of data to review.
  const [week, setWeek] = useState(Math.max(1, current - 1));
  const [metrics, setMetrics] = useState<WeekMetrics | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urgent, setUrgent] = useState<string | null>(null);

  const load = useCallback(async (w: number) => {
    setError(null); setUrgent(null); setMetrics(null);
    try {
      const [m, c] = await Promise.all([api.weekMetrics(w), api.checkinConversation(w)]);
      setMetrics(m); setMessages(c);
    } catch (e) { setError((e as Error).message); }
  }, []);

  useEffect(() => { load(week); }, [week, load]);

  const run = async (fn: () => Promise<{ plan_saved: boolean; urgent_banner: string | null; plan_error: string | null }>) => {
    setBusy(true); setError(null);
    try {
      const r = await fn();
      setUrgent(r.urgent_banner);
      if (r.plan_error) setError(`The updated plan couldn't be saved: ${r.plan_error}`);
      setMessages(await api.checkinConversation(week));
      if (r.plan_saved) onPlanChanged();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  const start = () => run(() => api.checkinStart(week));
  const send = (text: string) => {
    setMessages((m) => [...m, { role: "user", content: text }]);
    run(() => api.checkinMessage(week, text));
  };

  const s = metrics?.summary;
  const r = metrics?.recovery;
  const done = s ? s.completed_on_planned_day + s.completed_on_other_day : 0;
  const rhrDelta = r?.resting_hr_change_vs_baseline;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Week {week} check-in</h1>
          <p>{fmtRange(addDays(p.start_date, (week - 1) * 7))}. {metrics?.week_focus ?? ""}</p>
        </div>
        <div className="segmented" role="group" aria-label="Choose week">
          {p.weeks.map((w) => (
            <button key={w.week_number} aria-pressed={w.week_number === week}
                    disabled={w.week_number > current} onClick={() => setWeek(w.week_number)}>
              Week {w.week_number}
            </button>
          ))}
        </div>
      </header>

      <section className="panel" aria-label="Planned vs actual">
        <WeekStrip plan={p} week={week} metrics={metrics} />
      </section>

      {s && r && (
        <div className="stats">
          <div className="stat">
            <div className="stat-value">{done}<small>of {s.planned_sessions}</small></div>
            <div className="stat-label">Sessions done{s.completed_on_other_day ? `, ${s.completed_on_other_day} moved` : ""}</div>
          </div>
          <div className="stat">
            <div className="stat-value">{Math.round(s.actual_duration_min)}<small>of {Math.round(s.planned_duration_min)} min</small></div>
            <div className="stat-label">Training time</div>
          </div>
          <div className="stat">
            <div className="stat-value">{s.pct_time_in_target_hr_zone ?? "–"}<small>{s.pct_time_in_target_hr_zone != null ? "%" : ""}</small></div>
            <div className="stat-label">{s.pct_time_in_target_hr_zone != null ? "Time in target heart-rate zone" : "No heart-rate data"}</div>
          </div>
          <div className="stat">
            <div className="stat-value">{fmtNum(r.avg_resting_hr)}<small>bpm</small></div>
            <div className="stat-label">
              Resting heart rate{rhrDelta != null && (
                <span className={rhrDelta > 2 ? " delta-up" : ""}>, {rhrDelta > 0 ? "+" : ""}{rhrDelta} vs usual</span>)}
            </div>
          </div>
        </div>
      )}

      {metrics?.data_warnings.map((w) => (
        <div key={w} className="banner banner-warn" style={{ marginBottom: 12 }}><IconAlert />Check this: {w}</div>
      ))}

      <div className="workspace" style={{ marginTop: 8 }}>
        {messages.length || busy ? (
          <Chat messages={messages} busy={busy} onSend={send} placeholder="Tell Milo how the week felt…"
                urgentBanner={urgent} error={error} savedLabel="Plan updated" />
        ) : (
          <div className="empty">
            <h2>{metrics && !metrics.has_tracker_data ? "No tracker data for this week" : "Ready when you are"}</h2>
            <p>{metrics && !metrics.has_tracker_data
              ? "Upload your workouts first, or do the check-in from memory. Milo will work with what you tell it."
              : "Milo reviews the numbers above, asks how you felt, and suggests changes for next week. Nothing changes without your OK."}</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-primary" onClick={start} disabled={busy || !metrics}>Start check-in</button>
              {metrics && !metrics.has_tracker_data && <button className="btn" onClick={() => goTo("data")}>Upload workouts</button>}
            </div>
            {error && <div className="banner banner-error" style={{ marginTop: 16 }}>{error}</div>}
          </div>
        )}

        <div className="side">
          {metrics && (
            <div className="panel">
              <div className="panel-head"><h3>Sessions</h3></div>
              <ul className="rows">
                {metrics.sessions.map((row) => (
                  <li key={row.planned_day}>
                    <span>
                      {row.title}
                      <span className="muted small" style={{ display: "block" }}>
                        {row.intensity?.pct_time_in_target != null
                          ? `${row.intensity.pct_time_in_target}% in ${row.intensity.target?.split(": ")[1]}`
                          : row.pace ?? (row.status === "missed" ? "Not recorded" : typeLabel[row.type])}
                      </span>
                    </span>
                    <span className="num">{row.actual_duration_min != null ? fmtMin(row.actual_duration_min) : "–"}<span className="muted"> / {fmtMin(row.planned_duration_min)}</span></span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {r && (
            <div className="panel">
              <div className="panel-head"><h3>Recovery</h3><span className="muted small">vs previous 3 weeks</span></div>
              <ul className="rows">
                <li><span className="k">Average sleep</span><span className="num">{fmtNum(r.avg_sleep_hours, "h")}</span></li>
                <li><span className="k">Nights under 6 h</span><span className="num">{r.nights_under_6h_sleep ?? "–"}</span></li>
                <li><span className="k">Resting heart rate</span><span className="num">{fmtNum(r.avg_resting_hr)} <span className="muted">/ {fmtNum(r.baseline_resting_hr)}</span></span></li>
                <li><span className="k">HRV</span><span className="num">{fmtNum(r.avg_hrv_ms, "ms")} {r.hrv_change_vs_baseline_pct != null && <span className={r.hrv_change_vs_baseline_pct < -10 ? "delta-up" : "muted"}>({r.hrv_change_vs_baseline_pct}%)</span>}</span></li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}