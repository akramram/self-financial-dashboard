// ─── Alert family rules (FIN-022 lanjutan, KUR-132 ruling §1+§3) ────────────
// Client-safe pure rules shared by the server count (db.ts
// getActiveAlertCount) and the client list (AlertsPanel.tsx) so there is
// exactly ONE source of truth for which categories alert and why. This file
// must stay importable from client components — no better-sqlite3 here.

export type AlertPrefKey =
  | 'budget_over'
  | 'budget_approaching'
  | 'anomaly_amount_spike'
  | 'anomaly_new_merchant';

export const ALERT_PREF_KEYS: readonly AlertPrefKey[] = [
  'budget_over',
  'budget_approaching',
  'anomaly_amount_spike',
  'anomaly_new_merchant',
] as const;

export const DEFAULT_ALERT_PREFS: Readonly<Record<AlertPrefKey, boolean>> = {
  budget_over: true,
  budget_approaching: true,
  anomaly_amount_spike: true,
  anomaly_new_merchant: true,
};

/**
 * Map an anomaly reason to its pref family. `category_outlier` is never
 * produced by getAnomalies() (verified, KUR-132 §3) and has no toggle — if
 * it ever appears it stays visible (null → not filtered).
 */
export function anomalyPrefFamily(
  reason: string,
): Exclude<AlertPrefKey, 'budget_over' | 'budget_approaching'> | null {
  if (reason === 'amount_spike') return 'anomaly_amount_spike';
  if (reason === 'new_merchant') return 'anomaly_new_merchant';
  return null;
}

export interface BudgetAlertClass {
  family: 'budget_over' | 'budget_approaching';
  amount: number;
  limit: number;
  pct: number;
}

/**
 * Classify one category's spend against its monthly limit using the same
 * rules as AlertsPanel.tsx: alert only at ≥80% of the limit, and an
 * approaching (not-over) category is skipped when ALL of its spend comes
 * from recurring transactions (discretionary spend of 0).
 */
export function classifyBudgetAlert(
  amount: number,
  limit: number,
  isAllRecurring: boolean,
): BudgetAlertClass | null {
  if (limit <= 0 || amount <= 0) return null;
  const pct = (amount / limit) * 100;
  if (pct < 80) return null;
  const isOver = amount > limit;
  if (!isOver && isAllRecurring) return null;
  return { family: isOver ? 'budget_over' : 'budget_approaching', amount, limit, pct };
}
