import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { formatIdr, formatNumber } from '../lib/utils';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler
);

// ─── Types ─────────────────────────────────────────────────────────────────

interface CategoryBaseline {
  name: string;
  color: string;
  monthly_limit: number;
  avg_spending: number;
}

interface PeriodData {
  period_id: number;
  month: string;
  income: number;
  outcome: number;
  category_totals: Record<string, number>;
  networth: number | null;
}

interface ScenarioData {
  periods: PeriodData[];
  categories: CategoryBaseline[];
  avgIncome: number;
  avgSpending: number;
  avgSavings: number;
  currentNetworth: number;
  avgNwGrowth: number;
  savingsRate: number;
}

/** Per-category adjustment: absolute target spending amount per month */
interface CategoryAdjustment {
  name: string;
  /** delta amount: negative = cut, positive = increase */
  delta: number;
  /** percentage change from baseline */
  pct: number;
}

interface OneTimeEvent {
  id: string;
  label: string;
  amount: number; // negative = expense, positive = income
  monthOffset: number; // which month from now (0 = this month)
}

type ProjectionMonths = 6 | 12 | 24;

// ─── Component ──────────────────────────────────────────────────────────────

export default function WhatIfPlanner() {
  const [data, setData] = useState<ScenarioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Scenario controls
  const [incomeChangePct, setIncomeChangePct] = useState(0); // -50 to +100
  const [categoryAdjustments, setCategoryAdjustments] = useState<Record<string, CategoryAdjustment>>({});
  const [oneTimeEvents, setOneTimeEvents] = useState<OneTimeEvent[]>([]);
  const [projectionMonths, setProjectionMonths] = useState<ProjectionMonths>(12);
  const [showAllCategories, setShowAllCategories] = useState(false);

  useEffect(() => {
    fetch('/api/scenario')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // ─── Projection calculation ──────────────────────────────────────────────
  const projection = useMemo(() => {
    if (!data) return null;

    const { avgIncome, avgSpending, currentNetworth } = data;

    // Adjusted income
    const adjustedIncome = avgIncome * (1 + incomeChangePct / 100);

    // Adjusted spending: start from avg, apply category deltas
    let totalCategoryDelta = 0;
    for (const adj of Object.values(categoryAdjustments)) {
      totalCategoryDelta += adj.delta;
    }
    const adjustedSpending = Math.max(0, avgSpending + totalCategoryDelta);

    // Monthly net cashflow
    const monthlyNet = adjustedIncome - adjustedSpending;

    // Build month-by-month projection
    const baselineMonths: number[] = [];
    const scenarioMonths: number[] = [];
    const labels: string[] = [];
    const baselineSavings: number[] = [];
    const scenarioSavings: number[] = [];

    const now = new Date();
    for (let i = 0; i < projectionMonths; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      labels.push(d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));

      // Baseline: use historical avg growth
      baselineMonths.push(currentNetworth + data.avgNwGrowth * (i + 1));
      baselineSavings.push(data.avgSavings);

      // Scenario: apply monthly net + one-time events
      let scenarioNet = monthlyNet;
      for (const evt of oneTimeEvents) {
        if (evt.monthOffset === i) scenarioNet += evt.amount;
      }
      const prevScenario = i === 0 ? currentNetworth : scenarioMonths[i - 1];
      scenarioMonths.push(prevScenario + scenarioNet);
      scenarioSavings.push(monthlyNet);
    }

    const finalBaseline = baselineMonths[baselineMonths.length - 1] || currentNetworth;
    const finalScenario = scenarioMonths[scenarioMonths.length - 1] || currentNetworth;
    const networthDifference = finalScenario - finalBaseline;

    // Totals
    const totalSaved = monthlyNet * projectionMonths + oneTimeEvents.reduce((s, e) => s + e.amount, 0);
    const baselineTotalSaved = data.avgSavings * projectionMonths;

    return {
      labels,
      baselineMonths,
      scenarioMonths,
      baselineSavings,
      scenarioSavings,
      adjustedIncome,
      adjustedSpending,
      monthlyNet,
      finalBaseline,
      finalScenario,
      networthDifference,
      totalSaved,
      baselineTotalSaved,
      projectionMonths,
    };
  }, [data, incomeChangePct, categoryAdjustments, oneTimeEvents, projectionMonths]);

  // ─── Category adjustment handlers ────────────────────────────────────────
  const updateCategoryAdjustment = useCallback((name: string, pct: number, baseline: number) => {
    setCategoryAdjustments((prev) => {
      const next = { ...prev };
      if (pct === 0) {
        delete next[name];
      } else {
        const delta = Math.round((baseline * pct) / 100);
        next[name] = { name, delta, pct };
      }
      return next;
    });
  }, []);

  // ─── One-time event handlers ─────────────────────────────────────────────
  const addOneTimeEvent = useCallback(() => {
    setOneTimeEvents((prev) => [
      ...prev,
      {
        id: `evt-${Date.now()}`,
        label: 'One-time expense',
        amount: -1000000,
        monthOffset: 0,
      },
    ]);
  }, []);

  const updateOneTimeEvent = useCallback((id: string, field: keyof OneTimeEvent, value: string | number) => {
    setOneTimeEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: field === 'amount' || field === 'monthOffset' ? Number(value) : value } : e))
    );
  }, []);

  const removeOneTimeEvent = useCallback((id: string) => {
    setOneTimeEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  // ─── Reset ────────────────────────────────────────────────────────────────
  const resetScenario = useCallback(() => {
    setIncomeChangePct(0);
    setCategoryAdjustments({});
    setOneTimeEvents([]);
  }, []);

  // Categories sorted: those with spending first, then by name
  // (must be before early returns — Rules of Hooks)
  const sortedCategories = useMemo(() => {
    if (!data) return [];
    return [...data.categories].sort((a, b) => b.avg_spending - a.avg_spending);
  }, [data]);

  // ─── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading scenario data...</div>
      </div>
    );
  }

  if (error || !data || !projection) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">Error loading data: {error || 'Unknown error'}</p>
        </CardContent>
      </Card>
    );
  }

  const visibleCategories = showAllCategories
    ? sortedCategories
    : sortedCategories.filter((c) => c.avg_spending > 0).slice(0, 8);

  // Chart data — net worth projection
  const networthChartData = {
    labels: projection.labels,
    datasets: [
      {
        label: 'Baseline (current trend)',
        data: projection.baselineMonths,
        borderColor: 'rgb(148, 163, 184)',
        backgroundColor: 'rgba(148, 163, 184, 0.08)',
        borderWidth: 2,
        borderDash: [6, 4],
        pointRadius: 0,
        tension: 0.3,
        fill: false,
      },
      {
        label: 'What-If Scenario',
        data: projection.scenarioMonths,
        borderColor: projection.networthDifference >= 0 ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)',
        backgroundColor: projection.networthDifference >= 0
          ? 'rgba(16, 185, 129, 0.12)'
          : 'rgba(239, 68, 68, 0.12)',
        borderWidth: 3,
        pointRadius: 0,
        pointHoverRadius: 6,
        tension: 0.3,
        fill: true,
      },
    ],
  };

  const networthChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: { position: 'top' as const, labels: { font: { size: 11 } } },
      tooltip: {
        callbacks: {
          label: (ctx: any) => `${ctx.dataset.label}: ${formatIdr(ctx.parsed.y)}`,
        },
      },
    },
    scales: {
      y: {
        ticks: {
          font: { size: 10 },
          callback: (val: any) => 'IDR ' + (val / 1000000).toFixed(0) + 'M',
        },
      },
      x: { ticks: { font: { size: 10 } } },
    },
  };

  // Cashflow comparison bar chart
  const cashflowData = {
    labels: ['Monthly Income', 'Monthly Spending', 'Monthly Net Savings'],
    datasets: [
      {
        label: 'Baseline',
        data: [data.avgIncome, data.avgSpending, data.avgSavings],
        backgroundColor: ['rgba(59,130,246,0.6)', 'rgba(239,68,68,0.6)', 'rgba(148,163,184,0.6)'],
        borderColor: ['rgb(59,130,246)', 'rgb(239,68,68)', 'rgb(148,163,184)'],
        borderWidth: 1,
      },
      {
        label: 'Scenario',
        data: [projection.adjustedIncome, projection.adjustedSpending, projection.monthlyNet],
        backgroundColor: ['rgba(16,185,129,0.7)', 'rgba(245,158,11,0.7)', 'rgba(16,185,129,0.8)'],
        borderColor: ['rgb(16,185,129)', 'rgb(245,158,11)', 'rgb(16,185,129)'],
        borderWidth: 1,
      },
    ],
  };

  const cashflowOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: { position: 'top' as const, labels: { font: { size: 11 } } },
      tooltip: {
        callbacks: {
          label: (ctx: any) => `${ctx.dataset.label}: ${formatIdr(ctx.parsed.y)}`,
        },
      },
    },
    scales: {
      y: {
        ticks: {
          font: { size: 10 },
          callback: (val: any) => 'IDR ' + (val / 1000000).toFixed(0) + 'M',
        },
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* ─── Summary KPI cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4 px-4">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">Projected Net Worth</p>
            <p className={`text-xl font-bold mt-1 ${projection.networthDifference >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {formatIdr(projection.finalScenario)}
            </p>
            <p className="text-[11px] mt-1 text-muted-foreground">
              {projection.networthDifference >= 0 ? '▲' : '▼'} {formatIdr(Math.abs(projection.networthDifference))} vs baseline
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 px-4">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">Monthly Savings</p>
            <p className={`text-xl font-bold mt-1 ${projection.monthlyNet >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {formatIdr(projection.monthlyNet)}
            </p>
            <p className="text-[11px] mt-1 text-muted-foreground">
              vs {formatIdr(data.avgSavings)} baseline
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 px-4">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">Savings Rate</p>
            <p className={`text-xl font-bold mt-1 ${projection.adjustedIncome > 0 && projection.monthlyNet / projection.adjustedIncome >= 0.2 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {projection.adjustedIncome > 0 ? ((projection.monthlyNet / projection.adjustedIncome) * 100).toFixed(1) : '0'}%
            </p>
            <p className="text-[11px] mt-1 text-muted-foreground">
              vs {data.savingsRate.toFixed(1)}% baseline
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 px-4">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">Total Saved ({projectionMonths}mo)</p>
            <p className={`text-xl font-bold mt-1 ${projection.totalSaved >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {formatIdr(projection.totalSaved)}
            </p>
            <p className="text-[11px] mt-1 text-muted-foreground">
              vs {formatIdr(projection.baselineTotalSaved)} baseline
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ─── Net Worth Projection Chart ────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-lg">Net Worth Projection</CardTitle>
              <CardDescription className="text-xs">
                Baseline trend vs your what-if scenario over {projectionMonths} months
              </CardDescription>
            </div>
            <div className="flex gap-1">
              {([6, 12, 24] as ProjectionMonths[]).map((m) => (
                <Button
                  key={m}
                  size="sm"
                  variant={projectionMonths === m ? 'default' : 'outline'}
                  onClick={() => setProjectionMonths(m)}
                  className="h-8 text-xs"
                >
                  {m}mo
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div style={{ height: 320 }}>
            <Line data={networthChartData} options={networthChartOptions} />
          </div>
        </CardContent>
      </Card>

      {/* ─── Cashflow Comparison ───────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Monthly Cashflow: Baseline vs Scenario</CardTitle>
          <CardDescription className="text-xs">
            How income, spending, and savings change with your adjustments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div style={{ height: 240 }}>
            <Bar data={cashflowData} options={cashflowOptions} />
          </div>
        </CardContent>
      </Card>

      {/* ─── Controls ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income Control */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              💰 Income Adjustment
            </CardTitle>
            <CardDescription className="text-xs">
              Simulate a raise, bonus, or income loss
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Income Change</span>
                <Badge variant={incomeChangePct >= 0 ? 'default' : 'destructive'} className="text-xs">
                  {incomeChangePct >= 0 ? '+' : ''}{incomeChangePct}%
                </Badge>
              </div>
              <input
                type="range"
                min={-50}
                max={100}
                step={5}
                value={incomeChangePct}
                onChange={(e) => setIncomeChangePct(Number(e.target.value))}
                className="w-full accent-emerald-600"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>-50%</span>
                <span>0%</span>
                <span>+100%</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2 border-t">
              <div>
                <p className="text-[11px] text-muted-foreground">Current avg income</p>
                <p className="text-sm font-semibold">{formatIdr(data.avgIncome)}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Adjusted income</p>
                <p className={`text-sm font-bold ${incomeChangePct !== 0 ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                  {formatIdr(projection.adjustedIncome)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* One-Time Events */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  🎯 One-Time Events
                </CardTitle>
                <CardDescription className="text-xs">
                  Bonuses, large purchases, or unexpected costs
                </CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={addOneTimeEvent} className="h-8 text-xs">
                + Add Event
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {oneTimeEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No one-time events. Add a bonus, tax refund, or large purchase.
              </p>
            ) : (
              oneTimeEvents.map((evt) => (
                <div key={evt.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                  <input
                    type="text"
                    value={evt.label}
                    onChange={(e) => updateOneTimeEvent(evt.id, 'label', e.target.value)}
                    className="flex-1 min-w-0 bg-transparent text-sm border-0 focus:outline-none focus:ring-1 focus:ring-ring rounded px-1 py-0.5"
                    placeholder="Event name"
                  />
                  <input
                    type="number"
                    value={evt.amount}
                    onChange={(e) => updateOneTimeEvent(evt.id, 'amount', e.target.value)}
                    className="w-24 text-sm bg-background border rounded px-2 py-1 text-right"
                    step={100000}
                  />
                  <select
                    value={evt.monthOffset}
                    onChange={(e) => updateOneTimeEvent(evt.id, 'monthOffset', e.target.value)}
                    className="text-xs bg-background border rounded px-1 py-1"
                  >
                    {Array.from({ length: projectionMonths }, (_, i) => (
                      <option key={i} value={i}>Mo {i + 1}</option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeOneTimeEvent(evt.id)}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                  >
                    ✕
                  </Button>
                </div>
              ))
            )}
            <p className="text-[10px] text-muted-foreground">
              💡 Use negative amounts for expenses, positive for income.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ─── Category Spending Adjustments ─────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                🛒 Category Spending Adjustments
              </CardTitle>
              <CardDescription className="text-xs">
                Drag sliders to simulate cutting or increasing spending per category
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {Object.keys(categoryAdjustments).length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {Object.keys(categoryAdjustments).length} adjusted
                </Badge>
              )}
              <Button size="sm" variant="ghost" onClick={() => setShowAllCategories(!showAllCategories)} className="h-8 text-xs">
                {showAllCategories ? 'Show Top 8' : 'Show All'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {visibleCategories.map((cat) => {
            const adj = categoryAdjustments[cat.name];
            const pct = adj?.pct ?? 0;
            const newAmount = cat.avg_spending + (adj?.delta ?? 0);
            return (
              <div key={cat.name} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30">
                <div className="w-2 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                <div className="w-28 flex-shrink-0">
                  <p className="text-sm font-medium truncate">{cat.name}</p>
                  <p className="text-[10px] text-muted-foreground">{formatIdr(cat.avg_spending)}/mo</p>
                </div>
                <div className="flex-1">
                  <input
                    type="range"
                    min={-100}
                    max={100}
                    step={5}
                    value={pct}
                    onChange={(e) => updateCategoryAdjustment(cat.name, Number(e.target.value), cat.avg_spending)}
                    className="w-full accent-blue-600"
                  />
                </div>
                <div className="w-20 text-right flex-shrink-0">
                  <p className={`text-sm font-semibold ${pct < 0 ? 'text-emerald-600 dark:text-emerald-400' : pct > 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
                    {pct > 0 ? '+' : ''}{pct}%
                  </p>
                  <p className="text-[10px] text-muted-foreground">{formatIdr(newAmount)}</p>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* ─── Reset & Insight Bar ───────────────────────────────────────────── */}
      {(incomeChangePct !== 0 || Object.keys(categoryAdjustments).length > 0 || oneTimeEvents.length > 0) && (
        <Card className={`border-l-4 ${projection.networthDifference >= 0 ? 'border-l-emerald-500' : 'border-l-amber-500'}`}>
          <CardContent className="py-4 flex items-center justify-between flex-wrap gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">
                {projection.networthDifference >= 0 ? '✅' : '⚠️'}{' '}
                {projection.networthDifference >= 0
                  ? `This scenario gains you ${formatIdr(Math.abs(projection.networthDifference))} over ${projectionMonths} months!`
                  : `This scenario costs you ${formatIdr(Math.abs(projection.networthDifference))} over ${projectionMonths} months.`}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Monthly net: {formatIdr(projection.monthlyNet)} · Savings rate: {projection.adjustedIncome > 0 ? ((projection.monthlyNet / projection.adjustedIncome) * 100).toFixed(1) : '0'}%
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={resetScenario} className="flex-shrink-0">
              ↺ Reset All
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
