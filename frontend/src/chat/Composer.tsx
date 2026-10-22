import { useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { IconSend } from "../components/icons";

/** Message box: grows with the text, Enter sends, Shift+Enter adds a line. */
export function Composer({ busy, placeholder, onSend, suggestions = [] }: {
  busy: boolean;
  placeholder: string;
  onSend: (text: string) => Promise<boolean>;
  suggestions?: string[];
}) {
  const [text, setText] = useState("");
  const input = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = input.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [text]);

  const send = async (value: string) => {
    const t = value.trim();
    if (!t || busy) return;
    setText("");
    const ok = await onSend(t);
    if (!ok) setText(t); // give the text back if Milo couldn't answer
    input.current?.focus();
  };

  const submit = (e: FormEvent) => { e.preventDefault(); send(text); };
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(text); }
  };

  return (
    <div className="composer">
      {suggestions.length > 0 && !busy && (
        <div className="suggestions">
          {suggestions.map((s) => <button key={s} type="button" className="chip-btn" onClick={() => send(s)}>{s}</button>)}
        </div>
      )}
      <form onSubmit={submit}>
        <label htmlFor="milo-input" className="sr-only">Message to Milo</label>
        <textarea id="milo-input" ref={input} rows={1} value={text} placeholder={placeholder}
                  onChange={(e) => setText(e.target.value)} onKeyDown={onKey} />
        <button className="send" type="submit" disabled={busy || !text.trim()} aria-label="Send">
          <IconSend width={18} height={18} />
        </button>
      </form>
      <p className="composer-hint">Milo is a coach, not a doctor. For pain or symptoms, see a professional.</p>
    </div>
  );
}
