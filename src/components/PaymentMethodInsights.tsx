import React, { useMemo, useState } from 'react';
import type { Transaction, MonthlySummary, Category } from '../lib/data';
import { formatIdr, formatNumber } from '../lib/utils';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
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
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { useSortState } from '../hooks/useSortState';
import SortableHeader from './SortableHeader';
import {
  Wallet,
  CreditCard,
  Banknote,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  PieChart,
  Activity,
  Percent,
  Scale,
} from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface PeriodTypeBreakdown {
  period_id: number;
  month: string;
  cash_total: number;
  cash_count: number;
  credit_expense_total: number;
  credit_expense_count: number;
  credit_payment_total: number;
  credit_payment_count: number;
  total_spending: number; // cash + credit_expense (actual spending, not payments)
}

interface MerchantTypeRow {
  title: string;
  category: string;
  cash_total: number;
  cash_count: number;
  credit_total: number;
  credit_count: number;
  total: number;
  credit_pct: number;
}

interface Props {
  transactions: Transaction[];
  summaries: MonthlySummary[];
  categories: Category[];
}

// Color palette for cash vs credit
const CASH_COLOR = '#10b981';    // emerald
const CREDIT_COLOR = '#8b5cf6'; // violet
const PAYMENT_COLOR = '#f59e0b'; // amber
const MIXED_COLOR = '#06b6d4';   // cyan

export default function PaymentMethodInsights({
  transactions,
  summaries,
  categories,
}: Props) {
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(
    summaries.length > 0 ? summaries[summaries.length - 1].period_id : null
  );
  const [viewMode, setViewMode] = useState<'period' | 'all'>('all');

  const periodOptions = useMemo(() => {
    return summaries.map((s) => ({ id: s.period_id, month: s.month }));
  }, [summaries]);

  const activeSummary = useMemo(() => {
    return summaries.find((s) => s.period_id === selectedPeriodId) ?? null;
  }, [summaries, selectedPeriodId]);

  // ── Per-period breakdown ──
  const periodBreakdowns = useMemo((): PeriodTypeBreakdown[] => {
    const map = new Map<number, PeriodTypeBreakdown>();
    for (const s of summaries) {
      map.set(s.period_id, {
        period_id: s.period_id,
        month: s.month,
        cash_total: 0,
        cash_count: 0,
        credit_expense_total: 0,
        credit_expense_count: 0,
        credit_payment_total: 0,
        credit_payment_count: 0,
        total_spending: 0,
      });
    }

    for (const tx of transactions) {
      if (!tx.done) continue;
      const pb = map.get(tx.period_id);
      if (!pb) continue;
      switch (tx.type) {
        case 'cash':
          pb.cash_total += tx.amount;
          pb.cash_count++;
          break;
        case 'credit_expense':
          pb.credit_expense_total += tx.amount;
          pb.credit_expense_count++;
          break;
        case 'credit_payment':
          pb.credit_payment_total += tx.amount;
          pb.credit_payment_count++;
          break;
      }
    }

    // Compute total spending (cash + credit_expense only)
    for (const pb of map.values()) {
      pb.total_spending = pb.cash_total + pb.credit_expense_total;
    }

    return Array.from(map.values()).sort(
      (a, b) => {
        const ai = summaries.findIndex((s) => s.period_id === a.period_id);
        const bi = summaries.findIndex((s) => s.period_id === b.period_id);
        return ai - bi;
      }
    );
  }, [transactions, summaries]);

  // ── All-time aggregates ──
  const allTimeStats = useMemo(() => {
    let cashTotal = 0;
    let cashCount = 0;
    let creditExpenseTotal = 0;
    let creditExpenseCount = 0;
    let creditPaymentTotal = 0;
    let creditPaymentCount = 0;
    for (const pb of periodBreakdowns) {
      cashTotal += pb.cash_total;
      cashCount += pb.cash_count;
      creditExpenseTotal += pb.credit_expense_total;
      creditExpenseCount += pb.credit_expense_count;
      creditPaymentTotal += pb.credit_payment_total;
      creditPaymentCount += pb.credit_payment_count;
    }
    const totalSpending = cashTotal + creditExpenseTotal;
    const cashPct = totalSpending > 0 ? (cashTotal / totalSpending) * 100 : 0;
    const creditPct = totalSpending > 0 ? (creditExpenseTotal / totalSpending) * 100 : 0;
    const avgCashTx = cashCount > 0 ? cashTotal / cashCount : 0;
    const avgCreditTx = creditExpenseCount > 0 ? creditExpenseTotal / creditExpenseCount : 0;

    return {
      cashTotal, cashCount, creditExpenseTotal, creditExpenseCount,
      creditPaymentTotal, creditPaymentCount, totalSpending,
      cashPct, creditPct, avgCashTx, avgCreditTx,
    };
  }, [periodBreakdowns]);

  // ── Selected period stats ──
  const periodStats = useMemo(() => {
    if (!selectedPeriodId) return null;
    const pb = periodBreakdowns.find((p) => p.period_id === selectedPeriodId);
    if (!pb) return null;
    const totalSpending = pb.cash_total + pb.credit_expense_total;
    const cashPct = totalSpending > 0 ? (pb.cash_total / totalSpending) * 100 : 0;
    const creditPct = totalSpending > 0 ? (pb.credit_expense_total / totalSpending) * 100 : 0;
    const avgCashTx = pb.cash_count > 0 ? pb.cash_total / pb.cash_count : 0;
    const avgCreditTx = pb.credit_expense_count > 0 ? pb.credit_expense_total / pb.credit_expense_count : 0;
    return {
      ...pb,
      totalSpending,
      cashPct,
      creditPct,
      avgCashTx,
      avgCreditTx,
    };
  }, [selectedPeriodId, periodBreakdowns]);

  const displayStats = viewMode === 'period' ? periodStats : allTimeStats;

  // ── Credit Utilization Trend ──
  const utilizationData = useMemo(() => {
    const last12 = periodBreakdowns.slice(-12);
    return {
      labels: last12.map((p) => {
        // Shorten label: "Jun 2026" → "Jun '26"
        const parts = p.month.split(' ');
        return parts.length === 2 ? `${parts[0].slice(0, 3)} '${parts[1].slice(2)}` : p.month;
      }),
      payments: last12.map((p) => p.credit_payment_total),
      charges: last12.map((p) => p.credit_expense_total),
    };
  }, [periodBreakdowns]);

  // ── Merchant-level breakdown (by type) for selected period ──
  const merchantTypeRows = useMemo((): MerchantTypeRow[] => {
    const periodTxs = viewMode === 'period'
      ? transactions.filter((t) => t.period_id === selectedPeriodId && t.done && t.type !== 'credit_payment')
      : transactions.filter((t) => t.done && t.type !== 'credit_payment');

    const map = new Map<string, MerchantTypeRow>();
    for (const tx of periodTxs) {
      const key = tx.title.toLowerCase().trim();
      if (!map.has(key)) {
        map.set(key, {
          title: tx.title,
          category: tx.category,
          cash_total: 0,
          cash_count: 0,
          credit_total: 0,
          credit_count: 0,
          total: 0,
          credit_pct: 0,
        });
      }
      const row = map.get(key)!;
      row.total += tx.amount;
      if (tx.type === 'cash') {
        row.cash_total += tx.amount;
        row.cash_count++;
      } else {
        row.credit_total += tx.amount;
        row.credit_count++;
      }
    }

    // Compute credit_pct and filter to merchants with both types or significant totals
    const results: MerchantTypeRow[] = [];
    for (const row of map.values()) {
      row.credit_pct = row.total > 0 ? (row.credit_total / row.total) * 100 : 0;
      results.push(row);
    }

    return results;
  }, [transactions, selectedPeriodId, viewMode]);

  // Sort merchant rows
  const { sort, toggleSort, sortData, isSorted } = useSortState();
  const getCellValue = (m: MerchantTypeRow, key: string): number | string => {
    switch (key) {
      case 'title': return m.title.toLowerCase();
      case 'category': return m.category;
      case 'total': return m.total;
      case 'cash_total': return m.cash_total;
      case 'credit_total': return m.credit_total;
      case 'credit_pct': return m.credit_pct;
      case 'cash_count': return m.cash_count;
      case 'credit_count': return m.credit_count;
      default: return 0;
    }
  };
  const sortedMerchants = useMemo(() => {
    return sortData(
      merchantTypeRows,
      getCellValue,
      (data) => [...data].sort((a, b) => b.total - a.total)
    );
  }, [merchantTypeRows, sortData, getCellValue]);

  // Cash dependency score (higher = more reliant on cash)
  const cashDependencyScore = useMemo(() => {
    if (!displayStats || displayStats.totalSpending === 0) return 0;
    return Math.round(displayStats.cashPct);
  }, [displayStats]);

  // ── Chart configs ──

  // Cash vs Credit Trend (stacked bar)
  const trendChartData = useMemo(() => {
    const last12 = periodBreakdowns.slice(-12);
    return {
      labels: last12.map((p) => {
        const parts = p.month.split(' ');
        return parts.length === 2 ? `${parts[0].slice(0, 3)} '${parts[1].slice(2)}` : p.month;
      }),
      datasets: [
        {
          label: 'Cash',
          data: last12.map((p) => p.cash_total),
          backgroundColor: CASH_COLOR + 'cc',
          borderRadius: 2,
        },
        {
          label: 'Credit Card',
          data: last12.map((p) => p.credit_expense_total),
          backgroundColor: CREDIT_COLOR + 'cc',
          borderRadius: 2,
        },
      ],
    };
  }, [periodBreakdowns]);

  const trendChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { boxWidth: 12, padding: 16, font: { size: 12 } },
      },
      tooltip: {
        callbacks: {
          label: (ctx: any) => `${ctx.dataset.label}: ${formatIdr(ctx.parsed.y)}`,
          afterBody: (items: any[]) => {
            const total = items.reduce((s, i) => s + i.parsed.y, 0);
            return [`Total: ${formatIdr(total)}`];
          },
        },
      },
    },
    scales: {
      x: { stacked: true, grid: { display: false } },
      y: { stacked: true, beginAtZero: true, ticks: { callback: (v: any) => `${(v / 1000000).toFixed(0)}M` } },
    },
  };

  // Payment Split Doughnut
  const doughnutData = useMemo(() => {
    if (!displayStats) return { labels: [], datasets: [{ data: [] }] };
    return {
      labels: ['Cash', 'Credit Card'],
      datasets: [{
        data: [displayStats.cashTotal || displayStats.cash_total, displayStats.creditExpenseTotal || displayStats.credit_expense_total],
        backgroundColor: [CASH_COLOR, CREDIT_COLOR],
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.8)',
      }],
    };
  }, [displayStats]);

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    cutout: '65%',
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { boxWidth: 12, padding: 16, font: { size: 12 } },
      },
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            const total = ctx.dataset.data.reduce((s: number, v: number) => s + v, 0);
            const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : '0';
            return `${ctx.label}: ${formatIdr(ctx.parsed)} (${pct}%)`;
          },
        },
      },
    },
  };

  // Credit Utilization Line Chart
  const utilizationChartData = useMemo(() => {
    const last12 = periodBreakdowns.slice(-12);
    // Utilization ratio = credit_expense / credit_payment (how much of what was paid was actually spent)
    const ratios = last12.map((p) => {
      if (p.credit_payment_total === 0) return p.credit_expense_total > 0 ? 100 : null;
      return Math.min(100, (p.credit_expense_total / p.credit_payment_total) * 100);
    });

    return {
      labels: last12.map((p) => {
        const parts = p.month.split(' ');
        return parts.length === 2 ? `${parts[0].slice(0, 3)} '${parts[1].slice(2)}` : p.month;
      }),
      datasets: [
        {
          label: 'Utilization %',
          data: ratios,
          borderColor: PAYMENT_COLOR,
          backgroundColor: PAYMENT_COLOR + '22',
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 6,
          spanGaps: true,
        },
      ],
    };
  }, [periodBreakdowns]);

  const utilizationChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: any) => `Utilization: ${ctx.parsed.y?.toFixed(1) ?? 'N/A'}%`,
        },
      },
    },
    scales: {
      x: { grid: { display: false } },
      y: {
        beginAtZero: true,
        max: 100,
        ticks: { callback: (v: any) => `${v}%` },
      },
    },
  };

  // Average transaction size by period
  const avgTxSizeData = useMemo(() => {
    const last12 = periodBreakdowns.slice(-12);
    return {
      labels: last12.map((p) => {
        const parts = p.month.split(' ');
        return parts.length === 2 ? `${parts[0].slice(0, 3)} '${parts[1].slice(2)}` : p.month;
      }),
      datasets: [
        {
          label: 'Avg Cash Tx',
          data: last12.map((p) => p.cash_count > 0 ? p.cash_total / p.cash_count : null),
          borderColor: CASH_COLOR,
          backgroundColor: CASH_COLOR + '33',
          fill: false,
          tension: 0.4,
          pointRadius: 3,
          spanGaps: true,
        },
        {
          label: 'Avg Credit Tx',
          data: last12.map((p) => p.credit_expense_count > 0 ? p.credit_expense_total / p.credit_expense_count : null),
          borderColor: CREDIT_COLOR,
          backgroundColor: CREDIT_COLOR + '33',
          fill: false,
          tension: 0.4,
          pointRadius: 3,
          spanGaps: true,
        },
      ],
    };
  }, [periodBreakdowns]);

  const avgTxSizeOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { boxWidth: 12, padding: 16, font: { size: 12 } },
      },
      tooltip: {
        callbacks: {
          label: (ctx: any) => `${ctx.dataset.label}: ${formatIdr(ctx.parsed.y)}`,
        },
      },
    },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true },
    },
  };

  // Category-wise cash/credit split
  const categorySplitRows = useMemo(() => {
    const periodTxs = viewMode === 'period'
      ? transactions.filter((t) => t.period_id === selectedPeriodId && t.done && t.type !== 'credit_payment')
      : transactions.filter((t) => t.done && t.type !== 'credit_payment');

    const map = new Map<string, { category: string; cash: number; credit: number; total: number }>();
    for (const tx of periodTxs) {
      if (!map.has(tx.category)) {
        map.set(tx.category, { category: tx.category, cash: 0, credit: 0, total: 0 });
      }
      const row = map.get(tx.category)!;
      row.total += tx.amount;
      if (tx.type === 'cash') {
        row.cash += tx.amount;
      } else {
        row.credit += tx.amount;
      }
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [transactions, selectedPeriodId, viewMode]);

  const categoryColors = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of categories) map[c.name] = c.color;
    return map;
  }, [categories]);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Select
            value={viewMode}
            onValueChange={(v) => setViewMode(v as 'period' | 'all')}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="View mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="period">By Period</SelectItem>
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
        </div>

        {viewMode === 'period' && activeSummary && (
          <Badge variant="outline" className="text-sm font-normal">
            {activeSummary.month}
          </Badge>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Banknote className="w-3.5 h-3.5 text-emerald-500" />
              Cash Spending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold">{formatIdr(displayStats?.cashTotal ?? 0)}</p>
            <p className="text-xs text-slate-500 mt-1">
              {formatNumber(displayStats?.cashCount ?? 0)} transactions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-violet-500" />
              Credit Spending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold">{formatIdr(displayStats?.creditExpenseTotal ?? 0)}</p>
            <p className="text-xs text-slate-500 mt-1">
              {formatNumber(displayStats?.creditExpenseCount ?? 0)} transactions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-amber-500" />
              Cash Dependency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold">{cashDependencyScore}%</p>
              <Badge variant={cashDependencyScore > 70 ? 'secondary' : 'default'} className="text-xs">
                {cashDependencyScore > 70 ? 'Cash-heavy' : cashDependencyScore > 40 ? 'Mixed' : 'Credit-heavy'}
              </Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" />
              Avg Transaction Size
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-slate-500">Cash:</span>
                <span className="font-semibold">{formatIdr(displayStats?.avgCashTx ?? 0)}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full bg-violet-500" />
                <span className="text-slate-500">Credit:</span>
                <span className="font-semibold">{formatIdr(displayStats?.avgCreditTx ?? 0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cash vs Credit Stacked Bar */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-slate-500" />
              Cash vs Credit Spending
            </CardTitle>
            <CardDescription className="text-xs">
              Last 12 periods — actual spending (not credit card payments)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ height: 300 }}>
              <Bar data={trendChartData} options={trendChartOptions} />
            </div>
          </CardContent>
        </Card>

        {/* Payment Split Doughnut */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <PieChart className="w-4 h-4 text-slate-500" />
              {viewMode === 'period' && activeSummary
                ? `Payment Split — ${activeSummary.month}`
                : 'All-Time Payment Split'}
            </CardTitle>
            <CardDescription className="text-xs">
              How your spending is distributed between cash and credit card
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4">
              <div style={{ height: 260, width: 260 }}>
                <Doughnut data={doughnutData} options={doughnutOptions} />
              </div>
              {(displayStats?.cashPct ?? 0) > 0 && (
                <div className="flex gap-6 text-sm">
                  <div className="text-center">
                    <p className="text-emerald-600 dark:text-emerald-400 font-bold">
                      {(displayStats?.cashPct ?? 0).toFixed(1)}%
                    </p>
                    <p className="text-xs text-slate-500">Cash</p>
                  </div>
                  <div className="text-center">
                    <p className="text-violet-600 dark:text-violet-400 font-bold">
                      {(displayStats?.creditPct ?? 0).toFixed(1)}%
                    </p>
                    <p className="text-xs text-slate-500">Credit</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Credit Utilization Ratio */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Percent className="w-4 h-4 text-amber-500" />
              Credit Utilization Ratio
            </CardTitle>
            <CardDescription className="text-xs">
              Credit card spending as % of credit card payments. Below 100% = paying off more than charging.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ height: 260 }}>
              <Line data={utilizationChartData} options={utilizationChartOptions} />
            </div>
          </CardContent>
        </Card>

        {/* Average Transaction Size Trend */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-slate-500" />
              Average Transaction Size
            </CardTitle>
            <CardDescription className="text-xs">
              Average amount per transaction by payment method over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ height: 260 }}>
              <Line data={avgTxSizeData} options={avgTxSizeOptions} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category-wise Cash/Credit Split */}
      <Card>
        <CardHeader className="pb-3">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Wallet className="w-4 h-4 text-slate-500" />
              Category Payment Split
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              How each category is split between cash and credit card
              {viewMode === 'period' && activeSummary ? ` — ${activeSummary.month}` : ' — All Time'}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {categorySplitRows.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">No spending data available</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Cash</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right min-w-[140px]">Credit %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categorySplitRows.map((row) => {
                    const creditPct = row.total > 0 ? (row.credit / row.total) * 100 : 0;
                    const catColor = categoryColors[row.category] || '#64748b';
                    return (
                      <TableRow key={row.category}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: catColor }} />
                            <span className="font-medium text-sm">{row.category}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-sm">{formatIdr(row.cash)}</TableCell>
                        <TableCell className="text-right text-sm">{formatIdr(row.credit)}</TableCell>
                        <TableCell className="text-right font-semibold text-sm">{formatIdr(row.total)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${Math.min(100, creditPct)}%`,
                                  backgroundColor: creditPct > 50 ? CREDIT_COLOR : CASH_COLOR,
                                }}
                              />
                            </div>
                            <span className="text-xs font-mono text-slate-600 dark:text-slate-400 w-10 text-right">
                              {creditPct.toFixed(0)}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Merchant-level Cash/Credit Breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-violet-500" />
              Merchant Payment Breakdown
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              See how each merchant is paid — cash or credit
              {viewMode === 'period' && activeSummary ? ` — ${activeSummary.month}` : ' — All Time'}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {sortedMerchants.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">No merchant data available</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <SortableHeader sortKey="title" currentDirection={isSorted('title')} onSort={toggleSort}>
                      Merchant
                    </SortableHeader>
                    <SortableHeader sortKey="category" currentDirection={isSorted('category')} onSort={toggleSort}>
                      Category
                    </SortableHeader>
                    <SortableHeader sortKey="cash_total" currentDirection={isSorted('cash_total')} onSort={toggleSort} className="text-right">
                      Cash
                    </SortableHeader>
                    <SortableHeader sortKey="credit_total" currentDirection={isSorted('credit_total')} onSort={toggleSort} className="text-right">
                      Credit
                    </SortableHeader>
                    <SortableHeader sortKey="total" currentDirection={isSorted('total')} onSort={toggleSort} className="text-right">
                      Total
                    </SortableHeader>
                    <SortableHeader sortKey="credit_pct" currentDirection={isSorted('credit_pct')} onSort={toggleSort} className="text-right">
                      Credit %
                    </SortableHeader>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedMerchants.slice(0, 30).map((m, i) => (
                    <TableRow key={m.title}>
                      <TableCell className="text-xs text-slate-400">{i + 1}</TableCell>
                      <TableCell className="font-medium text-sm">{m.title}</TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          {formatIdr(m.cash_total)}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                          {formatIdr(m.credit_total)}
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-sm">{formatIdr(m.total)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(100, m.credit_pct)}%`,
                                backgroundColor: m.credit_pct > 50 ? CREDIT_COLOR : CASH_COLOR,
                              }}
                            />
                          </div>
                          <span className="text-xs font-mono text-slate-600 dark:text-slate-400 w-10 text-right">
                            {m.credit_pct.toFixed(0)}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
