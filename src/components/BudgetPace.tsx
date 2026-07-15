import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  Gauge,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle2,
  CalendarClock,
} from 'lucide-react';
import { formatIdr } from '../lib/utils';

interface BudgetPaceCategory {
  category: string;
  color: string;
  limit: number;
  spent: number;
  spent_pct: number;
  expected_pct: number;
  pace_diff: number;
  pace_status: 'on_track' | 'warning' | 'over_pace' | 'under_budget' | 'no_limit';
  projected_total: number;
  days_elapsed: number;
  days_total: number;
}

interface BudgetPaceResult {
  period_id: number;
  period_label: string;
  start_date: string;
  end_date: string;
  days_elapsed: number;
  days_total: number;
  time_elapsed_pct: number;
  total_budget: number;
  total_spent: number;
  total_expected: number;
  total_pace_diff: number;
  total_pace_pct: number;
  total_projected: number;
  overall_status: 'on_track' | 'warning' | 'over_pace' | 'critical';
  categories: BudgetPaceCategory[];
}

const STATUS_CONFIG = {
  on_track: { label: 'On Track', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500', icon: CheckCircle2 },
  warning: { label: 'Warning', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500', icon: AlertTriangle },
  over_pace: { label: 'Over Pace', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500', icon: TrendingUp },
  critical: { label: 'Critical', color: 'text-red-700 dark:text-red-500', bg: 'bg-red-700', icon: AlertTriangle },
  under_budget: { label: 'Under Budget', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500', icon: TrendingDown },
  no_limit: { label: 'No Limit', color: 'text-slate-500', bg: 'bg-slate-400', icon: Minus },
} as const;

function PaceBar({ spent, expected, limit }: { spent: number; expected: number; limit: number }) {
  const spentPct = Math.min(100, limit > 0 ? (spent / limit) * 100 : 0);
  const expectedPct = Math.min(100, limit > 0 ? (expected / limit) * 100 : 0);

  return (
    <div className="relative h-3 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
      {/* Expected spending marker zone (faint) */}
      <div
        className="absolute top-0 left-0 h-full bg-slate-300/50 dark:bg-slate-600/50"
        style={{ width: `${expectedPct}%` }}
      />
      {/* Actual spending bar */}
      <div
        className={`absolute top-0 left-0 h-full transition-all duration-500 ${
          spentPct > 100 ? 'bg-red-500' : spentPct > expectedPct + 5 ? 'bg-amber-500' : 'bg-emerald-500'
        }`}
        style={{ width: `${spentPct}%` }}
      />
      {/* Expected marker line */}
      {expectedPct > 0 && expectedPct < 100 && (
        <div
          className="absolute top-0 h-full w-0.5 bg-slate-900 dark:bg-white opacity-60"
          style={{ left: `${expectedPct}%` }}
        />
      )}
    </div>
  );
}

export default function BudgetPace() {
  const [data, setData] = useState<BudgetPaceResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/budget-pace')
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const sortedCategories = useMemo(() => {
    if (!data?.categories) return [];
    return [...data.categories].sort((a, b) => b.pace_diff - a.pace_diff);
  }, [data]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-slate-400">
          Loading budget pace...
        </CardContent>
      </Card>
    );
  }

  if (!data || data.total_budget === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5" />
            Budget Pace Tracker
          </CardTitle>
        </CardHeader>
        <CardContent className="py-10 text-center text-slate-400">
          <p>No budget limits set.</p>
          <p className="text-sm mt-2">
            Set category budget limits in <a href="/settings" className="underline text-blue-500">Settings</a> to track your spending pace.
          </p>
        </CardContent>
      </Card>
    );
  }

  const statusConfig = STATUS_CONFIG[data.overall_status];
  const StatusIcon = statusConfig.icon;

  return (
    <div className="space-y-4">
      {/* Overall Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between flex-wrap gap-2">
            <span className="flex items-center gap-2">
              <Gauge className="h-5 w-5" />
              Budget Pace Tracker
            </span>
            <Badge variant="outline" className={statusConfig.color}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {statusConfig.label}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Period info */}
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <CalendarClock className="h-4 w-4" />
            <span>
              {data.period_label}: Day <strong className="text-slate-700 dark:text-slate-200">{data.days_elapsed}</strong> of {data.days_total}
              {' '}({data.time_elapsed_pct.toFixed(0)}% time elapsed)
            </span>
          </div>

          {/* Overall pace bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-300">
                Spent: <strong>{formatIdr(data.total_spent)}</strong>
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                Expected: {formatIdr(data.total_expected)}
              </span>
              <span className="text-slate-600 dark:text-slate-300">
                Budget: <strong>{formatIdr(data.total_budget)}</strong>
              </span>
            </div>
            <PaceBar
              spent={data.total_spent}
              expected={data.total_expected}
              limit={data.total_budget}
            />
            <div className="flex justify-between text-xs text-slate-400">
              <span>
                {data.total_pace_diff >= 0 ? '+' : ''}{formatIdr(data.total_pace_diff)} vs expected
              </span>
              <span>
                Projected: <strong className={data.total_projected > data.total_budget ? 'text-red-500' : 'text-emerald-500'}>
                  {formatIdr(data.total_projected)}
                </strong>
              </span>
            </div>
          </div>

          {/* Key metrics row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg border p-3 text-center">
              <p className="text-xs text-slate-400 mb-1">Pace vs Expected</p>
              <p className={`text-lg font-bold ${data.total_pace_pct > 5 ? 'text-red-500' : data.total_pace_pct < -5 ? 'text-emerald-500' : 'text-amber-500'}`}>
                {data.total_pace_pct >= 0 ? '+' : ''}{data.total_pace_pct.toFixed(1)}%
              </p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-xs text-slate-400 mb-1">Budget Used</p>
              <p className="text-lg font-bold text-slate-700 dark:text-slate-200">
                {((data.total_spent / data.total_budget) * 100).toFixed(0)}%
              </p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-xs text-slate-400 mb-1">Remaining Budget</p>
              <p className="text-lg font-bold text-slate-700 dark:text-slate-200">
                {formatIdr(Math.max(0, data.total_budget - data.total_spent))}
              </p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-xs text-slate-400 mb-1">Projected Overshoot</p>
              <p className={`text-lg font-bold ${data.total_projected > data.total_budget ? 'text-red-500' : 'text-emerald-500'}`}>
                {data.total_projected > data.total_budget ? '+' : ''}
                {formatIdr(data.total_projected - data.total_budget)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Per-Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Category Pace Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {sortedCategories.map((cat) => {
            const cfg = STATUS_CONFIG[cat.pace_status];
            const CatIcon = cfg.icon;
            return (
              <div key={cat.category} className="space-y-1">
                <div className="flex items-center justify-between text-sm flex-wrap gap-1">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: cat.color }} />
                    <span className="font-medium">{cat.category}</span>
                    <Badge variant="outline" className={`text-xs ${cfg.color} border-current`}>
                      <CatIcon className="h-3 w-3 mr-1" />
                      {cfg.label}
                    </Badge>
                  </div>
                  <div className="text-slate-500 dark:text-slate-400 text-xs">
                    {formatIdr(cat.spent)} / {formatIdr(cat.limit)}
                    <span className="ml-2">
                      ({cat.spent_pct.toFixed(0)}% used)
                    </span>
                  </div>
                </div>
                <PaceBar
                  spent={cat.spent}
                  expected={cat.expected_pct > 0 ? cat.limit * (cat.expected_pct / 100) : 0}
                  limit={cat.limit}
                />
                <div className="flex justify-between text-xs text-slate-400">
                  <span>
                    {cat.pace_diff > 0 ? '↑' : cat.pace_diff < 0 ? '↓' : '−'}
                    {' '}{Math.abs(cat.pace_diff).toFixed(0)}% vs pace
                  </span>
                  <span>
                    Projected: {formatIdr(cat.projected_total)}
                    {cat.projected_total > cat.limit && (
                      <span className="text-red-500 ml-1">
                        (+{formatIdr(cat.projected_total - cat.limit)})
                      </span>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
