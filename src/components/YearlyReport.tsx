import React, { useMemo, useState } from 'react';
import type { MonthlySummary, Category } from '../lib/data';
import { formatIdr } from '../lib/utils';
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
import { Badge } from '@/components/ui/badge';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Wallet,
  Receipt,
  PiggyBank,
  TrendingUp,
  CalendarDays,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

interface Props {
  summaries: MonthlySummary[];
  categories: Category[];
}

function getYearFromMonth(monthStr: string): number {
  const d = new Date(monthStr + ' 1');
  return isNaN(d.getTime()) ? 0 : d.getFullYear();
}

function DeltaBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) {
    return <span className="text-xs text-muted-foreground flex items-center gap-1"><Minus className="w-3 h-3" /> 0%</span>;
  }
  if (previous === 0) {
    return <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><ArrowUpRight className="w-3 h-3" /> New</span>;
  }
  const change = current - previous;
  const pct = (change / Math.abs(previous)) * 100;
  const isPositive = change > 0;
  const colorClass = isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400';
  const Icon = isPositive ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`text-xs flex items-center gap-1 font-medium ${colorClass}`}>
      <Icon className="w-3 h-3" />
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

export default function YearlyReport({ summaries, categories }: Props) {
  const years = useMemo(() => {
    const set = new Set<number>();
    summaries.forEach((s) => {
      const y = getYearFromMonth(s.month);
      if (y > 0) set.add(y);
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [summaries]);

  const [selectedYear, setSelectedYear] = useState<number>(years[0] ?? new Date().getFullYear());

  const yearSummaries = useMemo(() => {
    return summaries
      .filter((s) => getYearFromMonth(s.month) === selectedYear)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [summaries, selectedYear]);

  const prevYearSummaries = useMemo(() => {
    return summaries
      .filter((s) => getYearFromMonth(s.month) === selectedYear - 1)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [summaries, selectedYear]);

  const totals = useMemo(() => {
    const income = yearSummaries.reduce((s, m) => s + m.income, 0);
    const spending = yearSummaries.reduce((s, m) => s + m.outcome.total, 0);
    const savings = yearSummaries.reduce((s, m) => s + m.savings, 0);
    const avgSavingsRate = yearSummaries.length > 0
      ? yearSummaries.reduce((s, m) => s + m.savings_rate_pct, 0) / yearSummaries.length
      : 0;
    const cash = yearSummaries.reduce((s, m) => s + m.outcome.cash, 0);
    const credit = yearSummaries.reduce((s, m) => s + m.outcome.credit_payment, 0);
    return { income, spending, savings, avgSavingsRate, cash, credit };
  }, [yearSummaries]);

  const prevTotals = useMemo(() => {
    const income = prevYearSummaries.reduce((s, m) => s + m.income, 0);
    const spending = prevYearSummaries.reduce((s, m) => s + m.outcome.total, 0);
    const savings = prevYearSummaries.reduce((s, m) => s + m.savings, 0);
    const avgSavingsRate = prevYearSummaries.length > 0
      ? prevYearSummaries.reduce((s, m) => s + m.savings_rate_pct, 0) / prevYearSummaries.length
      : 0;
    return { income, spending, savings, avgSavingsRate };
  }, [prevYearSummaries]);

  const categoryTotals = useMemo(() => {
    const map: Record<string, number> = {};
    yearSummaries.forEach((s) => {
      if (!s.category_totals) return;
      Object.entries(s.category_totals).forEach(([cat, amt]) => {
        map[cat] = (map[cat] || 0) + amt;
      });
    });
    return map;
  }, [yearSummaries]);

  const colorMap = useMemo(() => {
    const map: Record<string, string> = {};
    categories.forEach((c) => { map[c.name] = c.color; });
    return map;
  }, [categories]);

  const FALLBACK_COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  ];

  const barChartData = {
    labels: yearSummaries.map((s) => s.month),
    datasets: [
      {
        label: 'Income',
        data: yearSummaries.map((s) => s.income),
        backgroundColor: '#10b981',
        borderRadius: 4,
      },
      {
        label: 'Spending',
        data: yearSummaries.map((s) => s.outcome.total),
        backgroundColor: '#ef4444',
        borderRadius: 4,
      },
      {
        label: 'Savings',
        data: yearSummaries.map((s) => s.savings),
        backgroundColor: '#3b82f6',
        borderRadius: 4,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const, labels: { usePointStyle: true, padding: 16 } },
      tooltip: {
        callbacks: { label: (ctx: any) => `${ctx.dataset.label}: ${formatIdr(ctx.parsed.y)}` },
      },
    },
    scales: {
      y: { beginAtZero: true, ticks: { callback: (value: any) => (value >= 1_000_000 ? `${(value / 1_000_000).toFixed(1)}M` : value >= 1_000 ? `${(value / 1_000).toFixed(0)}K` : value) } },
      x: { ticks: { maxRotation: 45, minRotation: 0 } },
    },
  };

  const catEntries = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const doughnutData = {
    labels: catEntries.map(([k]) => k),
    datasets: [
      {
        data: catEntries.map(([_, v]) => v),
        backgroundColor: catEntries.map(([k], i) => colorMap[k] || FALLBACK_COLORS[i % FALLBACK_COLORS.length]),
        borderWidth: 0,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right' as const, labels: { boxWidth: 12, font: { size: 11 } } },
      tooltip: { callbacks: { label: (ctx: any) => `${ctx.label}: ${formatIdr(ctx.parsed)}` } },
    },
  };

  const allYearsStats = useMemo(() => {
    const stats: Record<number, { income: number; spending: number; savings: number; months: number }> = {};
    summaries.forEach((s) => {
      const y = getYearFromMonth(s.month);
      if (!stats[y]) stats[y] = { income: 0, spending: 0, savings: 0, months: 0 };
      stats[y].income += s.income;
      stats[y].spending += s.outcome.total;
      stats[y].savings += s.savings;
      stats[y].months += 1;
    });
    return Object.entries(stats)
      .map(([year, data]) => ({
        year: Number(year),
        ...data,
        avgSavingsRate: data.income > 0 ? (data.savings / data.income) * 100 : 0,
      }))
      .sort((a, b) => b.year - a.year);
  }, [summaries]);

  const topSpendingMonths = useMemo(() => {
    return [...yearSummaries]
      .sort((a, b) => b.outcome.total - a.outcome.total)
      .slice(0, 3);
  }, [yearSummaries]);

  const topSavingsMonths = useMemo(() => {
    return [...yearSummaries]
      .sort((a, b) => b.savings - a.savings)
      .slice(0, 3);
  }, [yearSummaries]);

  return (
    <div className="space-y-6">
      {/* Year Selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-white/60">Year:</label>
        <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {yearSummaries.length === 0 ? (
        <div className="glass-card p-5">
          No data available for {selectedYear}.
          </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card p-5">
              <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                    <Wallet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Income</p>
                    <p className="text-lg font-semibold">{formatIdr(totals.income)}</p>
                    <DeltaBadge current={totals.income} previous={prevTotals.income} />
                  </div>
                </div>
              </div>
            <div className="glass-card p-5">
              <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                    <Receipt className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Spending</p>
                    <p className="text-lg font-semibold">{formatIdr(totals.spending)}</p>
                    <span className="text-xs text-muted-foreground">vs {formatIdr(prevTotals.spending)} last year</span>
                  </div>
                </div>
              </div>
            <div className="glass-card p-5">
              <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${totals.savings >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                    <PiggyBank className={`w-5 h-5 ${totals.savings >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Savings</p>
                    <p className={`text-lg font-semibold ${totals.savings >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {formatIdr(totals.savings)}
                    </p>
                    <DeltaBadge current={totals.savings} previous={prevTotals.savings} />
                  </div>
                </div>
              </div>
            <div className="glass-card p-5">
              <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-mint-500/10 dark:bg-mint-700/20">
                    <TrendingUp className="w-5 h-5 text-mint-500 dark:text-mint-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Avg Savings Rate</p>
                    <p className="text-lg font-semibold">{totals.avgSavingsRate.toFixed(1)}%</p>
                    <span className="text-xs text-muted-foreground">
                      {prevTotals.avgSavingsRate.toFixed(1)}% last year
                    </span>
                  </div>
                </div>
              </div>
          </div>

          {/* Monthly Trend Chart */}
          <div className="glass-card p-5">
            <h3 className="text-base font-semibold flex items-center gap-2 text-white/80">
                <CalendarDays className="w-4 h-4 text-white/50" />
                Monthly Breakdown — {selectedYear}
              </h3>
            <div className="relative h-80">
                <Bar data={barChartData} options={barOptions} />
              </div>
            </div>

          {/* Category + Highlights Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card p-5">
              <h3 className="text-base font-semibold text-white/80">Top Spending Categories</h3>
              <div className="relative h-72">
                  <Doughnut data={doughnutData} options={doughnutOptions} />
                </div>
              </div>

            <div className="space-y-6">
              <div className="glass-card p-5">
                <h3 className="text-base font-semibold text-white/80">Top Spending Months</h3>
                <div className="space-y-2">
                    {topSpendingMonths.map((m, i) => (
                      <div key={m.month} className="flex justify-between items-center p-2 rounded-lg bg-slate-50 bg-white/[0.06]">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-white/40 w-4">#{i + 1}</span>
                          <span className="text-sm font-medium">{m.month}</span>
                        </div>
                        <span className="text-sm font-semibold">{formatIdr(m.outcome.total)}</span>
                      </div>
                    ))}
                    {topSpendingMonths.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">No data</p>
                    )}
                  </div>
                </div>

              <div className="glass-card p-5">
                <h3 className="text-base font-semibold text-white/80">Top Savings Months</h3>
                <div className="space-y-2">
                    {topSavingsMonths.map((m, i) => (
                      <div key={m.month} className="flex justify-between items-center p-2 rounded-lg bg-slate-50 bg-white/[0.06]">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-white/40 w-4">#{i + 1}</span>
                          <span className="text-sm font-medium">{m.month}</span>
                        </div>
                        <span className={`text-sm font-semibold ${m.savings >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                          {formatIdr(m.savings)}
                        </span>
                      </div>
                    ))}
                    {topSavingsMonths.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">No data</p>
                    )}
                  </div>
                </div>
            </div>
          </div>

          {/* Spending Composition */}
          <div className="glass-card p-5">
            <h3 className="text-base font-semibold text-white/80">Spending Composition</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg border bg-white/[0.03]">
                  <p className="text-xs text-muted-foreground mb-1">Cash Expenses</p>
                  <p className="text-xl font-semibold">{formatIdr(totals.cash)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {totals.spending > 0 ? ((totals.cash / totals.spending) * 100).toFixed(1) : 0}% of total
                  </p>
                </div>
                <div className="p-4 rounded-lg border bg-white/[0.03]">
                  <p className="text-xs text-muted-foreground mb-1">Credit Payments</p>
                  <p className="text-xl font-semibold">{formatIdr(totals.credit)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {totals.spending > 0 ? ((totals.credit / totals.spending) * 100).toFixed(1) : 0}% of total
                  </p>
                </div>
                <div className="p-4 rounded-lg border bg-white/[0.03]">
                  <p className="text-xs text-muted-foreground mb-1">Monthly Average</p>
                  <p className="text-xl font-semibold">{formatIdr(totals.spending / yearSummaries.length)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    across {yearSummaries.length} month{yearSummaries.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>

          {/* Year-over-Year Table */}
          {allYearsStats.length > 1 && (
            <div className="glass-card p-5">
              <h3 className="text-base font-semibold text-white/80">Year-over-Year Comparison</h3>
              <div className="rounded-xl border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Year</TableHead>
                        <TableHead className="text-right">Months</TableHead>
                        <TableHead className="text-right">Income</TableHead>
                        <TableHead className="text-right">Spending</TableHead>
                        <TableHead className="text-right">Savings</TableHead>
                        <TableHead className="text-right">Savings Rate</TableHead>
                        <TableHead className="text-right">YoY Savings</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allYearsStats.map((row, idx) => {
                        const prev = allYearsStats[idx + 1];
                        const savingsChange = prev ? row.savings - prev.savings : 0;
                        const savingsPct = prev && prev.savings !== 0 ? (savingsChange / Math.abs(prev.savings)) * 100 : null;
                        const isUp = savingsChange > 0;
                        return (
                          <TableRow key={row.year} className={row.year === selectedYear ? 'bg-white/[0.03]' : undefined}>
                            <TableCell className="font-medium">{row.year}</TableCell>
                            <TableCell className="text-right">{row.months}</TableCell>
                            <TableCell className="text-right">{formatIdr(row.income)}</TableCell>
                            <TableCell className="text-right">{formatIdr(row.spending)}</TableCell>
                            <TableCell className={`text-right font-medium ${row.savings >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                              {formatIdr(row.savings)}
                            </TableCell>
                            <TableCell className="text-right">{row.avgSavingsRate.toFixed(1)}%</TableCell>
                            <TableCell className="text-right">
                              {prev ? (
                                <span className={`text-xs font-medium ${isUp ? 'text-emerald-600 dark:text-emerald-400' : savingsChange < 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
                                  {isUp ? '+' : ''}{formatIdr(savingsChange)}
                                  {savingsPct !== null && (
                                    <span className="ml-1">({isUp ? '+' : ''}{savingsPct.toFixed(1)}%)</span>
                                  )}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
          )}
        </>
      )}
    </div>
  );
}
