import { useEffect, useState } from "react";
import type { TrainingPlan } from "../api/types";
import { DAYS } from "../api/types";
import { fmtMin, fmtRange, addDays } from "../format";

interface Props { plan: TrainingPlan; currentWeek: number | null }

export function PlanPanel({ plan, currentWeek }: Props) {
  const [week, setWeek] = useState(currentWeek ?? 1);
  useEffect(() => { if (currentWeek) setWeek(currentWeek); }, [currentWeek]);
  const w = plan.weeks.find((x) => x.week_number === week) ?? plan.weeks[0];
  const total = w.sessions.reduce((s, x) => s + x.duration_min, 0);

  return (
    <aside className="panel" aria-label="Your training plan">
      <p className="plan-goal">{plan.goal}</p>
      <p className="muted small">{plan.weeks.length} weeks from {fmtRange(plan.start_date).split(" – ")[0]}</p>

      <div className="panel-head" style={{ marginTop: 18 }}>
        <div className="segmented" role="group" aria-label="Plan week">
          {plan.weeks.map((x) => (
            <button key={x.week_number} aria-pressed={x.week_number === w.week_number} onClick={() => setWeek(x.week_number)}>
              {x.week_number}
            </button>
          ))}
        </div>
        <span className="muted small num">{fmtMin(total)}</span>
      </div>

      <div className="panel-head" style={{ marginBottom: 2 }}>
        <h3>Week {w.week_number}{w.week_number === currentWeek ? ", this week" : ""}</h3>
        <span className="muted small">{fmtRange(addDays(plan.start_date, (w.week_number - 1) * 7))}</span>
      </div>
      <p className="muted small">{w.focus}</p>

      <ul className="plan-days">
        {DAYS.map((day) => {
          const s = w.sessions.find((x) => x.day === day);
          const rest = !s || s.type === "rest";
          return (
            <li key={day} className={`plan-day${rest ? " plan-day-rest" : ""}`}>
              <span className="plan-day-name">{day.slice(0, 3)}</span>
              <div>
                <div className="plan-day-title">{rest ? "Rest" : s!.title}</div>
                {!rest && s!.target_intensity.kind !== "none" && (
                  <div className="plan-day-target">{s!.target_intensity.value}{s!.distance_km ? `, ${s!.distance_km} km` : ""}</div>
                )}
              </div>
              <span className="plan-day-dur num">{rest ? "" : fmtMin(s!.duration_min)}</span>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}