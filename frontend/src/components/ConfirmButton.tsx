import { useState, type ReactNode } from "react";

/** Two-step button: asks inline instead of a browser dialog. */
export function ConfirmButton({ label, question, confirmLabel, onConfirm, className = "btn", disabled }: {
  label: ReactNode; question: string; confirmLabel: string; onConfirm: () => void; className?: string; disabled?: boolean;
}) {
  const [asking, setAsking] = useState(false);
  if (!asking) return <button className={className} onClick={() => setAsking(true)} disabled={disabled}>{label}</button>;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }} role="group" aria-label={question}>
      <span className="small muted">{question}</span>
      <button className={className} onClick={() => { setAsking(false); onConfirm(); }} autoFocus>{confirmLabel}</button>
      <button className="btn btn-ghost" onClick={() => setAsking(false)}>Cancel</button>
    </span>
  );
}