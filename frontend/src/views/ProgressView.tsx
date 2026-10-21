import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { PlanResponse, ProgressWeek } from "../api/types";
import { addDays, fmtMin, fmtNum, fmtRange } from "../format";

function VolumeChart({ weeks }: { weeks: ProgressWeek[] }) {
  const W = 720, H = 260, padL = 44, padB = 34, padT = 16;
  const max = Math.max(60, ...weeks.map((w) => Math.max(w.planned_duration_min, w.actual_duration_min ?? 0)));
  const step = Math.ceil(max / 60) * 60 / 3;
  const ticks = [0, step, step * 2, step * 3];
  const top = ticks[3];
  const slot = (W - padL) / weeks.length;
  const bw = Math.min(56, slot * 0.5);
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / top);

  const rhr = weeks.filter((w) => w.avg_resting_hr != null);
  const rMin = Math.min(...rhr.map((w) => w.avg_resting_hr!)) - 3;
  const rMax = Math.max(...rhr.map((w) => w.avg_resting_hr!)) + 3;
  const ry = (v: number) => padT + (H - padT - padB) * (1 - (v - rMin) / (rMax - rMin || 1));
  const cx = (i: number) => padL + slot * i + slot / 2;

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img"
         aria-label={`Training minutes per week, planned versus done. ${weeks.map((w) => `Week ${w.week_number}: ${Math.round(w.actual_duration_min ?? 0)} of ${Math.round(w.planned_duration_min)} minutes`).join(". ")}`}>
      {ticks.map((t) => (
        <g key={t}>
          <line className="grid" x1={padL} x2={W} y1={y(t)} y2={y(t)} />
          <text x={padL - 10} y={y(t) + 4} textAnchor="end">{t}</text>
        </g>
      ))}
      {weeks.map((w, i) => (
        <g key={w.week_number}>
          <rect className="planned" x={cx(i) - bw / 2} y={y(w.planned_duration_min)} width={bw}
                height={y(0) - y(w.planned_duration_min)} rx={5} />
          {w.actual_duration_min != null && w.actual_duration_min > 0 && (
            <rect className="actual" x={cx(i) - bw / 2 + 5} y={y(w.actual_duration_min)} width={bw - 10}
                  height={y(0) - y(w.actual_duration_min)} rx={4} />
          )}
          <text x={cx(i)} y={H - 10} textAnchor="middle">Week {w.week_number}</text>
        </g>
      ))}
      {rhr.length > 1 && (
        <polyline className="line" points={rhr.map((w) => `${cx(w.week_number - 1)},${ry(w.avg_resting_hr!)}`).join(" ")} />
      )}
      {rhr.length > 1 && rhr.map((w) => <circle key={w.week_number} className="dot" cx={cx(w.week_number - 1)} cy={ry(w.avg_resting_hr!)} r={4} />)}
    </svg>
  );
}

export function ProgressView({ plan }: { plan: PlanResponse }) {
  const [weeks, setWeeks] = useState<ProgressWeek[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { api.progress().then(setWeeks).catch((e) => setError(e.message)); }, []);
  const p = plan.plan!;
  const started = weeks?.filter((w) => w.status !== "upcoming") ?? [];
  const totalDone = started.reduce((s, w) => s + (w.actual_duration_min ?? 0), 0);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Progress</h1>
          <p>{p.goal}. {fmtMin(totalDone)} trained so far across {started.length} week{started.length === 1 ? "" : "s"}.</p>
        </div>
      </header>

      {error && <div className="banner banner-error">{error}</div>}
      {weeks && (
        <>
          <section className="panel">
            <div className="panel-head">
              <h3>Training minutes per week</h3>
              <div className="strip-legend" style={{ marginTop: 0 }}>
                <span><i className="swatch swatch-planned" />Planned</span>
                <span><i className="swatch swatch-actual" />Done</span>
                {weeks.filter((w) => w.avg_resting_hr != null).length > 1 && <span><i className="swatch" style={{ borderTop: "2px solid var(--ink-2)", height: 0, width: 14 }} />Resting HR</span>}
              </div>
            </div>
            <VolumeChart weeks={weeks} />
          </section>

          <div className="table-wrap" style={{ marginTop: 28 }}>
            <table>
              <thead><tr><th>Week</th><th>Dates</th><th className="r">Planned</th><th className="r">Done</th><th className="r">Sessions done</th><th className="r">In target zone</th><th className="r">Resting HR</th><th className="r">Sleep</th></tr></thead>
              <tbody>
                {weeks.map((w) => (
                  <tr key={w.week_number} className={w.status === "upcoming" ? "muted" : ""}>
                    <td>{w.week_number}{w.status === "current" ? <span className="muted">, this week</span> : ""}</td>
                    <td>{fmtRange(addDays(p.start_date, (w.week_number - 1) * 7))}</td>
                    <td className="r">{fmtMin(w.planned_duration_min)}</td>
                    <td className="r">{w.status === "upcoming" ? "–" : fmtMin(w.actual_duration_min)}</td>
                    <td className="r">{w.completion_rate_pct != null && w.status !== "upcoming" ? `${w.completion_rate_pct}%` : "–"}</td>
                    <td className="r">{w.pct_time_in_target_hr_zone != null ? `${w.pct_time_in_target_hr_zone}%` : "–"}</td>
                    <td className="r">{fmtNum(w.avg_resting_hr, "bpm")}</td>
                    <td className="r">{fmtNum(w.avg_sleep_hours, "h")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
