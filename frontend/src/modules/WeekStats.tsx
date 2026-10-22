import type { ReactNode } from "react";
import type { WeekMetrics } from "../lib/types";
import { fmtNum } from "../lib/format";

/** The four numbers that summarize a week. All straight from the backend. */
export function WeekStats({ m }: { m: WeekMetrics }) {
  const s = m.summary;
  const r = m.recovery;
  const done = s.completed_on_planned_day + s.completed_on_other_day;
  const delta = r.resting_hr_change_vs_baseline;
  const pct = s.planned_sessions ? done / s.planned_sessions : 0;
  const timePct = s.planned_duration_min ? Math.min(1, s.actual_duration_min / s.planned_duration_min) : 0;

  return (
    <div className="stats">
      <Stat value={`${done}`} unit={`of ${s.planned_sessions}`} label={`Sessions done${s.completed_on_other_day ? `, ${s.completed_on_other_day} moved` : ""}`} meter={pct} />
      <Stat value={`${Math.round(s.actual_duration_min)}`} unit={`of ${Math.round(s.planned_duration_min)} min`} label="Training time" meter={timePct} />
      <Stat value={s.pct_time_in_target_hr_zone != null ? `${s.pct_time_in_target_hr_zone}` : "–"}
            unit={s.pct_time_in_target_hr_zone != null ? "%" : ""}
            label={s.pct_time_in_target_hr_zone != null ? "Time in target heart-rate zone" : "No heart-rate data"}
            meter={s.pct_time_in_target_hr_zone != null ? s.pct_time_in_target_hr_zone / 100 : undefined} />
      <Stat value={fmtNum(r.avg_resting_hr)} unit="bpm"
            label={<>Resting heart rate{delta != null && <span className={delta > 2 ? "tone-warn" : ""}>, {delta > 0 ? "+" : ""}{delta} vs usual</span>}</>} />
    </div>
  );
}

function Stat({ value, unit, label, meter }: { value: string; unit: string; label: ReactNode; meter?: number }) {
  return (
    <div className="stat">
      <div className="stat-value">{value}<small>{unit}</small></div>
      <div className="stat-label">{label}</div>
      {meter !== undefined && (
        <div className="meter" aria-hidden="true"><span style={{ width: `${Math.round(meter * 100)}%` }} /></div>
      )}
    </div>
  );
}
