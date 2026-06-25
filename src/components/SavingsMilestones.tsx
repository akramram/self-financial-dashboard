import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatIdr } from '../lib/utils';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

interface SavingsPeriod {
  period_id: number;
  month: string;
  start_date: string;
  income: number;
  outcome: number;
  savings: number;
  savings_rate_pct: number;
}

interface SavingsMilestone {
  id: string;
  name: string;
  emoji: string;
  description: string;
  achieved: boolean;
  achievedDate: string | null;
  value: number;
  target: number;
}

interface SavingsStreak {
  count: number;
  startMonth: string;
  endMonth: string;
  totalSaved: number;
}

interface Props {
  periods: SavingsPeriod[];
  milestones: SavingsMilestone[];
  currentStreak: SavingsStreak | null;
  longestStreak: SavingsStreak | null;
  allStreaks: SavingsStreak[];
  bestMonth: SavingsPeriod | null;
  worstMonth: SavingsPeriod | null;
  cumulativeSavings: number;
  avgSavingsRate: number;
  positiveMonths: number;
  totalMonths: number;
}

function formatIdrShort(n: number): string {
  if (Math.abs(n) >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return Math.round(n).toString();
}

function MilestoneBadge({ milestone }: { milestone: SavingsMilestone }) {
  return (
    <div
      className={`relative rounded-xl border-2 p-4 transition-all ${
        milestone.achieved
          ? 'border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/10 dark:border-amber-700'
          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 opacity-60 grayscale'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-3xl leading-none">{milestone.emoji}</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-200">{milestone.name}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{milestone.description}</p>
          {milestone.achieved && milestone.achievedDate && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
              ✓ Achieved in {milestone.achievedDate}
            </p>
          )}
          {!milestone.achieved && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              {milestone.id.startsWith('cumul')
                ? `${((milestone.value / milestone.target) * 100).toFixed(0)}% progress`
                : 'Not yet achieved'}
            </p>
          )}
        </div>
        {milestone.achieved && (
          <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-emerald-500 text-white text-xs flex items-center justify-center shadow-sm">
            ✓
          </div>
        )}
      </div>
    </div>
  );
}

function StreakBar({ streak, isCurrent }: { streak: SavingsStreak; isCurrent: boolean }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800">
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-500 text-white text-lg font-bold shadow-sm">
        {streak.count}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {streak.count} month{streak.count !== 1 ? 's' : ''}
          </span>
          {isCurrent && (
            <Badge className="bg-orange-500 text-white text-[10px] px-1.5 py-0 h-4">Current</Badge>
          )}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {streak.startMonth} → {streak.endMonth} • Saved {formatIdr(streak.totalSaved)}
        </p>
      </div>
      <span className="text-2xl">🔥</span>
    </div>
  );
}

export default function SavingsMilestones({
  periods,
  milestones,
  currentStreak,
  longestStreak,
  allStreaks,
  bestMonth,
  worstMonth,
  cumulativeSavings,
  avgSavingsRate,
  positiveMonths,
  totalMonths,
}: Props) {
  const achievedCount = useMemo(() => milestones.filter((m) => m.achieved).length, [milestones]);
  const totalMilestones = milestones.length;

  // Savings journey chart data
  const journeyChartData = useMemo(() => {
    const labels = periods.map((p) => {
      const parts = p.month.split(' ');
      return parts[0].substring(0, 3) + ' ' + parts[1];
    });

    return {
      labels,
      datasets: [
        {
          label: 'Savings',
          data: periods.map((p) => p.savings),
          backgroundColor: periods.map((p) =>
            p.savings >= 0 ? 'rgba(16, 185, 129, 0.7)' : 'rgba(239, 68, 68, 0.7)'
          ),
          borderColor: periods.map((p) =>
            p.savings >= 0 ? 'rgba(16, 185, 129, 1)' : 'rgba(239, 68, 68, 1)'
          ),
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    };
  }, [periods]);

  const journeyChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false as const,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            const val = ctx.raw;
            return `${val >= 0 ? 'Saved' : 'Deficit'}: ${formatIdr(val)}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { maxRotation: 45, font: { size: 10 } },
      },
      y: {
        grid: { color: 'rgba(148, 163, 184, 0.1)' },
        ticks: {
          callback: (val: any) => formatIdrShort(val as number),
          font: { size: 10 },
        },
      },
    },
  };

  // Cumulative savings line chart
  const cumulativeChartData = useMemo(() => {
    let cumulative = 0;
    const data = periods.map((p) => {
      cumulative += p.savings;
      return cumulative;
    });
    const labels = periods.map((p) => {
      const parts = p.month.split(' ');
      return parts[0].substring(0, 3) + ' ' + parts[1];
    });

    return {
      labels,
      datasets: [
        {
          label: 'Cumulative Savings',
          data,
          borderColor: '#6366f1',
          backgroundColor: (context: any) => {
            const chart = context.chart;
            const { ctx, chartArea } = chart;
            if (!chartArea) return 'rgba(99, 102, 241, 0.1)';
            const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            gradient.addColorStop(0, 'rgba(99, 102, 241, 0.25)');
            gradient.addColorStop(1, 'rgba(99, 102, 241, 0.02)');
            return gradient;
          },
          fill: true,
          tension: 0.35,
          pointRadius: periods.length > 20 ? 2 : 4,
          pointBackgroundColor: data.map((v) => (v >= 0 ? '#6366f1' : '#ef4444')),
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointHoverRadius: 6,
          borderWidth: 2,
        },
      ],
    };
  }, [periods]);

  const cumulativeChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false as const,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: any) => `Cumulative: ${formatIdr(ctx.raw)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { maxRotation: 45, font: { size: 10 } },
      },
      y: {
        grid: { color: 'rgba(148, 163, 184, 0.1)' },
        ticks: {
          callback: (val: any) => formatIdrShort(val as number),
          font: { size: 10 },
        },
      },
    },
  };

  // Savings rate over time
  const rateChartData = useMemo(() => {
    const labels = periods.map((p) => {
      const parts = p.month.split(' ');
      return parts[0].substring(0, 3) + ' ' + parts[1];
    });
    return {
      labels,
      datasets: [
        {
          label: 'Savings Rate %',
          data: periods.map((p) => p.savings_rate_pct),
          borderColor: '#8b5cf6',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          fill: true,
          tension: 0.35,
          pointRadius: periods.length > 20 ? 2 : 4,
          pointBackgroundColor: periods.map((p) =>
            p.savings_rate_pct >= 30 ? '#10b981' : p.savings_rate_pct >= 0 ? '#f59e0b' : '#ef4444'
          ),
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          borderWidth: 2,
        },
      ],
    };
  }, [periods]);

  const rateChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false as const,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: any) => `Savings Rate: ${ctx.raw.toFixed(1)}%`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { maxRotation: 45, font: { size: 10 } },
      },
      y: {
        grid: { color: 'rgba(148, 163, 184, 0.1)' },
        ticks: {
          callback: (val: any) => `${val}%`,
          font: { size: 10 },
        },
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* Summary Hero Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Cumulative Savings</p>
            <p className={`text-xl font-bold mt-1 ${cumulativeSavings >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {formatIdr(cumulativeSavings)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Avg Savings Rate</p>
            <p className="text-xl font-bold mt-1" style={{ color: avgSavingsRate >= 0 ? '#10b981' : '#ef4444' }}>
              {avgSavingsRate.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Positive Months</p>
            <p className="text-xl font-bold mt-1">
              {positiveMonths}<span className="text-sm text-slate-400">/{totalMonths}</span>
            </p>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 mt-2">
              <div
                className="bg-emerald-500 h-1.5 rounded-full"
                style={{ width: `${totalMonths > 0 ? (positiveMonths / totalMonths) * 100 : 0}%` }}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Milestones</p>
            <p className="text-xl font-bold mt-1 text-amber-600 dark:text-amber-400">
              {achievedCount}<span className="text-sm text-slate-400">/{totalMilestones}</span>
            </p>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 mt-2">
              <div
                className="bg-amber-500 h-1.5 rounded-full"
                style={{ width: `${totalMilestones > 0 ? (achievedCount / totalMilestones) * 100 : 0}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Savings Journey — Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Savings Journey</CardTitle>
          <CardDescription>Monthly savings (income − outcome). Green = positive, red = deficit.</CardDescription>
        </CardHeader>
        <CardContent>
          <div style={{ height: 280 }}>
            <Bar data={journeyChartData} options={journeyChartOptions} />
          </div>
        </CardContent>
      </Card>

      {/* Charts row: Cumulative + Rate */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cumulative Savings</CardTitle>
            <CardDescription>Running total over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ height: 280 }}>
              <Line data={cumulativeChartData} options={cumulativeChartOptions} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Savings Rate Trend</CardTitle>
            <CardDescription>How much of income was saved each period (%)</CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ height: 280 }}>
              <Line data={rateChartData} options={rateChartOptions} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Best & Worst Months */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {bestMonth && (
          <Card className="border-emerald-200 dark:border-emerald-800">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">📈</span>
                <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Best Month</h3>
              </div>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {formatIdr(bestMonth.savings)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {bestMonth.month} • {bestMonth.savings_rate_pct.toFixed(1)}% savings rate
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                Income: {formatIdr(bestMonth.income)} • Spent: {formatIdr(bestMonth.outcome)}
              </p>
            </CardContent>
          </Card>
        )}
        {worstMonth && (
          <Card className="border-red-200 dark:border-red-800">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">📉</span>
                <h3 className="text-sm font-semibold text-red-700 dark:text-red-400">Worst Month</h3>
              </div>
              <p className="text-lg font-bold text-red-600 dark:text-red-400">
                {formatIdr(worstMonth.savings)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {worstMonth.month} • {worstMonth.savings_rate_pct.toFixed(1)}% savings rate
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                Income: {formatIdr(worstMonth.income)} • Spent: {formatIdr(worstMonth.outcome)}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Streaks */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            🔥 Savings Streaks
          </CardTitle>
          <CardDescription>Consecutive months with positive savings</CardDescription>
        </CardHeader>
        <CardContent>
          {allStreaks.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No positive savings streaks yet.</p>
          ) : (
            <div className="space-y-3">
              {[...allStreaks]
                .sort((a, b) => b.count - a.count)
                .map((streak) => (
                  <StreakBar
                    key={streak.startMonth}
                    streak={streak}
                    isCurrent={currentStreak?.startMonth === streak.startMonth}
                  />
                ))}
            </div>
          )}
          {longestStreak && (
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-300">
                  Longest streak: <strong>{longestStreak.count} months</strong> ({longestStreak.startMonth} → {longestStreak.endMonth})
                </span>
                {currentStreak && (
                  <Badge className="bg-emerald-600 text-white">
                    Current: {currentStreak.count} month{currentStreak.count !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Milestones Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            🏅 Milestones
          </CardTitle>
          <CardDescription>
            {achievedCount} of {totalMilestones} milestones achieved
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {milestones.map((m) => (
              <MilestoneBadge key={m.id} milestone={m} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Savings Heatmap Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Savings Timeline</CardTitle>
          <CardDescription>Color intensity shows savings rate — greener = higher savings rate</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1.5">
            {periods.map((p) => {
              const rate = p.savings_rate_pct;
              let bgColor: string;
              let textColor = 'text-white';
              if (rate >= 40) {
                bgColor = 'bg-emerald-600';
              } else if (rate >= 20) {
                bgColor = 'bg-emerald-400';
              } else if (rate >= 0) {
                bgColor = 'bg-emerald-200';
                textColor = 'text-emerald-900';
              } else if (rate >= -20) {
                bgColor = 'bg-red-200';
                textColor = 'text-red-900';
              } else if (rate >= -50) {
                bgColor = 'bg-red-400';
              } else {
                bgColor = 'bg-red-600';
              }

              const shortMonth = p.month.split(' ')[0].substring(0, 3);
              const shortYear = p.month.split(' ')[1]?.substring(2) || '';

              return (
                <div
                  key={p.period_id}
                  className={`${bgColor} ${textColor} rounded-md px-2 py-1.5 text-center min-w-[52px] cursor-default`}
                  title={`${p.month}: ${rate.toFixed(1)}% rate, ${formatIdr(p.savings)} savings`}
                >
                  <div className="text-[10px] font-medium leading-tight">
                    {shortMonth}<br />{shortYear}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-2 mt-3 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-red-600" />
              <span>&lt;-50%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-red-200" />
              <span>-20%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-emerald-200" />
              <span>0%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-emerald-400" />
              <span>20%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-emerald-600" />
              <span>40%+</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
