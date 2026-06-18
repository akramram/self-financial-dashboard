import React, { useEffect, useState, useMemo } from 'react';
import { formatIdr } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Gauge,
  Target,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  BarChart3,
  Hash,
} from 'lucide-react';

interface CategoryStat {
  categoryId: number;
  category: string;
  periodCount: number;
  totalSpent: number;
  avgSpent: number;
  medianSpent: number;
  p80Spent: number;
  maxSpent: number;
  minSpent: number;
  stdDev: number;
  trend: 'rising' | 'falling' | 'stable';
  trendPct: number;
  volatility: 'low' | 'medium' | 'high';
  currentLimit: number;
  recommendedLimit: number;
  confidence: 'high' | 'medium' | 'low';
}

const CONFIDENCE_LABELS: Record<string, string> = {
  high: '12+ periods',
  medium: '6-11 periods',
  low: '<6 periods',
};

const CONFIDENCE_COLORS: Record<string, string> = {
  high: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20',
  medium: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20',
  low: 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800',
};

export default function BudgetRecommendations() {
  const [stats, setStats] = useState<CategoryStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    fetch('/api/recommendations')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const summary = useMemo(() => {
    const total = stats.length;
    const noLimit = stats.filter((s) => s.currentLimit === 0).length;
    const overBudget = stats.filter((s) => s.currentLimit > 0 && s.avgSpent > s.currentLimit).length;
    const underBudget = stats.filter((s) => s.currentLimit > 0 && s.avgSpent <= s.currentLimit).length;
    const rising = stats.filter((s) => s.trend === 'rising').length;
    const falling = stats.filter((s) => s.trend === 'falling').length;
    const highVol = stats.filter((s) => s.volatility === 'high').length;
    return { total, noLimit, overBudget, underBudget, rising, falling, highVol };
  }, [stats]);

  const applyAllRecommendations = async () => {
    // Apply each recommendation via the categories API (PUT by ID)
    const toApply = stats.filter((s) => s.recommendedLimit !== s.currentLimit && s.categoryId > 0);
    let successCount = 0;
    let failCount = 0;

    for (const stat of toApply) {
      try {
        const res = await fetch(`/api/categories/${stat.categoryId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            monthly_limit: stat.recommendedLimit,
          }),
        });
        if (res.ok) successCount++;
        else failCount++;
      } catch {
        failCount++;
      }
    }

    if (successCount > 0) {
      setApplied(true);
      // Refresh stats
      const res = await fetch('/api/recommendations');
      const data = await res.json();
      setStats(data);
    }
  };

  const needsUpdate = stats.filter((s) => s.recommendedLimit !== s.currentLimit).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600 dark:border-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-3" />
          <p className="text-red-600 dark:text-red-400 font-medium">Failed to load recommendations</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (stats.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <BarChart3 className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-muted-foreground">No transaction data available yet.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Add some transactions to get budget recommendations.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold">{summary.total}</p>
            <p className="text-xs text-muted-foreground">Categories</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{summary.noLimit}</p>
            <p className="text-xs text-muted-foreground">No Limit Set</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{summary.overBudget}</p>
            <p className="text-xs text-muted-foreground">Over Budget</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{summary.underBudget}</p>
            <p className="text-xs text-muted-foreground">Under Budget</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{summary.rising}</p>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <TrendingUp className="w-3 h-3" /> Rising
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{summary.highVol}</p>
            <p className="text-xs text-muted-foreground">High Volatility</p>
          </CardContent>
        </Card>
      </div>

      {/* Apply All Button */}
      {needsUpdate > 0 && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10">
          <CardContent className="py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  {needsUpdate} budget{needsUpdate > 1 ? 's' : ''} could be updated
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Based on {stats[0]?.periodCount ?? 0} periods of historical data
                </p>
              </div>
            </div>
            <Button
              onClick={applyAllRecommendations}
              disabled={applied}
              className="bg-amber-600 hover:bg-amber-700 text-white"
              size="sm"
            >
              {applied ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-1" /> Applied
                </>
              ) : (
                'Apply All'
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Recommendations Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Target className="w-4 h-4 text-slate-500" />
            Budget Recommendations
          </CardTitle>
          <CardDescription>
            Data-driven budget limits based on your historical spending patterns.
            Click any row to see details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Avg/Month</TableHead>
                  <TableHead className="text-right">P80</TableHead>
                  <TableHead className="text-right">Trend</TableHead>
                  <TableHead className="text-center">Volatility</TableHead>
                  <TableHead className="text-right">Current Limit</TableHead>
                  <TableHead className="text-right">Recommended</TableHead>
                  <TableHead className="text-center">Confidence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.map((stat) => {
                  const isChanged = stat.recommendedLimit !== stat.currentLimit;
                  const isNew = stat.currentLimit === 0;
                  const isOver = stat.currentLimit > 0 && stat.avgSpent > stat.currentLimit;
                  return (
                    <TableRow
                      key={stat.category}
                      className={
                        isOver
                          ? 'bg-red-50/50 dark:bg-red-900/10'
                          : isNew
                            ? 'bg-amber-50/50 dark:bg-amber-900/10'
                            : undefined
                      }
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {isOver && <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />}
                          {stat.category}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatIdr(stat.avgSpent)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-muted-foreground">
                        {formatIdr(stat.p80Spent)}
                      </TableCell>
                      <TableCell className="text-right">
                        {stat.trend === 'rising' ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-600 dark:text-orange-400">
                            <TrendingUp className="w-3 h-3" />
                            +{stat.trendPct}%
                          </span>
                        ) : stat.trend === 'falling' ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            <TrendingDown className="w-3 h-3" />
                            {stat.trendPct}%
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Minus className="w-3 h-3" />
                            Stable
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={
                            stat.volatility === 'low'
                              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                              : stat.volatility === 'high'
                                ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
                                : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                          }
                        >
                          {stat.volatility}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {stat.currentLimit > 0 ? (
                          <span className={isOver ? 'text-red-600 dark:text-red-400 font-semibold' : ''}>
                            {formatIdr(stat.currentLimit)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground italic text-xs">none</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        <span
                          className={
                            isChanged
                              ? 'font-semibold text-indigo-600 dark:text-indigo-400'
                              : 'text-muted-foreground'
                          }
                        >
                          {formatIdr(stat.recommendedLimit)}
                          {isChanged && !isNew && stat.currentLimit > 0 && (
                            <span className="text-xs ml-1">
                              ({stat.recommendedLimit > stat.currentLimit ? '+' : ''}
                              {((stat.recommendedLimit - stat.currentLimit) / stat.currentLimit * 100).toFixed(0)}%)
                            </span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={`text-xs ${CONFIDENCE_COLORS[stat.confidence]}`}
                        >
                          {stat.periodCount} periods
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.slice(0, 6).map((stat) => (
          <Card key={stat.category}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span>{stat.category}</span>
                <Badge
                  variant="outline"
                  className={`text-xs ${CONFIDENCE_COLORS[stat.confidence]}`}
                >
                  {CONFIDENCE_LABELS[stat.confidence]}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Average</p>
                  <p className="font-mono font-medium">{formatIdr(stat.avgSpent)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Median</p>
                  <p className="font-mono font-medium">{formatIdr(stat.medianSpent)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Max</p>
                  <p className="font-mono font-medium text-red-600 dark:text-red-400">{formatIdr(stat.maxSpent)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Min</p>
                  <p className="font-mono font-medium text-emerald-600 dark:text-emerald-400">{formatIdr(stat.minSpent)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs pt-2 border-t">
                <Gauge className="w-3 h-3 text-muted-foreground" />
                <span className="text-muted-foreground">Volatility:</span>
                <Badge
                  variant="outline"
                  className={
                    stat.volatility === 'low'
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                      : stat.volatility === 'high'
                        ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                        : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
                  }
                >
                  {stat.volatility}
                </Badge>
                <span className="text-muted-foreground ml-auto">
                  σ = {formatIdr(stat.stdDev)}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t">
                <span className="text-xs text-muted-foreground">Recommended limit:</span>
                <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                  {formatIdr(stat.recommendedLimit)}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
