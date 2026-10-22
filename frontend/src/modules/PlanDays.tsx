import { useState } from "react";
import type { TrainingPlan } from "../lib/types";
import { DAYS } from "../lib/types";
import { addDays, fmtDate, fmtMin, fmtRange, weekStart } from "../lib/format";
import { dayKey } from "../lib/planDiff";
import { Segmented } from "../components/ui";

interface Props { plan: TrainingPlan; currentWeek: number | null; changed: Set<string> }

/** One week at a time, one line per day. Days Milo just changed are marked. */
export function PlanDays({ plan, currentWeek, changed }: Props) {
  const firstChanged = plan.weeks.find((w) => DAYS.some((d) => changed.has(dayKey(w.week_number, d))))?.week_number;
  const [picked, setPicked] = useState<number | null>(null);
  const week = picked ?? firstChanged ?? Math.min(currentWeek ?? 1, plan.weeks.length);
  const w = plan.weeks.find((x) => x.week_number === week) ?? plan.weeks[0];
  const start = weekStart(plan.start_date, w.week_number);
  const total = w.sessions.reduce((s, x) => s + (x.type === "rest" ? 0 : x.duration_min), 0);

  return (
    <div className="plan-days">
      <div className="plan-days-head">
        <Segmented<number> label="Choose week" value={w.week_number} onChange={setPicked}
          options={plan.weeks.map((x) => ({
            value: x.week_number,
            label: <>W{x.week_number}{DAYS.some((d) => changed.has(dayKey(x.week_number, d))) && <span className="dot-new" aria-label="updated" />}</>,
          }))} />
        <span className="muted small">{fmtRange(start)} · {fmtMin(total)}{w.week_number === currentWeek ? " · this week" : ""}</span>
      </div>
      {w.focus && <p className="plan-focus">{w.focus}</p>}
      <ol className="days">
        {DAYS.map((day, i) => {
          const s = w.sessions.find((x) => x.day === day && x.type !== "rest");
          const isNew = changed.has(dayKey(w.week_number, day));
          return (
            <li key={day} className={`${s ? "" : "is-rest"}${isNew ? " is-new" : ""}`}>
              <span className="day-name">{day.slice(0, 3)}<span className="muted small">{fmtDate(addDays(start, i))}</span></span>
              {s ? (
                <span className="day-body">
                  <span className="day-title">{s.title}{isNew && <span className="chip chip-new">Updated</span>}</span>
                  <span className="muted small">
                    {[fmtMin(s.duration_min), s.distance_km ? `${s.distance_km} km` : "", s.target_intensity.kind !== "none" ? s.target_intensity.value : ""].filter(Boolean).join(" · ")}
                    {s.notes && <> — {s.notes}</>}
                  </span>
                </span>
              ) : (
                <span className="day-body muted">Rest{isNew && <span className="chip chip-new">Updated</span>}</span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
