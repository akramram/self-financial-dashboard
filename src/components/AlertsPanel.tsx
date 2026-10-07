import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { MonthlySummary, Category, Transaction } from '../lib/data';
import type { Anomaly } from '../lib/db';
import { formatIdr } from '../lib/utils';
import {
  subscribeAlerts,
  getAlertsState,
  getAlertsServerState,
  dismissAnomalyShared,
  dismissBudgetShared,
  type AlertsSharedState,
  type AlertsSnapshot,
} from '../lib/alertsStore';
import { classifyBudgetAlert, anomalyPrefFamily } from '../lib/alertRules';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  X,
  TrendingUp,
  ShoppingBag,
  CreditCard,
} from 'lucide-react';

interface Props {
  month: string;
  summaries: MonthlySummary[];
  categories: Category[];
  transactions: Transaction[];
  recurringTitles: string[];
  /** Pre-fetched anomalies (drawer mode) — skips the internal fetch. */
  anomalies?: Anomaly[];
  /** Rendered instead of null when there are 0 alerts (drawer empty state). */
  emptyState?: React.ReactNode;
  /** Hide the built-in "Alerts" card header (drawer renders its own). */
  showHeader?: boolean;
  /**
   * 'card'  — dashboard surface: glass card, severity header badges,
   *           top-5 collapse (KUR-117: collapse never inside the drawer).
   * 'drawer' — FIN-021 drawer surface: borderless, all alerts listed,
   *           per-card accent bar + severity chip.
   */
  variant?: 'card' | 'drawer';
  /**
   * FIN-022: called (once per alert-list change) with a snapshot of the
   * currently-visible alert keys, so a host surface (drawer) can offer
   * bulk "mark all read" + restore over exactly the visible scope (AC-6).
   */
  onVisibleAlertsChange?: (snapshot: AlertsSnapshot) => void;
}

// ─── Severity constants ─────────────────────────────────────────────────────
// KUR-117 design spec: coral/gold/mint scale only (never red-*), and severity
// is NEVER color-only — every card pairs a 3px accent bar (shape channel)
// with an uppercase text chip (label channel) plus the type badge.

type Severity = 'high' | 'medium' | 'low';

const SEVERITY_ORDER: Record<Severity, number> = { high: 0, medium: 1, low: 2 };

const SEVERITY_LABEL: Record<Severity, string> = {
  high: 'OVER',
  medium: 'APPROACHING',
  low: 'INFO',
};

/** 3px vertical accent bar at the card's left edge (shape channel). */
const SEVERITY_BAR: Record<Severity, string> = {
  high: 'bg-coral-500',
  medium: 'bg-gold-500',
  low: 'bg-mint-500',
};

/** Uppercase 10px/700 text chip (label channel). */
const SEVERITY_CHIP: Record<Severity, string> = {
  high: 'bg-coral-500/10 text-coral-600 dark:text-coral-400',
  medium: 'bg-gold-500/10 text-gold-600 dark:text-gold-400',
  low: 'bg-mint-500/10 text-mint-600 dark:text-mint-400',
};

/** Card border + tinted background. */
const SEVERITY_CARD: Record<Severity, string> = {
  high: 'border-coral-500/20 bg-coral-500/5 dark:border-coral-700/40',
  medium: 'border-gold-500/25 bg-gold-500/5 dark:border-gold-700/40',
  low: 'border-mint-500/20 bg-mint-500/5 dark:border-mint-700/40',
};

/** Type icon inherits the severity color (spec §2). */
const SEVERITY_ICON: Record<Severity, string> = {
  high: 'text-coral-500',
  medium: 'text-gold-500',
  low: 'text-mint-500',
};

/** Muted outline badge naming the alert type (card variant only). */
const SEVERITY_BADGE_CLASS: Record<Severity, string> = {
  high: 'text-coral-600 border-coral-400/50 dark:text-coral-400 dark:border-coral-700/50',
  medium: 'text-gold-600 border-gold-400/60 dark:text-gold-400 dark:border-gold-700/50',
  low: 'text-mint-600 border-mint-400/60 dark:text-mint-400 dark:border-mint-700/50',
};

const ANOMALY_REASON_LABELS: Record<Anomaly['reason'], string> = {
  amount_spike: 'Unusual Amount',
  new_merchant: 'New Merchant',
  category_outlier: 'Category Outlier',
};

const ANOMALY_REASON_ICONS: Record<Anomaly['reason'], React.ReactNode> = {
  amount_spike: <TrendingUp className="w-4 h-4" />,
  new_merchant: <ShoppingBag className="w-4 h-4" />,
  category_outlier: <AlertTriangle className="w-4 h-4" />,
};

// ─── Unified alert shape ──────────────────────────────────────────────────

interface UnifiedAlert {
  id: string; // unique key for React list
  type: 'anomaly' | 'budget';
  severity: Severity;
  title: string;
  detail: string;
  amount?: number;
  category?: string;
  badgeLabel: string; // 'Anomaly: Unusual Amount' or 'Budget: Food'
  icon: React.ReactNode;
  /** FIN-022: stable persistence key (`a:{tx_id}` / `{period_id}:{category}`). */
  stateKey?: string;
}

// ─── Budget dismissals live in the shared alerts store (alertsStore.ts),
// ── which mirrors the legacy `budget-alerts-dismissed` localStorage key. ──

// ─── Component ──────────────────────────────────────────────────────────────

export default function AlertsPanel({
  month,
  summaries,
  categories,
  transactions,
  recurringTitles,
  anomalies: anomaliesProp,
  emptyState,
  showHeader = true,
  variant = 'card',
  onVisibleAlertsChange,
}: Props) {
  // ── Anomaly data (injected by drawer, or fetched from API) ──
  const [fetchedAnomalies, setFetchedAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(anomaliesProp == null);
  const anomalies = anomaliesProp ?? fetchedAnomalies;

  // ── Shared dismiss state — single source of truth across the dashboard
  //    panel and the sidebar alerts drawer (FIN-021) ──
  // SSR renders the server snapshot; localStorage is hydrated on the client
  // mount (keeps SSR HTML and first client render identical).
  const [dismissed, setDismissed] = useState<AlertsSharedState>(() =>
    getAlertsServerState(),
  );

  useEffect(() => {
    setDismissed(getAlertsState());
    return subscribeAlerts(() => setDismissed(getAlertsState()));
  }, []);

  // ── Expand/collapse ──
  const [expanded, setExpanded] = useState(false);

  // ── Fetch anomalies on month change (skipped when injected) ──
  useEffect(() => {
    if (anomaliesProp != null) {
      setLoading(false);
      return;
    }
    if (!month) return;
    setLoading(true);
    fetch(`/api/anomalies?month=${encodeURIComponent(month)}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setFetchedAnomalies(data);
        else setFetchedAnomalies([]);
      })
      .catch(() => setFetchedAnomalies([]))
      .finally(() => setLoading(false));
  }, [month, anomaliesProp]);

  // ── Compute budget alerts (same logic as BudgetAlerts) ──
  const budgetAlerts = useMemo<UnifiedAlert[]>(() => {
    const activeSummary = month
      ? summaries.find((s) => s.month === month)
      : summaries[summaries.length - 1];

    if (!activeSummary?.category_totals) return [];

    const categoryMap: Record<string, Category> = {};
    categories.forEach((c) => {
      categoryMap[c.name] = c;
    });

    const recurringSet = new Set(
      (recurringTitles || []).map((t) => t.toLowerCase()),
    );

    // Discretionary spend per category
    const discretionarySpend: Record<string, number> = {};
    const periodTxs = (transactions || []).filter(
      (t) =>
        t.period_id === activeSummary.period_id &&
        t.done &&
        (t.type === 'cash' || t.type === 'credit_expense'),
    );
    for (const tx of periodTxs) {
      if (!recurringSet.has(tx.title.toLowerCase())) {
        discretionarySpend[tx.category] =
          (discretionarySpend[tx.category] || 0) + tx.amount;
      }
    }

    const results: UnifiedAlert[] = [];
    // FIN-022 lanjutan (KUR-132 §1): family toggles filter this list. The
    // over/approaching decision itself comes from the shared
    // classifyBudgetAlert() rule (single source of truth with the SSR badge).
    const prefs = dismissed.prefs;

    for (const [cat, amount] of Object.entries(activeSummary.category_totals)) {
      const catDef = categoryMap[cat];
      const limit = catDef?.monthly_limit ?? 0;
      if (limit <= 0 || amount <= 0) continue;

      const discAmt = discretionarySpend[cat] || 0;
      const cls = classifyBudgetAlert(amount, limit, discAmt === 0);
      if (!cls) continue;
      if (!prefs[cls.family]) continue;

      // Check dismissed (shared store)
      const dismissKey = `${activeSummary.period_id}:${cat}`;
      if (dismissed.dismissedBudget[dismissKey]) continue;

      const isOver = cls.family === 'budget_over';
      const severity: Severity = isOver ? 'high' : 'medium';
      const roundedPct = Math.round(cls.pct * 10) / 10;

      results.push({
        id: `budget:${cat}`,
        type: 'budget',
        severity,
        title: isOver ? `${cat} is over budget` : `${cat} approaching limit`,
        detail: isOver
          ? `${formatIdr(amount - limit)} over the ${formatIdr(limit)} limit`
          : `${roundedPct}% of ${formatIdr(limit)} limit used`,
        amount,
        category: cat,
        badgeLabel: `Budget: ${cat}`,
        icon: <CreditCard className="w-4 h-4" />,
        stateKey: dismissKey,
      });
    }

    return results;
  }, [summaries, categories, month, dismissed, transactions, recurringTitles]);

  // ── Build anomaly alerts (from injected or fetched data) ──
  const anomalyAlerts = useMemo<UnifiedAlert[]>(() => {
    // FIN-022 lanjutan (KUR-132 §1): family toggles filter anomalies too
    // (amount_spike / new_merchant). category_outlier has no toggle and no
    // producer — anomalyPrefFamily returns null for it → always shown.
    const prefs = dismissed.prefs;
    return anomalies
      .filter((a) => {
        if (dismissed.dismissedAnomalies.has(a.id)) return false;
        const family = anomalyPrefFamily(a.reason);
        return family == null || prefs[family];
      })
      .map((a) => ({
        id: `anomaly:${a.id}`,
        type: 'anomaly' as const,
        severity: a.severity,
        title: a.title,
        detail: a.detail,
        amount: a.amount,
        category: a.category,
        badgeLabel: `Anomaly: ${ANOMALY_REASON_LABELS[a.reason]}`,
        icon: ANOMALY_REASON_ICONS[a.reason],
        stateKey: `a:${a.id}`,
      }));
  }, [anomalies, dismissed]);

  // ── Merge & sort: severity first (critical → warning → info), then by type
  //    (anomaly before budget) and amount desc within the same severity
  //    (FIN-021 binding AC + KUR-117 tie-break) ──
  const allAlerts = useMemo(() => {
    const severityRank: Record<Severity, number> = SEVERITY_ORDER;
    const amountOf = (a: UnifiedAlert): number => a.amount ?? 0;
    const merged = [...anomalyAlerts, ...budgetAlerts];
    merged.sort((a, b) => {
      const bySeverity = severityRank[a.severity] - severityRank[b.severity];
      if (bySeverity !== 0) return bySeverity;
      if (a.type !== b.type) return a.type === 'anomaly' ? -1 : 1;
      return amountOf(b) - amountOf(a);
    });
    return merged;
  }, [anomalyAlerts, budgetAlerts]);

  // ── Dismiss with exit animation (KUR-117 §4): the card plays a 200ms
  //    fade+collapse; the optimistic shared-store dismissal then drops the
  //    count instantly (bell updates via `alerts-count` without waiting).
  // NOTE: hooks live above the early returns below (rules of hooks).
  const [dismissing, setDismissing] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  // ── Broadcast live count to sidebar/mobile bells (Pattern 2: CustomEvent) ──
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('alerts-count', { detail: allAlerts.length }));
  }, [allAlerts.length]);

  // ── FIN-022: publish the visible-alert snapshot for the drawer's bulk
  //    mark-all / restore (AC-6 scope = exactly what is currently shown). ──
  const onVisibleAlertsRef = useRef(onVisibleAlertsChange);
  onVisibleAlertsRef.current = onVisibleAlertsChange;
  useEffect(() => {
    if (!onVisibleAlertsRef.current) return;
    onVisibleAlertsRef.current({
      anomalyIds: anomalyAlerts.map((a) => parseInt(a.id.slice('anomaly:'.length), 10)),
      budgetKeys: budgetAlerts.map((a) => a.stateKey ?? ''),
    });
  });

  if (loading) return null;
  if (allAlerts.length === 0) return emptyState ?? null;

  // ── Count badges ──
  const highCount = allAlerts.filter((a) => a.severity === 'high').length;
  const mediumCount = allAlerts.filter((a) => a.severity === 'medium').length;
  const lowCount = allAlerts.filter((a) => a.severity === 'low').length;

  // ── Expand/collapse (show first 5) ──
  const VISIBLE_LIMIT = 5;
  const displayItems = expanded ? allAlerts : allAlerts.slice(0, VISIBLE_LIMIT);

  // ── Card border: red when critical, otherwise neutral ──
  const hasCritical = highCount > 0;
  const cardBorderClass = hasCritical
    ? 'border-red-300 dark:border-red-800'
    : 'border-slate-200 dark:border-slate-700';

  const handleDismiss = (alert: UnifiedAlert) => {
    if (dismissing) return;
    setDismissing(alert.id);
    window.setTimeout(() => {
      if (alert.type === 'anomaly') {
        dismissAnomalyShared(parseInt(alert.id.split(':')[1], 10));
      } else {
        const activeSummary = month
          ? summaries.find((s) => s.month === month)
          : summaries[summaries.length - 1];
        const periodId = activeSummary?.period_id ?? 0;
        dismissBudgetShared(`${periodId}:${alert.category ?? ''}`);
      }
      // Spec §4 focus: move to the next visible card's dismiss button.
      requestAnimationFrame(() => {
        listRef.current
          ?.querySelector<HTMLButtonElement>('[data-alert-dismiss]')
          ?.focus();
      });
    }, 200);
  };

  const isDrawer = variant === 'drawer';
  const listAlerts = isDrawer ? allAlerts : displayItems;

  return (
    <div
      ref={listRef}
      className={
        isDrawer
          ? 'flex flex-col gap-3'
          : `glass-card p-5 ${cardBorderClass}`
      }
    >
      {showHeader && (
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold flex items-center gap-2 text-slate-800 dark:text-white/80">
            <AlertTriangle className="w-4 h-4 text-gold-500" />
            Alerts
            <div className="flex items-center gap-1.5 ml-1">
              {highCount > 0 && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                  {highCount} over
                </Badge>
              )}
              {mediumCount > 0 && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 border-gold-400 text-gold-600 dark:text-gold-400"
                >
                  {mediumCount} approaching
                </Badge>
              )}
              {lowCount > 0 && highCount === 0 && mediumCount === 0 && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 border-mint-400 text-mint-500 dark:text-mint-400"
                >
                  {lowCount} info
                </Badge>
              )}
            </div>
          </h3>
        </div>
      )}

        {listAlerts.map((alert) => {
          const isDismissing = dismissing === alert.id;
          return (
            <div
              key={alert.id}
              className={`relative overflow-hidden rounded-lg border transition-opacity duration-200 ${
                isDismissing
                  ? 'opacity-0'
                  : SEVERITY_CARD[alert.severity]
              } ${isDrawer ? '' : 'mb-2'}`}
            >
              {/* 3px severity accent bar (shape channel — KUR-117 §2) */}
              <span
                aria-hidden="true"
                className={`absolute inset-y-0 left-0 w-[3px] ${SEVERITY_BAR[alert.severity]}`}
              />
              <div className="flex items-start gap-3 p-3 pl-4">
                <div className={`shrink-0 mt-0.5 ${SEVERITY_ICON[alert.severity]}`}>{alert.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-[0.05em] px-1.5 py-0.5 rounded ${SEVERITY_CHIP[alert.severity]}`}
                    >
                      {SEVERITY_LABEL[alert.severity]}
                    </span>
                    <span className="font-medium text-sm text-slate-800 dark:text-slate-200 truncate">
                      {alert.title}
                    </span>
                    {!isDrawer && (
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 ${SEVERITY_BADGE_CLASS[alert.severity]}`}
                      >
                        {alert.badgeLabel}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    {alert.amount != null && (
                      <>
                        <span>{formatIdr(alert.amount)}</span>
                        {alert.category && (
                          <>
                            <span>·</span>
                            <span>{alert.category}</span>
                          </>
                        )}
                      </>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    {alert.detail}
                  </p>
                </div>
                <button
                  data-alert-dismiss
                  onClick={() => handleDismiss(alert)}
                  aria-label={`Dismiss: ${alert.title}`}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg -my-3 -mr-3 transition hover:bg-slate-200 dark:hover:bg-slate-700"
                  title="Dismiss"
                >
                  <X className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>
            </div>
          );
        })}

        {!isDrawer && allAlerts.length > VISIBLE_LIMIT && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-slate-500"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <>
                <ChevronUp className="w-3.5 h-3.5 mr-1" />
                Show fewer
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5 mr-1" />
                Show all {allAlerts.length} alerts
              </>
            )}
          </Button>
        )}
      
    </div>
  );
}
