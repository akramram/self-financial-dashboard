import React, { useMemo, useState, useEffect } from 'react';
import type { MonthlySummary, Category } from '../lib/data';
import { formatIdr } from '../lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingUp, X, ChevronDown, ChevronUp } from 'lucide-react';

interface BudgetAlert {
  category: string;
  spent: number;
  discretionarySpent: number;
  limit: number;
  pct: number;
  discretionaryPct: number;
  isOver: boolean;
  isAllRecurring: boolean;
  color: string;
}

interface Props {
  summaries: MonthlySummary[];
  categories: Category[];
  activeMonth?: string;
  transactions?: { id: number; period_id: number; title: string; category: string; amount: number; type: string; done: number }[];
  recurringTitles?: string[];
}

const STORAGE_KEY = 'budget-alerts-dismissed';

function getDismissedAlerts(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function dismissAlert(periodId: number, category: string) {
  const key = `${periodId}:${category}`;
  const dismissed = getDismissedAlerts();
  dismissed[key] = true;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(dismissed));
}

export default function BudgetAlerts({ summaries, categories, activeMonth, transactions, recurringTitles }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({});

  // Load dismissed state from localStorage on mount
  useEffect(() => {
    setDismissed(getDismissedAlerts());
  }, []);

  const alerts = useMemo(() => {
    // Find the active summary
    const activeSummary = activeMonth
      ? summaries.find((s) => s.month === activeMonth)
      : summaries[summaries.length - 1];

    if (!activeSummary?.category_totals) return [];

    const categoryMap: Record<string, Category> = {};
    categories.forEach((c) => {
      categoryMap[c.name] = c;
    });

    // Build recurring title set (lowercased) for matching
    const recurringSet = new Set((recurringTitles || []).map((t) => t.toLowerCase()));

    // Compute discretionary spend per category (excluding recurring transactions)
    const discretionarySpend: Record<string, number> = {};
    const periodTxs = (transactions || []).filter(
      (t) => t.period_id === activeSummary.period_id && t.done === 1 && (t.type === 'cash' || t.type === 'credit_expense')
    );
    for (const tx of periodTxs) {
      if (!recurringSet.has(tx.title.toLowerCase())) {
        discretionarySpend[tx.category] = (discretionarySpend[tx.category] || 0) + tx.amount;
      }
    }

    const results: BudgetAlert[] = [];

    for (const [cat, amount] of Object.entries(activeSummary.category_totals)) {
      const catDef = categoryMap[cat];
      const limit = catDef?.monthly_limit ?? 0;
      if (limit <= 0 || amount <= 0) continue;

      const pct = (amount / limit) * 100;
      const discAmt = discretionarySpend[cat] || 0;
      const discPct = (discAmt / limit) * 100;
      const isOver = amount > limit;
      const isAllRecurring = discAmt === 0 && amount > 0;

      // Only alert at 80%+ (approaching) or 100%+ (over)
      // Hide "approaching" if all spend is from recurring transactions
      if (pct < 80) continue;
      if (!isOver && isAllRecurring) continue;

      // Check if dismissed for this period+category
      const dismissKey = `${activeSummary.period_id}:${cat}`;
      if (dismissed[dismissKey]) continue;

      results.push({
        category: cat,
        spent: amount,
        discretionarySpent: discAmt,
        limit,
        pct: Math.round(pct * 10) / 10,
        discretionaryPct: Math.round(discPct * 10) / 10,
        isOver,
        isAllRecurring,
        color: catDef?.color || '#94a3b8',
      });
    }

    // Sort: over-budget first (by severity), then approaching (by percentage desc)
    results.sort((a, b) => {
      if (a.isOver !== b.isOver) return a.isOver ? -1 : 1;
      return b.pct - a.pct;
    });

    return results;
  }, [summaries, categories, activeMonth, dismissed, transactions, recurringTitles]);

  const handleDismiss = (periodId: number, category: string) => {
    dismissAlert(periodId, category);
    setDismissed(getDismissedAlerts());
  };

  if (alerts.length === 0) return null;

  const overCount = alerts.filter((a) => a.isOver).length;
  const approachingCount = alerts.filter((a) => !a.isOver).length;

  return (
    <div className="glass-card p-5">
      
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base text-slate-800 dark:text-white/80">
            <AlertTriangle className="h-5 w-5 text-red-500 dark:text-red-400" />
            Budget Alerts
            {overCount > 0 && (
              <Badge variant="destructive" className="ml-1">
                {overCount} over
              </Badge>
            )}
            {approachingCount > 0 && (
              <Badge variant="outline" className="ml-1 border-gold-400 text-gold-600 dark:text-gold-400">
                {approachingCount} approaching
              </Badge>
            )}
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="h-7 w-7 p-0"
            aria-label={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
        </div>
      
      {!collapsed && (
        
          <div className="space-y-3">
            {alerts.map((alert) => {
              const visualPct = Math.min(100, alert.pct);
              const barColor = alert.isOver
                ? 'bg-red-500'
                : alert.pct >= 90
                  ? 'bg-coral-500/50'
                  : 'bg-gold-500';
              const bgColor = alert.isOver
                ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
                : 'bg-gold-500/5 dark:bg-gold-700/10/30 border-gold-400/20 dark:border-gold-700/40';
              const textColor = alert.isOver
                ? 'text-red-700 dark:text-red-300'
                : 'text-gold-700 dark:text-gold-300';

              return (
                <div
                  key={alert.category}
                  className={`relative rounded-lg border p-3 ${bgColor}`}
                >
                  <button
                    onClick={() => handleDismiss(
                      summaries.find((s) => s.month === activeMonth)?.period_id ?? 0,
                      alert.category
                    )}
                    className="absolute top-2 right-2 p-0.5 rounded hover:bg-black/10 dark:hover:bg-slate-200/50 dark:bg-white/10 transition"
                    aria-label={`Dismiss ${alert.category} alert`}
                  >
                    <X className="h-3.5 w-3.5 opacity-50" />
                  </button>

                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: alert.color }}
                    />
                    <span className="font-semibold text-sm">{alert.category}</span>
                    {alert.isOver ? (
                      <Badge variant="destructive" className="text-xs h-5">
                        <TrendingUp className="h-3 w-3 mr-0.5" />
                        Over budget
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs h-5 border-gold-400 text-gold-600 dark:text-gold-400">
                        Approaching limit
                      </Badge>
                    )}
                  </div>

                  <div className="flex justify-between text-xs mb-1.5">
                    <span className={textColor}>
                      {formatIdr(alert.spent)} spent
                    </span>
                    <span className={`font-semibold ${textColor}`}>
                      {alert.pct}% of {formatIdr(alert.limit)}
                    </span>
                  </div>

                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                    <div
                      className={`${barColor} h-2 rounded-full transition-all`}
                      style={{ width: `${visualPct}%` }}
                    />
                  </div>

                  {alert.isOver && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1.5">
                      {formatIdr(alert.spent - alert.limit)} over the monthly limit
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        
      )}
    </div>
  );
}
