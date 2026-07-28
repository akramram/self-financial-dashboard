import React, { useState, useEffect, useRef } from 'react';
import { formatIdr, formatNumber } from '../lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler
);

interface ForecastData {
  month: string;
  daysElapsed: number;
  periodLength: number;
  daysRemaining: number;
  totalSpent: number;
  totalUnpaid: number;
  dailyAvg: number;
  projectedTotal: number;
  projectionConfidence: 'low' | 'medium' | 'high';
  velocityVsHistory: number;
  budgetStatus: Array<{
    category: string;
    color: string;
    spent: number;
    projected: number;
    limit: number;
    spentPct: number;
    projectedPct: number;
    status: 'safe' | 'warning' | 'danger' | 'critical';
    remaining: number;
  }>;
  creditStatus: {
    creditExpenses: number;
    creditPayments: number;
    outstanding: number;
    utilizationPct: number;
    unpaidCredit: number;
    unpaidPayments: number;
  };
  cumulative: Array<{ day: string; amount: number; cumulative: number }>;
  projectedTrajectory: Array<{ day: string; cumulative: number }>;
  recentMonthly: Array<{ month: string; total: number; days: number; daily_avg: number }>;
  velocity: {
    current_avg_daily: number;
    historical_avg_daily: number;
    days_with_spending: number;
    days_tracked: number;
    cumulative_spend: number;
    projected_monthly: number;
    velocity_vs_history: number;
  };
  alerts: Array<{ type: 'info' | 'warning' | 'danger'; message: string }>;
}

interface ApiResponse {
  allMonths: string[];
  forecast: ForecastData | null;
}

function ConfidenceBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    high: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    low: 'bg-white/[0.08] text-white/60',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[level] || colors.low}`}>
      {level.charAt(0).toUpperCase() + level.slice(1)} confidence
    </span>
  );
}

function AlertIcon({ type }: { type: string }) {
  if (type === 'danger') return <span className="text-red-500 text-lg">⚠️</span>;
  if (type === 'warning') return <span className="text-amber-500 text-lg">⚡</span>;
  return <span className="text-blue-500 text-lg">ℹ️</span>;
}

function ProgressBar({ value, max, color, projectedColor }: { value: number; max: number; color: string; projectedColor?: string }) {
  const pct = Math.min(100, (value / max) * 100);
  const projPct = projectedColor ? Math.min(100, (value * 1.3 / max) * 100) : 0; // rough projection marker
  return (
    <div className="w-full bg-white/[0.08] rounded-full h-3 overflow-hidden relative">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}

export default function Forecast() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchForecast('');
  }, []);

  const fetchForecast = async (month: string) => {
    setLoading(true);
    try {
      const params = month ? `?month=${encodeURIComponent(month)}` : '';
      const res = await fetch(`/api/forecast${params}`);
      const json = await res.json();
      setData(json);
      if (!month && json.allMonths.length > 0) {
        setSelectedMonth(json.allMonths[json.allMonths.length - 1]);
      }
    } catch (err) {
      console.error('Failed to fetch forecast:', err);
    }
    setLoading(false);
  };

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
    fetchForecast(month);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-mint-500/40"></div>
        <span className="ml-3 text-white/50">Loading forecast...</span>
      </div>
    );
  }

  if (!data?.forecast) {
    return (
      <div className="glass-card p-5">
        
          <p className="text-white/50">No transaction data available for forecasting. Add some transactions first!</p>
        
      </div>
    );
  }

  const f = data.forecast;

  // Trajectory chart data
  const trajectoryLabels = [
    ...f.cumulative.map((d) => d.day.slice(5)), // MM-DD
    ...f.projectedTrajectory.map((d) => d.day.slice(5)),
  ];
  const actualData = [
    ...f.cumulative.map((d) => d.cumulative),
    ...f.projectedTrajectory.map(() => null as unknown as number),
  ];
  const projectedData = [
    ...f.cumulative.slice(-1).map((d) => d.cumulative),
    ...f.projectedTrajectory.map((d) => d.cumulative),
  ];
  // Fill the gap between last actual and first projected
  if (actualData.length > 0 && projectedData.length > 1) {
    actualData[actualData.length - 1] = projectedData[0]; // bridge point
  }

  const trajectoryChart = {
    labels: trajectoryLabels,
    datasets: [
      {
        label: 'Actual Spending',
        data: actualData,
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 2,
        borderWidth: 2,
      },
      {
        label: 'Projected',
        data: projectedData,
        borderColor: 'rgb(244, 63, 94)',
        backgroundColor: 'rgba(244, 63, 94, 0.05)',
        borderDash: [6, 4],
        fill: true,
        tension: 0.3,
        pointRadius: 1,
        borderWidth: 2,
      },
    ],
  };

  // Historical monthly chart
  const historicalChart = {
    labels: f.recentMonthly.map((m) => m.month),
    datasets: [
      {
        label: 'Total Spent',
        data: f.recentMonthly.map((m) => m.total),
        backgroundColor: f.recentMonthly.map((m) =>
          m.month === f.month ? 'rgba(99, 102, 241, 0.8)' : 'rgba(99, 102, 241, 0.4)'
        ),
        borderRadius: 6,
      },
      {
        label: 'Daily Average × 30',
        data: f.recentMonthly.map((m) => m.daily_avg * 30),
        backgroundColor: 'rgba(244, 63, 94, 0.3)',
        borderRadius: 6,
      },
    ],
  };

  // Credit donut chart
  const creditChartData = {
    labels: ['Credit Payments', 'Outstanding'],
    datasets: [
      {
        data: [f.creditStatus.creditPayments, f.creditStatus.outstanding],
        backgroundColor: ['rgba(16, 185, 129, 0.7)', 'rgba(239, 68, 68, 0.7)'],
        borderWidth: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const, labels: { font: { size: 12 } } },
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
            if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
            if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
            return value;
          },
        },
      },
    },
  };

  const statusColors: Record<string, string> = {
    safe: 'text-emerald-600 dark:text-emerald-400',
    warning: 'text-amber-600 dark:text-amber-400',
    danger: 'text-orange-600 dark:text-orange-400',
    critical: 'text-red-600 dark:text-red-400',
  };

  const barStatusColors: Record<string, string> = {
    safe: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-orange-500',
    critical: 'bg-red-500',
  };

  return (
    <div className="space-y-6">
      {/* Month selector */}
      <div className="flex items-center gap-4">
        <h2 className="text-sm font-medium text-white/50">Forecast for:</h2>
        <Select value={selectedMonth} onValueChange={handleMonthChange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {data.allMonths.map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Alerts */}
      <div className="space-y-2">
        {f.alerts.map((alert, i) => (
          <div
            key={i}
            className={`flex items-start gap-3 px-4 py-3 rounded-xl text-sm ${
              alert.type === 'danger'
                ? 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800'
                : alert.type === 'warning'
                ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800'
                : 'bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800'
            }`}
          >
            <AlertIcon type={alert.type} />
            <span className={alert.type === 'danger' ? 'text-red-700 dark:text-red-300 font-medium' : 'text-white/70'}>
              {alert.message}
            </span>
          </div>
        ))}
      </div>

      {/* Key metrics cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5">
          
            <p className="text-white/50">Current Spending</p>
          
          
            <div className="text-2xl font-bold">{formatIdr(f.totalSpent)}</div>
            <p className="text-xs text-white/50 mt-1">
              Day {f.daysElapsed} of ~{f.periodLength} · Avg {formatIdr(f.dailyAvg)}/day
            </p>
            {f.totalUnpaid > 0 && (
              <p className="text-xs text-orange-500 mt-1">
                + {formatIdr(f.totalUnpaid)} unpaid
              </p>
            )}
          
        </div>

        <div className="glass-card p-5">
          
            <p className="text-white/50">Projected Total</p>
          
          
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">{formatIdr(f.projectedTotal)}</div>
              <ConfidenceBadge level={f.projectionConfidence} />
            </div>
            <p className="text-xs text-white/50 mt-1">
              {f.daysRemaining} days remaining
            </p>
          
        </div>

        <div className="glass-card p-5">
          
            <p className="text-white/50">Spending Velocity</p>
          
          
            <div className={`text-2xl font-bold ${f.velocityVsHistory > 20 ? 'text-red-600 dark:text-red-400' : f.velocityVsHistory < -20 ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
              {f.velocityVsHistory > 0 ? '+' : ''}{Math.round(f.velocityVsHistory)}%
            </div>
            <p className="text-xs text-white/50 mt-1">
              vs {f.daysElapsed}-day historical average
            </p>
          
        </div>

        <div className="glass-card p-5">
          
            <p className="text-white/50">Credit Outstanding</p>
          
          
            <div className={`text-2xl font-bold ${f.creditStatus.outstanding > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {formatIdr(f.creditStatus.outstanding)}
            </div>
            <p className="text-xs text-white/50 mt-1">
              {formatIdr(f.creditStatus.creditExpenses)} spent · {formatIdr(f.creditStatus.creditPayments)} paid
            </p>
          
        </div>
      </div>

      {/* Trajectory chart */}
      <div className="glass-card p-5">
        
          <h3 className="text-lg text-white/80">Spending Trajectory</h3>
          <p className="text-white/50">
            Actual cumulative spending vs projected end-of-month total
          </p>
        
        
          <div className="h-[300px]">
            <Line data={trajectoryChart} options={{
              ...chartOptions,
              plugins: {
                ...chartOptions.plugins,
                annotation: undefined,
                tooltip: {
                  ...chartOptions.plugins.tooltip,
                  mode: 'index' as const,
                  intersect: false,
                },
              },
            }} />
          </div>
          <div className="flex items-center justify-center gap-6 mt-3 text-xs text-white/50">
            <span className="flex items-center gap-2">
              <span className="w-4 h-0.5 bg-mint-500 inline-block"></span> Actual
            </span>
            <span className="flex items-center gap-2">
              <span className="w-4 h-0.5 bg-red-500 inline-block border-dashed border-t border-red-500"></span> Projected
            </span>
          </div>
        
      </div>

      {/* Two-column: Budget burn rate + Credit utilization */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Budget burn rate */}
        <div className="glass-card p-5">
          
            <h3 className="text-lg text-white/80">Budget Burn Rate</h3>
            <p className="text-white/50">
              Category spending vs budget limits (with projection)
            </p>
          
          
            {f.budgetStatus.length === 0 ? (
              <p className="text-sm text-white/50 py-4 text-center">
                No category budgets set. Configure limits in Settings to see burn rates.
              </p>
            ) : (
              <div className="space-y-4">
                {f.budgetStatus.map((bs) => (
                  <div key={bs.category} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full inline-block"
                          style={{ backgroundColor: bs.color }}
                        />
                        <span className="font-medium">{bs.category}</span>
                      </div>
                      <span className={statusColors[bs.status]}>
                        {Math.round(bs.spentPct)}% used
                      </span>
                    </div>
                    <ProgressBar
                      value={bs.spent}
                      max={bs.limit}
                      color={bs.status === 'safe' ? '#10b981' : bs.status === 'warning' ? '#f59e0b' : bs.status === 'danger' ? '#f97316' : '#ef4444'}
                    />
                    <div className="flex justify-between text-xs text-white/50">
                      <span>{formatIdr(bs.spent)} of {formatIdr(bs.limit)}</span>
                      <span className={statusColors[bs.status]}>
                        Proj: {formatIdr(bs.projected)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          
        </div>

        {/* Credit utilization */}
        <div className="glass-card p-5">
          
            <h3 className="text-lg text-white/80">Credit Utilization</h3>
            <p className="text-white/50">
              Credit card expenses vs payments this period
            </p>
          
          
            <div className="flex items-center justify-center mb-4">
              <div className="w-[200px] h-[200px]">
                <Doughnut
                  data={creditChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: true,
                    cutout: '65%',
                    plugins: {
                      legend: { position: 'bottom' as const },
                      tooltip: {
                        callbacks: {
                          label: (ctx: any) => `${ctx.label}: ${formatIdr(ctx.parsed)}`,
                        },
                      },
                    },
                  }}
                />
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-white/50">Credit Expenses (paid)</span>
                <span className="font-medium">{formatIdr(f.creditStatus.creditExpenses)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Credit Payments (paid)</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">{formatIdr(f.creditStatus.creditPayments)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-white/50">Outstanding Balance</span>
                <span className={`font-bold ${f.creditStatus.outstanding > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {formatIdr(f.creditStatus.outstanding)}
                </span>
              </div>
              {f.creditStatus.unpaidCredit > 0 && (
                <div className="flex justify-between text-xs text-orange-500">
                  <span>Unpaid credit expenses</span>
                  <span>{formatIdr(f.creditStatus.unpaidCredit)}</span>
                </div>
              )}
              {f.creditStatus.unpaidPayments > 0 && (
                <div className="flex justify-between text-xs text-blue-500">
                  <span>Unscheduled credit payments</span>
                  <span>{formatIdr(f.creditStatus.unpaidPayments)}</span>
                </div>
              )}
            </div>
          
        </div>
      </div>

      {/* Historical comparison chart */}
      <div className="glass-card p-5">
        
          <h3 className="text-lg text-white/80">Historical Monthly Spending</h3>
          <p className="text-white/50">
            Total spending per month compared to daily average × 30 (normalized projection)
          </p>
        
        
          <div className="h-[250px]">
            <Bar data={historicalChart} options={{
              ...chartOptions,
              plugins: {
                ...chartOptions.plugins,
                legend: { position: 'top' as const },
              },
            }} />
          </div>
        
      </div>

      {/* Velocity breakdown table */}
      <div className="glass-card p-5">
        
          <h3 className="text-lg text-white/80">Spending Velocity Breakdown</h3>
          <p className="text-white/50">
            Detailed velocity metrics comparing current period to historical patterns
          </p>
        
        
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-white/[0.03]">
              <div className="text-xs text-white/50 mb-1">Current Avg/Day</div>
              <div className="text-lg font-bold">{formatIdr(f.velocity.current_avg_daily)}</div>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.03]">
              <div className="text-xs text-white/50 mb-1">Historical Avg/Day</div>
              <div className="text-lg font-bold">{formatIdr(f.velocity.historical_avg_daily)}</div>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.03]">
              <div className="text-xs text-white/50 mb-1">Days with Spending</div>
              <div className="text-lg font-bold">{f.velocity.days_with_spending} <span className="text-sm font-normal text-white/40">of {f.velocity.days_tracked}</span></div>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.03]">
              <div className="text-xs text-white/50 mb-1">Cumulative Spend</div>
              <div className="text-lg font-bold">{formatIdr(f.velocity.cumulative_spend)}</div>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.03]">
              <div className="text-xs text-white/50 mb-1">Projected Monthly</div>
              <div className="text-lg font-bold">{formatIdr(f.velocity.projected_monthly)}</div>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.03]">
              <div className="text-xs text-white/50 mb-1">Velocity vs History</div>
              <div className={`text-lg font-bold ${f.velocity.velocity_vs_history > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {f.velocity.velocity_vs_history > 0 ? '+' : ''}{Math.round(f.velocity.velocity_vs_history)}%
              </div>
            </div>
          </div>
        
      </div>
    </div>
  );
}
