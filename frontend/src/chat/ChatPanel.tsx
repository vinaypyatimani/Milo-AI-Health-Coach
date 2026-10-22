import { useState } from "react";
import { LogoMark } from "../components/Logo";
import { Banner } from "../components/ui";
import type { ChatMessage } from "../lib/types";
import { Composer } from "./Composer";
import { MessageList } from "./MessageList";
import type { Conversation } from "./useConversation";

interface Props {
  conv: Conversation;
  title: string;                 // "Coaching", "Week 1 check-in"
  intro: { text: string; button: string };
  placeholder: string;
  savedLabel: string;
  hasPlan: boolean;
  /** Clear the conversation on the server; clearPlan also removes the plan. */
  onStartOver: (clearPlan: boolean) => Promise<void>;
}

/** Quick replies for the two yes/no questions Milo asks. */
function suggestionsFor(messages: ChatMessage[]): string[] {
  const last = messages[messages.length - 1];
  if (!last || last.role !== "assistant" || !last.content.trim().endsWith("?")) return [];
  const tail = last.content.slice(-240).toLowerCase();
  if (tail.includes("nutrition")) return ["Yes, add a nutrition plan", "No thanks"];
  if (/update (the|your) plan|change (the|your) plan|apply these/.test(tail)) return ["Yes, update my plan", "Let's change something first"];
  return [];
}

function UsageMeter({ usage }: { usage: Conversation["usage"] }) {
  if (!usage.tokens) return null;
  const approx = usage.estimated ? "≈ " : "";
  const cost = usage.cost == null ? "–" : usage.cost === 0 ? "$0.00" : usage.cost < 0.01 ? `$${usage.cost.toFixed(4)}` : `$${usage.cost.toFixed(2)}`;
  const title = `${usage.model}${usage.estimated ? " · some numbers are estimates" : ""}${usage.cost === 0 ? " · free tier" : ""}`;
  return (
    <span className="usage num" title={title}>
      {approx}{usage.tokens.toLocaleString("en-US")} tokens · {cost}
    </span>
  );
}

/**
 * The one central chat. Before a conversation exists it shows a single
 * button; once clicked, the button is gone and the chat takes its place.
 */
export function ChatPanel({ conv, title, intro, placeholder, savedLabel, hasPlan, onStartOver }: Props) {
  const [asking, setAsking] = useState(false);
  const [working, setWorking] = useState(false);
  const empty = conv.messages.length === 0 && !conv.busy;

  const startOver = async (clearPlan: boolean) => {
    setWorking(true);
    try { await onStartOver(clearPlan); conv.reset(); } finally { setWorking(false); setAsking(false); }
  };

  if (conv.loading) return <div className="chat chat-intro"><div className="typing"><span /><span /><span /></div></div>;

  if (empty) {
    return (
      <div className="chat chat-intro">
        <LogoMark className="intro-mark" />
        <p className="intro-text">{intro.text}</p>
        <button className="btn btn-primary btn-lg" type="button" onClick={() => conv.start()}>{intro.button}</button>
        {conv.error && <Banner tone="error">{conv.error}</Banner>}
      </div>
    );
  }

  return (
    <section className="chat" aria-label={`Chat with Milo: ${title}`}>
      <header className="chat-head">
        <span className="chat-title"><LogoMark className="chat-mark" /> Milo <span className="muted">· {title}</span></span>
        <span className="chat-tools">
          <UsageMeter usage={conv.usage} />
          {!asking && <button className="link-btn" type="button" disabled={conv.busy} onClick={() => (hasPlan ? setAsking(true) : startOver(false))}>Start over</button>}
        </span>
      </header>

      {asking && (
        <div className="confirm" role="group" aria-label="Start over">
          <span className="grow">Start a new conversation. Should your plan be cleared too?</span>
          <button className="btn btn-sm" type="button" disabled={working} onClick={() => startOver(false)}>Keep my plan</button>
          <button className="btn btn-sm btn-danger" type="button" disabled={working} onClick={() => startOver(true)}>Clear my plan</button>
          <button className="link-btn" type="button" disabled={working} onClick={() => setAsking(false)}>Cancel</button>
        </div>
      )}

      <MessageList messages={conv.messages} streaming={conv.streaming} status={conv.status}
                   urgent={conv.urgent} error={conv.error} savedLabel={savedLabel} />
      <Composer busy={conv.busy} placeholder={placeholder} onSend={conv.send} suggestions={suggestionsFor(conv.messages)} />
    </section>
  );
}
