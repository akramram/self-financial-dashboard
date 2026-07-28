import React, { useState, useMemo, useEffect } from 'react';
import { formatIdr } from '../lib/utils';
import {
  RefreshCw,
  Calendar,
  TrendingDown,
  DollarSign,
  PieChart,
  Clock,
  ArrowRight,
  Lightbulb,
} from 'lucide-react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

ChartJS.register(ArcElement, Tooltip, Legend);

// ─── Data shapes (match getRecurringCostAnalysis in db.ts) ──────────────────
interface RecurringCostItem {
  id: number;
  title: string;
  category: string;
  amount: number;
  type: 'cash' | 'credit_expense' | 'credit_payment';
  active: boolean;
  end_date: string | null;
  isTemporary: boolean;
}

interface RecurringCostResult {
  items: RecurringCostItem[];
  activeItems: RecurringCostItem[];
  pausedItems: RecurringCostItem[];
  monthlyTotal: number;
  annualTotal: number;
  monthlyByCategory: Record<string, number>;
  monthlyByType: { cash: number; credit_expense: number; credit_payment: number };
  categoryCount: number;
  activeCount: number;
  temporaryCount: number;
  largestItem: RecurringCostItem | null;
  avgPerItem: number;
}

// ─── Category color palette (maximally distinct) ────────────────────────────
const PALETTE = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#d946ef', '#22c55e', '#eab308', '#64748b',
  '#a855f7', '#e11d48', '#0ea5e9',
];

function getCategoryColor(idx: number): string {
  return PALETTE[idx % PALETTE.length];
}

function formatEndDate(endDate: string | null): string {
  if (!endDate) return 'Permanent';
  return `Until ${endDate}`;
}

export default function RecurringCostAnalyzer() {
  const [data, setData] = useState<RecurringCostResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPaused, setShowPaused] = useState(false);

  useEffect(() => {
    fetch('/api/recurring-cost')
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // ─── Hooks must all fire before any early return ───────────────────────────
  const categoryEntries = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.monthlyByCategory)
      .sort(([, a], [, b]) => b - a);
  }, [data]);

  const displayItems = useMemo(() => {
    if (!data) return [];
    return showPaused ? data.items : data.activeItems;
  }, [data, showPaused]);

  const donutData = useMemo(() => {
    if (categoryEntries.length === 0) return null;
    return {
      labels: categoryEntries.map(([cat]) => cat),
      datasets: [
        {
          data: categoryEntries.map(([, amt]) => amt),
          backgroundColor: categoryEntries.map((_, i) => getCategoryColor(i)),
          borderColor: categoryEntries.map((_, i) => getCategoryColor(i)),
          borderWidth: 2,
        },
      ],
    };
  }, [categoryEntries]);

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false as const,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          boxWidth: 12,
          font: { size: 11 },
          color: undefined,
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            const val = ctx.parsed as number;
            const pct = data && data.monthlyTotal > 0
              ? ((val / data.monthlyTotal) * 100).toFixed(1)
              : '0';
            return `${formatIdr(val)} (${pct}%)`;
          },
        },
      },
    },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!data || data.activeItems.length === 0) {
    return (
      <div className="glass-card p-5">
        <RefreshCw className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          <p className="text-slate-500 dark:text-slate-400">
            No active recurring transactions found.
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Add recurring transactions on the <a href="/recurring" className="text-mint-500 hover:underline">Recurring page</a> to see your subscription cost analysis.
          </p>
        </div>
    );
  }

  const { monthlyTotal, annualTotal, activeCount, temporaryCount, largestItem, avgPerItem } = data;

  return (
    <div className="space-y-6">
      {/* ─── Summary Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Monthly Cost</span>
              <DollarSign className="w-4 h-4 text-mint-500" />
            </div>
            <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{formatIdr(monthlyTotal)}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">per salary period</p>
          </div>

        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Annual Cost</span>
              <Calendar className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{formatIdr(annualTotal)}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">projected per year</p>
          </div>

        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Items</span>
              <RefreshCw className="w-4 h-4 text-gold-500" />
            </div>
            <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{activeCount}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {temporaryCount > 0 ? `${temporaryCount} temporary` : 'all permanent'}
            </p>
          </div>

        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Avg / Item</span>
              <PieChart className="w-4 h-4 text-gold-500" />
            </div>
            <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{formatIdr(avgPerItem)}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">monthly average</p>
          </div>
      </div>

      {/* ─── Category Breakdown + Insight ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut chart */}
        <div className="glass-card p-5">
          <h3 className="text-sm flex items-center gap-2 text-white/80">
              <PieChart className="w-4 h-4 text-slate-500" />
              Category Breakdown
            </h3>
          {donutData && (
              <div style={{ height: 300 }}>
                <Doughnut data={donutData} options={donutOptions} />
              </div>
            )}
          </div>

        {/* Insights */}
        <div className="glass-card p-5">
          <h3 className="text-sm flex items-center gap-2 text-white/80">
              <Lightbulb className="w-4 h-4 text-gold-500" />
              Cost Insights
            </h3>
          {largestItem && (
              <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Largest Recurring Cost</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  <span className="font-medium">{largestItem.title}</span> —{' '}
                  <span className="font-semibold text-red-600 dark:text-red-400">{formatIdr(largestItem.amount)}</span>/month
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  That's {formatIdr(largestItem.amount * 12)}/year — {((largestItem.amount / monthlyTotal) * 100).toFixed(0)}% of your recurring total.
                </p>
              </div>
            )}

            <div className="rounded-lg bg-mint-500/5 dark:bg-mint-700/20 p-3 border border-mint-400/20 dark:border-mint-700/40">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-3.5 h-3.5 text-mint-500" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Time Equivalence</span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Your recurring costs total <span className="font-semibold">{formatIdr(monthlyTotal)}</span>/month.
                Cancelling all of them would save <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatIdr(annualTotal)}</span> per year.
              </p>
            </div>

            {/* Top 3 categories by cost */}
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-200 dark:border-slate-700">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-2 block">Top Categories</span>
              <div className="space-y-1.5">
                {categoryEntries.slice(0, 3).map(([cat, amt], i) => (
                  <div key={cat} className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: getCategoryColor(i) }}
                    />
                    <span className="text-xs text-slate-600 dark:text-slate-300 flex-1">{cat}</span>
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{formatIdr(amt)}</span>
                    <span className="text-[10px] text-slate-400 w-10 text-right">
                      {((amt / monthlyTotal) * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
      </div>

      {/* ─── Category Bars ──────────────────────────────────────────────────── */}
      <div className="glass-card p-5">
        <h3 className="text-sm text-white/80">Category Cost Breakdown</h3>
        <div className="space-y-3">
            {categoryEntries.map(([cat, amt], i) => {
              const pct = ((amt / monthlyTotal) * 100);
              return (
                <div key={cat}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600 dark:text-slate-300">{cat}</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {formatIdr(amt)}
                      <span className="text-slate-400 font-normal ml-1.5">({pct.toFixed(1)}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                    <div
                      className="h-2.5 rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: getCategoryColor(i) }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      {/* ─── Items Table ─────────────────────────────────────────────────────── */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between">
            <h3 className="text-sm flex items-center gap-2 text-white/80">
              Recurring Items
              <Badge variant="secondary" className="text-xs">{displayItems.length}</Badge>
            </h3>
            {data.pausedItems.length > 0 && (
              <button
                onClick={() => setShowPaused(!showPaused)}
                className="text-xs text-mint-500 hover:text-mint-600 font-medium flex items-center gap-1"
              >
                {showPaused ? 'Show active only' : `Show paused (${data.pausedItems.length})`}
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Monthly</TableHead>
                <TableHead className="text-right">Annual</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>% of Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayItems.map((item) => {
                const pctOfTotal = monthlyTotal > 0 ? (item.amount / monthlyTotal) * 100 : 0;
                const typeLabel = item.type === 'cash' ? 'Cash' : item.type === 'credit_payment' ? 'CC Pay' : 'Credit';
                return (
                  <TableRow key={item.id} className={item.active ? '' : 'opacity-50'}>
                    <TableCell className="font-medium">
                      {item.title}
                      {!item.active && (
                        <Badge variant="outline" className="ml-2 text-[10px] h-4">Paused</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-500 dark:text-slate-400">{item.category}</TableCell>
                    <TableCell className="text-right font-semibold">{formatIdr(item.amount)}</TableCell>
                    <TableCell className="text-right text-slate-500 dark:text-slate-400">{formatIdr(item.amount * 12)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {typeLabel}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 dark:text-slate-400">
                      {item.isTemporary ? (
                        <span className="text-gold-600 dark:text-gold-400">{formatEndDate(item.end_date)}</span>
                      ) : (
                        formatEndDate(item.end_date)
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                          <div
                            className="bg-slate-400 dark:bg-slate-500 h-1.5 rounded-full"
                            style={{ width: `${Math.min(100, pctOfTotal)}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-slate-500 w-8">{pctOfTotal.toFixed(0)}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
    </div>
  );
}
