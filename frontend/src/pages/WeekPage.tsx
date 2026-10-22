import { api } from "../lib/api";
import { useQuery } from "../lib/query";
import type { PlanResponse } from "../lib/types";
import { fmtRange, weekStart } from "../lib/format";
import { navigate } from "../lib/router";
import { Card, Segmented, Skeleton } from "../components/ui";
import { WeekStrip } from "../modules/WeekStrip";
import { WeekStats } from "../modules/WeekStats";
import { DataWarnings, RecoveryCard, SessionsCard } from "../modules/WeekDetails";

interface Props { plan: PlanResponse; week: number; changed: Set<string>; onCheckin: () => void }

export function WeekPage({ plan, week, changed, onCheckin }: Props) {
  const p = plan.plan!;
  const current = plan.current_week ?? 1;
  const upcoming = week > current;
  const { data: m, error, refreshing } = useQuery(upcoming ? null : `metrics:${week}`, () => api.weekMetrics(week));
  const w = p.weeks.find((x) => x.week_number === week);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow-date">{fmtRange(weekStart(p.start_date, week))}{week === current ? ", this week" : upcoming ? ", coming up" : ""}</p>
          <h1>Week {week}<span className="h1-sub">{w?.focus}</span></h1>
        </div>
        <div className="head-actions">
          <Segmented<number> label="Choose week" value={week} onChange={(n) => navigate({ page: "week", week: n })}
            options={p.weeks.map((x) => ({ value: x.week_number, label: `W${x.week_number}` }))} />
          {!upcoming && <button className="btn btn-primary" type="button" onClick={onCheckin}>Check in with Milo</button>}
        </div>
      </header>

      <div className="modules">
        <Card className="span-all" title={upcoming ? "Planned sessions" : "Planned vs done"}
              aside={refreshing ? <span className="muted small">Updating…</span> : undefined}>
          {upcoming || m ? <WeekStrip plan={p} week={week} metrics={upcoming ? null : m} changed={changed} /> : <Skeleton height={190} />}
        </Card>

        {error && <Card className="span-all"><p className="tone-urgent">{error.message}</p></Card>}

        {upcoming ? (
          <Card className="span-all" title="Coming up">
            <p className="muted">This week hasn't started yet. Once you've trained, upload your workouts and check in with Milo.</p>
          </Card>
        ) : m ? (
          <>
            <div className="span-all"><WeekStats m={m} /></div>
            <div className="span-all"><DataWarnings m={m} /></div>
            <SessionsCard m={m} />
            <RecoveryCard m={m} />
          </>
        ) : !error && (
          <>
            <div className="span-all"><Skeleton height={96} /></div>
            <Skeleton height={220} />
            <Skeleton height={220} />
          </>
        )}
      </div>
    </div>
  );
}
