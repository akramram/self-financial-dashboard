// ─── Alerts shared state (FIN-021 / FIN-022) ────────────────────────────────
// Single source of truth for alert dismissal shared by every AlertsPanel
// instance (dashboard panel + sidebar alerts drawer). Dismissing an alert in
// one surface immediately recomputes the other and re-broadcasts `alerts-count`
// so both sidebar bells update.
//
// FIN-022 (KUR-127 AC-2): dismissals are PERSISTENT in SQLite via
// `/api/alerts/state`, keyed by stable alert identities:
//   anomaly → `a:{transaction_id}`
//   budget  → `{period_id}:{category}`
// The client store remains the synchronous view (optimistic updates); every
// mutation is mirrored to the server. POST failures degrade to the previous
// in-memory-only behavior (same fallback as the old localStorage try/catch).
//
// Legacy migration (AC-7): the pre-FIN-022 `budget-alerts-dismissed`
// localStorage mirror is imported to the server once per browser, then removed
// (idempotent — a failed POST keeps the mirror and retries next load).

import type { MonthlySummary, Category, Transaction } from './data';
import type { Anomaly, AlertPrefKey } from './db';

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
  /**
   * FIN-022 lanjutan (KUR-132 §2): alert family toggles, SQLite-backed via
   * /api/alerts/state (AC-8 — the SSR badge reads the same table). Absent
   * row = enabled, and the SSR initial snapshot is all-ON, so first paint is
   * identical to the pre-prefs baseline. Prefs are a VIEW filter only.
   */
  prefs: Readonly<Record<AlertPrefKey, boolean>>;
}

/** Snapshot of visible alerts, for bulk mark-all + restore (AC-6). */
export interface AlertsSnapshot {
  anomalyIds: number[];
  budgetKeys: string[];
}

const BUDGET_STORAGE_KEY = 'budget-alerts-dismissed';

const DEFAULT_PREFS: Record<AlertPrefKey, boolean> = {
  budget_over: true,
  budget_approaching: true,
  anomaly_amount_spike: true,
  anomaly_new_merchant: true,
};

let state: AlertsSharedState = {
  dismissedAnomalies: new Set<number>(),
  dismissedBudget: {},
  prefs: { ...DEFAULT_PREFS },
};

let serverLoaded = false;
const listeners = new Set<() => void>();

/** Pref keys with a PATCH in flight — their server echo is ignored on GET merge. */
const prefsInFlight = new Set<AlertPrefKey>();

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

/** Client snapshot — hydrates once from the server (+ legacy mirror merge). */
export function getAlertsState(): AlertsSharedState {
  if (typeof window !== 'undefined') ensureAlertStateLoaded();
  return state;
}

/** Server snapshot — never touches localStorage or fetch (SSR-safe). */
export function getAlertsServerState(): AlertsSharedState {
  return state;
}

function publish(next: AlertsSharedState): void {
  state = next;
  listeners.forEach((l) => l());
}

// ─── Server persistence (FIN-022 AC-2) ──────────────────────────────────────

function parseAnomalyKey(key: string): number | null {
  return key.startsWith('a:') ? parseInt(key.slice(2), 10) || null : null;
}

async function postAlertState(keys: string[]): Promise<void> {
  const res = await fetch('/api/alerts/state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keys }),
  });
  if (!res.ok) throw new Error(`alert state POST failed: ${res.status}`);
}

/**
 * One-time hydration: GET dismissed keys from the server, merge them into the
 * current state (union — optimistic dismissals made while the request was in
 * flight are never lost), and import the legacy localStorage mirror (AC-7).
 * Any failure keeps the in-memory state (graceful degradation, no render
 * blocking). Idempotent.
 */
export function ensureAlertStateLoaded(): void {
  if (serverLoaded || typeof window === 'undefined') return;
  serverLoaded = true;

  // Legacy import first (synchronous read → optimistic merge → server write).
  const legacy = readBudgetDismissals();
  const legacyKeys = Object.keys(legacy).filter((k) => legacy[k]);
  if (legacyKeys.length > 0) {
    publish({
      ...state,
      dismissedBudget: { ...state.dismissedBudget, ...legacy },
    });
    postAlertState(legacyKeys)
      .then(() => {
        try {
          localStorage.removeItem(BUDGET_STORAGE_KEY);
        } catch {
          // Mirror survives → retried next load (idempotent POST).
        }
      })
      .catch(() => {
        // Mirror survives → retried next load (idempotent POST).
      });
  }

  fetch('/api/alerts/state')
    .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
    .then((data: { dismissed?: string[]; prefs?: Record<string, boolean> }) => {
      const keys = Array.isArray(data?.dismissed) ? data.dismissed : [];
      const anomalies = new Set(state.dismissedAnomalies);
      const budget = { ...state.dismissedBudget };
      for (const key of keys) {
        if (typeof key !== 'string') continue;
        const id = parseAnomalyKey(key);
        if (id != null) anomalies.add(id);
        else budget[key] = true;
      }
      // Prefs merge (KUR-132 §2): server values win, but a toggle made while
      // the GET was in flight is never lost — the server echoes the winning
      // value for keys we changed, so only untouched keys are taken here.
      const prefs = { ...state.prefs };
      if (data?.prefs && typeof data.prefs === 'object') {
        for (const k of Object.keys(prefs) as AlertPrefKey[]) {
          if (!(k in prefsInFlight)) {
            const v = data.prefs[k];
            if (typeof v === 'boolean') prefs[k] = v;
          }
        }
      }
      publish({ dismissedAnomalies: anomalies, dismissedBudget: budget, prefs });
    })
    .catch(() => {
      // Server unreachable → in-memory + legacy behavior only (AC-2 fallback).
      // Prefs stay all-ON (spec: failed GET must not empty the list).
    });
}

// ─── Mutations (optimistic + server mirror) ─────────────────────────────────

export function dismissAnomalyShared(id: number): void {
  const cur = getAlertsState();
  if (cur.dismissedAnomalies.has(id)) return;
  const next = new Set(cur.dismissedAnomalies);
  next.add(id);
  publish({ ...cur, dismissedAnomalies: next });
  void postAlertState([`a:${id}`]).catch(() => {
    // Fallback: in-memory dismissal only (per try/catch localStorage era).
  });
}

export function dismissBudgetShared(key: string): void {
  const cur = getAlertsState();
  if (cur.dismissedBudget[key]) return;
  const nextMap = { ...cur.dismissedBudget, [key]: true };
  publish({ ...cur, dismissedBudget: nextMap });
  void postAlertState([key]).catch(() => {
    // Fallback: in-memory dismissal only.
  });
}

/**
 * Toggle one alert-family preference (FIN-022 lanjutan, KUR-132 §2). Pure
 * view filter: optimistic publish → PATCH; on failure the previous value is
 * restored (spec: rollback optimistic). NEVER touches alert_state or
 * localStorage — prefs live only in SQLite via /api/alerts/state.
 */
export function setAlertPrefShared(key: AlertPrefKey, enabled: boolean): void {
  const cur = getAlertsState();
  if (cur.prefs[key] === enabled) return;
  const previous = cur.prefs[key];
  publish({ ...cur, prefs: { ...cur.prefs, [key]: enabled } });
  prefsInFlight.add(key);
  void fetch('/api/alerts/state', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pref: key, enabled }),
  })
    .then((res) => {
      if (res.ok) return;
      throw new Error(`alert pref PATCH failed: ${res.status}`);
    })
    .catch(() => {
      const rollback = getAlertsState();
      publish({ ...rollback, prefs: { ...rollback.prefs, [key]: previous } });
    })
    .finally(() => {
      prefsInFlight.delete(key);
    });
}

/**
 * Mark all currently-visible alerts dismissed in one shot (AC-6). One bulk
 * POST (KUR-129 checklist #6) — never N requests. Returns the snapshot for
 * `restoreAlertsSnapshot`.
 */
export function dismissAllAlertsShared(snapshot: AlertsSnapshot): void {
  const cur = getAlertsState();
  const anomalies = new Set(cur.dismissedAnomalies);
  for (const id of snapshot.anomalyIds) anomalies.add(id);
  const budget = { ...cur.dismissedBudget };
  for (const key of snapshot.budgetKeys) budget[key] = true;
  publish({
    dismissedAnomalies: anomalies,
    dismissedBudget: budget,
    prefs: cur.prefs,
  });
  const keys = [
    ...snapshot.anomalyIds.map((id) => `a:${id}`),
    ...snapshot.budgetKeys,
  ];
  void postAlertState(keys).catch(() => {
    // Fallback: in-memory dismissal only.
  });
}

/** Restore (un-dismiss) a snapshot — "Pulihkan semua alert bulan ini" (AC-6). */
export function restoreAlertsSnapshot(snapshot: AlertsSnapshot): void {
  const cur = getAlertsState();
  const anomalies = new Set(cur.dismissedAnomalies);
  for (const id of snapshot.anomalyIds) anomalies.delete(id);
  const budget = { ...cur.dismissedBudget };
  for (const key of snapshot.budgetKeys) delete budget[key];
  publish({
    dismissedAnomalies: anomalies,
    dismissedBudget: budget,
    prefs: cur.prefs,
  });
  const keys = [
    ...snapshot.anomalyIds.map((id) => `a:${id}`),
    ...snapshot.budgetKeys,
  ];
  void fetch('/api/alerts/state', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keys }),
  }).catch(() => {
    // Server restore failed → keys return on next load; in-memory restored.
  });
}

/** Test hygiene / fresh mount: clears in-memory shared state. */
export function resetAlertsState(): void {
  serverLoaded = false;
  prefsInFlight.clear();
  state = {
    dismissedAnomalies: new Set<number>(),
    dismissedBudget: {},
    prefs: { ...DEFAULT_PREFS },
  };
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
