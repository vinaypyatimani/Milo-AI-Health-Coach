import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const base = {
  viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8,
  strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true,
} as const;

export const IconSend = (p: P) => (
  <svg {...base} strokeWidth={2} {...p}><path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" /></svg>
);
export const IconCheck = (p: P) => (
  <svg {...base} strokeWidth={2.2} {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
);
export const IconAlert = (p: P) => (
  <svg {...base} {...p}><path d="M12 4 21 20H3L12 4Z" /><path d="M12 10v4M12 17h.01" /></svg>
);
export const IconUpload = (p: P) => (
  <svg {...base} {...p}><path d="M12 15V4M7 9l5-5 5 5M5 15v4h14v-4" /></svg>
);
export const IconDown = (p: P) => (
  <svg {...base} strokeWidth={2} {...p}><path d="M12 5v14M6 13l6 6 6-6" /></svg>
);
