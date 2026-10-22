import { api } from "../lib/api";
import { useQuery } from "../lib/query";
import type { PlanResponse } from "../lib/types";
import { fmtRange, weekStart } from "../lib/format";
import { navigate } from "../lib/router";
import { Card, Segmented, Skeleton } from "../components/ui";
import { ChatPanel } from "../chat/ChatPanel";
import { useConversation } from "../chat/useConversation";
import { WeekStrip } from "../modules/WeekStrip";
import { WeekStats } from "../modules/WeekStats";
import { DataWarnings, RecoveryCard, SessionsCard } from "../modules/WeekDetails";

interface Props {
  plan: PlanResponse;
  week: number;
  changed: Set<string>;
  onPlanSaved: () => void;
  onStartOver: (week: number, clearPlan: boolean) => Promise<void>;
}

function CheckinChat({ week, onPlanSaved, onStartOver }: Pick<Props, "week" | "onPlanSaved" | "onStartOver">) {
  const conv = useConversation({ mode: "checkin", week }, onPlanSaved);
  return (
    <ChatPanel conv={conv} title={`Week ${week} check-in`} hasPlan onStartOver={(clear) => onStartOver(week, clear)}
      intro={{ text: `Milo compares your tracker data with the plan for week ${week} and suggests what to change.`, button: "Check in with Milo" }}
      placeholder="How did the week feel?" savedLabel="Plan updated" />
  );
}

export function WeekPage({ plan, week, changed, onPlanSaved, onStartOver }: Props) {
  const p = plan.plan!;
  const current = plan.current_week ?? 1;
  const upcoming = week > current;
  const { data: m, error, refreshing } = useQuery(upcoming ? null : `metrics:${week}`, () => api.weekMetrics(week));
  const w = p.weeks.find((x) => x.week_number === week);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="muted small">{fmtRange(weekStart(p.start_date, week))}{week === current ? " · this week" : upcoming ? " · coming up" : ""}</p>
          <h1>Week {week}</h1>
          {w?.focus && <p className="lede">{w.focus}</p>}
        </div>
        <Segmented<number> label="Choose week" value={week} onChange={(n) => navigate({ page: "week", week: n })}
          options={p.weeks.map((x) => ({ value: x.week_number, label: `W${x.week_number}` }))} />
      </header>

      {!upcoming && <CheckinChat key={week} week={week} onPlanSaved={onPlanSaved} onStartOver={onStartOver} />}

      <div className="modules section">
        <Card className="span-all" title={upcoming ? "Planned sessions" : "Planned vs done"}
              aside={refreshing ? <span className="muted small">Updating…</span> : undefined}>
          {upcoming || m ? <WeekStrip plan={p} week={week} metrics={upcoming ? null : m} changed={changed} /> : <Skeleton height={190} />}
        </Card>

        {error && <Card className="span-all"><p className="tone-urgent">{error.message}</p></Card>}

        {upcoming ? (
          <Card className="span-all">
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
