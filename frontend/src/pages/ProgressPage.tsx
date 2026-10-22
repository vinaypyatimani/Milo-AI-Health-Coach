import { api } from "../lib/api";
import { useQuery } from "../lib/query";
import type { PlanResponse } from "../lib/types";
import { addDays, fmtDate, fmtMin, fmtNum, fmtRange, weekStart } from "../lib/format";
import { Card, Skeleton } from "../components/ui";
import { VolumeChart } from "../modules/VolumeChart";

export default function ProgressPage({ plan }: { plan: PlanResponse }) {
  const { data: weeks, error } = useQuery("progress", api.progress);
  const p = plan.plan!;
  const started = weeks?.filter((w) => w.status !== "upcoming") ?? [];
  const totalDone = started.reduce((s, w) => s + (w.actual_duration_min ?? 0), 0);
  // Workouts logged before the plan starts (or after it ends) can't be compared with it.
  const { data: acts } = useQuery("activities", api.activities);
  const end = addDays(p.start_date, p.weeks.length * 7 - 1);
  const outside = (acts ?? []).filter((a) => a.start_time.slice(0, 10) < p.start_date || a.start_time.slice(0, 10) > end).length;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow-date">{p.goal}</p>
          <h1>Progress</h1>
          <p className="lede">{fmtMin(totalDone)} trained so far across {started.length} week{started.length === 1 ? "" : "s"}.</p>
        </div>
      </header>
      {error && <p className="tone-urgent">{error.message}</p>}
      {outside > 0 && (
        <p className="muted small" style={{ marginBottom: 16 }}>
          {outside} workout{outside === 1 ? " is" : "s are"} outside your plan dates ({fmtDate(p.start_date)} – {fmtDate(end)}), so {outside === 1 ? "it isn't" : "they aren't"} counted here. You can see {outside === 1 ? "it" : "them"} on the Data page.
        </p>
      )}
      <div className="modules">
        <Card className="span-all" title="Training minutes per week"
              aside={<div className="legend"><span><i className="swatch swatch-planned" />Planned</span><span><i className="swatch swatch-done" />Done</span></div>}>
          {weeks ? <VolumeChart weeks={weeks} /> : <Skeleton height={230} />}
        </Card>
        {weeks && (
          <Card className="span-all" title="Week by week">
            <div className="table-wrap">
              <table>
                <thead><tr><th>Week</th><th>Dates</th><th className="r">Done / planned</th><th className="r">Sessions</th><th className="r">In zone</th><th className="r">Resting HR</th><th className="r">Sleep</th></tr></thead>
                <tbody>
                  {weeks.map((w) => (
                    <tr key={w.week_number} className={w.status === "upcoming" ? "muted" : ""}>
                      <td>{w.week_number}{w.status === "current" ? <span className="muted">, now</span> : ""}</td>
                      <td>{fmtRange(weekStart(p.start_date, w.week_number))}</td>
                      <td className="r">{w.status === "upcoming" ? "–" : fmtMin(w.actual_duration_min)} <span className="muted">/ {fmtMin(w.planned_duration_min)}</span></td>
                      <td className="r">{w.completion_rate_pct != null && w.status !== "upcoming" ? `${w.completion_rate_pct}%` : "–"}</td>
                      <td className="r">{w.pct_time_in_target_hr_zone != null ? `${w.pct_time_in_target_hr_zone}%` : "–"}</td>
                      <td className="r">{fmtNum(w.avg_resting_hr, "bpm")}</td>
                      <td className="r">{fmtNum(w.avg_sleep_hours, "h")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
