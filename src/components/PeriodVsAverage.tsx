import React, { useMemo } from 'react';
import type { MonthlySummary, Category } from '../lib/data';
import { formatIdr } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowUpRight, ArrowDownRight, Minus, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';

interface Props {
  summaries: MonthlySummary[];
  categories: Category[];
  activePeriodId: number | null;
  lookbackPeriods?: number;
}

interface CategoryVariance {
  category: string;
  color: string;
  current: number;
  average: number;
  variance: number;
  variancePct: number;
  count: number; // how many historical periods had this category
}

export default function PeriodVsAverage({
  summaries,
  categories,
  activePeriodId,
  lookbackPeriods = 6,
}: Props) {
  const categoryMap = useMemo(() => {
    const map: Record<string, Category> = {};
    categories.forEach((c) => {
      map[c.name] = c;
    });
    return map;
  }, [categories]);

  const variances = useMemo((): CategoryVariance[] => {
    if (!activePeriodId || summaries.length < 2) return [];

    const currentSummary = summaries.find((s) => s.period_id === activePeriodId);
    if (!currentSummary || !currentSummary.category_totals) return [];

    // Get historical periods (excluding current), sorted by date
    const historical = summaries
      .filter((s) => s.period_id !== activePeriodId && s.category_totals)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, lookbackPeriods);

    if (historical.length === 0) return [];

    // Collect all categories that appear in either current or historical
    const allCategories = new Set<string>();
    Object.keys(currentSummary.category_totals).forEach((c) => allCategories.add(c));
    historical.forEach((h) => {
      Object.keys(h.category_totals || {}).forEach((c) => allCategories.add(c));
    });

    const result: CategoryVariance[] = [];
    for (const cat of allCategories) {
      const current = currentSummary.category_totals[cat] || 0;
      const historicalValues = historical
        .map((h) => h.category_totals?.[cat] || 0)
        .filter((v) => v > 0);
      const count = historicalValues.length;
      const average = count > 0
        ? historicalValues.reduce((sum, v) => sum + v, 0) / count
        : 0;
      const variance = current - average;
      const variancePct = average > 0 ? (variance / average) * 100 : current > 0 ? 100 : 0;

      result.push({
        category: cat,
        color: categoryMap[cat]?.color || '#6b7280',
        current,
        average,
        variance,
        variancePct,
        count,
      });
    }

    // Sort by absolute variance (most significant deviations first)
    result.sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));
    return result;
  }, [summaries, activePeriodId, lookbackPeriods, categoryMap]);

  const currentSummary = useMemo(
    () => summaries.find((s) => s.period_id === activePeriodId),
    [summaries, activePeriodId]
  );

  const totalCurrent = useMemo(
    () => variances.reduce((sum, v) => sum + v.current, 0),
    [variances]
  );
  const totalAverage = useMemo(
    () => variances.reduce((sum, v) => sum + v.average, 0),
    [variances]
  );
  const totalVariance = totalCurrent - totalAverage;
  const totalVariancePct = totalAverage > 0 ? (totalVariance / totalAverage) * 100 : 0;

  if (!activePeriodId || variances.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-5 w-5" />
            Period vs Average
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Need at least 2 periods of data to compare.
          </p>
        </CardContent>
      </Card>
    );
  }

  const maxAbsVariance = Math.max(...variances.map((v) => Math.abs(v.variance)), 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-5 w-5" />
          {currentSummary?.month ?? 'Current'} vs {lookbackPeriods}-Period Average
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Comparing against {variances[0]?.count ?? 0} historical period
          {variances[0]?.count !== 1 ? 's' : ''}
          {' · '}
          Total:{' '}
          <span
            className={`font-semibold ${
              totalVariance > 0
                ? 'text-red-600 dark:text-red-400'
                : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {totalVariance >= 0 ? '+' : ''}
            {formatIdr(totalVariance)} ({totalVariancePct >= 0 ? '+' : ''}
            {totalVariancePct.toFixed(1)}%)
          </span>
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {variances.map((v) => {
            const isUp = v.variance > 0;
            const isSignificant = Math.abs(v.variancePct) >= 20;
            const barWidth = Math.min(
              100,
              Math.max(5, (Math.abs(v.variance) / maxAbsVariance) * 100)
            );

            return (
              <div key={v.category} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: v.color }}
                    />
                    <span className="font-medium truncate">{v.category}</span>
                    {isSignificant && (
                      <Badge
                        variant="outline"
                        className={`text-[10px] h-4 px-1.5 flex-shrink-0 ${
                          isUp
                            ? 'border-red-300 text-red-600 dark:border-red-700 dark:text-red-400'
                            : 'border-emerald-300 text-emerald-600 dark:border-emerald-700 dark:text-emerald-400'
                        }`}
                      >
                        {isUp ? (
                          <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
                        ) : (
                          <TrendingDown className="h-2.5 w-2.5 mr-0.5" />
                        )}
                        {Math.abs(v.variancePct).toFixed(0)}%
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0 ml-2">
                    <span>{formatIdr(v.current)}</span>
                    <span className="text-[10px]">vs</span>
                    <span>{formatIdr(v.average)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Average reference line marker */}
                  <div className="relative flex-1 h-5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    {/* Gray average baseline */}
                    <div
                      className="absolute top-0 bottom-0 bg-slate-300 dark:bg-slate-600 rounded-full opacity-50"
                      style={{
                        width: `${Math.min(100, (v.average / Math.max(v.current, v.average)) * 100)}%`,
                      }}
                    />
                    {/* Current value bar */}
                    <div
                      className={`absolute top-0 bottom-0 rounded-full transition-all ${
                        isUp ? 'bg-red-400 dark:bg-red-500' : 'bg-emerald-400 dark:bg-emerald-500'
                      }`}
                      style={{ width: `${barWidth}%`, maxWidth: '100%' }}
                    />
                  </div>
                  <span
                    className={`text-xs font-mono font-semibold w-16 text-right flex-shrink-0 ${
                      isUp
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {v.variance >= 0 ? '+' : ''}
                    {v.variancePct.toFixed(0)}%
                  </span>
                </div>
                {v.count < lookbackPeriods && v.current > 0 && (
                  <p className="text-[10px] text-muted-foreground ml-5">
                    New category — only {v.count} historical period{v.count !== 1 ? 's' : ''} for comparison
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {variances.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No category data to compare.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
