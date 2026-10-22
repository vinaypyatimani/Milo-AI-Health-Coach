import { Fragment } from "react";
import type { PlannedSession, TrainingPlan } from "../lib/types";
import { DAYS } from "../lib/types";
import { addDays, fmtDate, fmtMin, typeLabel } from "../lib/format";
import { dayKey } from "../lib/planDiff";
import { exercisesFor } from "../lib/exercises";

export interface DaySel { week: number; day: string }

interface Props {
  plan: TrainingPlan;
  changed: Set<string>;
  today: string;
  selected: DaySel | null;
  onSelect: (d: DaySel | null) => void;
}

export const sessionOn = (plan: TrainingPlan, d: DaySel): PlannedSession | undefined =>
  plan.weeks.find((w) => w.week_number === d.week)?.sessions.find((s) => s.day === d.day && s.type !== "rest");

/** The whole plan as a calendar: one row per week. Click a day to open it right under its week. */
export function PlanCalendar({ plan, changed, today, selected, onSelect }: Props) {
  return (
    <div className="cal" role="grid" aria-label="Plan calendar">
      <div className="cal-corner" />
      {DAYS.map((d) => <div key={d} className="cal-dow" role="columnheader">{d.slice(0, 3)}</div>)}

      {plan.weeks.map((w) => {
        const start = addDays(plan.start_date, (w.week_number - 1) * 7);
        const open = selected?.week === w.week_number ? sessionOrRest(plan, selected) : null;
        return (
          <Fragment key={w.week_number}>
            <div className="cal-week" title={w.focus}>W{w.week_number}</div>
            {DAYS.map((day, i) => {
              const date = addDays(start, i);
              const s = w.sessions.find((x) => x.day === day && x.type !== "rest");
              const key = dayKey(w.week_number, day);
              const isSel = selected?.week === w.week_number && selected.day === day;
              const cls = ["cal-day", s ? `t-${s.type}` : "is-rest", date === today && "is-today", date < today && "is-past",
                isSel && "is-selected", changed.has(key) && "is-new"].filter(Boolean).join(" ");
              const n = Number(date.slice(8));
              return (
                <button key={day} type="button" className={cls} role="gridcell" aria-expanded={isSel}
                        aria-label={`${day} ${fmtDate(date)}: ${s ? `${s.title}, ${fmtMin(s.duration_min)}` : "rest"}`}
                        onClick={() => onSelect(isSel ? null : { week: w.week_number, day })}>
                  <span className="cal-date">{n === 1 || (w.week_number === 1 && i === 0) ? fmtDate(date) : n}</span>
                  {s ? (
                    <>
                      <span className="cal-title">{s.title || typeLabel[s.type]}</span>
                      <span className="cal-min">{Math.round(s.duration_min)}′</span>
                    </>
                  ) : <span className="cal-rest">Rest</span>}
                </button>
              );
            })}
            {open && <DayDetail {...open} />}
          </Fragment>
        );
      })}
    </div>
  );
}

function sessionOrRest(plan: TrainingPlan, d: DaySel) {
  const start = addDays(plan.start_date, (d.week - 1) * 7);
  return { session: sessionOn(plan, d), day: d.day, date: addDays(start, DAYS.indexOf(d.day as (typeof DAYS)[number])) };
}

function DayDetail({ session: s, day, date }: { session?: PlannedSession; day: string; date: string }) {
  return (
    <div className="cal-detail" role="region" aria-label={`${day} details`}>
      <p className="muted small">{day}, {fmtDate(date)}</p>
      {s ? (
        <>
          <h3>{s.title || typeLabel[s.type]}</h3>
          <p className="muted small">
            {[fmtMin(s.duration_min), s.distance_km ? `${s.distance_km} km` : "", s.target_intensity.kind !== "none" ? s.target_intensity.value : ""].filter(Boolean).join(" · ")}
            {s.notes && <> — {s.notes}</>}
          </p>
          <ol className="exercises">
            {exercisesFor(s).map((e, i) => (
              <li key={i}><span>{e.name}</span>{e.detail && <span className="muted">{e.detail}</span>}</li>
            ))}
          </ol>
        </>
      ) : <h3 className="muted">Rest day. Recovery is part of the plan.</h3>}
    </div>
  );
}
