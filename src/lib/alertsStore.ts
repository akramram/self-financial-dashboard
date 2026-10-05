// ─── Alerts shared state (FIN-021) ──────────────────────────────────────────
// Single source of truth for alert dismissal shared by every AlertsPanel
// instance (dashboard panel + sidebar alerts drawer). Dismissing an alert in
// one surface immediately recomputes the other and re-broadcasts `alerts-count`
// so both sidebar bells update.
//
// - Anomaly dismissals are in-memory per page load (matches previous behavior;
//   new persistence is de-scoped by the BA).
// - Budget dismissals mirror the existing `budget-alerts-dismissed`
//   localStorage key used by AlertsPanel/BudgetAlerts (backward compatible).

import type { MonthlySummary, Category, Transaction } from './data';
import type { Anomaly } from './db';

export interface AlertsData {
  month: string;
  summaries: MonthlySummary[];
  categories: Category[];
  transactions: Transaction[];
  recurringTitles: string[];
  anomalies: Anomaly[];
}

export interface AlertsSharedState {
  dismissedAnomalies: ReadonlySet<number>;
  dismissedBudget: Readonly<Record<string, boolean>>;
}

const BUDGET_STORAGE_KEY = 'budget-alerts-dismissed';

let state: AlertsSharedState = {
  dismissedAnomalies: new Set<number>(),
  dismissedBudget: {},
};

let budgetLoaded = false;
const listeners = new Set<() => void>();

function readBudgetDismissals(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(BUDGET_STORAGE_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

export function subscribeAlerts(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Client snapshot — lazily hydrates budget dismissals from localStorage once. */
export function getAlertsState(): AlertsSharedState {
  if (!budgetLoaded) {
    budgetLoaded = true;
    state = { ...state, dismissedBudget: readBudgetDismissals() };
  }
  return state;
}

/** Server snapshot — never touches localStorage (SSR-safe). */
export function getAlertsServerState(): AlertsSharedState {
  return state;
}

function publish(next: AlertsSharedState): void {
  state = next;
  listeners.forEach((l) => l());
}

export function dismissAnomalyShared(id: number): void {
  const cur = getAlertsState();
  if (cur.dismissedAnomalies.has(id)) return;
  const next = new Set(cur.dismissedAnomalies);
  next.add(id);
  publish({ ...cur, dismissedAnomalies: next });
}

export function dismissBudgetShared(key: string): void {
  const cur = getAlertsState();
  if (cur.dismissedBudget[key]) return;
  const nextMap = { ...cur.dismissedBudget, [key]: true };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(BUDGET_STORAGE_KEY, JSON.stringify(nextMap));
    } catch {
      // storage full/blocked — keep in-memory dismissal only
    }
  }
  publish({ ...cur, dismissedBudget: nextMap });
}

/** Test hygiene / fresh mount: clears in-memory shared state. */
export function resetAlertsState(): void {
  budgetLoaded = false;
  state = { dismissedAnomalies: new Set<number>(), dismissedBudget: {} };
}

// ─── Drawer open bus ────────────────────────────────────────────────────────
// Sidebar bells (desktop + mobile) publish; the AlertsDrawer island in
// Layout.astro subscribes. Keeps the bell → drawer wiring navigation-free.

export const ALERTS_DRAWER_OPEN_EVENT = 'fin-alerts-drawer-open';

export function openAlertsDrawer(opener?: HTMLElement | null): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(ALERTS_DRAWER_OPEN_EVENT, { detail: opener ?? undefined }),
  );
}

// ─── Drawer data hook ───────────────────────────────────────────────────────
// The drawer is mounted on every page, so it fetches the same inputs the
// dashboard passes to AlertsPanel as SSR props, using the existing lib/api
// helpers (no duplicated endpoints or logic).

import { useCallback, useEffect, useState } from 'react';
import {
  fetchSummaries,
  fetchCategories,
  fetchTransactions,
  fetchRecurringTransactions,
} from './api';

export type AlertsDataStatus = 'idle' | 'loading' | 'ready' | 'error';

// Per-month cache (KUR-118 directive #4): reopening the drawer for a month
// already fetched renders instantly from cache instead of re-fetching.
const alertsDataCache = new Map<string, AlertsData>();

export function resetAlertsDataCache(): void {
  alertsDataCache.clear();
}

export function useAlertsData(enabled: boolean): {
  status: AlertsDataStatus;
  data: AlertsData | null;
  retry: () => void;
} {
  const [status, setStatus] = useState<AlertsDataStatus>('idle');
  const [data, setData] = useState<AlertsData | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setStatus('loading');
    (async () => {
      try {
        const [summaries, categories, transactions, recurring] = await Promise.all([
          fetchSummaries(),
          fetchCategories(),
          fetchTransactions(),
          fetchRecurringTransactions(),
        ]);
        // Active month = latest period (AlertsPanel falls back to this too).
        const month = summaries.length
          ? summaries[summaries.length - 1].month
          : '';
        const cached = month ? alertsDataCache.get(month) : undefined;
        if (cached) {
          if (!cancelled) {
            setData(cached);
            setStatus('ready');
          }
          return;
        }
        const anomaliesRes = await fetch(
          `/api/anomalies?month=${encodeURIComponent(month)}`,
        );
        const anomalies: Anomaly[] = await anomaliesRes.json();
        if (!Array.isArray(anomalies)) throw new Error('Invalid anomalies payload');
        if (cancelled) return;
        const next: AlertsData = {
          month,
          summaries,
          categories,
          transactions,
          recurringTitles: recurring
            .filter((r) => r.active)
            .map((r) => r.title),
          anomalies,
        };
        if (month) alertsDataCache.set(month, next);
        setData(next);
        setStatus('ready');
      } catch {
        if (cancelled) return;
        setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, attempt]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  return { status, data, retry };
}
