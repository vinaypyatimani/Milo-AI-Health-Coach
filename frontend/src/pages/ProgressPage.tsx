import { api } from "../lib/api";
import { useQuery } from "../lib/query";
import type { PlanResponse } from "../lib/types";
import { fmtMin, fmtNum, fmtRange, weekStart } from "../lib/format";
import { Card, Skeleton } from "../components/ui";
import { VolumeChart } from "../modules/VolumeChart";

export default function ProgressPage({ plan }: { plan: PlanResponse }) {
  const { data: weeks, error } = useQuery("progress", api.progress);
  const p = plan.plan!;
  const started = weeks?.filter((w) => w.status !== "upcoming") ?? [];
  const totalDone = started.reduce((s, w) => s + (w.actual_duration_min ?? 0), 0);

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
