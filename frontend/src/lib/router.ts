import { useSyncExternalStore } from "react";

/** Pages and their URLs: #week/2, #plan, #data, #progress, #profile */
export type Route =
  | { page: "week"; week: number | null }
  | { page: "plan" }
  | { page: "data" }
  | { page: "progress" }
  | { page: "profile" }
  | { page: "analyze" };

export function parseRoute(hash: string): Route {
  const [page, arg] = hash.replace(/^#\/?/, "").split("?")[0].split("/");   // "#analyze?connected=polar" -> analyze
  if (page === "data" || page === "progress" || page === "profile" || page === "analyze") return { page };
  if (page === "week") {
    const week = Number(arg);
    return { page: "week", week: Number.isInteger(week) && week > 0 ? week : null };
  }
  return { page: "plan" }; // the Plan page is the start page
}

export function routeHash(r: Route): string {
  return r.page === "week" ? (r.week ? `#week/${r.week}` : "#week") : `#${r.page}`;
}

export function navigate(r: Route) {
  window.location.hash = routeHash(r);
}

const subscribe = (cb: () => void) => {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
};

/** The current page, kept in sync with the URL (back button works). */
export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash);
  return parseRoute(hash);
}
