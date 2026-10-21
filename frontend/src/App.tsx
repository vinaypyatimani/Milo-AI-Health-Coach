import { useCallback, useEffect, useState } from "react";
import { api } from "./api/client";
import type { PlanResponse } from "./api/types";
import { IconCheckin, IconCoach, IconData, IconProgress, IconSettings, Mark } from "./components/icons";
import { CheckinView } from "./views/CheckinView";
import { CoachView } from "./views/CoachView";
import { DataView } from "./views/DataView";
import { ProgressView } from "./views/ProgressView";
import { SettingsView } from "./views/SettingsView";

type View = "coach" | "checkin" | "data" | "progress" | "settings";

const NAV: { id: View; label: string; Icon: typeof IconCoach; needsPlan?: boolean }[] = [
  { id: "coach", label: "Plan", Icon: IconCoach },
  { id: "checkin", label: "Check-in", Icon: IconCheckin, needsPlan: true },
  { id: "data", label: "Tracker data", Icon: IconData },
  { id: "progress", label: "Progress", Icon: IconProgress, needsPlan: true },
  { id: "settings", label: "Profile", Icon: IconSettings },
];

function initialView(): View {
  const h = window.location.hash.slice(1) as View;
  return NAV.some((n) => n.id === h) ? h : "coach";
}

export default function App() {
  const [view, setView] = useState<View>(initialView);
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const loadPlan = useCallback(() => { api.getPlan().then(setPlan).catch(() => setPlan(null)); }, []);
  useEffect(() => { loadPlan(); }, [loadPlan]);
  useEffect(() => { if (window.location.hash.slice(1) !== view) window.location.hash = view; }, [view]);
  useEffect(() => {
    const onHash = () => setView(initialView());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const notify = (m: string) => { setToast(m); window.setTimeout(() => setToast(null), 2400); };
  const hasPlan = !!plan?.plan;

  const go = (v: View) => setView(NAV.find((n) => n.id === v)?.needsPlan && !hasPlan ? "coach" : v);

  return (
    <div className="shell">
      <nav className="nav" aria-label="Main">
        <div className="brand"><Mark className="brand-mark" /><span className="brand-name">Milo</span></div>
        {NAV.map(({ id, label, Icon, needsPlan }) => (
          <button key={id} className="nav-item" aria-current={view === id ? "page" : undefined}
                  onClick={() => go(id)} disabled={needsPlan && !hasPlan}
                  title={needsPlan && !hasPlan ? "Create a plan first" : undefined}>
            <Icon />{label}
          </button>
        ))}
      </nav>

      <main className="main">
        {view === "coach" && <CoachView plan={plan} onPlanChanged={loadPlan} />}
        {view === "checkin" && hasPlan && <CheckinView key={plan!.history[0]?.id} plan={plan!} onPlanChanged={() => { loadPlan(); notify("Plan updated"); }} goTo={go} />}
        {view === "data" && <DataView notify={notify} />}
        {view === "progress" && hasPlan && <ProgressView plan={plan!} />}
        {view === "settings" && <SettingsView notify={notify} onDeleted={() => { loadPlan(); setView("coach"); }} />}
      </main>

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}