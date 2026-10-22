import type { TrainingPlan } from "../lib/types";
import { DAYS } from "../lib/types";
import { fmtMin, fmtRange, weekStart } from "../lib/format";
import { dayKey } from "../lib/planDiff";
import { navigate } from "../lib/router";

/**
 * The whole plan at a glance: one row per week, one cell per day.
 * Cells Milo just changed are highlighted, so plan updates are easy to spot.
 */
export function PlanOverview({ plan, currentWeek, changed }: {
  plan: TrainingPlan; currentWeek: number | null; changed: Set<string>;
}) {
  return (
    <div className="plan-grid-wrap">
      <div className="plan-grid" role="table" aria-label="Training plan">
        <div className="plan-row plan-row-head" role="row">
          <span role="columnheader" className="plan-week-cell">Week</span>
          {DAYS.map((d) => <span role="columnheader" key={d}>{d.slice(0, 3)}</span>)}
          <span role="columnheader" className="r">Total</span>
        </div>
        {plan.weeks.map((w) => {
          const total = w.sessions.reduce((s, x) => s + x.duration_min, 0);
          const isCurrent = w.week_number === currentWeek;
          return (
            <div role="row" key={w.week_number} className={`plan-row${isCurrent ? " is-current" : ""}`}>
              <button role="rowheader" type="button" className="plan-week-cell"
                      onClick={() => navigate({ page: "week", week: w.week_number })}
                      title={`Open week ${w.week_number}`}>
                <strong>Week {w.week_number}</strong>
                <span className="muted small">{fmtRange(weekStart(plan.start_date, w.week_number))}</span>
                <span className="small focus">{isCurrent ? "This week: " : ""}{w.focus}</span>
              </button>
              {DAYS.map((day) => {
                const s = w.sessions.find((x) => x.day === day && x.type !== "rest");
                const isNew = changed.has(dayKey(w.week_number, day));
                return (
                  <div role="cell" key={day} className={`plan-cell${s ? ` t-${s.type}` : " is-rest"}${isNew ? " is-new" : ""}`}>
                    {s ? (
                      <>
                        <span className="pc-title">{s.title}</span>
                        <span className="pc-meta">{fmtMin(s.duration_min)}{s.target_intensity.kind !== "none" ? `, ${s.target_intensity.value}` : ""}</span>
                        {isNew && <span className="pc-new">Updated</span>}
                      </>
                    ) : <span className="pc-rest">Rest</span>}
                  </div>
                );
              })}
              <span role="cell" className="r num plan-total">{fmtMin(total)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
