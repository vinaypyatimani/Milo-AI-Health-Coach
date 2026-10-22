import type { ProgressWeek } from "../lib/types";

/** Planned (outline) vs done (fill) training minutes per week, in plain SVG. */
export function VolumeChart({ weeks }: { weeks: ProgressWeek[] }) {
  const W = 720, H = 250, padL = 44, padB = 32, padT = 24;
  const max = Math.max(60, ...weeks.map((w) => Math.max(w.planned_duration_min, w.actual_duration_min ?? 0)));
  const step = Math.ceil(max / 3 / 30) * 30;
  const ticks = [0, step, step * 2, step * 3];
  const top = ticks[3];
  const slot = (W - padL) / Math.max(weeks.length, 1);
  const bw = Math.min(64, slot * 0.5);
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / top);
  const cx = (i: number) => padL + slot * i + slot / 2;

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img"
         aria-label={`Training minutes per week. ${weeks.map((w) => `Week ${w.week_number}: ${w.actual_duration_min != null ? Math.round(w.actual_duration_min) : "no"} of ${Math.round(w.planned_duration_min)} planned minutes`).join(". ")}`}>
      {ticks.map((t) => (
        <g key={t}>
          <line className="grid" x1={padL} x2={W} y1={y(t)} y2={y(t)} />
          <text className="axis" x={padL - 10} y={y(t) + 4} textAnchor="end">{t}</text>
        </g>
      ))}
      {weeks.map((w, i) => {
        const done = w.actual_duration_min ?? 0;
        return (
          <g key={w.week_number}>
            <rect className="planned" x={cx(i) - bw / 2} y={y(w.planned_duration_min)} width={bw}
                  height={y(0) - y(w.planned_duration_min)} rx={6} />
            {done > 0 && (
              <rect className="actual" x={cx(i) - bw / 2 + 6} y={y(done)} width={bw - 12} height={y(0) - y(done)} rx={4} />
            )}
            {w.status !== "upcoming" && (
              <text className="value" x={cx(i)} y={y(Math.max(done, w.planned_duration_min)) - 8} textAnchor="middle">
                {Math.round(done)} / {Math.round(w.planned_duration_min)}
              </text>
            )}
            <text className="axis" x={cx(i)} y={H - 8} textAnchor="middle">
              Week {w.week_number}{w.status === "current" ? " (now)" : ""}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
