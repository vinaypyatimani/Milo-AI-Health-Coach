import type { SVGProps } from "react";

const base = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round", viewBox: "0 0 24 24", "aria-hidden": true } as const;

/** Milo's mark: three bars growing step by step, like the calf Milo carried. */
export const Mark = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 28 28" aria-hidden="true" {...p}>
    <rect x="3" y="15" width="6" height="10" rx="2" fill="var(--planned)" />
    <rect x="11" y="10" width="6" height="15" rx="2" fill="var(--accent)" opacity="0.65" />
    <rect x="19" y="3" width="6" height="22" rx="2" fill="var(--accent)" />
  </svg>
);

export const IconCoach = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><path d="M4 5h16v11H9l-5 4z" /><path d="M8 10h8M8 13h5" /></svg>
);
export const IconCheckin = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 9h16M9 3v4M15 3v4M9 14l2 2 4-4" /></svg>
);
export const IconData = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><path d="M3 12h4l2-5 4 10 2-5h6" /></svg>
);
export const IconProgress = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><path d="M5 20V12M10 20V8M15 20v-5M20 20V4" /></svg>
);
export const IconSettings = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><circle cx="12" cy="8" r="3.5" /><path d="M5 20c1-3.5 3.8-5.5 7-5.5s6 2 7 5.5" /></svg>
);
export const IconSend = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><path d="M5 12h13M13 6l6 6-6 6" /></svg>
);
export const IconCheck = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} strokeWidth={2.2} {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
);
export const IconUpload = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><path d="M12 15V4M7 9l5-5 5 5M5 15v4h14v-4" /></svg>
);
export const IconAlert = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p} width={18} height={18} style={{ flex: "none", marginTop: 1 }}><path d="M12 4l9 16H3z" /><path d="M12 10v4M12 17h.01" /></svg>
);
