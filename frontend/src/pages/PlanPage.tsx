import type { PlanResponse } from "../lib/types";
import { fmtDate, fmtMin } from "../lib/format";
import { Card, Empty } from "../components/ui";
import { PlanOverview } from "../modules/PlanOverview";

interface Props { plan: PlanResponse | null; changed: Set<string>; onPlanChat: () => void }

export function PlanPage({ plan, changed, onPlanChat }: Props) {
  if (!plan?.plan) {
    return (
      <div className="page">
        <Empty title="No plan yet"
               action={<button className="btn btn-primary" type="button" onClick={onPlanChat}>Build my plan with Milo</button>}>
          Milo asks about your goal, your week and your body, one question at a time, then builds a plan you can actually stick to.
        </Empty>
      </div>
    );
  }
  const p = plan.plan;
  const total = p.weeks.reduce((s, w) => s + w.sessions.reduce((a, x) => a + x.duration_min, 0), 0);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow-date">{p.weeks.length} weeks from {fmtDate(p.start_date)}, {fmtMin(total)} in total</p>
          <h1>{p.goal}</h1>
        </div>
        <div className="head-actions">
          <button className="btn" type="button" onClick={onPlanChat}>Change the plan with Milo</button>
        </div>
      </header>

      <div className="modules">
        <Card className="span-all" title="Your plan" aside={changed.size ? <span className="chip chip-new">{changed.size} day{changed.size === 1 ? "" : "s"} just updated</span> : undefined}>
          <PlanOverview plan={p} currentWeek={plan.current_week} changed={changed} />
        </Card>
        <Card className="span-all" title="Plan history" aside={<span className="muted small">every change is kept</span>}>
          <ul className="rows">
            {plan.history.map((h, i) => (
              <li key={h.id}>
                <span className="grow">{h.reason || "Plan saved"}{i === 0 && <span className="chip" style={{ marginLeft: 8 }}>current</span>}</span>
                <span className="muted small num">{fmtDate(h.created_at)}, {h.created_at.slice(11, 16)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
