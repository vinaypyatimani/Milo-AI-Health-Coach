import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import type { ChatMessage } from "../api/types";
import { Markdown } from "./Markdown";
import { IconAlert, IconCheck, IconSend, Mark } from "./icons";

interface Props {
  messages: ChatMessage[];
  busy: boolean;
  onSend: (text: string) => void;
  placeholder: string;
  urgentBanner?: string | null;
  error?: string | null;
  savedLabel: string;
}

export function Chat({ messages, busy, onSend, placeholder, urgentBanner, error, savedLabel }: Props) {
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, busy]);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const t = text.trim();
    if (!t || busy) return;
    onSend(t);
    setText("");
    inputRef.current?.focus();
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) submit();
  };

  return (
    <section className="chat" aria-label="Conversation with Milo">
      <div className="messages" aria-live="polite">
        {messages.map((m, i) => (
          <div key={i} className={`msg msg-${m.role}`}>
            {m.role === "assistant" && <Mark className="avatar" />}
            <div className="bubble">
              <Markdown text={m.content} />
              {m.plan_saved && (
                <div className="saved-note"><IconCheck /> {savedLabel}</div>
              )}
            </div>
          </div>
        ))}
        {busy && (
          <div className="msg msg-assistant">
            <Mark className="avatar" />
            <div className="typing" aria-label="Milo is typing"><span /><span /><span /></div>
          </div>
        )}
        {urgentBanner && <div className="banner banner-urgent" role="alert"><IconAlert />{urgentBanner}</div>}
        {error && <div className="banner banner-error" role="alert"><IconAlert />{error}</div>}
        <div ref={endRef} />
      </div>

      <div className="composer">
        <form onSubmit={submit}>
          <textarea
            ref={inputRef}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKey}
            placeholder={placeholder}
            aria-label="Message"
          />
          <button className="btn btn-primary" type="submit" disabled={busy || !text.trim()} aria-label="Send">
            <IconSend width={18} height={18} />
          </button>
        </form>
        <p className="composer-hint">Milo is a coach, not a doctor. For pain or symptoms, see a professional.</p>
      </div>
    </section>
  );
}