import { useLayoutEffect, useRef, useState } from "react";
import { Markdown } from "../components/Markdown";
import { LogoMark } from "../components/Logo";
import { Banner } from "../components/ui";
import { IconCheck, IconDown } from "../components/icons";
import type { ChatMessage } from "../lib/types";

interface Props {
  messages: ChatMessage[];
  streaming: string | null;
  status: string | null;
  urgent: string | null;
  error: string | null;
  savedLabel: string;
}

/** While a plan is being written, show the prose and hide the raw JSON. */
function visibleText(text: string): { text: string; writingPlan: boolean; week: number } {
  const i = text.indexOf("```");
  if (i < 0) return { text, writingPlan: false, week: 0 };
  // Show progress while the plan is written: count the weeks started so far.
  const week = (text.slice(i).match(/"week_number"\s*:/g) ?? []).length;
  return { text: text.slice(0, i).trimEnd(), writingPlan: true, week };
}

/**
 * The message list scrolls on its own (not the whole page) and follows new
 * text while Milo writes. If you scroll up to reread something, it stops
 * following and shows a "Latest" button instead of pulling you back down.
 */
export function MessageList({ messages, streaming, status, urgent, error, savedLabel }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const follow = useRef(true);
  const lastCount = useRef(0);
  const [showJump, setShowJump] = useState(false);

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    follow.current = nearBottom;
    setShowJump(!nearBottom);
  };

  const jump = () => {
    follow.current = true;
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  };

  // Runs after every change, before the browser paints, so there's no flicker.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    // A message you just sent always brings you back to the bottom.
    if (messages.length > lastCount.current && messages[messages.length - 1]?.role === "user") follow.current = true;
    lastCount.current = messages.length;
    if (follow.current) el.scrollTop = el.scrollHeight;
  }, [messages, streaming, status, urgent, error]);

  const live = streaming !== null ? visibleText(streaming) : null;

  return (
    <div className="messages-wrap">
      <div className="messages" ref={scroller} onScroll={onScroll} aria-live="polite">
        {messages.map((m, i) => (
          <div key={i} className={`msg msg-${m.role}`}>
            {m.role === "assistant" && <LogoMark className="avatar" />}
            <div className="bubble">
              <Markdown text={m.content} />
              {m.plan_saved && <div className="saved-note"><IconCheck /> {savedLabel}</div>}
            </div>
          </div>
        ))}

        {live && (
          <div className="msg msg-assistant">
            <LogoMark className="avatar" />
            <div className="bubble is-streaming">
              {live.text ? <Markdown text={live.text} /> : <div className="typing" aria-label="Milo is thinking"><span /><span /><span /></div>}
              {live.text && !live.writingPlan && <span className="caret" aria-hidden="true" />}
              {(live.writingPlan || status) && <div className="writing-note"><span className="spinner" />{status ?? (live.week ? `Writing your plan… week ${live.week}` : "Writing your plan…")}</div>}
            </div>
          </div>
        )}

        {urgent && <Banner tone="urgent">{urgent}</Banner>}
        {error && <Banner tone="error">{error}</Banner>}
      </div>
      {showJump && (
        <button className="jump" onClick={jump} type="button">
          <IconDown width={14} height={14} /> Latest
        </button>
      )}
    </div>
  );
}
