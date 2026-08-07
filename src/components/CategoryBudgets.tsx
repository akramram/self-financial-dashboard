import React, { useMemo, useState } from 'react';
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

const TOP_N = 6;

interface CategoryTrend {
  direction: 'up' | 'down' | 'flat' | 'new';
  changePct: number;
  prevAmount: number;
}

export default function CategoryBudgets({ summaries, categories, activeMonth, onCategoryClick }: Props) {
  const [showAll, setShowAll] = useState(false);

  const { categoryMap, entries, trends } = useMemo(() => {
    const map: Record<string, Category> = {};
    categories.forEach((c) => { map[c.name] = c; });

    const activeSummary = activeMonth
      ? summaries.find((s) => s.month === activeMonth)
      : summaries[summaries.length - 1];

    if (!activeSummary?.category_totals) return { categoryMap: map, entries: [] as { category: string; amount: number; limit: number; color: string | undefined }[], trends: {} as Record<string, CategoryTrend> };

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

    return { categoryMap: map, entries: items, trends: trendMap };
  }, [summaries, categories, activeMonth]);

  if (entries.length === 0) return null;

  const displayEntries = showAll ? entries : entries.slice(0, TOP_N);

  return (
    <div className="glass-card p-5 shadow-none">
      
        {/* Header — Similarity: same icon+title+meta pattern as AlertsPanel */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Category Budgets</h3>
          </div>
          <span className="text-xs text-slate-400">{entries.length} categories</span>
        </div>

        {/* List — Proximity: each category row is its own visual unit */}
        <div className="space-y-3">
          {displayEntries.map(({ category, amount, limit, color }) => {
            const hasLimit = limit > 0;
            const pct = hasLimit ? Math.min(100, (amount / limit) * 100) : 100;
            const isOver = hasLimit && amount > limit;
            const trend = trends[category];

            const barColor = !hasLimit
              ? (color || '#94a3b8')
              : isOver
                ? '#ef4444'
                : pct > 80
                  ? '#f59e0b'
                  : '#10b981';

            const textColor = !hasLimit
              ? ''
              : isOver
                ? 'text-red-600 dark:text-red-400'
                : pct > 80
                  ? 'text-gold-600 dark:text-gold-400'
                  : 'text-emerald-600 dark:text-emerald-400';

            return (
              <div
                key={category}
                className="cursor-pointer group"
                onClick={() => onCategoryClick(category)}
              >
                {/* Label + amount — grouped by proximity above the bar */}
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
                            ? '—'
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
                {/* shadcn Progress — Common Region: consistent progress treatment */}
                <Progress
                  value={pct}
                  className="h-1.5 bg-slate-200 dark:bg-slate-700"
                  indicatorStyle={{ backgroundColor: barColor }}
                />
                {isOver && (
                  <p className="text-[11px] text-red-500 dark:text-red-400 mt-0.5 ml-[18px]">
                    {formatIdr(amount - limit)} over limit
                  </p>
                )}
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
