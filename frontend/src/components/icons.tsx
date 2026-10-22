import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const base = {
  viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8,
  strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true,
} as const;

export const IconWeek = (p: P) => (
  <svg {...base} {...p}><rect x="3.5" y="5" width="17" height="15" rx="3" /><path d="M3.5 10h17M8.5 3v4M15.5 3v4M8 14.5h2M14 14.5h2" /></svg>
);
export const IconPlan = (p: P) => (
  <svg {...base} {...p}><path d="M12 3.5 3.5 8 12 12.5 20.5 8 12 3.5Z" /><path d="m3.5 12 8.5 4.5 8.5-4.5M3.5 16l8.5 4.5 8.5-4.5" /></svg>
);
export const IconData = (p: P) => (
  <svg {...base} {...p}><path d="M3 12.5h4l2.5-6 5 11 2.5-5H21" /></svg>
);
export const IconProgress = (p: P) => (
  <svg {...base} {...p}><path d="M4 19.5h16" /><path d="m5 15 4.5-4.5 3.5 3L19 7.5" /><path d="M14.5 7.5H19V12" /></svg>
);
export const IconProfile = (p: P) => (
  <svg {...base} {...p}><circle cx="12" cy="8.5" r="3.8" /><path d="M4.5 20c1.2-3.6 4.1-5.5 7.5-5.5s6.3 1.9 7.5 5.5" /></svg>
);
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
export const IconChat = (p: P) => (
  <svg {...base} {...p}><path d="M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v8.5A1.5 1.5 0 0 1 19 17h-8l-5 3.5V17H5a1.5 1.5 0 0 1-1.5-1.5V7A1.5 1.5 0 0 1 5 5.5Z" /></svg>
);
export const IconClose = (p: P) => (
  <svg {...base} strokeWidth={2} {...p}><path d="M6 6l12 12M18 6 6 18" /></svg>
);
export const IconDown = (p: P) => (
  <svg {...base} strokeWidth={2} {...p}><path d="M12 5v14M6 13l6 6 6-6" /></svg>
);
export const IconRefresh = (p: P) => (
  <svg {...base} {...p}><path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" /><path d="M19.5 4.5v4h-4" /></svg>
);
