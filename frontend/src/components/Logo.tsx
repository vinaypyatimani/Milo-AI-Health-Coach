import type { SVGProps } from "react";

/**
 * Milo's mark: a heart-rate line whose two peaks form an "M".
 * Heart rate is what Milo reads from the tracker, and the M is Milo.
 */
export function LogoMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" {...props}>
      <rect width="32" height="32" rx="9" fill="var(--accent)" />
      <path d="M5 18.5h4l3-9 4 13 4-13 3 9h4" fill="none" stroke="var(--accent-ink)"
            strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="logo">
      <LogoMark className="logo-mark" />
      <span className="logo-word">milo</span>
    </span>
  );
}
