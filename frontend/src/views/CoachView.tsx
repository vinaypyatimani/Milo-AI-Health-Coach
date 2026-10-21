import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { ChatMessage, PlanResponse } from "../api/types";
import { Chat } from "../components/Chat";
import { PlanPanel } from "../components/PlanPanel";
import { ConfirmButton } from "../components/ConfirmButton";

interface Props { plan: PlanResponse | null; onPlanChanged: () => void }

export function CoachView({ plan, onPlanChanged }: Props) {
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urgent, setUrgent] = useState<string | null>(null);

  useEffect(() => { api.coachingConversation().then(setMessages).catch((e) => setError(e.message)); }, []);

  const run = async (fn: () => Promise<{ reply: string; plan_saved: boolean; plan_error: string | null; urgent_banner: string | null }>) => {
    setBusy(true); setError(null);
    try {
      const r = await fn();
      setUrgent(r.urgent_banner);
      if (r.plan_error) setError(`Milo's plan couldn't be saved: ${r.plan_error}`);
      setMessages(await api.coachingConversation());
      if (r.plan_saved) onPlanChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const start = () => {
    setMessages([]);
    run(api.coachingStart);
  };

  const send = (text: string) => {
    setMessages((m) => [...(m ?? []), { role: "user", content: text }]);
    run(() => api.coachingMessage(text));
  };

  const hasConversation = messages && (messages.length > 0 || busy);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Your plan</h1>
          <p>Tell Milo about your goal, your week and your body. Milo asks one question at a time and builds a plan you can actually stick to.</p>
        </div>
        {hasConversation && <ConfirmButton label="New plan" question="Your current plan stays until Milo makes a new one." confirmLabel="Start over" onConfirm={start} disabled={busy} />}
      </header>

      <div className="workspace">
        {hasConversation ? (
          <Chat messages={messages!} busy={busy} onSend={send} placeholder="Answer Milo or ask for a change…"
                urgentBanner={urgent} error={error} savedLabel="Plan saved" />
        ) : (
          <div className="empty">
            <h2>Start with a conversation</h2>
            <p>About five minutes of questions: your goal, current fitness, available time, equipment and any injuries.</p>
            <button className="btn btn-primary" onClick={start} disabled={busy || messages === null}>Build my plan</button>
            {error && <div className="banner banner-error" style={{ marginTop: 16 }}>{error}</div>}
          </div>
        )}

        <div className="side">
          {plan?.plan ? (
            <PlanPanel plan={plan.plan} currentWeek={plan.current_week} />
          ) : (
            <div className="panel">
              <h3>No plan yet</h3>
              <p className="muted small" style={{ marginTop: 6 }}>Your weekly plan appears here as soon as Milo has what it needs.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}