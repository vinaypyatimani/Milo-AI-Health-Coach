import { lazy, Suspense, useState } from "react";
import { api, isDemo } from "./lib/api";
import { fetchQuery, getQueryData, invalidate, setQueryData, useQuery } from "./lib/query";
import type { ChatTarget, PlanResponse } from "./lib/types";
import { diffPlans } from "./lib/planDiff";
import { navigate, useRoute, type Route } from "./lib/router";
import { Logo } from "./components/Logo";
import { Skeleton } from "./components/ui";
import { conversationKey } from "./chat/useConversation";
import { PlanPage } from "./pages/PlanPage";
import { WeekPage } from "./pages/WeekPage";

// Pages you visit less often load only when first opened (smaller first download).
const DataPage = lazy(() => import("./pages/DataPage"));
const ProgressPage = lazy(() => import("./pages/ProgressPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));

const NAV = [
  { page: "plan", label: "Plan", needsPlan: false },
  { page: "week", label: "Week", needsPlan: true },
  { page: "data", label: "Data", needsPlan: false },
  { page: "progress", label: "Progress", needsPlan: true },
  { page: "profile", label: "Profile", needsPlan: false },
] as const;

const NO_PLAN: PlanResponse = { plan: null, current_week: null, history: [] };

export default function App() {
  const route = useRoute();
  const { data: plan, loading } = useQuery("plan", api.getPlan);
  const [changed, setChanged] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);

  const hasPlan = !!plan?.plan;
  const current = plan?.current_week ?? 1;
  const lastWeek = Math.max(1, current - 1); // the last complete week
  const shownWeek = route.page === "week" ? Math.min(route.week ?? lastWeek, plan?.plan?.weeks.length ?? 1) : lastWeek;

  const notify = (m: string) => { setToast(m); window.setTimeout(() => setToast(null), 2600); };

  const onPlanSaved = async () => {
    const before = getQueryData<PlanResponse>("plan")?.plan;
    const next = await fetchQuery("plan", api.getPlan);
    setChanged(diffPlans(before, next.plan));
    invalidate("metrics:", "progress");
    notify(before ? "Plan updated" : "Plan saved");
  };

  /** Start over: always clears the conversation; optionally the plan too. */
  const startOver = async (target: ChatTarget, clearPlan: boolean) => {
    if (clearPlan) {
      await api.clearPlan(); // also removes every conversation
      setQueryData("plan", NO_PLAN);
      setQueryData("conv:coaching", []);
      invalidate("plan", "conv:", "metrics:", "progress");
      setChanged(new Set());
      navigate({ page: "plan" });
      notify("Plan cleared");
    } else {
      await api.clearConversation(target);
      setQueryData(conversationKey(target), []);
    }
  };

  const onDeleted = () => {
    invalidate("plan", "activities", "metrics:", "progress", "profile", "conv:");
    setChanged(new Set());
    navigate({ page: "plan" });
  };

  const go = (page: Route["page"]) => navigate(page === "week" ? { page: "week", week: null } : ({ page } as Route));

  let content;
  if (loading) content = <div className="page"><Skeleton height={48} /><div style={{ height: 20 }} /><Skeleton height={220} /></div>;
  else if (route.page === "week" && hasPlan)
    content = <WeekPage plan={plan!} week={shownWeek} changed={changed} onPlanSaved={onPlanSaved}
                        onStartOver={(week, clear) => startOver({ mode: "checkin", week }, clear)} />;
  else if (route.page === "data") content = <DataPage notify={notify} />;
  else if (route.page === "progress" && hasPlan) content = <ProgressPage plan={plan!} />;
  else if (route.page === "profile") content = <ProfilePage notify={notify} onDeleted={onDeleted} />;
  else content = <PlanPage plan={plan ?? null} changed={changed} onPlanSaved={onPlanSaved}
                           onStartOver={(clear) => startOver({ mode: "coaching" }, clear)} />;

  const active = route.page === "week" && !hasPlan ? "plan" : route.page;

  return (
    <div className="app">
      <header className="topbar">
        <a href="#plan" className="brand" aria-label="Milo, go to your plan"><Logo /></a>
        <nav className="tabs" aria-label="Main">
          {NAV.map(({ page, label, needsPlan }) => (
            <button key={page} type="button" className="tab" aria-current={active === page ? "page" : undefined}
                    disabled={needsPlan && !hasPlan} title={needsPlan && !hasPlan ? "Build a plan first" : undefined}
                    onClick={() => go(page)}>
              {label}
            </button>
          ))}
        </nav>
        {isDemo && <span className="demo-pill" title="Sample data, scripted replies">Demo</span>}
      </header>

      <main className="content">
        <Suspense fallback={<div className="page"><Skeleton height={300} /></div>}>{content}</Suspense>
      </main>
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
