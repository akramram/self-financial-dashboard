import React, { useEffect, useMemo, useState } from 'react';
import type { MonthlySummary, Category } from '../lib/data';
import { formatIdr } from '../lib/utils';
import { PieChart, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

interface Props {
  summaries: MonthlySummary[];
  categories: Category[];
  activeMonth: string;
  onCategoryClick: (category: string) => void;
}

interface PaceCategory {
  category: string;
  limit: number;
  spent: number;
  expected_pct: number;
  projected_total: number;
  days_elapsed: number;
  days_total: number;
}

const TOP_N = 6;

interface CategoryTrend {
  direction: 'up' | 'down' | 'flat' | 'new';
  changePct: number;
  prevAmount: number;
}

export default function CategoryBudgets({ summaries, categories, activeMonth, onCategoryClick }: Props) {
  const [showAll, setShowAll] = useState(false);
  // Pace context for the active period — null when API fails or period is closed
  const [pace, setPace] = useState<PaceCategory[] | null>(null);

  // Pace only exists for the ACTIVE period (days_elapsed < days_total). For
  // past periods the static spent/limit view is already the whole truth.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/budget-pace')
      .then((r) => r.json())
      .then((d: { categories?: PaceCategory[]; days_elapsed?: number; days_total?: number }) => {
        if (cancelled) return;
        const inProgress = (d.days_elapsed ?? 0) < (d.days_total ?? 0) && (d.days_total ?? 0) > 0;
        setPace(inProgress ? d.categories ?? null : null);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [summaries]);

  const paceByCat = useMemo(() => {
    const map: Record<string, PaceCategory> = {};
    pace?.forEach((p) => { map[p.category] = p; });
    return map;
  }, [pace]);

  const { entries, trends } = useMemo(() => {
    const map: Record<string, Category> = {};
    categories.forEach((c) => { map[c.name] = c; });

    const activeSummary = activeMonth
      ? summaries.find((s) => s.month === activeMonth)
      : summaries[summaries.length - 1];

    if (!activeSummary?.category_totals) return { entries: [] as { category: string; amount: number; limit: number; color: string | undefined }[], trends: {} as Record<string, CategoryTrend> };

    // Build a sorted index of summaries by start_date for period comparison
    const sortedSummaries = [...summaries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const activeIdx = sortedSummaries.findIndex((s) => s.month === activeSummary.month);
    const prevSummary = activeIdx > 0 ? sortedSummaries[activeIdx - 1] : null;

    // Compute per-category trend: current vs previous period
    const trendMap: Record<string, CategoryTrend> = {};
    if (prevSummary?.category_totals) {
      for (const [cat, currAmount] of Object.entries(activeSummary.category_totals)) {
        const prevAmount = prevSummary.category_totals[cat] ?? 0;
        if (prevAmount === 0 && currAmount === 0) {
          trendMap[cat] = { direction: 'flat', changePct: 0, prevAmount };
        } else if (prevAmount === 0) {
          trendMap[cat] = { direction: 'new', changePct: 100, prevAmount };
        } else {
          const changePct = ((currAmount - prevAmount) / prevAmount) * 100;
          trendMap[cat] = {
            direction: changePct > 5 ? 'up' : changePct < -5 ? 'down' : 'flat',
            changePct,
            prevAmount,
          };
        }
      }
    }

    const items = Object.entries(activeSummary.category_totals)
      .map(([cat, amount]) => ({
        category: cat,
        amount,
        limit: map[cat]?.monthly_limit ?? 0,
        color: map[cat]?.color,
      }))
      .sort((a, b) => b.amount - a.amount);

    return { entries: items, trends: trendMap };
  }, [summaries, categories, activeMonth]);

  if (entries.length === 0) return null;

  const displayEntries = showAll ? entries : entries.slice(0, TOP_N);

  return (
    <div className="glass-card p-5 shadow-none">

        {/* Header, Similarity: same icon+title+meta pattern as AlertsPanel */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Category Budgets</h3>
          </div>
          <span className="text-xs text-slate-400">
            {pace ? `Day ${pace[0]?.days_elapsed ?? 0}/${pace[0]?.days_total ?? 0} · pace-aware` : `${entries.length} categories`}
          </span>
        </div>

        {/* List, Proximity: each category row is its own visual unit */}
        <div className="space-y-3">
          {displayEntries.map(({ category, amount, limit, color }) => {
            const hasLimit = limit > 0;
            const pct = hasLimit ? Math.min(100, (amount / limit) * 100) : 100;
            const isOver = hasLimit && amount > limit;
            const trend = trends[category];
            const pc = paceByCat[category];

            // Pace semantics (active period only): bar colour judges spending
            // vs the expected-by-now marker, not just the hard limit.
            const expectedPct = hasLimit && pc ? Math.min(100, pc.expected_pct) : 0;
            const overPace = hasLimit && pc ? amount > pc.projected_total * 1.05 : false;
            const projectedOver = hasLimit && pc ? pc.projected_total > limit : false;

            const barColor = !hasLimit
              ? (color || '#94a3b8')
              : isOver
                ? '#ef4444'
                : overPace
                  ? '#f59e0b'
                  : pct > 80
                    ? '#f59e0b'
                    : '#10b981';

            const textColor = !hasLimit
              ? ''
              : isOver
                ? 'text-red-600 dark:text-red-400'
                : overPace
                  ? 'text-gold-600 dark:text-gold-400'
                  : pct > 80
                    ? 'text-gold-600 dark:text-gold-400'
                    : 'text-emerald-600 dark:text-emerald-400';

            return (
              <div
                key={category}
                className="cursor-pointer group"
                onClick={() => onCategoryClick(category)}
              >
                {/* Label + amount, grouped by proximity above the bar */}
                <div className="flex justify-between text-sm mb-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: color || '#94a3b8' }}
                    />
                    <span className="text-slate-600 dark:text-slate-300 group-hover:text-slate-800 dark:group-hover:text-slate-100 transition-colors">
                      {category}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Spending trend indicator */}
                    {trend && trend.direction !== 'new' && (
                      <span
                        className={`flex items-center gap-0.5 text-[11px] font-normal ${
                          trend.direction === 'down'
                            ? 'text-emerald-500 dark:text-emerald-400'
                            : trend.direction === 'up'
                              ? 'text-red-500 dark:text-red-400'
                              : 'text-slate-400 dark:text-slate-500'
                        }`}
                        title={
                          trend.direction === 'flat'
                            ? 'Sama dengan periode sebelumnya'
                            : trend.direction === 'down'
                              ? `${trend.changePct.toFixed(0)}% lebih rendah dari periode sebelumnya`
                              : `${trend.changePct.toFixed(0)}% lebih tinggi dari periode sebelumnya`
                        }
                      >
                        {trend.direction === 'down' && (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {trend.direction === 'up' && (
                          <TrendingUp className="w-3 h-3" />
                        )}
                        {trend.direction === 'flat' && (
                          <Minus className="w-3 h-3" />
                        )}
                        <span>
                          {trend.direction === 'flat'
                            ? '-'
                            : `${Math.abs(trend.changePct).toFixed(0)}%`}
                        </span>
                      </span>
                    )}
                    {trend?.direction === 'new' && (
                      <span className="text-[11px] text-slate-400 dark:text-slate-500" title="Kategori baru periode ini">
                        Baru
                      </span>
                    )}
                    <span className={`font-semibold text-sm ${textColor}`}>
                      {hasLimit ? (
                      <span className="flex items-center gap-1.5">
                        {formatIdr(amount)}
                        <span className="text-slate-400 dark:text-slate-500 font-normal">
                          / {formatIdr(limit)}
                        </span>
                      </span>
                    ) : (
                      formatIdr(amount)
                    )}
                  </span>
                  </div>
                </div>
                {/* shadcn Progress + pace marker (active period only) */}
                <div className="relative">
                  <Progress
                    value={pct}
                    className="h-1.5 bg-slate-200 dark:bg-slate-700"
                    indicatorStyle={{ backgroundColor: barColor }}
                  />
                  {/* Expected-by-now marker: where the bar SHOULD be today */}
                  {expectedPct > 0 && expectedPct < 100 && (
                    <div
                      className="absolute top-0 h-[6px] w-0.5 bg-slate-900/70 dark:bg-white/70 pointer-events-none"
                      style={{ left: `calc(${expectedPct}% - 1px)` }}
                      aria-hidden="true"
                    />
                  )}
                </div>
                {/* Over-limit / pace projection note */}
                {isOver ? (
                  <p className="text-[11px] text-red-500 dark:text-red-400 mt-0.5 ml-[18px]">
                    {formatIdr(amount - limit)} over limit{pc && projectedOver ? ` · projected ${formatIdr(pc.projected_total)}` : ''}
                  </p>
                ) : pc && projectedOver ? (
                  <p className="text-[11px] text-gold-600 dark:text-gold-400 mt-0.5 ml-[18px]">
                    On pace to exceed: projected {formatIdr(pc.projected_total)}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>

        {entries.length > TOP_N && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-3 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll
              ? `Show top ${TOP_N}`
              : `Show all ${entries.length} categories`}
          </Button>
        )}

    </div>
  );
}
