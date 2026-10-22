import { lazy, Suspense, useState } from "react";
import { api, isDemo } from "./lib/api";
import { fetchQuery, getQueryData, invalidate, useQuery } from "./lib/query";
import type { ChatTarget, PlanResponse } from "./lib/types";
import { diffPlans } from "./lib/planDiff";
import { navigate, routeHash, useRoute, type Route } from "./lib/router";
import { Logo } from "./components/Logo";
import { Skeleton } from "./components/ui";
import { IconChat, IconData, IconPlan, IconProfile, IconProgress, IconWeek } from "./components/icons";
import { MiloDock } from "./chat/MiloDock";
import { WeekPage } from "./pages/WeekPage";
import { PlanPage } from "./pages/PlanPage";

// Pages you visit less often load only when first opened (smaller first download).
const DataPage = lazy(() => import("./pages/DataPage"));
const ProgressPage = lazy(() => import("./pages/ProgressPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));

const NAV = [
  { page: "week", label: "Week", Icon: IconWeek, needsPlan: true },
  { page: "plan", label: "Plan", Icon: IconPlan, needsPlan: false },
  { page: "data", label: "Data", Icon: IconData, needsPlan: false },
  { page: "progress", label: "Progress", Icon: IconProgress, needsPlan: true },
  { page: "profile", label: "Profile", Icon: IconProfile, needsPlan: false },
] as const;

export default function App() {
  const route = useRoute();
  const { data: plan, loading } = useQuery("plan", api.getPlan);
  const [changed, setChanged] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);              // phones only
  const [override, setOverride] = useState<{ hash: string; target: ChatTarget } | null>(null);

  const hasPlan = !!plan?.plan;
  const current = plan?.current_week ?? 1;
  const lastWeek = Math.max(1, current - 1);                     // the last complete week
  const shownWeek = route.page === "week" ? Math.min(route.week ?? lastWeek, plan?.plan?.weeks.length ?? 1) : lastWeek;
  const checkinWeek = hasPlan ? (shownWeek <= current ? shownWeek : lastWeek) : null;

  // The dock follows the page (Week -> that week's check-in, Plan -> planning),
  // unless you switched it yourself on this page.
  const hash = routeHash(route);
  const auto: ChatTarget = !hasPlan || route.page === "plan" ? { mode: "coaching" } : { mode: "checkin", week: checkinWeek! };
  const target = override?.hash === hash ? override.target : auto;
  const openChat = (t: ChatTarget) => { setOverride({ hash, target: t }); setSheetOpen(true); };

  const notify = (m: string) => { setToast(m); window.setTimeout(() => setToast(null), 2600); };

  const onPlanSaved = async () => {
    const before = getQueryData<PlanResponse>("plan")?.plan;
    const next = await fetchQuery("plan", api.getPlan);
    setChanged(diffPlans(before, next.plan));
    invalidate("metrics:", "progress");
    notify(before ? "Plan updated" : "Plan saved");
  };

  const onDeleted = () => {
    invalidate("plan", "activities", "metrics:", "progress", "profile", "conv:");
    setChanged(new Set());
    navigate({ page: "plan" });
  };

  const go = (page: Route["page"]) => navigate(page === "week" ? { page: "week", week: null } : { page } as Route);

  let content;
  if (loading) content = <div className="page"><Skeleton height={60} /><div style={{ height: 16 }} /><Skeleton height={260} /></div>;
  else if (route.page === "week" && hasPlan) content = <WeekPage plan={plan!} week={shownWeek} changed={changed} onCheckin={() => openChat({ mode: "checkin", week: shownWeek })} />;
  else if (route.page === "data") content = <DataPage notify={notify} />;
  else if (route.page === "progress" && hasPlan) content = <ProgressPage plan={plan!} />;
  else if (route.page === "profile") content = <ProfilePage notify={notify} onDeleted={onDeleted} />;
  else content = <PlanPage plan={plan ?? null} changed={changed} onPlanChat={() => openChat({ mode: "coaching" })} />;

  return (
    <div className={`app${sheetOpen ? " sheet-open" : ""}`}>
      <header className="topbar">
        <a href="#week" className="brand" aria-label="Milo, go to this week"><Logo /></a>
        <nav className="tabs" aria-label="Main">
          {NAV.map(({ page, label, Icon, needsPlan }) => (
            <button key={page} type="button" className="tab" aria-current={route.page === page ? "page" : undefined}
                    disabled={needsPlan && !hasPlan} title={needsPlan && !hasPlan ? "Create a plan first" : undefined}
                    onClick={() => go(page)}>
              <Icon width={18} height={18} /><span>{label}</span>
            </button>
          ))}
        </nav>
        {isDemo && <span className="demo-pill" title="Sample data, scripted replies">Demo</span>}
      </header>

      <div className="body">
        <main className="content">
          <Suspense fallback={<div className="page"><Skeleton height={300} /></div>}>{content}</Suspense>
        </main>
        <MiloDock target={target} checkinWeek={checkinWeek}
                  onTarget={(t) => setOverride({ hash, target: t })}
                  onPlanSaved={onPlanSaved} onClose={() => setSheetOpen(false)} />
      </div>

      <button className="fab" type="button" onClick={() => setSheetOpen(true)} aria-label="Chat with Milo">
        <IconChat width={20} height={20} /> Milo
      </button>
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
