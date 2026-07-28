import React, { useState, useEffect, useMemo } from 'react';
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
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
} from 'chart.js';
import { Doughnut, Line } from 'react-chartjs-2';
import { Repeat, Zap, TrendingUp, TrendingDown, ArrowRightLeft } from 'lucide-react';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler);

interface BreakdownPeriod {
  period_id: number;
  month: string;
  recurring: number;
  discretionary: number;
  total: number;
  recurring_pct: number;
  discretionary_pct: number;
  recurring_count: number;
  discretionary_count: number;
}

interface TopItem {
  title: string;
  category: string;
  amount: number;
}

interface BreakdownData {
  periods: BreakdownPeriod[];
  current: BreakdownPeriod | null;
  topRecurring: TopItem[];
}

export default function RecurringBreakdown() {
  const [data, setData] = useState<BreakdownData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = selectedPeriodId ? `?period_id=${selectedPeriodId}` : '';
    fetch(`/api/recurring-breakdown${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setError(d.error);
        } else {
          setData(d);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [selectedPeriodId]);

  // Periods for the selector
  const periods = useMemo(() => {
    if (!data) return [];
    return [...data.periods].reverse(); // newest first
  }, [data]);

  // Selected or current period
  const currentPeriod = useMemo(() => {
    if (!data) return null;
    if (selectedPeriodId) {
      return data.periods.find((p) => p.period_id === selectedPeriodId) || data.current;
    }
    return data.current;
  }, [data, selectedPeriodId]);

  // Donut chart data
  const donutData = useMemo(() => {
    if (!currentPeriod || currentPeriod.total === 0) return null;
    return {
      labels: ['Recurring', 'Discretionary'],
      datasets: [
        {
          data: [currentPeriod.recurring, currentPeriod.discretionary],
          backgroundColor: ['rgba(99, 102, 241, 0.8)', 'rgba(16, 185, 129, 0.8)'],
          borderColor: ['rgba(99, 102, 241, 1)', 'rgba(16, 185, 129, 1)'],
          borderWidth: 2,
          hoverBorderWidth: 3,
        },
      ],
    };
  }, [currentPeriod]);

  // Trend line chart data
  const trendData = useMemo(() => {
    if (!data || data.periods.length < 2) return null;
    const periods = data.periods;
    return {
      labels: periods.map((p) => p.month),
      datasets: [
        {
          label: 'Recurring %',
          data: periods.map((p) => p.recurring_pct),
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 4,
          pointHoverRadius: 6,
          yAxisID: 'y',
        },
        {
          label: 'Discretionary %',
          data: periods.map((p) => p.discretionary_pct),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 4,
          pointHoverRadius: 6,
          yAxisID: 'y',
        },
        {
          label: 'Discretionary Amount',
          data: periods.map((p) => p.discretionary),
          borderColor: '#f59e0b',
          backgroundColor: 'transparent',
          borderDash: [6, 4],
          borderWidth: 1.5,
          tension: 0.3,
          pointRadius: 2,
          yAxisID: 'y1',
        },
      ],
    };
  }, [data]);

  // Trend direction
  const trendDirection = useMemo(() => {
    if (!data || data.periods.length < 3) return null;
    const periods = data.periods;
    const firstHalf = periods.slice(0, Math.floor(periods.length / 2));
    const secondHalf = periods.slice(-Math.floor(periods.length / 2));
    const firstAvg = firstHalf.reduce((s, p) => s + p.recurring_pct, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((s, p) => s + p.recurring_pct, 0) / secondHalf.length;
    const diff = secondAvg - firstAvg;
    if (diff > 3) return 'rising';
    if (diff < -3) return 'falling';
    return 'stable';
  }, [data]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white/30 animate-pulse">Loading breakdown...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  if (!data || data.periods.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white/30">No transaction data available.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with period selector */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-mint-500" />
            Recurring vs Discretionary
          </h2>
          <p className="text-sm text-white/40">
            See how much of your spending is locked into recurring costs vs flexible
          </p>
        </div>
        <Select
          value={selectedPeriodId?.toString() ?? 'all'}
          onValueChange={(v) => setSelectedPeriodId(v === 'all' ? null : parseInt(v))}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All periods" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All periods</SelectItem>
            {periods.map((p) => (
              <SelectItem key={p.period_id} value={p.period_id.toString()}>
                {p.month}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards Row */}
      {currentPeriod && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-card p-5">
            <h3 className="text-sm font-medium text-white/40 text-white/80">
                Flexibility Score
              </h3>
            <div className="text-2xl font-bold">
                {currentPeriod.discretionary_pct}%
              </div>
              <p className="text-xs text-white/30 mt-1">
                of spending is flexible
              </p>
              {trendDirection && (
                <Badge
                  variant="outline"
                  className={`mt-2 text-xs ${
                    trendDirection === 'falling'
                      ? 'text-red-500 border-red-200'
                      : trendDirection === 'rising'
                      ? 'text-green-500 border-green-200'
                      : 'text-slate-500 border-slate-200'
                  }`}
                >
                  {trendDirection === 'falling' ? (
                    <TrendingDown className="w-3 h-3 mr-1" />
                  ) : trendDirection === 'rising' ? (
                    <TrendingUp className="w-3 h-3 mr-1" />
                  ) : null}
                  {trendDirection === 'falling'
                    ? 'Shrinking'
                    : trendDirection === 'rising'
                    ? 'Growing'
                    : 'Stable'}
                </Badge>
              )}
            </div>

          <div className="glass-card p-5">
            <h3 className="text-sm font-medium text-white/40 text-white/80">
                Recurring
              </h3>
            <div className="text-2xl font-bold text-mint-600 dark:text-mint-400">
                {formatIdr(currentPeriod.recurring)}
              </div>
              <p className="text-xs text-white/30 mt-1">
                {currentPeriod.recurring_count} transactions · {currentPeriod.recurring_pct}%
              </p>
            </div>

          <div className="glass-card p-5">
            <h3 className="text-sm font-medium text-white/40 text-white/80">
                Discretionary
              </h3>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatIdr(currentPeriod.discretionary)}
              </div>
              <p className="text-xs text-white/30 mt-1">
                {currentPeriod.discretionary_count} transactions · {currentPeriod.discretionary_pct}%
              </p>
            </div>

          <div className="glass-card p-5">
            <h3 className="text-sm font-medium text-white/40 text-white/80">
                Total Spending
              </h3>
            <div className="text-2xl font-bold">
                {formatIdr(currentPeriod.total)}
              </div>
              <p className="text-xs text-white/30 mt-1">
                {currentPeriod.month}
              </p>
            </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut Chart */}
        <div className="glass-card p-5">
          <h3 className="text-base flex items-center gap-2 text-white/80">
              <Repeat className="w-4 h-4 text-mint-500" />
              Current Breakdown
            </h3>
            <p className="text-white/50">
              {currentPeriod?.month || 'Latest period'}
            </p>
          {donutData ? (
              <div className="max-w-[280px] mx-auto" style={{ height: 280 }}>
                <Doughnut
                  data={donutData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: false,
                    plugins: {
                      legend: {
                        position: 'bottom',
                        labels: {
                          padding: 20,
                          usePointStyle: true,
                        },
                      },
                      tooltip: {
                        callbacks: {
                          label: (ctx) => {
                            const value = ctx.parsed;
                            const total = (ctx.dataset.data as number[]).reduce((a, b) => a + b, 0);
                            const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
                            return ` ${ctx.label}: ${formatIdr(value)} (${pct}%)`;
                          },
                        },
                      },
                    },
                    cutout: '65%',
                  }}
                />
                {currentPeriod && currentPeriod.total > 0 && (
                  <div className="text-center -mt-[140px] relative z-10 pointer-events-none">
                    <div className="text-xs text-white/30">Total</div>
                    <div className="text-lg font-bold">{formatIdr(currentPeriod.total)}</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 text-white/30">
                No spending data for this period
              </div>
            )}
          </div>

        {/* Trend Line */}
        <div className="glass-card p-5">
          <h3 className="text-base flex items-center gap-2 text-white/80">
              <Zap className="w-4 h-4 text-gold-500" />
              Trend Over Time
            </h3>
            <p className="text-white/50">
              How the recurring/discretionary mix has shifted
            </p>
          {trendData ? (
              <div style={{ height: 300 }}>
                <Line
                  data={trendData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: false,
                    interaction: {
                      mode: 'index',
                      intersect: false,
                    },
                    plugins: {
                      legend: {
                        position: 'bottom',
                        labels: {
                          usePointStyle: true,
                          padding: 16,
                        },
                      },
                    },
                    scales: {
                      y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                          display: true,
                          text: '% of Total',
                        },
                        min: 0,
                        max: 100,
                        ticks: {
                          callback: (v) => v + '%',
                        },
                      },
                      y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                          display: true,
                          text: 'Amount',
                        },
                        grid: {
                          drawOnChartArea: false,
                        },
                        ticks: {
                          callback: (v) => {
                            const n = v as number;
                            if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
                            if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K';
                            return n.toString();
                          },
                        },
                      },
                    },
                  }}
              />
              </div>
              ) : (
              <div className="flex items-center justify-center h-48 text-white/30">
                Need at least 2 periods of data
              </div>
            )}
          </div>
      </div>

      {/* Top Recurring Expenses Table */}
      {data.topRecurring.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-base flex items-center gap-2 text-white/80">
              <Repeat className="w-4 h-4 text-mint-500" />
              Top Recurring Expenses (All Time)
            </h3>
            <p className="text-white/50">
              Highest total spending on recurring items across all periods
            </p>
          <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topRecurring.map((item, i) => (
                  <TableRow key={item.title}>
                    <TableCell className="text-xs text-white/30 font-mono">
                      {i + 1}
                    </TableCell>
                    <TableCell className="font-medium">{item.title}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {item.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatIdr(item.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
      )}

      {/* No recurring data notice */}
      {data.topRecurring.length === 0 && (
        <div className="glass-card p-5">
          <Repeat className="w-12 h-12 mx-auto text-white/10 mb-3" />
            <p className="text-white/40 font-medium">
              No recurring transactions found
            </p>
            <p className="text-sm text-white/30 mt-1">
              Add recurring templates in{' '}
              <a href="/recurring" className="text-mint-500 hover:underline">
                Settings → Recurring
              </a>{' '}
              to see the breakdown between recurring and discretionary spending.
            </p>
          </div>
      )}
    </div>
  );
}
