import { useRef } from "react";
import { api, isDemo } from "../lib/api";
import type { PlanResponse } from "../lib/types";
import { fmtDate, fmtMin } from "../lib/format";
import { ChatPanel } from "../chat/ChatPanel";
import { useConversation } from "../chat/useConversation";
import { PlanDays } from "../modules/PlanDays";
import { NutritionView } from "../modules/Nutrition";

interface Props {
  plan: PlanResponse | null;
  changed: Set<string>;
  onPlanSaved: () => void;
  onStartOver: (clearPlan: boolean) => Promise<void>;
}

const ASK_NUTRITION = "Yes, please add a nutrition plan to my training plan.";

/** The start page: one chat in the middle, the plan underneath once it exists. */
export function PlanPage({ plan, changed, onPlanSaved, onStartOver }: Props) {
  const conv = useConversation({ mode: "coaching" }, onPlanSaved);
  const chatRef = useRef<HTMLDivElement>(null);
  const p = plan?.plan ?? null;
  const total = p ? p.weeks.reduce((s, w) => s + w.sessions.reduce((a, x) => a + (x.type === "rest" ? 0 : x.duration_min), 0), 0) : 0;

  const askNutrition = () => {
    chatRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    conv.send(ASK_NUTRITION);
  };

  return (
    <div className="page">
      <header className="page-head">
        <h1>{p ? "Your plan" : "Let's build your plan"}</h1>
        <p className="lede">{p ? "Ask Milo to change anything, any time." : "A few questions about your goal, your week and your body. Then a plan you can stick to."}</p>
      </header>

      <div ref={chatRef}>
        <ChatPanel conv={conv} title={p ? "Your plan" : "New plan"} hasPlan={!!p} onStartOver={onStartOver}
          intro={p
            ? { text: "Want to change something, or start fresh? Milo remembers your current plan.", button: "Start a new conversation with Milo" }
            : { text: "Hi, I'm Milo. I'll ask a few short questions, one at a time.", button: "Build a plan with Milo" }}
          placeholder={p ? "e.g. Move my long run to Sunday" : "Type your answer…"}
          savedLabel="Plan saved, see below" />
      </div>

      {p && (
        <>
          <section className="section">
            <div className="section-head">
              <div>
                <h2>{p.goal}</h2>
                <p className="muted small">{p.weeks.length} weeks from {fmtDate(p.start_date)} · {fmtMin(total)} in total</p>
              </div>
              <div className="downloads">
                {isDemo ? (
                  <>
                    <button className="btn btn-sm" type="button" disabled title="Downloads need the backend">PDF</button>
                    <button className="btn btn-sm" type="button" disabled title="Downloads need the backend">Excel</button>
                  </>
                ) : (
                  <>
                    <a className="btn btn-sm" href={api.exportUrl("pdf")} download>Download PDF</a>
                    <a className="btn btn-sm" href={api.exportUrl("xlsx")} download>Download Excel</a>
                  </>
                )}
              </div>
            </div>
            <PlanDays plan={p} currentWeek={plan?.current_week ?? null} changed={changed} />
          </section>

          <section className="section">
            <div className="section-head"><h2>Nutrition</h2></div>
            {p.nutrition ? <NutritionView n={p.nutrition} /> : (
              <div className="offer">
                <p className="muted">Want simple meal ideas that fit your training days? Milo asks a couple of questions and adds them to this plan.</p>
                <button className="btn btn-sm" type="button" disabled={conv.busy} onClick={askNutrition}>Add a nutrition plan</button>
              </div>
            )}
          </section>

          {plan!.history.length > 1 && (
            <details className="section history">
              <summary>Plan history · {plan!.history.length} versions</summary>
              <ul className="rows">
                {plan!.history.map((h, i) => (
                  <li key={h.id}>
                    <span className="grow">{h.reason || "Plan saved"}{i === 0 && <span className="muted"> · current</span>}</span>
                    <span className="muted small num">{fmtDate(h.created_at)}, {h.created_at.slice(11, 16)}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </div>
  );
}
