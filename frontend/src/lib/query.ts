/**
 * A tiny data cache shared by the whole app (no extra library).
 *
 * - Every API result is stored under a key ("plan", "metrics:1", ...).
 * - Pages read with useQuery(): cached data shows instantly when you switch
 *   pages, and stale data is refreshed in the background.
 * - After a change (e.g. Milo saved a plan), invalidate() marks keys as stale,
 *   and every page using them refreshes itself.
 */
import { useEffect, useSyncExternalStore } from "react";

interface Entry<T> { data?: T; error?: Error; stale?: boolean; loading?: boolean }

const cache = new Map<string, Entry<unknown>>();
const listeners = new Map<string, Set<() => void>>();
const inflight = new Map<string, Promise<unknown>>();

function emit(key: string) { listeners.get(key)?.forEach((l) => l()); }
function update(key: string, patch: Entry<unknown>) {
  cache.set(key, { ...cache.get(key), ...patch });
  emit(key);
}

export function getQueryData<T>(key: string): T | undefined {
  return cache.get(key)?.data as T | undefined;
}

export function setQueryData<T>(key: string, data: T) {
  update(key, { data, error: undefined, stale: false });
}

export function fetchQuery<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const running = inflight.get(key);
  if (running) return running as Promise<T>;
  update(key, { loading: true });
  const p = fn()
    .then((data) => { update(key, { data, error: undefined, stale: false, loading: false }); return data; })
    .catch((error: Error) => { update(key, { error, stale: false, loading: false }); throw error; })
    .finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

/** Mark keys as stale. A key ending in ":" matches every key with that prefix. */
export function invalidate(...keys: string[]) {
  for (const k of [...cache.keys()]) {
    if (keys.some((p) => (p.endsWith(":") ? k.startsWith(p) : k === p))) update(k, { stale: true });
  }
}

const EMPTY: Entry<unknown> = {};

export function useQuery<T>(key: string | null, fn: () => Promise<T>) {
  const entry = useSyncExternalStore(
    (cb) => {
      if (!key) return () => {};
      if (!listeners.has(key)) listeners.set(key, new Set());
      listeners.get(key)!.add(cb);
      return () => listeners.get(key)?.delete(cb);
    },
    () => (key ? cache.get(key) ?? EMPTY : EMPTY),
  ) as Entry<T>;

  const needsFetch = !!key && (entry === EMPTY || entry.stale) && !entry.loading;
  useEffect(() => {
    if (key && needsFetch) fetchQuery(key, fn).catch(() => { /* shown via entry.error */ });
    // fn is recreated each render; the key identifies the request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, needsFetch]);

  return {
    data: entry.data,
    error: entry.error,
    loading: !entry.data && !entry.error,
    refreshing: !!entry.loading,
  };
}
