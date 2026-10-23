import { useState } from "react";
import type { Analysis, AnalysisWeek } from "../lib/types";
import { fmtDate, fmtMin, typeLabel } from "../lib/format";
import { IconAlert, IconCheck } from "../components/icons";
import { Segmented } from "../components/ui";

/** Sports in a fixed order, so a sport keeps its color whatever else is in the data. */
export const SPORT_ORDER = ["run", "strength", "cycling", "walk", "swim", "mobility", "other"] as const;
const sportVar = (t: string) => `var(--sport-${SPORT_ORDER.includes(t as never) ? t : "other"})`;

export function StatTiles({ a }: { a: Analysis }) {
  const t = a.totals!;
  const r = a.recovery;
  const tiles: { label: string; value: string; sub?: string }[] = [
    { label: "Per week", value: `${t.sessions_per_week} sessions`, sub: `${fmtMin(t.minutes_per_week)} a week` },
    { label: "Total", value: `${t.hours} h`, sub: `${t.sessions} sessions${t.distance_km ? ` · ${t.distance_km} km` : ""}` },
  ];
  if (a.intensity) tiles.push({ label: "Easy training", value: `${a.intensity.easy_pct}%`, sub: `${a.intensity.hard_pct}% hard` });
  if (a.running) tiles.push({ label: "Running", value: `${a.running.km_per_week} km/wk`, sub: a.running.avg_pace ? `avg ${a.running.avg_pace}` : undefined });
  if (r?.avg_sleep_hours) tiles.push({ label: "Sleep", value: `${r.avg_sleep_hours} h`, sub: r.nights_under_6h ? `${r.nights_under_6h} nights < 6 h` : "per night" });
  if (r?.resting_hr_avg) {
    const ch = r.resting_hr_change_bpm;
    tiles.push({ label: "Resting HR", value: `${r.resting_hr_avg} bpm`, sub: ch == null ? undefined : `${ch > 0 ? "+" : ""}${ch} bpm vs start` });
  }
  return (
    <div className="tiles">
      {tiles.slice(0, 6).map((x) => (
        <div className="tile" key={x.label}>
          <span className="tile-label">{x.label}</span>
          <strong className="tile-value num">{x.value}</strong>
          {x.sub && <span className="tile-sub num">{x.sub}</span>}
        </div>
      ))}
    </div>
  );
}

/** Minutes per week, stacked by sport. Hover a column for the numbers; "Table" shows them all. */
export function WeeklyBars({ weeks }: { weeks: AnalysisWeek[] }) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const [hover, setHover] = useState<number | null>(null);
  const types = SPORT_ORDER.filter((t) => weeks.some((w) => w.by_type[t]));
  const max = Math.max(60, ...weeks.map((w) => w.minutes));

  return (
    <div className="viz">
      <div className="viz-head">
        <div className="legend">
          {types.map((t) => <span key={t}><i className="swatch" style={{ background: sportVar(t) }} />{typeLabel[t]}</span>)}
        </div>
        <Segmented<"chart" | "table"> label="View" value={view} onChange={setView}
          options={[{ value: "chart", label: "Chart" }, { value: "table", label: "Table" }]} />
      </div>

      {view === "table" ? (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Week of</th>{types.map((t) => <th key={t} className="r">{typeLabel[t]}</th>)}<th className="r">Total</th><th className="r">Easy</th></tr></thead>
            <tbody>
              {weeks.map((w) => (
                <tr key={w.week_start}>
                  <td>{fmtDate(w.week_start)}{w.partial && <span className="muted"> (part)</span>}</td>
                  {types.map((t) => <td key={t} className="r">{w.by_type[t] ? fmtMin(w.by_type[t]) : "–"}</td>)}
                  <td className="r">{fmtMin(w.minutes)}</td>
                  <td className="r">{w.easy_pct == null ? "–" : `${w.easy_pct}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bars" role="img" aria-label="Training minutes per week by sport (see Table for the numbers)"
             onMouseLeave={() => setHover(null)}>
          {weeks.map((w, i) => (
            <div key={w.week_start} className={`bar-col${w.partial ? " is-partial" : ""}`}
                 onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={0}>
              <div className="bar-stack" style={{ height: `${(w.minutes / max) * 100}%` }}>
                {types.filter((t) => w.by_type[t]).map((t) => (
                  <span key={t} style={{ flexGrow: w.by_type[t], background: sportVar(t) }} />
                ))}
              </div>
              <span className="bar-x">{fmtDate(w.week_start)}</span>
              {hover === i && (
                <div className={`viz-tip${i > weeks.length / 2 ? " left" : ""}`} role="tooltip">
                  <strong>Week of {fmtDate(w.week_start)}{w.partial ? " (partial)" : ""}</strong>
                  {types.filter((t) => w.by_type[t]).map((t) => (
                    <span key={t}><i className="swatch" style={{ background: sportVar(t) }} />{typeLabel[t]} <b className="num">{fmtMin(w.by_type[t])}</b></span>
                  ))}
                  <span className="tip-total">Total <b className="num">{fmtMin(w.minutes)}</b></span>
                  {w.easy_pct != null && <span className="muted">{w.easy_pct}% of the time easy</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const ZONE_NAMES = ["Recovery", "Easy", "Moderate", "Hard", "Max"];

/** Share of time in each heart-rate zone, as one horizontal bar with labels. */
export function ZoneBar({ a }: { a: Analysis }) {
  const i = a.intensity;
  if (!i) return <p className="muted small">Heart-rate zones need your age or max heart rate (Profile page) and workouts with heart rate.</p>;
  return (
    <div className="zones">
      <div className="zone-bar" role="img" aria-label={`Easy ${i.easy_pct}%, moderate ${i.moderate_pct}%, hard ${i.hard_pct}%`}>
        {[1, 2, 3, 4, 5].map((z) => i.zone_pct[z] > 0 && (
          <span key={z} style={{ flexGrow: i.zone_pct[z], background: `var(--zone-${z})` }}
                title={`Zone ${z} (${ZONE_NAMES[z - 1]}): ${i.zone_pct[z]}%, ${fmtMin(i.zone_minutes[z])}`} />
        ))}
      </div>
      <ol className="zone-labels">
        {[1, 2, 3, 4, 5].map((z) => (
          <li key={z}><span><i className="swatch" style={{ background: `var(--zone-${z})` }} />Z{z} {ZONE_NAMES[z - 1]}</span><b className="num">{i.zone_pct[z]}%</b></li>
        ))}
      </ol>
      <p className="muted small">Easy {i.easy_pct}% · moderate {i.moderate_pct}% · hard {i.hard_pct}% · max HR {a.data.max_hr_used} bpm ({a.data.max_hr_source})</p>
    </div>
  );
}

const GOOD = new Set(["good_easy_share", "fitter"]);

/** What the rules found. The same list goes to Milo, who explains it in the report. */
export function Findings({ flags }: { flags: Analysis["flags"] }) {
  if (!flags.length) return <p className="muted">Nothing unusual: a steady, balanced period.</p>;
  return (
    <ul className="findings">
      {[...flags].sort((x, y) => Number(GOOD.has(y.code)) - Number(GOOD.has(x.code))).map((f) => (
        <li key={f.code} className={GOOD.has(f.code) ? "is-good" : "is-watch"}>
          {GOOD.has(f.code) ? <IconCheck /> : <IconAlert />}
          <span className="sr-only">{GOOD.has(f.code) ? "Going well:" : "Worth a look:"}</span>
          <span>{f.text.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, (m) => fmtDate(m))}</span>
        </li>
      ))}
    </ul>
  );
}
