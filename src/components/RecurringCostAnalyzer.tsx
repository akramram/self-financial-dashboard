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
  ShieldCheck,
  CreditCard,
  Layers,
} from 'lucide-react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
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

ChartJS.register(ArcElement, Tooltip, Legend);

// ─── Data shapes (matches getRecurringCostAnalysis in db.ts) ──────────────────
export interface RecurringCostItem {
  id: number;
  title: string;
  cleanTitle?: string;
  category: string;
  amount: number;
  type: 'cash' | 'credit_expense' | 'credit_payment';
  active: boolean;
  end_date: string | null;
  created_at?: string;
  isTemporary: boolean;
  isInstallment?: boolean;
  totalTenor?: number | null;
  currentTenor?: number | null;
  remainingTenor?: number | null;
  remainingLiability?: number | null;
}

export interface RecurringCostResult {
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
  subscriptionMonthlyTotal?: number;
  installmentMonthlyTotal?: number;
  totalRemainingLiability?: number;
  postInstallmentRunRate?: number;
  installmentCount?: number;
  subscriptionCount?: number;
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

function formatDurationInfo(item: RecurringCostItem): { label: string; badge?: string } {
  if (item.totalTenor && item.currentTenor) {
    const remaining = item.remainingTenor ?? Math.max(1, item.totalTenor - item.currentTenor + 1);
    return {
      label: `Tenor ${item.currentTenor}/${item.totalTenor}`,
      badge: `${remaining} mo left`,
    };
  }
  if (item.end_date) {
    return {
      label: `Until ${item.end_date}`,
      badge: item.remainingTenor ? `${item.remainingTenor} mo left` : undefined,
    };
  }
  if (item.isInstallment) {
    return { label: 'Cicilan Berjalan' };
  }
  return { label: 'Permanent' };
}

export default function RecurringCostAnalyzer() {
  const [data, setData] = useState<RecurringCostResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPaused, setShowPaused] = useState(false);
  const [filterTab, setFilterTab] = useState<'all' | 'subscriptions' | 'installments'>('all');

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

  const baseItems = useMemo(() => {
    if (!data) return [];
    return showPaused ? data.items : data.activeItems;
  }, [data, showPaused]);

  const displayItems = useMemo(() => {
    if (filterTab === 'subscriptions') {
      return baseItems.filter((i) => !i.isInstallment);
    }
    if (filterTab === 'installments') {
      return baseItems.filter((i) => i.isInstallment);
    }
    return baseItems;
  }, [baseItems, filterTab]);

  const counts = useMemo(() => {
    const subscriptions = baseItems.filter((i) => !i.isInstallment).length;
    const installments = baseItems.filter((i) => i.isInstallment).length;
    return {
      all: baseItems.length,
      subscriptions,
      installments,
    };
  }, [baseItems]);

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
      <div className="flex items-center justify-center py-20" role="status" aria-label="Loading recurring cost analysis">
        <RefreshCw className="w-6 h-6 animate-spin text-slate-500 dark:text-white/40" />
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <RefreshCw className="w-8 h-8 text-slate-400 dark:text-white/30 mx-auto mb-2" />
        <p className="text-sm font-medium text-slate-700 dark:text-white/80">No recurring transactions found</p>
        <p className="text-xs text-slate-500 dark:text-white/50 mt-1">
          Add recurring transactions on the <a href="/recurring" className="text-mint-500 hover:underline">Recurring page</a> to see your subscription and installment cost analysis.
        </p>
      </div>
    );
  }

  const {
    monthlyTotal,
    annualTotal,
    activeCount,
    temporaryCount,
    largestItem,
    subscriptionMonthlyTotal = monthlyTotal,
    installmentMonthlyTotal = 0,
    totalRemainingLiability = 0,
    postInstallmentRunRate = monthlyTotal,
    installmentCount = temporaryCount,
    subscriptionCount = activeCount - temporaryCount,
  } = data;

  const installmentReliefPct = monthlyTotal > 0
    ? Math.round((installmentMonthlyTotal / monthlyTotal) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* ─── Summary Cards (4-column grid) ──────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-500 dark:text-white/50">Monthly Total</span>
            <DollarSign className="w-4 h-4 text-mint-500" />
          </div>
          <p className="text-xl font-bold text-slate-900 dark:text-white">{formatIdr(monthlyTotal)}</p>
          <p className="text-[11px] text-slate-500 dark:text-white/40 mt-0.5">per salary period</p>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-500 dark:text-white/50">Annual Cost</span>
            <Calendar className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-xl font-bold text-slate-900 dark:text-white">{formatIdr(annualTotal)}</p>
          <p className="text-[11px] text-slate-500 dark:text-white/40 mt-0.5">projected 1-year total</p>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-500 dark:text-white/50">Subscriptions</span>
            <RefreshCw className="w-4 h-4 text-gold-500" />
          </div>
          <p className="text-xl font-bold text-slate-900 dark:text-white">{formatIdr(subscriptionMonthlyTotal)}</p>
          <p className="text-[11px] text-slate-500 dark:text-white/40 mt-0.5">
            {subscriptionCount} permanent {subscriptionCount === 1 ? 'item' : 'items'}
          </p>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-500 dark:text-white/50">Installments</span>
            <CreditCard className="w-4 h-4 text-coral-500" />
          </div>
          <p className="text-xl font-bold text-slate-900 dark:text-white">{formatIdr(installmentMonthlyTotal)}</p>
          <p className="text-[11px] text-slate-500 dark:text-white/40 mt-0.5">
            {installmentCount} active ({formatIdr(totalRemainingLiability)} liability)
          </p>
        </div>
      </div>

      {/* ─── Post-Installment Cash Flow Relief Banner ────────────────────────── */}
      {installmentCount > 0 && (
        <div className="glass-card p-5 border-l-4 border-l-mint-500">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-mint-500" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Post-Installment Cash Flow Relief
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-white/60">
                When all {installmentCount} active installments are paid off, your monthly recurring obligations will decrease by{' '}
                <span className="font-semibold text-coral-500 dark:text-coral-400">{formatIdr(installmentMonthlyTotal)}/mo</span> ({installmentReliefPct}% reduction).
                Your baseline fixed run rate will be{' '}
                <span className="font-semibold text-mint-600 dark:text-mint-400">{formatIdr(postInstallmentRunRate)}/mo</span>.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Badge className="bg-mint-500/10 text-mint-700 dark:text-mint-300 border-mint-500/20 text-xs">
                Run Rate: {formatIdr(postInstallmentRunRate)}/mo
              </Badge>
              {totalRemainingLiability > 0 && (
                <Badge className="bg-slate-100 text-slate-700 dark:bg-white/[0.08] dark:text-white/80 border-slate-200 dark:border-white/10 text-xs">
                  Remaining Debt: {formatIdr(totalRemainingLiability)}
                </Badge>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Category Breakdown + Insights ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut chart */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-medium flex items-center gap-2 text-slate-900 dark:text-white/80 mb-3">
            <PieChart className="w-4 h-4 text-slate-500 dark:text-white/40" />
            Category Cost Breakdown
          </h3>
          {donutData && (
            <div style={{ height: 280 }}>
              <Doughnut data={donutData} options={donutOptions} />
            </div>
          )}
        </div>

        {/* Insights */}
        <div className="glass-card p-5 space-y-3">
          <h3 className="text-sm font-medium flex items-center gap-2 text-slate-900 dark:text-white/80">
            <Lightbulb className="w-4 h-4 text-gold-500" />
            Cost Insights
          </h3>

          {largestItem && (
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="w-3.5 h-3.5 text-coral-500" />
                <span className="text-xs font-semibold text-slate-700 dark:text-white/80">Largest Single Recurring Item</span>
              </div>
              <p className="text-sm text-slate-700 dark:text-white/70">
                <span className="font-medium text-slate-900 dark:text-white">{largestItem.title}</span> :{' '}
                <span className="font-semibold text-coral-600 dark:text-coral-400">{formatIdr(largestItem.amount)}</span>/month
              </p>
              <p className="text-[11px] text-slate-500 dark:text-white/40 mt-0.5">
                Constitutes {((largestItem.amount / monthlyTotal) * 100).toFixed(0)}% of your recurring total.
              </p>
            </div>
          )}

          <div className="rounded-lg bg-mint-500/5 dark:bg-mint-700/20 p-3 border border-mint-400/20 dark:border-mint-700/40">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-3.5 h-3.5 text-mint-500" />
              <span className="text-xs font-semibold text-slate-700 dark:text-white/80">Annual Impact</span>
            </div>
            <p className="text-sm text-slate-700 dark:text-white/70">
              Your recurring obligations require <span className="font-semibold text-slate-900 dark:text-white">{formatIdr(monthlyTotal)}</span>/month, or{' '}
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatIdr(annualTotal)}</span> per year.
            </p>
          </div>

          {/* Top categories summary */}
          <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-200 dark:border-white/10">
            <span className="text-xs font-semibold text-slate-700 dark:text-white/80 mb-2 block">Top 3 Spending Categories</span>
            <div className="space-y-1.5">
              {categoryEntries.slice(0, 3).map(([cat, amt], i) => (
                <div key={cat} className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: getCategoryColor(i) }}
                  />
                  <span className="text-xs text-slate-700 dark:text-white/70 flex-1 truncate">{cat}</span>
                  <span className="text-xs font-medium text-slate-900 dark:text-white tabular-nums">{formatIdr(amt)}</span>
                  <span className="text-[11px] text-slate-500 dark:text-white/40 w-10 text-right">
                    {((amt / monthlyTotal) * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Category Horizontal Progress Bars ──────────────────────────────── */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-medium text-slate-900 dark:text-white/80 mb-3">Category Proportion Breakdown</h3>
        <div className="space-y-3">
          {categoryEntries.map(([cat, amt], i) => {
            const pct = (amt / monthlyTotal) * 100;
            return (
              <div key={cat}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-700 dark:text-white/70">{cat}</span>
                  <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
                    {formatIdr(amt)}
                    <span className="text-slate-500 dark:text-white/40 font-normal ml-1.5">({pct.toFixed(1)}%)</span>
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: getCategoryColor(i) }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Items Table & Mobile List ───────────────────────────────────────── */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-900 dark:text-white">
              <Layers className="w-4 h-4 text-mint-500" />
              Recurring Items
            </h3>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/[0.06] p-0.5 rounded-lg border border-slate-200 dark:border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setFilterTab('all')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  filterTab === 'all'
                    ? 'bg-white dark:bg-navy-800 text-slate-900 dark:text-white shadow-sm font-medium'
                    : 'text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                All ({counts.all})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('subscriptions')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  filterTab === 'subscriptions'
                    ? 'bg-white dark:bg-navy-800 text-slate-900 dark:text-white shadow-sm font-medium'
                    : 'text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Subscriptions ({counts.subscriptions})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('installments')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  filterTab === 'installments'
                    ? 'bg-white dark:bg-navy-800 text-slate-900 dark:text-white shadow-sm font-medium'
                    : 'text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Installments ({counts.installments})
              </button>
            </div>
          </div>

          {data.pausedItems.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPaused(!showPaused)}
              className="text-xs text-mint-600 dark:text-mint-400 hover:text-mint-700 h-8 px-2 flex items-center gap-1 self-start sm:self-auto"
            >
              {showPaused ? 'Show active only' : `Show paused (${data.pausedItems.length})`}
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>

        {displayItems.length === 0 ? (
          <div className="text-center py-8 text-slate-500 dark:text-white/40 border border-dashed border-slate-200 dark:border-white/10 rounded-lg">
            <p className="text-sm font-medium text-slate-700 dark:text-white/70">No items match the selected filter</p>
          </div>
        ) : (
          <>
            {/* Desktop Table (≥md) */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Monthly</TableHead>
                    <TableHead className="text-right">Annual/Est.</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Duration / Tenor</TableHead>
                    <TableHead>% Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayItems.map((item) => {
                    const pctOfTotal = monthlyTotal > 0 ? (item.amount / monthlyTotal) * 100 : 0;
                    const typeLabel = item.type === 'cash' ? 'Cash' : item.type === 'credit_payment' ? 'CC Pay' : 'Credit';
                    const duration = formatDurationInfo(item);
                    const estimatedAnnual = item.isInstallment && item.remainingTenor !== null
                      ? item.amount * Math.min(12, item.remainingTenor)
                      : item.amount * 12;

                    return (
                      <TableRow key={item.id} className={item.active ? '' : 'opacity-50'}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-900 dark:text-white">{item.title}</span>
                            {item.isInstallment && (
                              <Badge className="bg-gold-500/10 text-gold-700 dark:text-gold-300 border-gold-500/20 text-[10px] px-1.5 py-0 h-4">
                                Installment
                              </Badge>
                            )}
                            {!item.active && (
                              <Badge variant="outline" className="text-slate-500 dark:text-white/40 text-[10px] h-4">
                                Paused
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-600 dark:text-white/60 text-xs">
                          {item.category}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-slate-900 dark:text-white tabular-nums">
                          {formatIdr(item.amount)}
                        </TableCell>
                        <TableCell className="text-right text-slate-600 dark:text-white/60 tabular-nums text-xs">
                          {formatIdr(estimatedAnnual)}
                          {item.isInstallment && item.remainingLiability !== null && item.remainingLiability !== undefined && (
                            <span className="block text-[10px] text-slate-400 dark:text-white/30">
                              (rem: {formatIdr(item.remainingLiability)})
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[11px] font-normal">
                            {typeLabel}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="space-y-0.5">
                            <span className={item.isInstallment ? 'text-gold-600 dark:text-gold-400 font-medium' : 'text-slate-600 dark:text-white/60'}>
                              {duration.label}
                            </span>
                            {duration.badge && (
                              <span className="block text-[10px] text-slate-500 dark:text-white/40">
                                {duration.badge}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-14 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                              <div
                                className="bg-mint-500 h-1.5 rounded-full"
                                style={{ width: `${Math.min(100, pctOfTotal)}%` }}
                              />
                            </div>
                            <span className="text-[11px] text-slate-500 dark:text-white/50 w-7 tabular-nums">
                              {pctOfTotal.toFixed(0)}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card List (<md) */}
            <div className="md:hidden space-y-3">
              {displayItems.map((item) => {
                const pctOfTotal = monthlyTotal > 0 ? (item.amount / monthlyTotal) * 100 : 0;
                const typeLabel = item.type === 'cash' ? 'Cash' : item.type === 'credit_payment' ? 'CC Pay' : 'Credit';
                const duration = formatDurationInfo(item);

                return (
                  <div
                    key={item.id}
                    className={`rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02] p-4 space-y-2.5 ${
                      !item.active ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {item.title}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs text-slate-600 dark:text-white/60">
                            {item.category}
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-white/30">·</span>
                          <span className="text-[11px] text-slate-500 dark:text-white/40">
                            Day {item.created_at || '21'}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                          {formatIdr(item.amount)}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-white/40 tabular-nums">
                          {pctOfTotal.toFixed(1)}% of total
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-200/60 dark:border-white/[0.04]">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {typeLabel}
                      </Badge>

                      {item.isInstallment ? (
                        <Badge className="bg-gold-500/10 text-gold-700 dark:text-gold-300 border-gold-500/20 text-[10px] px-1.5 py-0">
                          {duration.label}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 text-slate-600 dark:text-white/60">
                          Permanent
                        </Badge>
                      )}

                      {duration.badge && (
                        <span className="text-[11px] text-slate-500 dark:text-white/40">
                          ({duration.badge})
                        </span>
                      )}

                      {item.isInstallment && item.remainingLiability !== null && item.remainingLiability !== undefined && (
                        <span className="text-[11px] font-medium text-coral-600 dark:text-coral-400 ml-auto">
                          Remaining: {formatIdr(item.remainingLiability)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}