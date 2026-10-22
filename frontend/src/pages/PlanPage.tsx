import { useState } from "react";
import { api, isDemo } from "../lib/api";
import type { PlanResponse, TrainingPlan } from "../lib/types";
import { DAYS } from "../lib/types";
import { addDays, fmtDate, fmtMin, localToday, typeLabel } from "../lib/format";
import { ChatPanel } from "../chat/ChatPanel";
import { useConversation } from "../chat/useConversation";
import { PlanCalendar, sessionOn, type DaySel } from "../modules/PlanCalendar";
import { ExerciseVideos } from "../modules/ExerciseVideos";
import { NutritionView } from "../modules/Nutrition";

interface Props {
  plan: PlanResponse | null;
  changed: Set<string>;
  onPlanSaved: () => void;
  onStartOver: (clearPlan: boolean) => Promise<void>;
}

const ASK_NUTRITION = "Yes, please add a nutrition plan to my training plan.";

/** Today's session if there is one, else the next one, else the first. */
function defaultDay(p: TrainingPlan, today: string): DaySel | null {
  let first: DaySel | null = null;
  for (const w of p.weeks) {
    for (const [i, day] of DAYS.entries()) {
      if (!w.sessions.some((s) => s.day === day && s.type !== "rest")) continue;
      const d = { week: w.week_number, day };
      first ??= d;
      if (addDays(p.start_date, (w.week_number - 1) * 7 + i) >= today) return d;
    }
  }
  return first;
}

/**
 * The start page. Before there's a plan: one chat in the middle. Once Milo
 * saves a plan, the chat moves left and the plan opens beside it as a
 * calendar, with the day's exercises and how-to videos underneath.
 */
export function PlanPage({ plan, changed, onPlanSaved, onStartOver }: Props) {
  const conv = useConversation({ mode: "coaching" }, onPlanSaved);
  const [picked, setPicked] = useState<DaySel | null | undefined>(undefined); // undefined = not chosen yet
  const p = plan?.plan ?? null;
  const today = localToday();

  const chat = (
    <ChatPanel conv={conv} title={p ? "Your plan" : "New plan"} hasPlan={!!p} onStartOver={onStartOver}
      intro={p
        ? { text: "Want to change something, or start fresh? Milo remembers your current plan.", button: "Start a new conversation with Milo" }
        : { text: "Hi, I'm Milo. I'll ask a few short questions, one at a time.", button: "Build a plan with Milo" }}
      placeholder={p ? "e.g. Move my long run to Sunday" : "Type your answer…"}
      savedLabel="Plan saved" />
  );

  if (!p) {
    return (
      <div className="page">
        <header className="page-head">
          <h1>Let's build your plan</h1>
          <p className="lede">A few questions about your goal, your week and your body. Then a plan you can stick to.</p>
        </header>
        {chat}
      </div>
    );
  }

  const selected = picked === undefined ? defaultDay(p, today) : picked;
  const session = selected ? sessionOn(p, selected) : undefined;
  const total = p.weeks.reduce((s, w) => s + w.sessions.reduce((a, x) => a + (x.type === "rest" ? 0 : x.duration_min), 0), 0);
  const end = addDays(p.start_date, p.weeks.length * 7 - 1);

  return (
    <div className="page page-wide plan-layout">
      <aside className="plan-chat">{chat}</aside>

      <div className="plan-main">
        <header className="section-head">
          <div>
            <h1 className="plan-goal">{p.goal}</h1>
            <p className="muted small">{fmtDate(p.start_date)} – {fmtDate(end)} · {p.weeks.length} weeks · {fmtMin(total)} in total
              {changed.size > 0 && <span className="chip chip-new" style={{ marginLeft: 8 }}>{changed.size} day{changed.size === 1 ? "" : "s"} updated</span>}</p>
          </div>
          <div className="downloads">
            {isDemo ? (
              <>
                <button className="btn btn-sm" type="button" disabled title="Downloads need the backend">PDF</button>
                <button className="btn btn-sm" type="button" disabled title="Downloads need the backend">Excel</button>
              </>
            ) : (
              <>
                <a className="btn btn-sm" href={api.exportUrl("pdf")} download>PDF</a>
                <a className="btn btn-sm" href={api.exportUrl("xlsx")} download>Excel</a>
              </>
            )}
          </div>
        </header>

        <PlanCalendar plan={p} changed={changed} today={today} selected={selected} onSelect={setPicked} />

        <section className="section">
          <div className="section-head">
            <h2>How to do it{session && <span className="muted"> · {session.title || typeLabel[session.type]}, {selected!.day}</span>}</h2>
          </div>
          <ExerciseVideos session={session} />
        </section>

        <section className="section">
          <div className="section-head"><h2>Nutrition</h2></div>
          {p.nutrition ? <NutritionView n={p.nutrition} /> : (
            <div className="offer">
              <p className="muted">Want simple meal ideas that fit your training days? Milo asks a couple of questions and adds them to this plan.</p>
              <button className="btn btn-sm" type="button" disabled={conv.busy} onClick={() => conv.send(ASK_NUTRITION)}>Add a nutrition plan</button>
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
      </div>
    </div>
  );
}
