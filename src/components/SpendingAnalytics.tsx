import React, { useState, useMemo, useEffect } from 'react';
import type { MonthlySummary, Category, Transaction } from '../lib/data';
import { formatIdr, getMonthSortKey } from '../lib/utils';
import { fetchTransactions } from '../lib/api';
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
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import {
  TrendingUp,
  TrendingDown,
  Zap,
  BarChart3,
  PieChart,
  Hash,
  Activity,
  Target,
  Clock,
} from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement,
);

interface DailySpending {
  day: string;
  tx_count: number;
  paid_amount: number;
  total_amount: number;
}

interface DayOfWeekRow {
  dow: number;
  tx_count: number;
  paid_amount: number;
  avg_paid: number;
}

interface TxStats {
  total: number;
  count: number;
  paid_count: number;
  unpaid_count: number;
  avg_amount: number;
  median_amount: number;
  min_amount: number;
  max_amount: number;
  largest_title: string;
  smallest_title: string;
  paid_amount: number;
  unpaid_amount: number;
}

interface Velocity {
  current_avg_daily: number;
  historical_avg_daily: number;
  days_with_spending: number;
  days_tracked: number;
  cumulative_spend: number;
  projected_monthly: number;
  velocity_vs_history: number;
}

interface TitleSpending {
  title: string;
  category: string;
  paid_amount: number;
  total_amount: number;
  tx_count: number;
  avg_amount: number;
  max_amount: number;
  min_amount: number;
}

interface AnalyticsData {
  daily: DailySpending[];
  dow: DayOfWeekRow[];
  stats: TxStats;
  velocity: Velocity;
  titleSpending: TitleSpending[];
}

interface Props {
  summaries: MonthlySummary[];
  categories: Category[];
}

const DOW_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DOW_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const FALLBACK_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
];

export default function SpendingAnalytics({ summaries, categories }: Props) {
  const months = useMemo(() => {
    return [...summaries]
      .sort((a, b) => getMonthSortKey(b.month) - getMonthSortKey(a.month))
      .map((s) => s.month);
  }, [summaries]);

  const [selectedMonth, setSelectedMonth] = useState<string>(months[0] || '');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  // Category drill-down dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [categoryTxs, setCategoryTxs] = useState<Transaction[]>([]);

  const categoryMap = useMemo(() => {
    const map: Record<string, Category> = {};
    categories.forEach((c) => {
      map[c.name] = c;
    });
    return map;
  }, [categories]);

  useEffect(() => {
    if (!selectedMonth) return;
    setLoading(true);
    fetch(`/api/analytics?month=${encodeURIComponent(selectedMonth)}`)
      .then((res) => res.json())
      .then((json) => setData(json))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [selectedMonth]);

  // ─── ALL hooks must be before any early return ──────────────────

  // Fallback empty data so hooks below always get called
  const daily = data?.daily ?? [];
  const dow = data?.dow ?? [];
  const stats = data?.stats;
  const velocity = data?.velocity;
  const titleSpending = data?.titleSpending ?? [];

  // Compute top categories for the selected month
  const topCategories = useMemo(() => {
    const summary = summaries.find((s) => s.month === selectedMonth);
    if (!summary?.category_totals) return [];
    return Object.entries(summary.category_totals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([name, amount]) => ({
        name,
        amount,
        color: categoryMap[name]?.color || '#64748b',
        limit: categoryMap[name]?.monthly_limit ?? 0,
      }));
  }, [selectedMonth, summaries, categoryMap]);

  // Compute previous month comparison for top categories
  const prevMonthCategories = useMemo(() => {
    const currentIdx = months.indexOf(selectedMonth);
    if (currentIdx < 0 || currentIdx >= months.length - 1) return null;
    const prevMonth = months[currentIdx + 1];
    const prevSummary = summaries.find((s) => s.month === prevMonth);
    return prevSummary?.category_totals ?? null;
  }, [selectedMonth, months, summaries]);

  // ─── Top Merchants (Title Spending) ────────────────────────────
  const topMerchants = useMemo(() => {
    if (!titleSpending || titleSpending.length === 0) return [];
    return titleSpending
      .filter((t) => t.paid_amount > 0)
      .slice(0, 10);
  }, [titleSpending]);

  const merchantChartData = useMemo(() => {
    if (topMerchants.length === 0) return null;
    const reversed = [...topMerchants].reverse();
    return {
      labels: reversed.map((t) => t.title.length > 25 ? t.title.slice(0, 25) + '...' : t.title),
      datasets: [
        {
          label: 'Paid Amount',
          data: reversed.map((t) => t.paid_amount),
          backgroundColor: reversed.map((t) => {
            const catColor = categoryMap[t.category]?.color;
            if (catColor) return catColor + 'CC';
            return 'rgba(99, 102, 241, 0.7)';
          }),
          borderRadius: 4,
          borderSkipped: false,
        },
      ],
    };
  }, [topMerchants, categoryMap]);

  // Chart data (always computed, even when data is null — React hook rules)
  const dailyChartData = useMemo(() => ({
    labels: daily.map((d) => {
      const date = new Date(d.day + 'T00:00:00');
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }),
    datasets: [
      {
        label: 'Daily Spending',
        data: daily.map((d) => d.paid_amount),
        borderColor: '#818cf8',
        backgroundColor: 'rgba(129, 140, 248, 0.08)',
        fill: true,
        tension: 0.3,
        pointRadius: daily.length > 20 ? 2 : 4,
        pointHoverRadius: 6,
      },
      {
        label: 'Historical Avg',
        data: daily.map(() => velocity?.historical_avg_daily ?? 0),
        borderColor: 'rgba(255,255,255,0.15)',
        borderDash: [6, 4],
        borderWidth: 1,
        pointRadius: 0,
        fill: false,
      },
    ],
  }), [daily, velocity]);

  const dowChartData = useMemo(() => ({
    labels: DOW_SHORT,
    datasets: [
      {
        label: 'Total Spent',
        data: DOW_LABELS.map((_, i) => {
          const row = dow.find((d) => d.dow === i);
          return row?.paid_amount ?? 0;
        }),
        backgroundColor: DOW_LABELS.map((_, i) => {
          const row = dow.find((d) => d.dow === i);
          if (!row) return 'rgba(100, 116, 139, 0.5)';
          return i === 0 || i === 6
            ? 'rgba(129, 140, 248, 0.6)'
            : 'rgba(52, 211, 153, 0.6)';
        }),
        borderRadius: 6,
      },
    ],
  }), [dow]);

  const catChartData = useMemo(() => ({
    labels: topCategories.map((c) => c.name),
    datasets: [
      {
        data: topCategories.map((c) => c.amount),
        backgroundColor: topCategories.map((c) => c.color),
        borderWidth: 2,
        borderColor: '#0a0e27',
      },
    ],
  }), [topCategories]);

  const openCategoryDrillDown = async (cat: string) => {
    setSelectedCategory(cat);
    setDialogOpen(true);
    try {
      const txs = await fetchTransactions({ month: selectedMonth, category: cat });
      setCategoryTxs(txs);
    } catch {
      setCategoryTxs([]);
    }
  };

  // ─── Render (early returns AFTER all hooks) ────────────────────

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white/30">Loading analytics...</div>
      </div>
    );
  }

  if (!data || !stats || !velocity) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white/30">No data available for this period.</div>
      </div>
    );
  }

  const velocityUp = velocity.velocity_vs_history >= 0;

  return (
    <div className="space-y-6">
      {/* Month Selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-white/60">Period:</label>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[200px]">
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

      {/* ─── Velocity / KPI Row ─────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <Zap className="w-4 h-4 text-mint-400 mb-1.5" />
          <span className="text-[10px] font-medium text-white/40 uppercase tracking-wider">Avg Daily</span>
          <div className="text-xl font-bold text-white mt-1">{formatIdr(velocity.current_avg_daily)}</div>
          <div className={`text-xs mt-1 ${velocityUp ? 'text-red-400' : 'text-emerald-400'}`}>
            {velocityUp ? '↑' : '↓'} {Math.abs(velocity.velocity_vs_history).toFixed(0)}% vs avg
          </div>
        </div>

        <div className="glass-card p-4">
          <Target className="w-4 h-4 text-emerald-400 mb-1.5" />
          <span className="text-[10px] font-medium text-white/40 uppercase tracking-wider">Projected</span>
          <div className="text-xl font-bold text-white mt-1">{formatIdr(velocity.projected_monthly)}</div>
          <div className="text-xs text-white/30 mt-1">Based on {velocity.days_with_spending} spending days</div>
        </div>

        <div className="glass-card p-4">
          <Clock className="w-4 h-4 text-gold-400 mb-1.5" />
          <span className="text-[10px] font-medium text-white/40 uppercase tracking-wider">Cumulative</span>
          <div className="text-xl font-bold text-white mt-1">{formatIdr(velocity.cumulative_spend)}</div>
          <div className="text-xs text-white/30 mt-1">Over {velocity.days_tracked} tracked days</div>
        </div>

        <div className="glass-card p-4">
          <Hash className="w-4 h-4 text-mint-400 mb-1.5" />
          <span className="text-[10px] font-medium text-white/40 uppercase tracking-wider">Transactions</span>
          <div className="text-xl font-bold text-white mt-1">{stats.count}</div>
          <div className="text-xs text-white/30 mt-1">
            {stats.paid_count} paid · {stats.unpaid_count} unpaid
          </div>
        </div>
      </div>

      {/* ─── Daily Spending Trend ─────────────────────────────── */}
      {daily.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="flex items-center gap-2 text-base font-semibold text-white/80">
            <Activity className="w-4 h-4 text-white/40" />
            Daily Spending Trend
          </h3>
          <p className="text-xs text-white/30 mb-3">Daily paid spending vs historical average (dashed line)</p>
          <div className="h-[280px]">
            <Line data={dailyChartData} options={{
              responsive: true, maintainAspectRatio: false,
              plugins: { legend: { display: true, position: 'top' as const, labels: { boxWidth: 12, font: { size: 11 } } }, tooltip: { callbacks: { label: (ctx: any) => `${ctx.dataset.label}: ${formatIdr(ctx.raw as number)}` } } },
              scales: { x: { grid: { display: false }, ticks: { font: { size: 10 }, maxRotation: 45 } }, y: { beginAtZero: true, ticks: { font: { size: 10 }, callback: (val: any) => { const n = Number(val); if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`; if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`; return val; } } } },
              interaction: { intersect: false, mode: 'index' as const },
            }} />
          </div>
        </div>
      )}

      {/* ─── Two-column: Day of Week + Top Categories ────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-5">
          <h3 className="flex items-center gap-2 text-base font-semibold text-white/80">
            <BarChart3 className="w-4 h-4 text-white/40" />
            Spending by Day of Week
          </h3>
          <p className="text-xs text-white/30 mb-3">All-time totals. Weekends in purple, weekdays in green.</p>
          <div className="h-[250px]">
            <Bar data={dowChartData} options={{
              responsive: true, maintainAspectRatio: false,
              plugins: { legend: { display: false }, tooltip: { callbacks: { title: (items: any) => DOW_LABELS[items[0]?.dataIndex ?? 0], afterBody: (items: any) => { const row = dow.find((d: any) => d.dow === (items[0]?.dataIndex ?? 0)); return row ? `${row.tx_count} transactions` : ''; }, label: (ctx: any) => `Total: ${formatIdr(ctx.raw as number)}` } } },
              scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { font: { size: 10 }, callback: (val: any) => { const n = Number(val); if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`; if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`; return val; } } } },
            }} />
          </div>
        </div>

        <div className="glass-card p-5">
          <h3 className="flex items-center gap-2 text-base font-semibold text-white/80">
            <PieChart className="w-4 h-4 text-white/40" />
            Category Breakdown
          </h3>
          <p className="text-xs text-white/30 mb-3">Click a category below to drill down into transactions.</p>
          {topCategories.length > 0 ? (
            <>
              <div className="h-[200px] mx-auto" style={{ maxWidth: 200 }}>
                <Doughnut data={catChartData} options={{
                  responsive: true, maintainAspectRatio: false, cutout: '55%',
                  plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx: any) => `${ctx.label}: ${formatIdr(ctx.raw as number)}` } } },
                }} />
              </div>
              <div className="mt-4 space-y-2">
                {topCategories.map((cat) => {
                  const prev = prevMonthCategories?.[cat.name];
                  const prevPct = prev ? ((cat.amount - prev) / prev) * 100 : null;
                  return (
                    <div
                      key={cat.name}
                      className="flex items-center justify-between text-sm cursor-pointer hover:bg-white/[0.04] rounded px-2 py-1 -mx-2 transition"
                      onClick={() => openCategoryDrillDown(cat.name)}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: cat.color }} />
                        <span className="text-white/70">{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white/90">{formatIdr(cat.amount)}</span>
                        {prevPct !== null && (
                          <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${prevPct > 0 ? 'bg-red-500/10 text-red-300' : 'bg-emerald-500/10 text-emerald-300'}`}>
                            {prevPct > 0 ? '↑' : '↓'}{Math.abs(prevPct).toFixed(0)}%
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="text-sm text-white/30 h-[200px] flex items-center justify-center">No spending data for this period</div>
          )}
        </div>
      </div>

      {/* ─── Transaction Statistics Table ───────────────────── */}
      <div className="glass-card p-5">
        <h3 className="flex items-center gap-2 text-base font-semibold text-white/80 mb-3">
          <Hash className="w-4 h-4 text-white/40" />
          Transaction Statistics
        </h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-white/40">Metric</TableHead>
              <TableHead className="text-right text-white/40">Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow><TableCell className="text-white/60">Total Paid Spending</TableCell><TableCell className="text-right font-semibold text-white/90">{formatIdr(stats.paid_amount)}</TableCell></TableRow>
            <TableRow><TableCell className="text-white/60">Unpaid Total</TableCell><TableCell className="text-right font-semibold text-gold-400">{formatIdr(stats.unpaid_amount)}</TableCell></TableRow>
            <TableRow><TableCell className="text-white/60">Average Transaction (paid)</TableCell><TableCell className="text-right text-white/80">{formatIdr(stats.avg_amount)}</TableCell></TableRow>
            <TableRow><TableCell className="text-white/60">Median Transaction (paid)</TableCell><TableCell className="text-right text-white/80">{formatIdr(stats.median_amount)}</TableCell></TableRow>
            <TableRow><TableCell className="text-white/60">Largest Transaction</TableCell><TableCell className="text-right"><span className="font-semibold text-white/90">{formatIdr(stats.max_amount)}</span>{stats.largest_title && <span className="text-xs text-white/30 ml-2">{stats.largest_title}</span>}</TableCell></TableRow>
            <TableRow><TableCell className="text-white/60">Smallest Transaction</TableCell><TableCell className="text-right"><span className="font-semibold text-white/90">{formatIdr(stats.min_amount)}</span>{stats.smallest_title && <span className="text-xs text-white/30 ml-2">{stats.smallest_title}</span>}</TableCell></TableRow>
            <TableRow><TableCell className="text-white/60">Total Transactions</TableCell><TableCell className="text-right text-white/80">{stats.count}</TableCell></TableRow>
            <TableRow><TableCell className="text-white/60">Paid / Unpaid</TableCell><TableCell className="text-right"><span className="text-emerald-400">{stats.paid_count}</span><span className="text-white/30 mx-1">/</span><span className="text-gold-400">{stats.unpaid_count}</span></TableCell></TableRow>
          </TableBody>
        </Table>
      </div>

      {/* ─── Spending Velocity Insight ───────────────────────── */}
      <div className="glass-card p-5">
        <h3 className="flex items-center gap-2 text-base font-semibold text-white/80 mb-3">
          <Zap className="w-4 h-4 text-white/40" />
          Spending Velocity
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="text-center"><div className="text-sm text-white/40 mb-1">Current Avg / Day</div><div className="text-lg font-bold text-white">{formatIdr(velocity.current_avg_daily)}</div></div>
          <div className="text-center"><div className="text-sm text-white/40 mb-1">Historical Avg / Day</div><div className="text-lg font-bold text-white">{formatIdr(velocity.historical_avg_daily)}</div></div>
          <div className="text-center">
            <div className="text-sm text-white/40 mb-1">vs Historical</div>
            <div className={`text-lg font-bold ${velocityUp ? 'text-red-400' : 'text-emerald-400'}`}>{velocityUp ? '+' : ''}{velocity.velocity_vs_history.toFixed(1)}%</div>
            <div className="flex items-center justify-center gap-1 mt-1">
              {velocityUp ? <TrendingUp className="w-4 h-4 text-red-400" /> : <TrendingDown className="w-4 h-4 text-emerald-400" />}
              <span className="text-xs text-white/40">{Math.abs(velocity.velocity_vs_history) > 20 ? (velocityUp ? 'Spending significantly higher than usual' : 'Great — spending well below average') : Math.abs(velocity.velocity_vs_history) > 5 ? (velocityUp ? 'Slightly above your typical pace' : 'Slightly below your typical pace') : 'On track with your historical average'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Top Merchants ───────────────────────────────────── */}
      {topMerchants.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="flex items-center gap-2 text-base font-semibold text-white/80">
            <Hash className="w-4 h-4 text-white/40" />
            Top Merchants
          </h3>
          <p className="text-xs text-white/30 mb-3">Where your money went this period — grouped by transaction title.</p>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {merchantChartData && (
              <div className="lg:col-span-3 h-[320px]">
                <Bar data={merchantChartData} options={{
                  indexAxis: 'y' as const, responsive: true, maintainAspectRatio: false,
                  plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx: any) => { const merchant = topMerchants[topMerchants.length - 1 - (ctx.dataIndex ?? 0)]; if (!merchant) return formatIdr(ctx.raw as number); return [`Total: ${formatIdr(merchant.paid_amount)}`, `Transactions: ${merchant.tx_count}`, `Avg: ${formatIdr(merchant.avg_amount)}`, `Category: ${merchant.category}`]; } } } },
                  scales: { x: { beginAtZero: true, ticks: { font: { size: 10 }, callback: (val: any) => { const n = Number(val); if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`; if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`; return val; } } }, y: { ticks: { font: { size: 10 } } } },
                }} />
              </div>
            )}
            <div className="lg:col-span-2">
              <Table>
                <TableHeader><TableRow><TableHead className="text-xs text-white/40">Merchant</TableHead><TableHead className="text-xs text-right text-white/40">Spent</TableHead><TableHead className="text-xs text-right text-white/40">#</TableHead></TableRow></TableHeader>
                <TableBody>
                  {topMerchants.map((m) => (
                    <TableRow key={m.title}>
                      <TableCell className="text-xs py-1.5"><div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: categoryMap[m.category]?.color || '#64748b' }} /><span className="truncate max-w-[140px] text-white/80" title={m.title}>{m.title}</span></div></TableCell>
                      <TableCell className="text-xs text-right font-medium py-1.5 text-white/90">{formatIdr(m.paid_amount)}</TableCell>
                      <TableCell className="text-xs text-right text-white/30 py-1.5">{m.tx_count}x</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {/* ─── Category Drill-down Dialog ─────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto bg-navy-800 border-white/[0.08]">
          <DialogHeader>
            <DialogTitle className="text-white">Category: {selectedCategory}</DialogTitle>
            <DialogDescription className="text-white/40">Transactions for {selectedCategory} in {selectedMonth}</DialogDescription>
          </DialogHeader>
          {categoryTxs.length > 0 ? (
            <Table>
              <TableHeader><TableRow><TableHead className="text-white/50">Title</TableHead><TableHead className="text-white/50">Type</TableHead><TableHead className="text-right text-white/50">Amount</TableHead></TableRow></TableHeader>
              <TableBody>
                {categoryTxs.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="flex items-center gap-2"><span className={tx.done ? 'text-white/80' : 'text-white/40'}>{tx.title}</span>{!tx.done && <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-white/[0.1] text-white/50">Unpaid</Badge>}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-[10px]">{tx.type === 'cash' ? 'Cash' : tx.type === 'credit_payment' ? 'Credit Pay' : 'Credit'}</Badge></TableCell>
                    <TableCell className="text-right font-medium text-white/90">{formatIdr(tx.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-white/30">No transactions found for this category.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
