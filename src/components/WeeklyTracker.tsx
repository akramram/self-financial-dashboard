import React, { useState, useMemo, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import type { MonthlySummary } from '../lib/data';
import { formatIdr, formatNumber } from '../lib/utils';
import { fetchSummaries } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CalendarDays, TrendingUp, TrendingDown, Target, AlertTriangle, CheckCircle2, Zap, Wallet, ArrowRight } from 'lucide-react';
import type { WeeklySpendingResult, WeeklyBucket } from '../lib/db';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, PointElement,
  LineElement, Title, Tooltip, Legend, Filler, ArcElement
);

// ── Weekly spending API fetcher ──────────────────────────────────────────────
async function fetchWeeklySpending(periodId: number): Promise<WeeklySpendingResult> {
  const res = await fetch(`/api/weekly-spending?period_id=${periodId}`);
  if (!res.ok) throw new Error('Failed to fetch weekly spending');
  return res.json();
}

// ── Color palette for weeks ─────────────────────────────────────────────────
const WEEK_COLORS = [
  'rgba(99, 102, 241, 0.8)',   // indigo
  'rgba(168, 85, 247, 0.8)',   // purple
  'rgba(236, 72, 153, 0.8)',   // pink
  'rgba(249, 115, 22, 0.8)',   // orange
  'rgba(14, 165, 233, 0.8)',   // sky
];
const WEEK_BORDERS = [
  'rgb(99, 102, 241)',
  'rgb(168, 85, 247)',
  'rgb(236, 72, 153)',
  'rgb(249, 115, 22)',
  'rgb(14, 165, 233)',
];

// ── Insight generation ───────────────────────────────────────────────────────
function generateInsights(data: WeeklySpendingResult): { icon: React.ReactNode; text: string; type: 'good' | 'warn' | 'bad' | 'info' }[] {
  const insights: { icon: React.ReactNode; text: string; type: 'good' | 'warn' | 'bad' | 'info' }[] = [];
  const { weeks, weeklyBudget, income, totalSpend } = data;

  if (weeks.length === 0) return insights;

  // Find the biggest spending week
  const maxWeek = weeks.reduce((a, b) => a.total > b.total ? a : b);
  const minWeek = weeks.reduce((a, b) => a.total < b.total ? a : b);

  // Find which weeks exceeded the weekly budget
  const overBudgetWeeks = weeks.filter((w) => w.total > weeklyBudget);
  if (overBudgetWeeks.length > 0) {
    const pctOver = Math.round(((overBudgetWeeks[0].total - weeklyBudget) / weeklyBudget) * 100);
    insights.push({
      icon: <AlertTriangle className="w-4 h-4 text-amber-500" />,
      text: `${overBudgetWeeks.length} of ${weeks.length} weeks exceeded your weekly budget (${formatIdr(weeklyBudget)}). The worst was ${overBudgetWeeks[0].label} at ${pctOver}% over.`,
      type: 'warn',
    });
  }

  // First-week-heavy pattern (often kickoff expenses)
  if (weeks.length >= 3 && weeks[0].total > weeks[1].total * 2) {
    const pct = Math.round((weeks[0].total / totalSpend) * 100);
    insights.push({
      icon: <Zap className="w-4 h-4 text-orange-500" />,
      text: `${pct}% of all spending happened in Week 1 — a "kickoff spike" pattern. Consider spreading early-month payments.`,
      type: 'info',
    });
  }

  // Spending consistency check
  if (weeks.length >= 3) {
    const avg = totalSpend / weeks.length;
    const variance = weeks.reduce((s, w) => s + Math.pow(w.total - avg, 2), 0) / weeks.length;
    const stdDev = Math.sqrt(variance);
    const cv = avg > 0 ? (stdDev / avg) * 100 : 0;
    if (cv > 80) {
      insights.push({
        icon: <TrendingDown className="w-4 h-4 text-red-500" />,
        text: `Highly irregular weekly spending (CV: ${cv.toFixed(0)}%). Your weeks swing wildly — consider a more consistent budget plan.`,
        type: 'bad',
      });
    } else if (cv < 30) {
      insights.push({
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
        text: `Very consistent weekly spending (CV: ${cv.toFixed(0)}%). Your spending rhythm is steady and predictable.`,
        type: 'good',
      });
    }
  }

  // End-of-period savings signal
  if (income > 0 && totalSpend < income) {
    const savingsPct = Math.round(((income - totalSpend) / income) * 100);
    insights.push({
      icon: <TrendingUp className="w-4 h-4 text-emerald-500" />,
      text: `You're on track to save ${savingsPct}% of your income this period (${formatIdr(income - totalSpend)}).`,
      type: 'good',
    });
  } else if (income > 0 && totalSpend >= income) {
    insights.push({
      icon: <AlertTriangle className="w-4 h-4 text-red-500" />,
      text: `Total spending (${formatIdr(totalSpend)}) has exceeded income (${formatIdr(income)}). No savings this period.`,
      type: 'bad',
    });
  }

  // Most expensive category per week insight
  if (weeks.length > 0) {
    const allCats: Record<string, number> = {};
    weeks.forEach((w) => {
      Object.entries(w.categoryTotals).forEach(([cat, amount]) => {
        allCats[cat] = (allCats[cat] || 0) + amount;
      });
    });
    const topCat = Object.entries(allCats).sort(([, a], [, b]) => b - a)[0];
    if (topCat) {
      const catPct = Math.round((topCat[1] / totalSpend) * 100);
      insights.push({
        icon: <Wallet className="w-4 h-4 text-blue-500" />,
        text: `Your biggest spending category is "${topCat[0]}" at ${formatIdr(topCat[1])} (${catPct}% of total).`,
        type: 'info',
      });
    }
  }

  return insights;
}

export default function WeeklyTracker() {
  const [summaries, setSummaries] = useState<MonthlySummary[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('latest');
  const [weeklyData, setWeeklyData] = useState<WeeklySpendingResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);

  // All hooks before any early return
  const months = useMemo(() => {
    return [...summaries].reverse().map((s) => s.month);
  }, [summaries]);

  const latestPeriodId = useMemo(() => {
    return summaries.length > 0 ? summaries[summaries.length - 1]?.period_id : null;
  }, [summaries]);

  const activePeriodId = useMemo(() => {
    if (selectedPeriodId === 'latest') return latestPeriodId;
    const s = summaries.find((s) => s.period_id === parseInt(selectedPeriodId));
    return s?.period_id ?? latestPeriodId;
  }, [selectedPeriodId, summaries, latestPeriodId]);

  useEffect(() => {
    fetchSummaries()
      .then((s) => {
        setSummaries(s);
        return s;
      })
      .then((s) => {
        const pid = s.length > 0 ? s[s.length - 1].period_id : null;
        if (pid) return fetchWeeklySpending(pid);
        return null;
      })
      .then((data) => {
        if (data) setWeeklyData(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!activePeriodId) return;
    setLoading(true);
    fetchWeeklySpending(activePeriodId)
      .then((data) => setWeeklyData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
    setSelectedWeek(null);
  }, [activePeriodId]);

  const insights = useMemo(() => {
    if (!weeklyData) return [];
    return generateInsights(weeklyData);
  }, [weeklyData]);

  // ── Chart data ──
  const barChartData = useMemo(() => {
    if (!weeklyData) return { labels: [], datasets: [] };
    return {
      labels: weeklyData.weeks.map((w) => `W${w.weekNum}`),
      datasets: [
        {
          label: 'Spending',
          data: weeklyData.weeks.map((w) => w.total),
          backgroundColor: weeklyData.weeks.map((_, i) => WEEK_COLORS[i % WEEK_COLORS.length]),
          borderColor: weeklyData.weeks.map((_, i) => WEEK_BORDERS[i % WEEK_BORDERS.length]),
          borderWidth: 2,
          borderRadius: 8,
          barThickness: 40,
        },
        {
          label: 'Weekly Budget',
          data: weeklyData.weeks.map(() => weeklyData.weeklyBudget),
          type: 'line' as const,
          borderColor: 'rgb(16, 185, 129)',
          borderDash: [6, 4],
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
          order: 0,
        },
      ],
    };
  }, [weeklyData]);

  const trendData = useMemo(() => {
    if (!weeklyData) return { labels: [], datasets: [] };
    return {
      labels: weeklyData.weeks.map((w) => `W${w.weekNum}`),
      datasets: [
        {
          label: 'Avg Daily Spend',
          data: weeklyData.weeks.map((w) => w.avgDaily),
          borderColor: 'rgb(99, 102, 241)',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 5,
          pointBackgroundColor: 'rgb(99, 102, 241)',
        },
      ],
    };
  }, [weeklyData]);

  const categoryDonutData = useMemo(() => {
    if (!weeklyData) return { labels: [], datasets: [] };
    // Aggregate all category totals across weeks
    const catTotals: Record<string, number> = {};
    weeklyData.weeks.forEach((w) => {
      Object.entries(w.categoryTotals).forEach(([cat, amount]) => {
        catTotals[cat] = (catTotals[cat] || 0) + amount;
      });
    });

    const sorted = Object.entries(catTotals).sort(([, a], [, b]) => b - a);
    const top = sorted.slice(0, 8);
    const otherTotal = sorted.slice(8).reduce((s, [, v]) => s + v, 0);

    const labels = top.map(([name]) => name);
    const values = top.map(([, val]) => val);
    if (otherTotal > 0) {
      labels.push('Other');
      values.push(otherTotal);
    }

    const palette = [
      'rgb(99, 102, 241)', 'rgb(168, 85, 247)', 'rgb(236, 72, 153)',
      'rgb(249, 115, 22)', 'rgb(14, 165, 233)', 'rgb(16, 185, 129)',
      'rgb(234, 179, 8)', 'rgb(239, 68, 68)', 'rgb(148, 163, 184)',
    ];

    return {
      labels,
      datasets: [{
        data: values,
        backgroundColor: palette.slice(0, labels.length),
        borderWidth: 0,
      }],
    };
  }, [weeklyData]);

  // Weekly comparison breakdown
  const selectedWeekData = useMemo(() => {
    if (!weeklyData || selectedWeek === null) return null;
    return weeklyData.weeks.find((w) => w.weekNum === selectedWeek) ?? null;
  }, [weeklyData, selectedWeek]);

  const weeklyComparisonData = useMemo(() => {
    if (!weeklyData) return null;
    // Get all unique categories across all weeks
    const allCats = new Set<string>();
    weeklyData.weeks.forEach((w) => {
      Object.keys(w.categoryTotals).forEach((c) => allCats.add(c));
    });
    return Array.from(allCats);
  }, [weeklyData]);

  if (loading && !weeklyData) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-40 rounded-xl bg-slate-200 dark:bg-slate-700 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!weeklyData || weeklyData.weeks.length === 0) {
    return (
      <div className="text-center py-16">
        <CalendarDays className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
        <p className="text-slate-500 dark:text-slate-400">No spending data for this period.</p>
        <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Add transactions to see your weekly breakdown.</p>
      </div>
    );
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      tooltip: {
        callbacks: {
          label: (ctx: any) => `${ctx.dataset.label}: ${formatIdr(ctx.parsed.y)}`,
        },
      },
      legend: {
        display: true,
        position: 'top' as const,
        labels: { font: { size: 12 }, boxWidth: 12, padding: 16 },
      },
    },
    scales: {
      x: { grid: { display: false } },
      y: {
        beginAtZero: true,
        ticks: {
          callback: (val: any) => {
            if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
            if (val >= 1_000) return `${(val / 1_000).toFixed(0)}K`;
            return val;
          },
        },
      },
    },
  };

  const lineOptions = {
    ...chartOptions,
    plugins: {
      ...chartOptions.plugins,
      legend: { display: false },
    },
  };

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Period:</label>
        <Select
          value={selectedPeriodId}
          onValueChange={setSelectedPeriodId}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map((m, idx) => {
              const s = [...summaries].reverse()[idx];
              return (
                <SelectItem key={s.period_id} value={String(s.period_id)}>
                  {m}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Income</p>
            <p className="text-lg font-bold">{formatIdr(weeklyData.income)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Spent</p>
            <p className="text-lg font-bold">{formatIdr(weeklyData.totalSpend)}</p>
            {weeklyData.income > 0 && (
              <p className={`text-xs mt-1 ${weeklyData.totalSpend <= weeklyData.income ? 'text-emerald-600' : 'text-red-500'}`}>
                {weeklyData.totalSpend <= weeklyData.income
                  ? `${Math.round(((weeklyData.income - weeklyData.totalSpend) / weeklyData.income) * 100)}% saved`
                  : `${Math.round(((weeklyData.totalSpend - weeklyData.income) / weeklyData.income) * 100)}% over`}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Weekly Budget</p>
            <p className="text-lg font-bold">{formatIdr(weeklyData.weeklyBudget)}</p>
            <p className="text-xs text-slate-400 mt-1">{weeklyData.weeks.length} weeks in period</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Avg Daily Spend</p>
            <p className="text-lg font-bold">
              {formatIdr(
                weeklyData.weeks.reduce((s, w) => s + w.avgDaily, 0) / weeklyData.weeks.length
              )}
            </p>
            <p className="text-xs text-slate-400 mt-1">{weeklyData.totalTxCount} transactions</p>
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <Card className="border-indigo-200 dark:border-indigo-800/50 bg-indigo-50/50 dark:bg-indigo-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="w-4 h-4 text-indigo-500" />
              Weekly Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {insights.map((ins, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  {ins.icon}
                  <span className={ins.type === 'bad' ? 'text-red-700 dark:text-red-400' : ins.type === 'warn' ? 'text-amber-700 dark:text-amber-400' : 'text-slate-600 dark:text-slate-300'}>
                    {ins.text}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Main Chart: Weekly Spending vs Budget */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Weekly Spending vs Budget</CardTitle>
          <CardDescription>Each bar represents total spending for that week. The dashed line is your weekly budget target.</CardDescription>
        </CardHeader>
        <CardContent>
          <div style={{ height: 300 }}>
            <Bar data={barChartData} options={chartOptions} />
          </div>
        </CardContent>
      </Card>

      {/* Row: Weekly cards + Average daily trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Breakdown Cards */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Week-by-Week Breakdown</CardTitle>
            <CardDescription>Click a week to see its category breakdown.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {weeklyData.weeks.map((w, idx) => {
                const isOver = w.total > weeklyData.weeklyBudget;
                const pctOfBudget = weeklyData.weeklyBudget > 0
                  ? Math.round((w.total / weeklyData.weeklyBudget) * 100)
                  : 0;
                const budgetBarWidth = Math.min(100, pctOfBudget);

                return (
                  <button
                    key={w.weekNum}
                    onClick={() => setSelectedWeek(selectedWeek === w.weekNum ? null : w.weekNum)}
                    className={`w-full text-left p-3 rounded-lg border transition cursor-pointer ${
                      selectedWeek === w.weekNum
                        ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full inline-block"
                          style={{ backgroundColor: WEEK_BORDERS[idx % WEEK_BORDERS.length] }}
                        />
                        <span className="text-sm font-medium">{w.label}</span>
                        <span className="text-xs text-slate-400">({w.txCount} txs)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isOver ? (
                          <Badge variant="destructive" className="text-xs">+{pctOfBudget - 100}%</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs text-emerald-600">-{100 - pctOfBudget}%</Badge>
                        )}
                        <span className="text-sm font-semibold">{formatIdr(w.total)}</span>
                      </div>
                    </div>
                    {/* Budget progress bar */}
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full mt-1">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isOver ? 'bg-red-400' : 'bg-emerald-400'
                        }`}
                        style={{ width: `${budgetBarWidth}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Avg daily: {formatIdr(w.avgDaily)} &middot; Budget: {formatIdr(weeklyData.weeklyBudget)}
                    </p>

                    {/* Expanded category breakdown */}
                    {selectedWeek === w.weekNum && (
                      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600">
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Category breakdown:</p>
                        <div className="space-y-1.5">
                          {Object.entries(w.categoryTotals)
                            .sort(([, a], [, b]) => b - a)
                            .map(([cat, amount]) => {
                              const catPct = w.total > 0 ? (amount / w.total) * 100 : 0;
                              return (
                                <div key={cat} className="flex items-center justify-between">
                                  <span className="text-xs text-slate-600 dark:text-slate-300">{cat}</span>
                                  <div className="flex items-center gap-2">
                                    <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full">
                                      <div
                                        className="h-full rounded-full bg-indigo-400"
                                        style={{ width: `${catPct}%` }}
                                      />
                                    </div>
                                    <span className="text-xs font-medium w-20 text-right">{formatIdr(amount)}</span>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Average Daily Spend Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Average Daily Spend Trend</CardTitle>
            <CardDescription>How your daily spending pace shifts across the period.</CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ height: 300 }}>
              <Line data={trendData} options={lineOptions} />
            </div>
            <div className="mt-4">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-2">Week-over-Week Change</p>
              {weeklyData.weeks.slice(1).map((w, idx) => {
                const prev = weeklyData.weeks[idx];
                if (!prev) return null;
                const change = w.avgDaily - prev.avgDaily;
                const changePct = prev.avgDaily > 0 ? ((change / prev.avgDaily) * 100).toFixed(0) : '—';
                return (
                  <div key={w.weekNum} className="flex items-center gap-2 text-xs mb-1">
                    <span className="text-slate-400">W{prev.weekNum} → W{w.weekNum}</span>
                    <ArrowRight className="w-3 h-3 text-slate-300" />
                    {change >= 0 ? (
                      <TrendingUp className="w-3 h-3 text-red-500" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-emerald-500" />
                    )}
                    <span className={change >= 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}>
                      {change >= 0 ? '+' : ''}{formatIdr(change)} ({changePct}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row: Category donut + Full table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Distribution Donut */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Category Distribution</CardTitle>
            <CardDescription>Where your money goes across the whole period.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-w-[250px] mx-auto" style={{ height: 250 }}>
              <Doughnut
                data={categoryDonutData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  animation: false,
                  plugins: {
                    legend: {
                      position: 'bottom' as const,
                      labels: { font: { size: 11 }, boxWidth: 10, padding: 8 },
                    },
                    tooltip: {
                      callbacks: {
                        label: (ctx: any) => `${ctx.label}: ${formatIdr(ctx.parsed)}`,
                      },
                    },
                  },
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Full Category × Week Table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Category × Week Matrix</CardTitle>
            <CardDescription>Spending per category across each week of the period.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Category</TableHead>
                    {weeklyData.weeks.map((w) => (
                      <TableHead key={w.weekNum} className="text-xs text-right">W{w.weekNum}</TableHead>
                    ))}
                    <TableHead className="text-xs text-right font-bold">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {weeklyComparisonData?.map((cat) => {
                    const rowTotal = weeklyData.weeks.reduce((s, w) => s + (w.categoryTotals[cat] || 0), 0);
                    return (
                      <TableRow key={cat}>
                        <TableCell className="text-xs font-medium">{cat}</TableCell>
                        {weeklyData.weeks.map((w) => {
                          const val = w.categoryTotals[cat] || 0;
                          return (
                            <TableCell key={w.weekNum} className="text-xs text-right">
                              {val > 0 ? formatIdr(val) : <span className="text-slate-300 dark:text-slate-600">—</span>}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-xs text-right font-bold">{formatIdr(rowTotal)}</TableCell>
                      </TableRow>
                    );
                  })}
                  {/* Total row */}
                  <TableRow className="font-bold border-t-2">
                    <TableCell className="text-xs">Total</TableCell>
                    {weeklyData.weeks.map((w) => (
                      <TableCell key={w.weekNum} className="text-xs text-right">{formatIdr(w.total)}</TableCell>
                    ))}
                    <TableCell className="text-xs text-right">{formatIdr(weeklyData.totalSpend)}</TableCell>
                  </TableRow>
                  {/* Budget row */}
                  <TableRow className="text-emerald-600 dark:text-emerald-400">
                    <TableCell className="text-xs">Budget</TableCell>
                    {weeklyData.weeks.map((w) => (
                      <TableCell key={w.weekNum} className="text-xs text-right">{formatIdr(weeklyData.weeklyBudget)}</TableCell>
                    ))}
                    <TableCell className="text-xs text-right">{formatIdr(weeklyData.weeklyBudget * weeklyData.weeks.length)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
