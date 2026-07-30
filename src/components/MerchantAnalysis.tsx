import React, { useMemo, useState } from 'react';
import type { Transaction, MonthlySummary, Category } from '../lib/data';
import { formatIdr } from '../lib/utils';
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
import { useSortState } from '../hooks/useSortState';
import SortableHeader from './SortableHeader';
import {
  Store,
  Hash,
  TrendingUp,
  Sparkles,
  ArrowUpDown,
  BarChart3,
  Clock,
} from 'lucide-react';

interface Props {
  transactions: Transaction[];
  summaries: MonthlySummary[];
  categories: Category[];
  merchantData: MerchantData[];
}

interface MerchantData {
  title: string;
  category: string;
  period_id: number;
  month: string;
  paid_amount: number;
  total_amount: number;
  tx_count: number;
  avg_amount: number;
  max_amount: number;
  min_amount: number;
}

interface AggregatedMerchant {
  title: string;
  category: string;
  totalPaid: number;
  txCount: number;
  avgAmount: number;
  maxAmount: number;
  minAmount: number;
  firstSeen: string;
  lastSeen: string;
  periods: number;
  monthlyData: { month: string; amount: number; count: number }[];
}

export default function MerchantAnalysis({
  transactions,
  summaries,
  categories,
  merchantData,
}: Props) {
  const periodOptions = useMemo(() => {
    return summaries
      .map((s) => ({ id: s.period_id, month: s.month }))
      .reverse();
  }, [summaries]);

  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(
    periodOptions.length > 0 ? periodOptions[0].id : null
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'all' | 'period'>('period');

  // All unique categories from the data
  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    merchantData.forEach((m) => cats.add(m.category));
    return Array.from(cats).sort();
  }, [merchantData]);

  // Aggregate all merchants across all periods
  const allMerchants = useMemo((): AggregatedMerchant[] => {
    const map = new Map<string, AggregatedMerchant>();

    for (const m of merchantData) {
      const key = m.title;
      if (!map.has(key)) {
        map.set(key, {
          title: m.title,
          category: m.category,
          totalPaid: 0,
          txCount: 0,
          avgAmount: 0,
          maxAmount: 0,
          minAmount: Infinity,
          firstSeen: m.month,
          lastSeen: m.month,
          periods: 0,
          monthlyData: [],
        });
      }
      const agg = map.get(key)!;
      agg.totalPaid += m.paid_amount;
      agg.txCount += m.tx_count;
      agg.maxAmount = Math.max(agg.maxAmount, m.max_amount);
      agg.minAmount = Math.min(agg.minAmount, m.min_amount);
      agg.monthlyData.push({
        month: m.month,
        amount: m.paid_amount,
        count: m.tx_count,
      });
      agg.periods = agg.monthlyData.length;

      // Track first/last seen by period order
      const currPeriodIdx = summaries.findIndex((s) => s.month === m.month);
      const firstPeriodIdx = summaries.findIndex((s) => s.month === agg.firstSeen);
      const lastPeriodIdx = summaries.findIndex((s) => s.month === agg.lastSeen);
      if (currPeriodIdx >= 0 && (firstPeriodIdx < 0 || currPeriodIdx < firstPeriodIdx)) {
        agg.firstSeen = m.month;
      }
      if (currPeriodIdx >= 0 && currPeriodIdx > lastPeriodIdx) {
        agg.lastSeen = m.month;
      }
    }

    // Compute avg amount
    for (const agg of map.values()) {
      agg.avgAmount = agg.txCount > 0 ? agg.totalPaid / agg.txCount : 0;
      if (agg.minAmount === Infinity) agg.minAmount = 0;
      // Sort monthly data chronologically
      agg.monthlyData.sort((a, b) => {
        const ai = summaries.findIndex((s) => s.month === a.month);
        const bi = summaries.findIndex((s) => s.month === b.month);
        return ai - bi;
      });
    }

    let results = Array.from(map.values());

    // Filter by category
    if (selectedCategory !== 'all') {
      results = results.filter((m) => m.category === selectedCategory);
    }

    return results;
  }, [merchantData, selectedCategory, summaries]);

  // Period-specific merchants
  const periodMerchants = useMemo((): AggregatedMerchant[] => {
    if (selectedPeriodId == null) return [];
    const periodSummary = summaries.find((s) => s.period_id === selectedPeriodId);
    const periodMonth = periodSummary?.month ?? '';

    const map = new Map<string, AggregatedMerchant>();
    for (const m of merchantData) {
      if (m.period_id !== selectedPeriodId) continue;
      map.set(m.title, {
        title: m.title,
        category: m.category,
        totalPaid: m.paid_amount,
        txCount: m.tx_count,
        avgAmount: m.avg_amount,
        maxAmount: m.max_amount,
        minAmount: m.min_amount,
        firstSeen: periodMonth,
        lastSeen: periodMonth,
        periods: 1,
        monthlyData: [{ month: periodMonth, amount: m.paid_amount, count: m.tx_count }],
      });
    }

    let results = Array.from(map.values());
    if (selectedCategory !== 'all') {
      results = results.filter((m) => m.category === selectedCategory);
    }
    return results;
  }, [merchantData, selectedPeriodId, selectedCategory, summaries]);

  const displayMerchants = viewMode === 'period' ? periodMerchants : allMerchants;

  // Sort state
  const { sort, toggleSort, sortData, isSorted } = useSortState();

  const getCellValue = (m: AggregatedMerchant, key: string): number | string => {
    switch (key) {
      case 'title':
        return m.title.toLowerCase();
      case 'category':
        return m.category;
      case 'totalPaid':
        return m.totalPaid;
      case 'txCount':
        return m.txCount;
      case 'avgAmount':
        return m.avgAmount;
      case 'maxAmount':
        return m.maxAmount;
      case 'periods':
        return m.periods;
      default:
        return 0;
    }
  };

  const sortedMerchants = useMemo(() => {
    return sortData(
      displayMerchants,
      getCellValue,
      (data) => [...data].sort((a, b) => b.totalPaid - a.totalPaid)
    );
  }, [displayMerchants, sortData, getCellValue]);

  // Stats
  const stats = useMemo(() => {
    const data = displayMerchants;
    return {
      totalMerchants: data.length,
      totalSpent: data.reduce((s, m) => s + m.totalPaid, 0),
      totalTransactions: data.reduce((s, m) => s + m.txCount, 0),
      topMerchant: data.length > 0 ? data.reduce((a, b) => a.totalPaid > b.totalPaid ? a : b) : null,
      avgPerMerchant: data.length > 0
        ? data.reduce((s, m) => s + m.totalPaid, 0) / data.length
        : 0,
    };
  }, [displayMerchants]);

  // New merchants (only in current period, not in earlier periods)
  const newMerchants = useMemo(() => {
    if (viewMode !== 'period' || selectedPeriodId == null) return [];
    const periodSummary = summaries.find((s) => s.period_id === selectedPeriodId);
    if (!periodSummary) return [];
    const currentPeriodIdx = summaries.findIndex((s) => s.period_id === selectedPeriodId);
    if (currentPeriodIdx < 0) return [];

    const earlierTitles = new Set<string>();
    for (let i = 0; i < currentPeriodIdx; i++) {
      const pid = summaries[i].period_id;
      merchantData
        .filter((m) => m.period_id === pid)
        .forEach((m) => earlierTitles.add(m.title.toLowerCase().trim()));
    }

    return allMerchants.filter((m) => !earlierTitles.has(m.title.toLowerCase().trim()));
  }, [viewMode, selectedPeriodId, summaries, merchantData, allMerchants]);

  // Category colors
  const categoryColors = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of categories) map[c.name] = c.color;
    return map;
  }, [categories]);

  const selectedPeriodLabel = useMemo(() => {
    return summaries.find((s) => s.period_id === selectedPeriodId)?.month ?? '';
  }, [summaries, selectedPeriodId]);

  // Top N most frequent merchants (across all time)
  const frequentMerchants = useMemo(() => {
    return [...allMerchants]
      .sort((a, b) => b.txCount - a.txCount)
      .slice(0, 10);
  }, [allMerchants]);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Select
            value={viewMode}
            onValueChange={(v) => setViewMode(v as 'all' | 'period')}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="View mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="period">By Period</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>

          {viewMode === 'period' && (
            <Select
              value={selectedPeriodId?.toString() ?? ''}
              onValueChange={(v) => setSelectedPeriodId(parseInt(v))}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                {periodOptions.map((p) => (
                  <SelectItem key={p.id} value={p.id.toString()}>
                    {p.month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select
            value={selectedCategory}
            onValueChange={setSelectedCategory}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {allCategories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {viewMode === 'period' && selectedPeriodId != null && (
          <Badge variant="outline" className="text-sm font-normal">
            {selectedPeriodLabel}
          </Badge>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="glass-card p-5">
          <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5 text-slate-800 dark:text-white/80">
              <Store className="w-3.5 h-3.5" />
              Merchants
            </h3>
          <p className="text-2xl font-bold">{stats.totalMerchants}</p>
          </div>
        <div className="glass-card p-5">
          <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5 text-slate-800 dark:text-white/80">
              <Hash className="w-3.5 h-3.5" />
              Transactions
            </h3>
          <p className="text-2xl font-bold">{stats.totalTransactions}</p>
          </div>
        <div className="glass-card p-5">
          <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5 text-slate-800 dark:text-white/80">
              <BarChart3 className="w-3.5 h-3.5" />
              Total Spent
            </h3>
          <p className="text-lg font-bold text-slate-800 dark:text-slate-100">
              {formatIdr(stats.totalSpent)}
            </p>
          </div>
        <div className="glass-card p-5">
          <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5 text-slate-800 dark:text-white/80">
              <TrendingUp className="w-3.5 h-3.5" />
              Avg / Merchant
            </h3>
          <p className="text-lg font-bold">
              {formatIdr(stats.avgPerMerchant)}
            </p>
          </div>
        <div className="glass-card p-5">
          <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5 text-slate-800 dark:text-white/80">
              <Sparkles className="w-3.5 h-3.5" />
              Top Merchant
            </h3>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate" title={stats.topMerchant?.title}>
              {stats.topMerchant?.title ?? '—'}
            </p>
            {stats.topMerchant && (
              <p className="text-xs text-slate-500">
                {formatIdr(stats.topMerchant.totalPaid)}
              </p>
            )}
          </div>
      </div>

      {/* New Merchants Alert */}
      {newMerchants.length > 0 && viewMode === 'period' && (
        <div className="glass-card p-5 border-gold-400/20 dark:border-gold-700/40 bg-gold-500/5 dark:bg-gold-700/20">
          <h3 className="text-sm font-semibold text-gold-700 dark:text-gold-300 flex items-center gap-2 text-slate-800 dark:text-white/80">
              <Sparkles className="w-4 h-4" />
              New Merchants This Period
            </h3>
            <p className="text-xs text-gold-600 dark:text-gold-400 text-slate-600 dark:text-white/50">
              {newMerchants.length} merchant{newMerchants.length !== 1 ? 's' : ''} appearing for the first time
            </p>
          <div className="flex flex-wrap gap-2">
              {newMerchants.slice(0, 15).map((m) => (
                <Badge
                  key={m.title}
                  variant="outline"
                  className="text-xs bg-white dark:bg-slate-800 border-gold-400/30 dark:border-gold-700"
                >
                  {m.title}
                  <span className="ml-1.5 text-gold-600 dark:text-gold-400 font-mono">
                    {formatIdr(m.totalPaid)}
                  </span>
                </Badge>
              ))}
              {newMerchants.length > 15 && (
                <Badge variant="secondary" className="text-xs">
                  +{newMerchants.length - 15} more
                </Badge>
              )}
            </div>
          </div>
      )}

      {/* Merchant Table */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold flex items-center gap-2 text-slate-800 dark:text-white/80">
                <Store className="w-4 h-4 text-slate-500" />
                {viewMode === 'period'
                  ? `Merchants — ${selectedPeriodLabel}`
                  : 'All-Time Merchant Summary'}
              </h3>
              <p className="text-xs mt-0.5 text-slate-600 dark:text-white/50">
                {sortedMerchants.length} merchant{sortedMerchants.length !== 1 ? 's' : ''}
                {selectedCategory !== 'all' && ` in "${selectedCategory}"`}
              </p>
            </div>
          </div>
        {sortedMerchants.length === 0 ? (
            <div className="text-center py-12">
              <Store className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                No merchant data available{selectedCategory !== 'all' ? ` for category "${selectedCategory}"` : ''}.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <SortableHeader
                      sortKey="title"
                      currentDirection={isSorted('title')}
                      onSort={toggleSort}
                    >
                      Merchant
                    </SortableHeader>
                    <SortableHeader
                      sortKey="category"
                      currentDirection={isSorted('category')}
                      onSort={toggleSort}
                    >
                      Category
                    </SortableHeader>
                    <SortableHeader
                      sortKey="totalPaid"
                      currentDirection={isSorted('totalPaid')}
                      onSort={toggleSort}
                      className="justify-end"
                    >
                      Total
                    </SortableHeader>
                    <SortableHeader
                      sortKey="txCount"
                      currentDirection={isSorted('txCount')}
                      onSort={toggleSort}
                      className="justify-end"
                    >
                      Count
                    </SortableHeader>
                    <SortableHeader
                      sortKey="avgAmount"
                      currentDirection={isSorted('avgAmount')}
                      onSort={toggleSort}
                      className="justify-end"
                    >
                      Avg
                    </SortableHeader>
                    <SortableHeader
                      sortKey="maxAmount"
                      currentDirection={isSorted('maxAmount')}
                      onSort={toggleSort}
                      className="justify-end"
                    >
                      Max
                    </SortableHeader>
                    {viewMode === 'all' && (
                      <SortableHeader
                        sortKey="periods"
                        currentDirection={isSorted('periods')}
                        onSort={toggleSort}
                        className="justify-end"
                      >
                        Periods
                      </SortableHeader>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedMerchants.map((m, idx) => (
                    <TableRow key={m.title}>
                      <TableCell className="text-xs text-slate-400 w-8">
                        {idx + 1}
                      </TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate" title={m.title}>
                        {m.title}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {categoryColors[m.category] && (
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: categoryColors[m.category] }}
                            />
                          )}
                          <span className="text-xs">{m.category}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatIdr(m.totalPaid)}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {m.txCount}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-slate-500">
                        {formatIdr(m.avgAmount)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-slate-500">
                        {formatIdr(m.maxAmount)}
                      </TableCell>
                      {viewMode === 'all' && (
                        <TableCell className="text-right text-sm">
                          <Badge variant="secondary" className="text-xs">
                            {m.periods}
                          </Badge>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

      {/* All-Time: Most Frequent Merchants */}
      {viewMode === 'all' && frequentMerchants.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-base font-semibold flex items-center gap-2 text-slate-800 dark:text-white/80">
              <Clock className="w-4 h-4 text-slate-500" />
              Most Frequent Merchants
            </h3>
            <p className="text-xs text-slate-600 dark:text-white/50">
              Top 10 merchants by transaction count across all periods
            </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {frequentMerchants.map((m) => {
                const maxCount = frequentMerchants[0]?.txCount ?? 1;
                const barWidth = (m.txCount / maxCount) * 100;
                return (
                  <div
                    key={m.title}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium truncate" title={m.title}>
                          {m.title}
                        </span>
                        <span className="text-xs text-slate-500 ml-2 shrink-0">
                          {m.txCount}x
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                          <div
                            className="bg-mint-500/30 dark:bg-mint-400 h-1.5 rounded-full transition-all"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono shrink-0">
                          {formatIdr(m.totalPaid)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
      )}
    </div>
  );
}
