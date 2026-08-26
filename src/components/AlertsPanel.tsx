import React, { useState, useEffect, useMemo } from 'react';
import type { MonthlySummary, Category, Transaction } from '../lib/data';
import type { Anomaly } from '../lib/db';
import { formatIdr } from '../lib/utils';
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
}

// ─── Severity constants ─────────────────────────────────────────────────────

type Severity = 'high' | 'medium' | 'low';

const SEVERITY_ORDER: Record<Severity, number> = { high: 0, medium: 1, low: 2 };

const SEVERITY_BORDER: Record<Severity, string> = {
  high: 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30',
  medium: 'border-gold-400/30 bg-gold-500/5 dark:border-gold-700/40 dark:bg-gold-700/10/30',
  low: 'border-mint-400/30 bg-mint-500/5 dark:border-mint-700/40 dark:bg-mint-700/10',
};

const SEVERITY_BADGE_CLASS: Record<Severity, string> = {
  high: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  medium: 'bg-gold-500/10 text-gold-700 dark:bg-gold-700/20/40 dark:text-gold-300',
  low: 'bg-mint-500/10 text-mint-600 dark:bg-mint-700/20 dark:text-mint-300',
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
}

// ─── Budget alert localStorage helpers (same as BudgetAlerts) ──────────────

const BUDGET_STORAGE_KEY = 'budget-alerts-dismissed';

function getBudgetDismissed(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(BUDGET_STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function AlertsPanel({
  month,
  summaries,
  categories,
  transactions,
  recurringTitles,
}: Props) {
  // ── Anomaly state (fetched from API) ──
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Dismiss state ──
  const [dismissedAnomalies, setDismissedAnomalies] = useState<Set<number>>(
    new Set(),
  );
  const [dismissedBudget, setDismissedBudget] = useState<Record<string, boolean>>(
    {},
  );

  // ── Expand/collapse ──
  const [expanded, setExpanded] = useState(false);

  // ── Fetch anomalies on month change ──
  useEffect(() => {
    if (!month) return;
    setLoading(true);
    setDismissedAnomalies(new Set());
    fetch(`/api/anomalies?month=${encodeURIComponent(month)}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setAnomalies(data);
        else setAnomalies([]);
      })
      .catch(() => setAnomalies([]))
      .finally(() => setLoading(false));
  }, [month]);

  // ── Load budget dismissed from localStorage on mount ──
  useEffect(() => {
    setDismissedBudget(getBudgetDismissed());
  }, []);

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

    for (const [cat, amount] of Object.entries(activeSummary.category_totals)) {
      const catDef = categoryMap[cat];
      const limit = catDef?.monthly_limit ?? 0;
      if (limit <= 0 || amount <= 0) continue;

      const pct = (amount / limit) * 100;
      const discAmt = discretionarySpend[cat] || 0;
      const discPct = (discAmt / limit) * 100;
      const isOver = amount > limit;
      const isAllRecurring = discAmt === 0 && amount > 0;

      // Only alert at 80%+; hide "approaching" if all recurring
      if (pct < 80) continue;
      if (!isOver && isAllRecurring) continue;

      // Check dismissed
      const dismissKey = `${activeSummary.period_id}:${cat}`;
      if (dismissedBudget[dismissKey]) continue;

      const severity: Severity = isOver ? 'high' : 'medium';
      const roundedPct = Math.round(pct * 10) / 10;

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
      });
    }

    return results;
  }, [summaries, categories, month, dismissedBudget, transactions, recurringTitles]);

  // ── Build anomaly alerts (from fetched data) ──
  const anomalyAlerts = useMemo<UnifiedAlert[]>(() => {
    return anomalies
      .filter((a) => !dismissedAnomalies.has(a.id))
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
      }));
  }, [anomalies, dismissedAnomalies]);

  // ── Merge & sort by severity ──
  const allAlerts = useMemo(() => {
    const merged = [...anomalyAlerts, ...budgetAlerts];
    merged.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
    return merged;
  }, [anomalyAlerts, budgetAlerts]);

  // ── Broadcast live count to sidebar/mobile bells (Pattern 2: CustomEvent) ──
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('alerts-count', { detail: allAlerts.length }));
  }, [allAlerts.length]);

  if (loading) return null;
  if (allAlerts.length === 0) return null;

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

  // ── Dismiss handlers ──
  const dismissAnomaly = (id: number) => {
    setDismissedAnomalies((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const dismissBudgetAlert = (periodId: number, category: string) => {
    const key = `${periodId}:${category}`;
    const dismissed = getBudgetDismissed();
    dismissed[key] = true;
    localStorage.setItem(BUDGET_STORAGE_KEY, JSON.stringify(dismissed));
    setDismissedBudget(getBudgetDismissed());
  };

  const handleDismiss = (alert: UnifiedAlert) => {
    if (alert.type === 'anomaly') {
      const anomalyId = parseInt(alert.id.split(':')[1], 10);
      dismissAnomaly(anomalyId);
    } else {
      const activeSummary = month
        ? summaries.find((s) => s.month === month)
        : summaries[summaries.length - 1];
      const periodId = activeSummary?.period_id ?? 0;
      const cat = alert.category ?? '';
      dismissBudgetAlert(periodId, cat);
    }
  };

  return (
    <div className={`glass-card p-5 ${cardBorderClass}`}>
      
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
      
      
        {displayItems.map((alert) => (
          <div
            key={alert.id}
            className={`flex items-start gap-3 p-3 rounded-lg border ${SEVERITY_BORDER[alert.severity]} transition`}
          >
            <div className="shrink-0 mt-0.5">{alert.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm text-slate-800 dark:text-slate-200 truncate">
                  {alert.title}
                </span>
                <Badge
                  variant="outline"
                  className={`text-[10px] px-1.5 py-0 ${SEVERITY_BADGE_CLASS[alert.severity]}`}
                >
                  {alert.badgeLabel}
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
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
              onClick={() => handleDismiss(alert)}
              className="shrink-0 p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        ))}

        {allAlerts.length > VISIBLE_LIMIT && (
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
