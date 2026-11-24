import React, { useMemo, useState } from 'react';
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
} from 'chart.js';
import { Bar, Chart } from 'react-chartjs-2';
import type { MonthlySummary, Category } from '../lib/data';
import { formatIdr } from '../lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  TrendingDown,
  TrendingUp,
  ArrowDown,
  ArrowUp,
  Wallet,
  PiggyBank,
  Minus,
  Flame,
  ShieldCheck,
  Scale,
  BarChart3,
  Layers,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import {
  compute503020Allocation,
  computeCashflowMetrics,
  computeMultiPeriodCashflow,
} from '../lib/cashflow-analytics';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface Props {
  summaries: MonthlySummary[];
  categories: Category[];
}

interface WaterfallItem {
  label: string;
  amount: number;
  base: number; // where the bar starts (for floating bars)
  isPositive: boolean;
  isTotal: boolean;
  isSubtotal: boolean;
  color: string;
  type: 'income' | 'category' | 'subtotal' | 'savings';
}

export default function CashFlowWaterfall({ summaries, categories }: Props) {
  const [activeTab, setActiveTab] = useState<'waterfall' | 'trend'>('waterfall');

  const months = useMemo(() => [...summaries].reverse().map((s) => s.month), [summaries]);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    return months[0] ?? '';
  });

  const categoryMap = useMemo(() => {
    const map: Record<string, Category> = {};
    categories.forEach((c) => {
      map[c.name] = c;
    });
    return map;
  }, [categories]);

  const summary = useMemo(() => {
    return summaries.find((s) => s.month === selectedMonth);
  }, [summaries, selectedMonth]);

  // 50/30/20 allocation for selected month
  const allocation = useMemo(() => {
    return compute503020Allocation(summary);
  }, [summary]);

  // Multi-period cashflow data and metrics
  const multiPeriods = useMemo(() => {
    return computeMultiPeriodCashflow(summaries);
  }, [summaries]);

  const metrics = useMemo(() => {
    return computeCashflowMetrics(summaries);
  }, [summaries]);

  // Build waterfall data
  const { items, totalIncome, totalSpent, totalSavings } = useMemo(() => {
    if (!summary || !summary.category_totals) {
      return { items: [], totalIncome: 0, totalSpent: 0, totalSavings: 0 };
    }

    const income = summary.income || 0;
    const cats = summary.category_totals;

    // Sort categories by spend descending
    const sortedCats = Object.entries(cats).sort(([, a], [, b]) => b - a);

    const waterfallItems: WaterfallItem[] = [];

    // 1. Income (starts from 0)
    waterfallItems.push({
      label: '💰 Income',
      amount: income,
      base: 0,
      isPositive: true,
      isTotal: true,
      isSubtotal: false,
      color: '#10b981', // emerald
      type: 'income',
    });

    let running = income;

    // 2. Each category as a decrease
    sortedCats.forEach(([catName, amount]) => {
      const newRunning = running - amount;
      waterfallItems.push({
        label: catName,
        amount: -amount,
        base: newRunning,
        isPositive: false,
        isTotal: false,
        isSubtotal: false,
        color: categoryMap[catName]?.color || '#6366f1',
        type: 'category',
      });
      running = newRunning;
    });

    // 3. Remaining (Savings) - subtotal
    const savings = running;
    waterfallItems.push({
      label: '🏦 Remaining',
      amount: savings,
      base: 0,
      isPositive: savings >= 0,
      isTotal: false,
      isSubtotal: true,
      color: savings >= 0 ? '#10b981' : '#ef4444',
      type: 'savings',
    });

    return {
      items: waterfallItems,
      totalIncome: income,
      totalSpent: sortedCats.reduce((s, [, a]) => s + a, 0),
      totalSavings: savings,
    };
  }, [summary, categoryMap]);

  // Build chart data for Chart.js floating bar
  const chartData = useMemo(() => {
    if (items.length === 0) return null;

    return {
      labels: items.map((i) => i.label),
      datasets: [
        {
          label: 'Cash Flow',
          data: items.map((i) => {
            if (i.isTotal || i.isSubtotal) {
              return [0, i.amount];
            } else {
              const top = i.base + Math.abs(i.amount);
              return [i.base, top];
            }
          }),
          backgroundColor: items.map((i) => {
            if (i.type === 'category') {
              return i.color + 'CC';
            }
            return i.color;
          }),
          borderColor: items.map((i) => i.color),
          borderWidth: 1,
          borderRadius: 4,
          borderSkipped: false,
        },
      ],
    };
  }, [items]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            const item = items[ctx.dataIndex];
            if (!item) return '';
            const val = Math.abs(item.amount);
            if (item.type === 'income') return `Income: ${formatIdr(val)}`;
            if (item.type === 'savings')
              return `Remaining: ${formatIdr(val)} (${
                totalIncome > 0 ? ((val / totalIncome) * 100).toFixed(1) : 0
              }%)`;
            return `${item.label}: -${formatIdr(val)} (${
              totalIncome > 0 ? ((val / totalIncome) * 100).toFixed(1) : 0
            }% of income)`;
          },
          afterLabel: (ctx: any) => {
            const item = items[ctx.dataIndex];
            if (!item) return '';
            if (item.type === 'income') return `Starting point`;
            if (item.type === 'savings') {
              return item.amount >= 0
                ? `Positive savings`
                : `Over budget by ${formatIdr(Math.abs(item.amount))}`;
            }
            const catLimit = categoryMap[item.label]?.monthly_limit ?? 0;
            if (catLimit > 0) {
              const pct = ((Math.abs(item.amount) / catLimit) * 100).toFixed(0);
              return `Budget: ${formatIdr(catLimit)} (${pct}% used)`;
            }
            return `No budget limit set`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: any) => {
            if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
            if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
            return value;
          },
        },
      },
      x: {
        ticks: {
          maxRotation: 45,
          minRotation: 30,
          font: { size: 11 },
        },
      },
    },
  };

  // Multi-period Trend Chart Data (Bar & Line combo)
  const trendChartData = useMemo(() => {
    if (multiPeriods.length === 0) return null;

    return {
      labels: multiPeriods.map((p) => p.month),
      datasets: [
        {
          type: 'bar' as const,
          label: 'Inflow (Income)',
          data: multiPeriods.map((p) => p.inflow),
          backgroundColor: 'rgba(52, 211, 153, 0.85)', // mint
          borderColor: 'rgb(16, 185, 129)',
          borderWidth: 1,
          borderRadius: 6,
          order: 2,
        },
        {
          type: 'bar' as const,
          label: 'Outflow (Spending)',
          data: multiPeriods.map((p) => p.outflow),
          backgroundColor: 'rgba(248, 113, 113, 0.85)', // coral
          borderColor: 'rgb(239, 68, 68)',
          borderWidth: 1,
          borderRadius: 6,
          order: 2,
        },
        {
          type: 'line' as const,
          label: 'Net Cash Flow',
          data: multiPeriods.map((p) => p.netFlow),
          borderColor: '#38bdf8', // sky-400
          backgroundColor: '#38bdf8',
          borderWidth: 2.5,
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.2,
          order: 1,
        },
      ],
    };
  }, [multiPeriods]);

  const trendChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          boxWidth: 12,
          padding: 14,
          font: { size: 12 },
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx: any) => `${ctx.dataset.label}: ${formatIdr(ctx.parsed.y)}`,
        },
      },
    },
    scales: {
      y: {
        ticks: {
          callback: (value: any) => {
            if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
            if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
            return value;
          },
        },
      },
      x: {
        ticks: {
          font: { size: 11 },
        },
      },
    },
  };

  const savingsRate = totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0;

  const largestCategory = useMemo(() => {
    if (!summary?.category_totals) return null;
    let max = { name: '', amount: 0 };
    Object.entries(summary.category_totals).forEach(([cat, amount]) => {
      if (amount > max.amount) max = { name: cat, amount };
    });
    return max.name ? max : null;
  }, [summary]);

  const overBudgetCategories = useMemo(() => {
    if (!summary?.category_totals) return [];
    return Object.entries(summary.category_totals)
      .filter(([cat, amount]) => {
        const limit = categoryMap[cat]?.monthly_limit ?? 0;
        return limit > 0 && amount > limit;
      })
      .map(([cat, amount]) => ({
        name: cat,
        amount,
        limit: categoryMap[cat].monthly_limit,
        over: amount - categoryMap[cat].monthly_limit,
      }));
  }, [summary, categoryMap]);

  const categoryBreakdown = useMemo(() => {
    if (!summary?.category_totals) return [];
    return Object.entries(summary.category_totals)
      .sort(([, a], [, b]) => b - a)
      .map(([cat, amount]) => ({
        name: cat,
        amount,
        pct: totalSpent > 0 ? (amount / totalSpent) * 100 : 0,
        color: categoryMap[cat]?.color,
        limit: categoryMap[cat]?.monthly_limit ?? 0,
      }));
  }, [summary, totalSpent, categoryMap]);

  return (
    <div className="space-y-6">
      {/* Top Controls: View Tabs + Month Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* View Mode Toggle Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-white/[0.06] w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('waterfall')}
            className={`flex items-center gap-2 px-3.5 py-2 min-h-[44px] rounded-lg text-sm font-medium transition-all ${
              activeTab === 'waterfall'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4 text-mint-500" />
            Waterfall View
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('trend')}
            className={`flex items-center gap-2 px-3.5 py-2 min-h-[44px] rounded-lg text-sm font-medium transition-all ${
              activeTab === 'trend'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-sky-500" />
            Trend & History
          </button>
        </div>

        {/* Month Selector (only in waterfall mode) */}
        {activeTab === 'waterfall' && (
          <div className="flex items-center gap-2.5">
            <Label className="text-sm font-medium text-slate-600 dark:text-slate-300">Period:</Label>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[180px] min-h-[44px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* VIEW 1: WATERFALL VIEW */}
      {activeTab === 'waterfall' && (
        <>
          {!summary ? (
            <div className="glass-card p-5">
              <div className="space-y-2">
                <p>Belum ada transaksi di bulan ini, jadi aliran kas belum bisa digambar.</p>
                <a
                  href="/add"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-mint-600 dark:text-mint-400 hover:underline min-h-[44px]"
                >
                  Tambah transaksi pertama
                </a>
              </div>
            </div>
          ) : (
            <>
              {/* Top Stats Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="glass-card p-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                      <Wallet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Income</p>
                      <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatIdr(totalIncome)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="glass-card p-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                      <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Spent</p>
                      <p className="text-lg font-semibold text-red-600 dark:text-red-400">
                        {formatIdr(totalSpent)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {totalIncome > 0 ? `${((totalSpent / totalIncome) * 100).toFixed(1)}% of income` : ''}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="glass-card p-5">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        totalSavings >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'
                      }`}
                    >
                      <PiggyBank
                        className={`w-5 h-5 ${
                          totalSavings >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                        }`}
                      />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Remaining</p>
                      <p
                        className={`text-lg font-semibold ${
                          totalSavings >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {formatIdr(totalSavings)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Savings rate: {savingsRate.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>

                <div className="glass-card p-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700">
                      <Minus className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Categories</p>
                      <p className="text-lg font-semibold">{categoryBreakdown.length}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {largestCategory ? `Largest: ${largestCategory.name}` : '-'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 50/30/20 Allocation Rule Card */}
              <div className="glass-card p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <div>
                    <h3 className="text-base font-semibold flex items-center gap-2 text-slate-800 dark:text-white/90">
                      <Scale className="w-4 h-4 text-mint-500" />
                      50/30/20 Cash Allocation Rule
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Formula keuangan sehat: 50% Kebutuhan (Needs), 30% Keinginan (Wants), 20% Tabungan dan Investasi (Savings).
                    </p>
                  </div>
                </div>

                {/* 3 Buckets Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  {/* Needs */}
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Needs (Kebutuhan)</span>
                      <Badge
                        variant={allocation.status.needs === 'good' ? 'secondary' : 'destructive'}
                        className="text-[10px] px-1.5 py-0"
                      >
                        {allocation.status.needs === 'good' ? 'Target <=50%' : 'Over Target'}
                      </Badge>
                    </div>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">
                      {allocation.needsPct}%
                    </p>
                    <p className="text-xs text-muted-foreground">{formatIdr(allocation.needsAmount)}</p>
                  </div>

                  {/* Wants */}
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Wants (Keinginan)</span>
                      <Badge
                        variant={allocation.status.wants === 'good' ? 'secondary' : 'destructive'}
                        className="text-[10px] px-1.5 py-0"
                      >
                        {allocation.status.wants === 'good' ? 'Target <=30%' : 'Over Target'}
                      </Badge>
                    </div>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">
                      {allocation.wantsPct}%
                    </p>
                    <p className="text-xs text-muted-foreground">{formatIdr(allocation.wantsAmount)}</p>
                  </div>

                  {/* Savings */}
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Savings & Invest</span>
                      <Badge
                        variant={allocation.status.savings === 'good' ? 'secondary' : 'destructive'}
                        className="text-[10px] px-1.5 py-0"
                      >
                        {allocation.status.savings === 'good' ? 'Target >=20%' : 'Low Target'}
                      </Badge>
                    </div>
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      {allocation.savingsPct}%
                    </p>
                    <p className="text-xs text-muted-foreground">{formatIdr(allocation.savingsAmount)}</p>
                  </div>
                </div>

                {/* Combined Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex h-3 w-full rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700">
                    <div
                      style={{ width: `${Math.min(100, allocation.needsPct)}%` }}
                      className="bg-blue-500 transition-all"
                      title={`Needs: ${allocation.needsPct}%`}
                    />
                    <div
                      style={{ width: `${Math.min(100 - allocation.needsPct, allocation.wantsPct)}%` }}
                      className="bg-coral-500 transition-all"
                      title={`Wants: ${allocation.wantsPct}%`}
                    />
                    <div
                      style={{
                        width: `${Math.min(
                          100 - allocation.needsPct - allocation.wantsPct,
                          allocation.savingsPct
                        )}%`,
                      }}
                      className="bg-emerald-500 transition-all"
                      title={`Savings: ${allocation.savingsPct}%`}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-muted-foreground pt-1">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                      Needs ({allocation.needsPct}%)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-coral-500 inline-block" />
                      Wants ({allocation.wantsPct}%)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                      Savings ({allocation.savingsPct}%)
                    </span>
                  </div>
                </div>

                {/* Recommendation insight */}
                <div className="mt-3.5 p-3 rounded-lg bg-mint-500/10 border border-mint-500/20 text-xs text-slate-700 dark:text-mint-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-mint-500 shrink-0" />
                  <span>{allocation.recommendation}</span>
                </div>
              </div>

              {/* Over Budget Warnings */}
              {overBudgetCategories.length > 0 && (
                <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 p-4">
                  <p className="text-sm font-semibold text-red-800 dark:text-red-300 mb-2">
                    ⚠️ Over Budget Categories
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {overBudgetCategories.map((cat) => (
                      <Badge key={cat.name} variant="destructive" className="text-xs">
                        {cat.name}: over by {formatIdr(cat.over)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Waterfall Chart */}
              {chartData && items.length > 1 && (
                <div className="glass-card p-5">
                  <h3 className="text-base font-semibold flex items-center gap-2 text-slate-800 dark:text-white/80">
                    <ArrowDown className="w-4 h-4 text-slate-500" />
                    Cash Flow Waterfall: {selectedMonth}
                  </h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    Aliran pemasukan mengalir melalui pos pengeluaran kategori hingga sisa kas akhir periode.
                  </p>
                  <div className="relative" style={{ height: Math.max(300, items.length * 30 + 100) }}>
                    <Bar data={chartData} options={chartOptions} />
                  </div>
                </div>
              )}

              {/* Detailed Breakdown Table */}
              <div className="glass-card p-5">
                <h3 className="text-base font-semibold flex items-center gap-2 text-slate-800 dark:text-white/80 mb-3">
                  <TrendingDown className="w-4 h-4 text-slate-500" />
                  Detailed Breakdown
                </h3>
                <div className="space-y-2">
                  {/* Income Row */}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                    <span className="text-lg">💰</span>
                    <span className="flex-1 font-medium text-sm">Total Income</span>
                    <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatIdr(totalIncome)}
                    </span>
                    <span className="text-xs text-muted-foreground w-12 text-right">100%</span>
                  </div>

                  <div className="flex items-center gap-2 px-3">
                    <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                    <ArrowDown className="w-3 h-3 text-slate-500" />
                  </div>

                  {/* Category Rows */}
                  {categoryBreakdown.map((cat) => {
                    const isOverBudget = cat.limit > 0 && cat.amount > cat.limit;
                    return (
                      <div
                        key={cat.name}
                        className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      >
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color || '#94a3b8' }}
                        />
                        <span className="flex-1 font-medium text-sm truncate">{cat.name}</span>
                        <span
                          className={`text-sm font-semibold ${
                            isOverBudget ? 'text-red-600 dark:text-red-400' : ''
                          }`}
                        >
                          -{formatIdr(cat.amount)}
                        </span>
                        <span className="text-xs text-muted-foreground w-12 text-right">
                          {cat.pct.toFixed(1)}%
                        </span>
                        {isOverBudget && (
                          <Badge variant="destructive" className="text-[11px] px-1.5 py-0">
                            Over
                          </Badge>
                        )}
                      </div>
                    );
                  })}

                  <div className="flex items-center gap-2 px-3">
                    <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                    <ArrowUp className="w-3 h-3 text-slate-500" />
                  </div>

                  {/* Remaining Row */}
                  <div
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      totalSavings >= 0
                        ? 'bg-emerald-50 dark:bg-emerald-900/20'
                        : 'bg-red-50 dark:bg-red-900/20'
                    }`}
                  >
                    <span className="text-lg">🏦</span>
                    <span className="flex-1 font-medium text-sm">Remaining (Savings)</span>
                    <span
                      className={`text-sm font-semibold ${
                        totalSavings >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {formatIdr(totalSavings)}
                    </span>
                    <span
                      className={`text-xs w-12 text-right ${
                        totalSavings >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {savingsRate.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Savings Rate Bar */}
              <div className="glass-card p-5">
                <h3 className="text-base font-semibold flex items-center gap-2 text-slate-800 dark:text-white/80">
                  <PiggyBank className="w-4 h-4 text-slate-500" />
                  Savings Rate Indicator
                </h3>
                <div className="space-y-3 mt-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Savings Rate</span>
                    <span
                      className={`font-semibold ${
                        savingsRate < 0
                          ? 'text-red-600 dark:text-red-400'
                          : savingsRate < 20
                          ? 'text-gold-600 dark:text-gold-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {savingsRate.toFixed(1)}%
                    </span>
                  </div>

                  <div className="relative w-full h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="absolute inset-0 bg-red-200 dark:bg-red-900/30" style={{ width: '10%' }} />
                    <div
                      className="absolute inset-0 bg-gold-400/20 dark:bg-gold-700/20"
                      style={{ left: '10%', width: '10%' }}
                    />
                    <div
                      className={`absolute top-0 left-0 h-full rounded-full transition-all ${
                        savingsRate < 0
                          ? 'bg-red-500'
                          : savingsRate < 20
                          ? 'bg-gold-500/50'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, savingsRate))}%` }}
                    />
                    <div
                      className="absolute top-0 h-full w-0.5 bg-slate-400 dark:bg-slate-500"
                      style={{ left: '20%' }}
                      title="20% target"
                    />
                  </div>

                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>0%</span>
                    <span className="text-red-500">Risky</span>
                    <span className="text-gold-500">Caution</span>
                    <span className="text-emerald-500">20% target</span>
                    <span>100%</span>
                  </div>

                  {savingsRate < 0 && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                      ⚠️ Pengeluaran melebihi pemasukan bulan ini. Evaluasi pos kategori pengeluaran terbesar di atas.
                    </p>
                  )}
                  {savingsRate >= 0 && savingsRate < 20 && (
                    <p className="text-xs text-gold-600 dark:text-gold-400 mt-2">
                      💡 Rasio tabungan di bawah anjuran 20%. Pertimbangkan pengurangan pos belanja sekunder.
                    </p>
                  )}
                  {savingsRate >= 20 && savingsRate < 50 && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">
                      ✅ Rasio tabungan baik dan berada di jalur kebiasaan finansial yang sehat.
                    </p>
                  )}
                  {savingsRate >= 50 && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">
                      🎉 Rasio tabungan istimewa di atas 50%. Pertumbuhan aset berlangsung sangat pesat.
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* VIEW 2: MULTI-PERIOD TREND & HISTORY */}
      {activeTab === 'trend' && (
        <>
          {/* Health Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Surplus Streak */}
            <div className="glass-card p-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gold-100 dark:bg-gold-900/30">
                  <Flame className="w-5 h-5 text-gold-600 dark:text-gold-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Surplus Streak</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">
                    {metrics.surplusStreak} Bulan
                  </p>
                  <p className="text-[11px] text-muted-foreground">Berturut-turut surplus kas</p>
                </div>
              </div>
            </div>

            {/* Inflow / Outflow Ratio */}
            <div className="glass-card p-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Inflow / Outflow Ratio</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">
                    {metrics.inflowOutflowRatio}x
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {metrics.inflowOutflowRatio >= 1.2
                      ? 'Safety buffer sehat'
                      : metrics.inflowOutflowRatio >= 1.0
                      ? 'Cash flow positif'
                      : 'Defisit'}
                  </p>
                </div>
              </div>
            </div>

            {/* Average Monthly Net Flow */}
            <div className="glass-card p-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-sky-100 dark:bg-sky-900/30">
                  <Wallet className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Avg Net Cashflow</p>
                  <p
                    className={`text-lg font-bold ${
                      metrics.avgMonthlyNetFlow >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {formatIdr(metrics.avgMonthlyNetFlow)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Rata-rata surplus per bulan</p>
                </div>
              </div>
            </div>

            {/* Total Net Accumulated */}
            <div className="glass-card p-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-mint-100 dark:bg-mint-900/30">
                  <PiggyBank className="w-5 h-5 text-mint-600 dark:text-mint-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Net Accumulated</p>
                  <p
                    className={`text-lg font-bold ${
                      metrics.totalNetAccumulated >= 0
                        ? 'text-mint-600 dark:text-mint-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {formatIdr(metrics.totalNetAccumulated)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Dari {metrics.periodsCount} periode
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Multi-Period Combo Chart */}
          {trendChartData && (
            <div className="glass-card p-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-semibold flex items-center gap-2 text-slate-800 dark:text-white/80">
                  <BarChart3 className="w-4 h-4 text-sky-500" />
                  Historical Cash Flow Trend
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Grafik komparasi Inflow (pemasukan), Outflow (pengeluaran), dan garis Net Cash Flow antar periode.
              </p>
              <div className="relative" style={{ height: 340 }}>
                <Chart type="bar" data={trendChartData} options={trendChartOptions} />
              </div>
            </div>
          )}

          {/* Multi-Period Table */}
          <div className="glass-card p-5">
            <h3 className="text-base font-semibold flex items-center gap-2 text-slate-800 dark:text-white/80 mb-3">
              <Layers className="w-4 h-4 text-slate-500" />
              Cash Flow Period History
            </h3>

            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Periode</TableHead>
                    <TableHead className="text-right">Inflow (Pemasukan)</TableHead>
                    <TableHead className="text-right">Outflow (Pengeluaran)</TableHead>
                    <TableHead className="text-right">Net Flow</TableHead>
                    <TableHead className="text-right">Savings Rate</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...multiPeriods].reverse().map((p) => (
                    <TableRow key={p.period_id}>
                      <TableCell className="font-medium text-slate-900 dark:text-white">
                        {p.month}
                      </TableCell>
                      <TableCell className="text-right text-emerald-600 dark:text-emerald-400 font-semibold">
                        {formatIdr(p.inflow)}
                      </TableCell>
                      <TableCell className="text-right text-red-600 dark:text-red-400 font-medium">
                        {formatIdr(p.outflow)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-semibold ${
                          p.netFlow >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {formatIdr(p.netFlow)}
                      </TableCell>
                      <TableCell className="text-right text-slate-700 dark:text-slate-300">
                        {p.savingsRatePct}%
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={p.isSurplus ? 'secondary' : 'destructive'}
                          className="text-xs"
                        >
                          {p.isSurplus ? 'Surplus' : 'Deficit'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card List */}
            <div className="sm:hidden space-y-3">
              {[...multiPeriods].reverse().map((p) => (
                <div
                  key={p.period_id}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-slate-900 dark:text-white">
                      {p.month}
                    </span>
                    <Badge variant={p.isSurplus ? 'secondary' : 'destructive'} className="text-[11px]">
                      {p.isSurplus ? 'Surplus' : 'Deficit'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200/60 dark:border-white/[0.05]">
                    <div>
                      <p className="text-muted-foreground">Inflow</p>
                      <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatIdr(p.inflow)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Outflow</p>
                      <p className="font-semibold text-red-600 dark:text-red-400">
                        {formatIdr(p.outflow)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Net Flow</p>
                      <p
                        className={`font-semibold ${
                          p.netFlow >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {formatIdr(p.netFlow)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Savings Rate</p>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {p.savingsRatePct}%
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
