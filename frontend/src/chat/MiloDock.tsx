import { api } from "../lib/api";
import { useQuery } from "../lib/query";
import type { ChatTarget } from "../lib/types";
import { ConfirmButton } from "../components/ConfirmButton";
import { LogoMark } from "../components/Logo";
import { IconClose } from "../components/icons";
import { Segmented } from "../components/ui";
import { Composer } from "./Composer";
import { MessageList } from "./MessageList";
import { conversationKey, useConversation } from "./useConversation";

interface Props {
  target: ChatTarget;
  checkinWeek: number | null;     // the week the check-in option points to (null = no plan yet)
  onTarget: (t: ChatTarget) => void;
  onPlanSaved: () => void;
  onClose?: () => void;           // phones: the dock is a full-screen sheet
}

/** Milo is always one glance away: the dock sits beside every page. */
export function MiloDock({ target, checkinWeek, onTarget, onPlanSaved, onClose }: Props) {
  return (
    <aside className="dock" aria-label="Chat with Milo">
      <header className="dock-head">
        <div className="dock-title">
          <LogoMark className="dock-mark" />
          <div>
            <strong>Milo</strong>
            <span className="dock-sub">{target.mode === "coaching" ? "Planning with you" : `Reviewing week ${target.week}`}</span>
          </div>
        </div>
        {onClose && (
          <button className="icon-btn" onClick={onClose} aria-label="Close chat" type="button"><IconClose width={18} height={18} /></button>
        )}
      </header>
      <div className="dock-modes">
        <Segmented<"coaching" | "checkin">
          label="Conversation"
          value={target.mode}
          onChange={(m) => onTarget(m === "coaching" || !checkinWeek ? { mode: "coaching" } : { mode: "checkin", week: checkinWeek })}
          options={[
            { value: "coaching", label: "Plan" },
            { value: "checkin", label: checkinWeek ? `Week ${checkinWeek} check-in` : "Check-in",
              disabled: !checkinWeek, title: checkinWeek ? undefined : "Create a plan first" },
          ]}
        />
      </div>
      {/* key: a fresh conversation component per target, so state never leaks between chats */}
      <Conversation key={conversationKey(target)} target={target} onPlanSaved={onPlanSaved} />
    </aside>
  );
}

function Conversation({ target, onPlanSaved }: { target: ChatTarget; onPlanSaved: () => void }) {
  const c = useConversation(target, onPlanSaved);
  const week = target.mode === "checkin" ? target.week : null;
  // Shares the cache with the Week page, so this costs no extra request.
  const { data: metrics } = useQuery(week ? `metrics:${week}` : null, () => api.weekMetrics(week!));

  const last = c.messages[c.messages.length - 1];
  const asksApproval = !c.busy && last?.role === "assistant" && /\?\s*$/.test(last.content.trim())
    && /(update|change).{0,40}plan/i.test(last.content);
  const suggestions = asksApproval ? ["Yes, update my plan", "Let's change something first"] : [];

  const isEmpty = !c.loading && c.messages.length === 0 && !c.busy;

  return (
    <>
      {isEmpty ? (
        <div className="dock-empty">
          {target.mode === "coaching" ? (
            <>
              <h3>Let's build your plan</h3>
              <p>About five minutes of questions: your goal, current fitness, available time, equipment and any injuries. Milo asks one at a time.</p>
              <button className="btn btn-primary" onClick={c.start} type="button">Build my plan</button>
            </>
          ) : (
            <>
              <h3>Review week {target.week}</h3>
              <p>{metrics && !metrics.has_tracker_data
                ? "There's no tracker data for this week yet. You can upload it first, or tell Milo how it went."
                : "Milo summarizes the week, asks how you felt, and suggests changes for next week. Nothing changes without your OK."}</p>
              <button className="btn btn-primary" onClick={c.start} type="button">Start check-in</button>
            </>
          )}
          {c.error && <p className="dock-error">{c.error}</p>}
        </div>
      ) : (
        <MessageList messages={c.messages} streaming={c.streaming} status={c.status}
                     urgent={c.urgent} error={c.error}
                     savedLabel={target.mode === "coaching" ? "Plan saved" : "Plan updated"} />
      )}
      {!isEmpty && (
        <div className="dock-restart">
          <ConfirmButton className="link-btn" disabled={c.busy} onConfirm={c.start}
                         label={target.mode === "coaching" ? "Start a new plan conversation" : "Restart this check-in"}
                         question="This clears the conversation." confirmLabel="Start over" />
        </div>
      )}
      <Composer busy={c.busy} onSend={c.send} suggestions={suggestions}
                placeholder={target.mode === "coaching" ? "Answer Milo or ask for a change…" : "Tell Milo how the week felt…"} />
    </>
  );
}
