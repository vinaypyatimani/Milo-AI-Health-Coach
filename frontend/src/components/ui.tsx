/** Small shared building blocks used by the modules and pages. */
import type { ReactNode } from "react";
import { IconAlert } from "./icons";

export function Card({ title, aside, children, className = "", highlight = false }: {
  title?: ReactNode; aside?: ReactNode; children: ReactNode; className?: string; highlight?: boolean;
}) {
  return (
    <section className={`card${highlight ? " card-updated" : ""} ${className}`}>
      {(title || aside) && (
        <header className="card-head">
          {title && <h2 className="card-title">{title}</h2>}
          {aside && <div className="card-aside">{aside}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function Banner({ tone, children }: { tone: "urgent" | "warn" | "error"; children: ReactNode }) {
  return (
    <div className={`banner banner-${tone}`} role={tone === "warn" ? "status" : "alert"}>
      <IconAlert className="banner-icon" />
      <div>{children}</div>
    </div>
  );
}

export function Segmented<T extends string | number>({ label, options, value, onChange }: {
  label: string;
  options: { value: T; label: ReactNode; disabled?: boolean; title?: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.value)} type="button" aria-pressed={o.value === value}
                disabled={o.disabled} title={o.title} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Skeleton({ height = 120 }: { height?: number }) {
  return <div className="skeleton" style={{ height }} aria-hidden="true" />;
}

export function Empty({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <h2>{title}</h2>
      <p>{children}</p>
      {action}
    </div>
  );
}
