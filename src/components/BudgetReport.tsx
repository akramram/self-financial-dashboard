import React, { useMemo, useState } from 'react';
import type { MonthlySummary, Category, Transaction } from '../lib/data';
import { formatIdr } from '../lib/utils';
import { fetchTransactions } from '../lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
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
import {
  ArrowUpDown,
  TrendingDown,
  Wallet,
  AlertTriangle,
  PiggyBank,
  Receipt,
  Search,
  X,
  SlidersHorizontal,
} from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

type SortKey = 'name' | 'limit' | 'spent' | 'remaining' | 'pct';
type SortDir = 'asc' | 'desc';
type StatusFilter = 'all' | 'over' | 'near' | 'track' | 'unbudgeted';

interface Props {
  summaries: MonthlySummary[];
  categories: Category[];
}

export default function BudgetReport({ summaries, categories }: Props) {
  const months = useMemo(() => [...summaries].reverse().map((s) => s.month), [summaries]);
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('pct');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [categoryTransactions, setCategoryTransactions] = useState<Transaction[]>([]);
  const [dialogLoading, setDialogLoading] = useState(false);

  const isAllTime = filterMonth === 'all';

  const categoryMap = useMemo(() => {
    const map: Record<string, Category> = {};
    categories.forEach((c) => {
      map[c.name] = c;
    });
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
      const pct = effectiveLimit > 0 ? (data.spent / effectiveLimit) * 100 : 0;
      let status: 'over' | 'near' | 'track' | 'unbudgeted' = 'unbudgeted';
      if (effectiveLimit > 0) {
        if (data.spent > effectiveLimit) {
          status = 'over';
        } else if (pct >= 80) {
          status = 'near';
        } else {
          status = 'track';
        }
      }

      return {
        name,
        spent: data.spent,
        limit: effectiveLimit,
        remaining: effectiveLimit - data.spent,
        pct,
        status,
        color: categoryMap[name]?.color,
        months: data.months,
      };
    });
  }, [summaries, filterMonth, isAllTime, categories, categoryMap]);

  // Summary counts
  const totalBudget = categoryStats.reduce((s, c) => s + c.limit, 0);
  const totalSpent = categoryStats.reduce((s, c) => s + c.spent, 0);
  const totalRemaining = totalBudget - totalSpent;
  const overspentCount = categoryStats.filter((c) => c.status === 'over').length;
  const nearLimitCount = categoryStats.filter((c) => c.status === 'near').length;
  const onTrackCount = categoryStats.filter((c) => c.status === 'track').length;
  const unbudgetedCount = categoryStats.filter((c) => c.status === 'unbudgeted').length;

  // Aggregate budget adherence for categories with defined limits
  const budgetedCategories = useMemo(() => categoryStats.filter((c) => c.limit > 0), [categoryStats]);
  const totalBudgetedSpent = useMemo(
    () => budgetedCategories.reduce((s, c) => s + c.spent, 0),
    [budgetedCategories]
  );
  const totalBudgetedLimit = useMemo(
    () => budgetedCategories.reduce((s, c) => s + c.limit, 0),
    [budgetedCategories]
  );
  const overallAdherencePct = totalBudgetedLimit > 0 ? (totalBudgetedSpent / totalBudgetedLimit) * 100 : 0;

  // Filtered and sorted category rows
  const filteredStats = useMemo(() => {
    return categoryStats.filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        if (!c.name.toLowerCase().includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [categoryStats, statusFilter, searchQuery]);

  const sortedStats = useMemo(() => {
    const sorted = [...filteredStats];
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
  }, [filteredStats, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  // Chart data: top categories by spend
  const chartCategories = useMemo(() => {
    return [...categoryStats]
      .filter((c) => c.limit > 0 || c.spent > 0)
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 12);
  }, [categoryStats]);

  const chartData = {
    labels: chartCategories.map((c) => c.name),
    datasets: [
      {
        label: 'Budget',
        data: chartCategories.map((c) => c.limit),
        backgroundColor: 'rgba(148, 163, 184, 0.4)',
        borderColor: 'rgba(148, 163, 184, 0.8)',
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        label: 'Spent',
        data: chartCategories.map((c) => c.spent),
        backgroundColor: chartCategories.map((c) =>
          c.spent > c.limit && c.limit > 0 ? 'rgba(239, 68, 68, 0.75)' : 'rgba(16, 185, 129, 0.75)'
        ),
        borderColor: chartCategories.map((c) =>
          c.spent > c.limit && c.limit > 0 ? 'rgba(239, 68, 68, 1)' : 'rgba(16, 185, 129, 1)'
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
      type="button"
      className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-100 transition"
      onClick={() => handleSort(sortKeyValue)}
    >
      {label}
      <ArrowUpDown className="w-3 h-3 opacity-50" />
    </button>
  );

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
    } catch {
      setCategoryTransactions([]);
    } finally {
      setDialogLoading(false);
    }
  };

  const dialogTotal = categoryTransactions.reduce((s, t) => s + t.amount, 0);

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
      {/* Month Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-slate-700 dark:text-white/70">Period:</label>
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              {months.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="text-xs text-slate-500 dark:text-white/40">
          Showing {sortedStats.length} of {categoryStats.length} categories
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-200/60 dark:bg-white/[0.06]">
              <Wallet className="w-5 h-5 text-slate-500 dark:text-white/60" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-white/40">Total Budget</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">{formatIdr(totalBudget)}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <TrendingDown className="w-5 h-5 text-red-500 dark:text-red-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-white/40">Total Spent</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">{formatIdr(totalSpent)}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${totalRemaining >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
              <PiggyBank
                className={`w-5 h-5 ${totalRemaining >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}
              />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-white/40">Remaining</p>
              <p
                className={`text-lg font-semibold ${
                  totalRemaining >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                }`}
              >
                {formatIdr(totalRemaining)}
              </p>
            </div>
          </div>
        </div>

        <div
          className="glass-card p-5 cursor-pointer hover:ring-1 hover:ring-gold-500/30 transition"
          onClick={() => setStatusFilter((prev) => (prev === 'over' ? 'all' : 'over'))}
          title="Click to toggle filter over budget categories"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gold-500/10">
              <AlertTriangle className="w-5 h-5 text-gold-500 dark:text-gold-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-white/40">Alerts</p>
              <div className="flex gap-2 mt-0.5">
                {overspentCount > 0 && (
                  <Badge variant="destructive" className="text-[11px] px-1.5 py-0">
                    {overspentCount} Over
                  </Badge>
                )}
                {nearLimitCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="text-[11px] px-1.5 py-0 bg-gold-500/10 text-gold-700 dark:bg-gold-700/20 dark:text-gold-300"
                  >
                    {nearLimitCount} Near
                  </Badge>
                )}
                {overspentCount === 0 && nearLimitCount === 0 && (
                  <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">All Good</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Budget Adherence & Efficiency Overview */}
      {totalBudgetedLimit > 0 && (
        <div className="glass-card p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Budget Adherence</h3>
              <p className="text-xs text-slate-500 dark:text-white/50">
                {formatIdr(totalBudgetedSpent)} spent of {formatIdr(totalBudgetedLimit)} across {budgetedCategories.length}{' '}
                budgeted categories
              </p>
            </div>
            <div className="text-right">
              <span
                className={`text-lg font-bold ${
                  overallAdherencePct > 100
                    ? 'text-red-600 dark:text-red-400'
                    : overallAdherencePct >= 80
                    ? 'text-gold-600 dark:text-gold-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {overallAdherencePct.toFixed(1)}% Used
              </span>
            </div>
          </div>

          <Progress
            value={Math.min(100, overallAdherencePct)}
            className="h-2 bg-slate-200 dark:bg-slate-700"
            indicatorClassName={
              overallAdherencePct > 100
                ? 'bg-red-500'
                : overallAdherencePct >= 80
                ? 'bg-gold-500'
                : 'bg-emerald-500'
            }
          />

          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-white/50">
            <span>
              {overallAdherencePct > 100
                ? `Exceeded limit by ${formatIdr(totalBudgetedSpent - totalBudgetedLimit)}`
                : `Remaining buffer: ${formatIdr(totalBudgetedLimit - totalBudgetedSpent)}`}
            </span>
            <span>
              {overspentCount > 0
                ? `${overspentCount} categories over budget`
                : 'All budgeted categories within limits'}
            </span>
          </div>
        </div>
      )}

      {/* Budget vs Actual Chart */}
      {chartCategories.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white/90 mb-4">Budget vs Actual Spend</h3>
          <div className="relative h-80">
            <Bar data={chartData} options={chartOptions} />
          </div>
        </div>
      )}

      {/* Category Management & Filter Hub */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white/90">Category Breakdown</h3>

          {/* Search Bar */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-white/40" />
            <Input
              type="text"
              placeholder="Search category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 h-9 text-sm bg-slate-50/70 dark:bg-white/[0.04] border-slate-200 dark:border-white/10"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-slate-200/60 dark:border-white/[0.08]">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'text-slate-600 dark:text-white/60 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
            }`}
          >
            <span>All</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                statusFilter === 'all'
                  ? 'bg-white/20 dark:bg-slate-900/20'
                  : 'bg-slate-200 dark:bg-white/[0.1]'
              }`}
            >
              {categoryStats.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('over')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
              statusFilter === 'over'
                ? 'bg-red-600 text-white'
                : 'text-red-600 dark:text-red-400 hover:bg-red-500/10'
            }`}
          >
            <span>Over Budget</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                statusFilter === 'over' ? 'bg-white/20' : 'bg-red-500/15'
              }`}
            >
              {overspentCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('near')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
              statusFilter === 'near'
                ? 'bg-gold-600 text-white'
                : 'text-gold-600 dark:text-gold-400 hover:bg-gold-500/10'
            }`}
          >
            <span>Near Limit</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                statusFilter === 'near' ? 'bg-white/20' : 'bg-gold-500/15'
              }`}
            >
              {nearLimitCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('track')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
              statusFilter === 'track'
                ? 'bg-emerald-600 text-white'
                : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
            }`}
          >
            <span>On Track</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                statusFilter === 'track' ? 'bg-white/20' : 'bg-emerald-500/15'
              }`}
            >
              {onTrackCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('unbudgeted')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
              statusFilter === 'unbudgeted'
                ? 'bg-slate-700 text-white dark:bg-slate-300 dark:text-slate-900'
                : 'text-slate-500 dark:text-white/50 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
            }`}
          >
            <span>No Limit</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                statusFilter === 'unbudgeted'
                  ? 'bg-white/20 dark:bg-slate-900/20'
                  : 'bg-slate-200 dark:bg-white/[0.1]'
              }`}
            >
              {unbudgetedCount}
            </span>
          </button>
        </div>

        {/* Category Budget Table */}
        <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-200 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02]">
                <TableHead>
                  <SortHeader label="Category" sortKeyValue="name" />
                </TableHead>
                <TableHead className="text-right">
                  <SortHeader label="Budget" sortKeyValue="limit" />
                </TableHead>
                <TableHead className="text-right">
                  <SortHeader label="Spent" sortKeyValue="spent" />
                </TableHead>
                <TableHead className="text-right">
                  <SortHeader label="Remaining" sortKeyValue="remaining" />
                </TableHead>
                <TableHead className="text-right">
                  <SortHeader label="Used" sortKeyValue="pct" />
                </TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedStats.map((row) => {
                const hasLimit = row.limit > 0;
                const isOver = row.status === 'over';
                const isNear = row.status === 'near';
                const isTrack = row.status === 'track';

                return (
                  <TableRow
                    key={row.name}
                    className="cursor-pointer hover:bg-slate-100/70 dark:hover:bg-white/[0.06] transition"
                    onClick={() => openCategoryDialog(row.name)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: row.color || '#94a3b8' }}
                        />
                        <span className="font-medium text-slate-900 dark:text-white">{row.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-slate-500 dark:text-white/60">
                      {hasLimit ? formatIdr(row.limit) : '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium text-slate-900 dark:text-white">
                      {formatIdr(row.spent)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium ${
                        !hasLimit
                          ? 'text-slate-400 dark:text-white/30'
                          : row.remaining < 0
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {hasLimit ? formatIdr(row.remaining) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {hasLimit ? (
                        <div className="flex items-center justify-end gap-2">
                          <span
                            className={`text-xs font-semibold ${
                              isOver
                                ? 'text-red-600 dark:text-red-400'
                                : isNear
                                ? 'text-gold-600 dark:text-gold-400'
                                : 'text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {row.pct.toFixed(0)}%
                          </span>
                          <div className="w-16 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full transition-all ${
                                isOver ? 'bg-red-500' : isNear ? 'bg-gold-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(100, row.pct)}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 dark:text-white/30">No limit</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isOver ? (
                        <Badge variant="destructive" className="text-[11px]">
                          Over Budget
                        </Badge>
                      ) : isNear ? (
                        <Badge
                          variant="secondary"
                          className="text-[11px] bg-gold-500/10 text-gold-700 dark:bg-gold-700/20 dark:text-gold-300"
                        >
                          Near Limit
                        </Badge>
                      ) : isTrack ? (
                        <Badge
                          variant="secondary"
                          className="text-[11px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                        >
                          On Track
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-[11px] text-slate-500 dark:text-white/40 border-slate-300 dark:border-white/20"
                        >
                          No Limit
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}

              {sortedStats.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    <div className="max-w-sm mx-auto space-y-2">
                      <SlidersHorizontal className="w-8 h-8 text-slate-400 mx-auto opacity-40" />
                      <p className="text-sm font-medium text-slate-700 dark:text-white/70">
                        No categories found matching your filter
                      </p>
                      <p className="text-xs text-slate-500 dark:text-white/40">
                        Try clearing your search term or switching to another status filter.
                      </p>
                      <div className="pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSearchQuery('');
                            setStatusFilter('all');
                          }}
                        >
                          Reset Filters
                        </Button>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Category Drill-down Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="pr-12">
            <DialogTitle className="flex items-start gap-2 line-clamp-2 break-words">
              <Receipt className="w-5 h-5 shrink-0 text-slate-500" />
              {selectedCategory}: Transactions
            </DialogTitle>
            <DialogDescription className="break-words">
              {isAllTime ? 'All months' : filterMonth} · {categoryTransactions.length} transaction
              {categoryTransactions.length !== 1 ? 's' : ''} · Total {formatIdr(dialogTotal)}
            </DialogDescription>
          </DialogHeader>

          {dialogLoading ? (
            <div className="py-8 text-center text-sm text-slate-500 dark:text-white/50">Loading transactions...</div>
          ) : categoryTransactions.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500 dark:text-white/50">
              No transactions found for this category.
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-slate-200 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02]">
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
                        ? 'text-mint-600 dark:text-mint-400'
                        : tx.type === 'credit_payment'
                        ? 'text-gold-600 dark:text-gold-400'
                        : 'text-coral-500 dark:text-coral-400';
                    const typeLabel =
                      tx.type === 'cash' ? 'Cash' : tx.type === 'credit_payment' ? 'Credit Pay' : 'Credit';
                    const dateObj = tx.created_time ? new Date(tx.created_time) : new Date(tx.date);
                    const dateStr = isNaN(dateObj.getTime())
                      ? tx.date
                      : dateObj.toLocaleDateString('id-ID', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        });
                    return (
                      <TableRow
                        key={tx.id}
                        className={isOverBudget ? 'bg-red-50/60 dark:bg-red-950/30' : ''}
                      >
                        <TableCell className="font-medium text-slate-900 dark:text-white">{tx.title}</TableCell>
                        <TableCell className="text-slate-500 dark:text-white/50 text-xs">{dateStr}</TableCell>
                        <TableCell className="text-right font-medium text-slate-900 dark:text-white">
                          {formatIdr(tx.amount)}
                        </TableCell>
                        <TableCell className={`${typeClass} text-xs font-semibold uppercase`}>{typeLabel}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {isOverBudget && (
                              <Badge variant="destructive" className="text-[11px] whitespace-nowrap">
                                Over Budget
                              </Badge>
                            )}
                            <Badge
                              variant="secondary"
                              className={`text-[11px] ${
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
