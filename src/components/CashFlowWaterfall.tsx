import React, { useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
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
import { TrendingDown, ArrowDown, ArrowUp, Wallet, PiggyBank, Minus } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

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
  const months = useMemo(() => [...summaries].reverse().map((s) => s.month), [summaries]);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    // Default to latest month
    return months[0] ?? '';
  });

  const categoryMap = useMemo(() => {
    const map: Record<string, Category> = {};
    categories.forEach((c) => { map[c.name] = c; });
    return map;
  }, [categories]);

  const summary = useMemo(() => {
    return summaries.find((s) => s.month === selectedMonth);
  }, [summaries, selectedMonth]);

  // Build waterfall data
  const { items, totalIncome, totalSpent, totalSavings } = useMemo(() => {
    if (!summary || !summary.category_totals) {
      return { items: [], totalIncome: 0, totalSpent: 0, totalSavings: 0 };
    }

    const income = summary.income || 0;
    const cats = summary.category_totals;

    // Sort categories by spend descending
    const sortedCats = Object.entries(cats)
      .sort(([, a], [, b]) => b - a);

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

    // 3. Remaining (Savings) — subtotal
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
              // Full bar from 0 to amount
              return [0, i.amount];
            } else {
              // Floating bar: category decrease
              const top = i.base + Math.abs(i.amount);
              return [i.base, top];
            }
          }),
          backgroundColor: items.map((i) => {
            // Slightly transparent for categories
            if (i.type === 'category') {
              return i.color + 'CC'; // 80% opacity
            }
            return i.color;
          }),
          borderColor: items.map((i) => i.color),
          borderWidth: 1,
          borderRadius: 4,
          borderSkipped: false,
        },
        // Connector lines (thin invisible dataset to simulate connectors)
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
            if (item.type === 'savings') return `Remaining: ${formatIdr(val)} (${totalIncome > 0 ? ((val / totalIncome) * 100).toFixed(1) : 0}%)`;
            return `${item.label}: -${formatIdr(val)} (${totalIncome > 0 ? ((val / totalIncome) * 100).toFixed(1) : 0}% of income)`;
          },
          afterLabel: (ctx: any) => {
            const item = items[ctx.dataIndex];
            if (!item) return '';
            if (item.type === 'income') return `Starting point`;
            if (item.type === 'savings') {
              return item.amount >= 0
                ? `✅ Positive savings`
                : `⚠️ Over budget by ${formatIdr(Math.abs(item.amount))}`;
            }
            const catLimit = categoryMap[item.label]?.monthly_limit ?? 0;
            if (catLimit > 0) {
              const pct = (Math.abs(item.amount) / catLimit * 100).toFixed(0);
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

  const savingsRate = totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0;

  // Summary stats
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

  // Percent of total spending per category (for the summary list)
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
      {/* Month Selector */}
      <div className="flex items-center gap-3">
        <Label className="text-sm font-medium text-slate-600 dark:text-slate-300">Month:</Label>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!summary ? (
        <div className="glass-card p-5">
          <p>No data available for the selected month.</p>
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
                    <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">{formatIdr(totalIncome)}</p>
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
                    <p className="text-lg font-semibold text-red-600 dark:text-red-400">{formatIdr(totalSpent)}</p>
                    <p className="text-[10px] text-muted-foreground">{totalIncome > 0 ? `${((totalSpent / totalIncome) * 100).toFixed(1)}% of income` : ''}</p>
                  </div>
                </div>
              </div>
            <div className="glass-card p-5">
              <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${totalSavings >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                    <PiggyBank className={`w-5 h-5 ${totalSavings >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Remaining</p>
                    <p className={`text-lg font-semibold ${totalSavings >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {formatIdr(totalSavings)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Savings rate: {savingsRate.toFixed(1)}%</p>
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
                    <p className="text-[10px] text-muted-foreground">
                      {largestCategory ? `Largest: ${largestCategory.name}` : '—'}
                    </p>
                  </div>
                </div>
              </div>
          </div>

          {/* Over Budget Warnings */}
          {overBudgetCategories.length > 0 && (
            <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 p-4">
              <p className="text-sm font-semibold text-red-800 dark:text-red-300 mb-2">⚠️ Over Budget Categories</p>
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
              <h3 className="text-base font-semibold flex items-center gap-2 text-white/80">
                  <ArrowDown className="w-4 h-4 text-slate-500" />
                  Cash Flow Waterfall — {selectedMonth}
                </h3>
              <p className="text-xs text-muted-foreground mb-4">
                  Shows how your income flows through each spending category to your remaining savings.
                  Green bars increase your balance; colored bars show category spending; the final bar shows what's left.
                </p>
                <div className="relative" style={{ height: Math.max(300, items.length * 30 + 100) }}>
                  <Bar data={chartData} options={chartOptions} />
                </div>
              </div>
          )}

          {/* Detailed Breakdown Table */}
          <div className="glass-card p-5">
            <h3 className="text-base font-semibold flex items-center gap-2 text-white/80">
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
                  <ArrowDown className="w-3 h-3 text-slate-400" />
                </div>

                {/* Category Rows */}
                {categoryBreakdown.map((cat) => {
                  const isOverBudget = cat.limit > 0 && cat.amount > cat.limit;
                  return (
                    <div key={cat.name} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color || '#94a3b8' }}
                      />
                      <span className="flex-1 font-medium text-sm truncate">{cat.name}</span>
                      <span className={`text-sm font-semibold ${isOverBudget ? 'text-red-600 dark:text-red-400' : ''}`}>
                        -{formatIdr(cat.amount)}
                      </span>
                      <span className="text-xs text-muted-foreground w-12 text-right">
                        {cat.pct.toFixed(1)}%
                      </span>
                      {isOverBudget && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Over</Badge>
                      )}
                    </div>
                  );
                })}

                <div className="flex items-center gap-2 px-3">
                  <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                  <ArrowUp className="w-3 h-3 text-slate-400" />
                </div>

                {/* Remaining Row */}
                <div className={`flex items-center gap-3 p-3 rounded-lg ${totalSavings >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                  <span className="text-lg">🏦</span>
                  <span className="flex-1 font-medium text-sm">Remaining (Savings)</span>
                  <span className={`text-sm font-semibold ${totalSavings >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatIdr(totalSavings)}
                  </span>
                  <span className={`text-xs w-12 text-right ${totalSavings >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {savingsRate.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

          {/* Savings Rate Bar */}
          <div className="glass-card p-5">
            <h3 className="text-base font-semibold flex items-center gap-2 text-white/80">
                <PiggyBank className="w-4 h-4 text-slate-500" />
                Savings Rate Indicator
              </h3>
            <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Savings Rate</span>
                  <span className={`font-semibold ${savingsRate < 0 ? 'text-red-600 dark:text-red-400' : savingsRate < 20 ? 'text-gold-600 dark:text-gold-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {savingsRate.toFixed(1)}%
                  </span>
                </div>
                {/* Visual progress bar with zones */}
                <div className="relative w-full h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  {/* Danger zone (0-10%) */}
                  <div className="absolute inset-0 bg-red-200 dark:bg-red-900/30" style={{ width: '10%' }} />
                  {/* Warning zone (10-20%) */}
                  <div className="absolute inset-0 bg-gold-400/20 dark:bg-gold-700/20" style={{ left: '10%', width: '10%' }} />
                  {/* Current savings bar */}
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
                  {/* Markers */}
                  <div className="absolute top-0 h-full w-0.5 bg-slate-400 dark:bg-slate-500" style={{ left: '20%' }} title="20% target" />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>0%</span>
                  <span className="text-red-500">Risky</span>
                  <span className="text-gold-500">Caution</span>
                  <span className="text-emerald-500" style={{ position: 'relative', left: '0%' }}>20% target</span>
                  <span>100%</span>
                </div>

                {savingsRate < 0 && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                    ⚠️ You're spending more than you earn! Review your largest categories above.
                  </p>
                )}
                {savingsRate >= 0 && savingsRate < 20 && (
                  <p className="text-xs text-gold-600 dark:text-gold-400 mt-2">
                    💡 Your savings rate is below the recommended 20%. Consider reducing spending in your top categories.
                  </p>
                )}
                {savingsRate >= 20 && savingsRate < 50 && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">
                    ✅ Good savings rate! You're on track with healthy financial habits.
                  </p>
                )}
                {savingsRate >= 50 && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">
                    🎉 Excellent savings rate above 50%! You're building wealth rapidly.
                  </p>
                )}
              </div>
            </div>
        </>
      )}
    </div>
  );
}
