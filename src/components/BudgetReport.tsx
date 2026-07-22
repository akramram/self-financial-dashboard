import React, { useMemo, useState, useEffect } from 'react';
import type { MonthlySummary, Category, Transaction } from '../lib/data';
import { formatIdr } from '../lib/utils';
import { fetchTransactions } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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
import { ArrowUpDown, TrendingDown, Wallet, AlertTriangle, PiggyBank, Receipt } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

type SortKey = 'name' | 'limit' | 'spent' | 'remaining' | 'pct';
type SortDir = 'asc' | 'desc';

interface Props {
  summaries: MonthlySummary[];
  categories: Category[];
}

export default function BudgetReport({ summaries, categories }: Props) {
  const months = useMemo(() => [...summaries].reverse().map((s) => s.month), [summaries]);
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('pct');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [categoryTransactions, setCategoryTransactions] = useState<Transaction[]>([]);
  const [dialogLoading, setDialogLoading] = useState(false);

  const isAllTime = filterMonth === 'all';

  const categoryMap = useMemo(() => {
    const map: Record<string, Category> = {};
    categories.forEach((c) => { map[c.name] = c; });
    return map;
  }, [categories]);

  // Aggregate category spending
  const categoryStats = useMemo(() => {
    const stats: Record<string, { spent: number; limit: number; months: number }> = {};

    const activeSummaries = isAllTime ? summaries : summaries.filter((s) => s.month === filterMonth);

    activeSummaries.forEach((summary) => {
      if (!summary.category_totals) return;
      Object.entries(summary.category_totals).forEach(([cat, amount]) => {
        if (!stats[cat]) {
          stats[cat] = { spent: 0, limit: categoryMap[cat]?.monthly_limit ?? 0, months: 0 };
        }
        stats[cat].spent += amount;
        stats[cat].months += 1;
      });
    });

    // Ensure categories with limits but no spending are shown
    categories.forEach((cat) => {
      if (!stats[cat.name] && cat.monthly_limit > 0) {
        stats[cat.name] = { spent: 0, limit: cat.monthly_limit, months: 0 };
      }
    });

    const totalPeriods = activeSummaries.length;
    return Object.entries(stats).map(([name, data]) => {
      const periodCount = isAllTime ? (data.months > 0 ? data.months : totalPeriods) : 1;
      const effectiveLimit = data.limit * periodCount;
      return {
        name,
        spent: data.spent,
        limit: effectiveLimit,
        remaining: effectiveLimit - data.spent,
        pct: effectiveLimit > 0 ? (data.spent / effectiveLimit) * 100 : data.spent > 0 ? 101 : 0,
        color: categoryMap[name]?.color,
        months: data.months,
      };
    });
  }, [summaries, filterMonth, isAllTime, categories, categoryMap]);

  const sortedStats = useMemo(() => {
    const sorted = [...categoryStats];
    sorted.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortKey === 'limit') cmp = a.limit - b.limit;
      else if (sortKey === 'spent') cmp = a.spent - b.spent;
      else if (sortKey === 'remaining') cmp = a.remaining - b.remaining;
      else if (sortKey === 'pct') cmp = a.pct - b.pct;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [categoryStats, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const totalBudget = categoryStats.reduce((s, c) => s + c.limit, 0);
  const totalSpent = categoryStats.reduce((s, c) => s + c.spent, 0);
  const totalRemaining = totalBudget - totalSpent;
  const overspentCount = categoryStats.filter((c) => c.limit > 0 && c.spent > c.limit).length;
  const nearLimitCount = categoryStats.filter((c) => c.limit > 0 && c.spent <= c.limit && c.pct >= 80).length;

  // Chart data: top categories by spend
  const chartCategories = useMemo(() => {
    return [...sortedStats]
      .filter((c) => c.limit > 0 || c.spent > 0)
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 12);
  }, [sortedStats]);

  const chartData = {
    labels: chartCategories.map((c) => c.name),
    datasets: [
      {
        label: 'Budget',
        data: chartCategories.map((c) => c.limit),
        backgroundColor: 'rgba(148, 163, 184, 0.5)',
        borderColor: 'rgba(148, 163, 184, 0.8)',
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        label: 'Spent',
        data: chartCategories.map((c) => c.spent),
        backgroundColor: chartCategories.map((c) =>
          c.spent > c.limit && c.limit > 0 ? 'rgba(239, 68, 68, 0.7)' : 'rgba(59, 130, 246, 0.7)'
        ),
        borderColor: chartCategories.map((c) =>
          c.spent > c.limit && c.limit > 0 ? 'rgba(239, 68, 68, 1)' : 'rgba(59, 130, 246, 1)'
        ),
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const },
      tooltip: {
        callbacks: {
          label: (ctx: any) => `${ctx.dataset.label}: ${formatIdr(ctx.parsed.y)}`,
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
        ticks: { maxRotation: 45, minRotation: 0, font: { size: 11 } },
      },
    },
  };

  const SortHeader = ({ label, sortKeyValue }: { label: string; sortKeyValue: SortKey }) => (
    <button
      className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-100 transition"
      onClick={() => handleSort(sortKeyValue)}
    >
      {label}
      <ArrowUpDown className="w-3 h-3 opacity-50" />
    </button>
  );

  // Resolve a month display label (e.g. "June 2026") to its period_id via summaries.
  // Avoids passing the removed `month` filter to fetchTransactions() — that field is
  // not in its type signature and would be silently ignored at runtime, leaking
  // transactions from other periods into the drill-down dialog.
  const monthToPeriodId = (monthLabel: string): number | undefined => {
    const match = summaries.find((s) => s.month === monthLabel);
    return match?.period_id;
  };

  const openCategoryDialog = async (catName: string) => {
    setSelectedCategory(catName);
    setDialogOpen(true);
    setDialogLoading(true);
    setCategoryTransactions([]);
    try {
      const periodId = isAllTime ? undefined : monthToPeriodId(filterMonth);
      const rows = await fetchTransactions({
        periodId,
        category: catName,
      });
      setCategoryTransactions(rows);
    } catch (e) {
      setCategoryTransactions([]);
    } finally {
      setDialogLoading(false);
    }
  };

  const dialogTotal = categoryTransactions.reduce((s, t) => s + t.amount, 0);

  // Determine which period_ids were over budget for the selected category
  const overBudgetPeriods = useMemo(() => {
    if (!selectedCategory) return new Set<number>();
    const cat = categoryMap[selectedCategory];
    if (!cat || cat.monthly_limit <= 0) return new Set<number>();
    const periods = new Set<number>();
    summaries.forEach((s) => {
      const spent = s.category_totals?.[selectedCategory] ?? 0;
      if (spent > cat.monthly_limit) {
        periods.add(s.period_id);
      }
    });
    return periods;
  }, [summaries, selectedCategory, categoryMap]);

  return (
    <div className="space-y-6">
      {/* Month Filter */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-white/60">Period:</label>
        <Select value={filterMonth} onValueChange={setFilterMonth}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Months</SelectItem>
            {months.map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white/[0.06]">
                <Wallet className="w-5 h-5 text-white/40" />
              </div>
              <div>
                <p className="text-xs text-white/40">Total Budget</p>
                <p className="text-lg font-semibold">{formatIdr(totalBudget)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <TrendingDown className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-xs text-white/40">Total Spent</p>
                <p className="text-lg font-semibold">{formatIdr(totalSpent)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${totalRemaining >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                <PiggyBank className={`w-5 h-5 ${totalRemaining >= 0 ? 'text-emerald-400' : 'text-red-400'}`} />
              </div>
              <div>
                <p className="text-xs text-white/40">Remaining</p>
                <p className={`text-lg font-semibold ${totalRemaining >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatIdr(totalRemaining)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-white/40">Alerts</p>
                <div className="flex gap-2 mt-0.5">
                  {overspentCount > 0 && (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                      {overspentCount} Over
                    </Badge>
                  )}
                  {nearLimitCount > 0 && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                      {nearLimitCount} Near
                    </Badge>
                  )}
                  {overspentCount === 0 && nearLimitCount === 0 && (
                    <span className="text-sm text-emerald-400 font-medium">All Good</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget vs Actual Chart */}
      {chartCategories.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Budget vs Actual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative h-80">
              <Bar data={chartData} options={chartOptions} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Budget Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Category Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead><SortHeader label="Category" sortKeyValue="name" /></TableHead>
                  <TableHead className="text-right"><SortHeader label="Budget" sortKeyValue="limit" /></TableHead>
                  <TableHead className="text-right"><SortHeader label="Spent" sortKeyValue="spent" /></TableHead>
                  <TableHead className="text-right"><SortHeader label="Remaining" sortKeyValue="remaining" /></TableHead>
                  <TableHead className="text-right"><SortHeader label="Used" sortKeyValue="pct" /></TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedStats.map((row) => {
                  const isOver = row.limit > 0 && row.spent > row.limit;
                  const isNear = row.limit > 0 && row.spent <= row.limit && row.pct >= 80;
                  const hasLimit = row.limit > 0;

                  return (
                    <TableRow
                      key={row.name}
                      className="cursor-pointer hover:bg-white/[0.04] transition"
                      onClick={() => openCategoryDialog(row.name)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: row.color || '#94a3b8' }}
                          />
                          <span className="font-medium">{row.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {hasLimit ? formatIdr(row.limit) : '—'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatIdr(row.spent)}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${row.remaining < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {hasLimit ? formatIdr(row.remaining) : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {hasLimit ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className={`text-xs font-semibold ${isOver ? 'text-red-600 dark:text-red-400' : isNear ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600 dark:text-slate-300'}`}>
                              {row.pct.toFixed(0)}%
                            </span>
                            <div className="w-16 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full transition-all ${isOver ? 'bg-red-500' : isNear ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                style={{ width: `${Math.min(100, row.pct)}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">No limit</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isOver ? (
                          <Badge variant="destructive" className="text-[10px]">Over</Badge>
                        ) : isNear ? (
                          <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">Near Limit</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">On Track</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {sortedStats.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No budget data available for this period.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Category Drill-down Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-slate-500" />
              {selectedCategory} — Transactions
            </DialogTitle>
            <DialogDescription>
              {isAllTime ? 'All months' : filterMonth} · {categoryTransactions.length} transaction{categoryTransactions.length !== 1 ? 's' : ''} · Total {formatIdr(dialogTotal)}
            </DialogDescription>
          </DialogHeader>

          {dialogLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading transactions...</div>
          ) : categoryTransactions.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No transactions found for this category.</div>
          ) : (
            <div className="rounded-xl border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categoryTransactions.map((tx) => {
                    const isOverBudget = overBudgetPeriods.has(tx.period_id);
                    const typeClass =
                      tx.type === 'cash'
                        ? 'text-blue-600 dark:text-blue-400'
                        : tx.type === 'credit_payment'
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-purple-600 dark:text-purple-400';
                    const typeLabel =
                      tx.type === 'cash' ? 'Cash' : tx.type === 'credit_payment' ? 'Credit Pay' : 'Credit';
                    const dateObj = tx.created_time ? new Date(tx.created_time) : new Date(tx.date);
                    const dateStr = isNaN(dateObj.getTime())
                      ? tx.date
                      : dateObj.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });
                    return (
                      <TableRow
                        key={tx.id}
                        className={isOverBudget ? 'border-l-2 border-l-red-500 bg-red-50/60 dark:bg-red-950/30' : ''}
                      >
                        <TableCell className="font-medium">{tx.title}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{dateStr}</TableCell>
                        <TableCell className="text-right font-medium">{formatIdr(tx.amount)}</TableCell>
                        <TableCell className={`${typeClass} text-xs font-semibold uppercase`}>{typeLabel}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {isOverBudget && (
                              <Badge variant="destructive" className="text-[10px] whitespace-nowrap">Over Budget</Badge>
                            )}
                            <Badge
                              variant="secondary"
                              className={`text-[10px] ${
                                tx.done
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                  : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                              }`}
                            >
                              {tx.done ? 'Paid' : 'Unpaid'}
                            </Badge>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button size="sm" variant="secondary" onClick={() => setDialogOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
