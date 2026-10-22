import type { TrainingPlan, WeekMetrics } from "../lib/types";
import { DAYS } from "../lib/types";
import { addDays, fmtMin, planBegins, shortDay, weekStart } from "../lib/format";
import { dayKey } from "../lib/planDiff";

interface Props { plan: TrainingPlan; week: number; metrics?: WeekMetrics | null; changed: Set<string> }

/**
 * Seven day columns. The outline is what was planned; the solid bar is what
 * the tracker recorded on that day. Moved sessions fill the day they actually
 * happened. Days Milo just changed get an "Updated" mark.
 */
export function WeekStrip({ plan, week, metrics, changed }: Props) {
  const pw = plan.weeks.find((w) => w.week_number === week);
  if (!pw) return null;
  const start = weekStart(plan.start_date, week);

  const cols = DAYS.map((day, i) => {
    const date = addDays(start, i);
    // "Start today" plans: week 1 days before the first day show nothing planned.
    const planned = date < planBegins(plan) ? undefined : pw.sessions.find((s) => s.day === day && s.type !== "rest");
    const row = metrics?.sessions.find((r) => r.planned_day === day);
    const actual = (metrics?.sessions ?? [])
      .filter((r) => r.actual_date === date)
      .reduce((sum, r) => sum + (r.actual_duration_min ?? 0), 0);
    const extra = (metrics?.extra_activities ?? [])
      .filter((e) => e.date === date)
      .reduce((sum, e) => sum + e.duration_min, 0);
    return { day, date, planned, row, actual, extra, isNew: changed.has(dayKey(week, day)) };
  });

  const max = Math.max(60, ...cols.map((c) => Math.max(c.planned?.duration_min ?? 0, c.actual + c.extra)));
  const h = (min: number) => `${Math.min(100, (min / max) * 100)}%`;

  const status = (c: (typeof cols)[number]) => {
    if (!c.planned) return c.extra ? <span className="st-extra">Extra</span> : <span className="muted">Rest</span>;
    if (!metrics || !c.row) return <span className="muted">{fmtMin(c.planned.duration_min)}</span>;
    if (c.row.status === "completed") return <span className="st-done">Done</span>;
    if (c.row.status === "moved") return <span className="st-moved">Moved to {shortDay(c.row.actual_date!)}</span>;
    return <span className="st-missed">Missed</span>;
  };

  return (
    <div>
      <div className="strip" role="list" aria-label={`Week ${week}: planned vs done`}>
        {cols.map((c, i) => (
          <div className={`strip-day${c.isNew ? " is-new" : ""}`} role="listitem" key={c.day}
               aria-label={`${c.day}: ${c.planned ? `${c.planned.title}, ${c.planned.duration_min} min planned` : "rest"}${c.actual ? `, ${Math.round(c.actual)} min done` : ""}${c.isNew ? ", just updated" : ""}`}>
            <div className="strip-label">
              <span>{c.day.slice(0, 3)}</span>
              <span className="num">{Number(c.date.slice(8))}</span>
            </div>
            <div className="strip-col">
              {c.planned && <div className="bar-planned" style={{ height: h(c.planned.duration_min) }} />}
              {c.actual + c.extra > 0 && (
                <div className={`bar-actual${c.actual === 0 ? " extra" : ""}`}
                     style={{ height: h(c.actual + c.extra), animationDelay: `${i * 45}ms` }} />
              )}
            </div>
            <div className="strip-meta">
              <div className="title">{c.planned?.title ?? ""}</div>
              <div className="strip-status">{c.isNew ? <span className="st-new">Updated</span> : status(c)}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="legend">
        <span><i className="swatch swatch-planned" />Planned</span>
        <span><i className="swatch swatch-done" />Done</span>
        {metrics?.extra_activities.length ? <span><i className="swatch swatch-extra" />Unplanned</span> : null}
      </div>
    </div>
  );
}
