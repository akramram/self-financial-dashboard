import React, { useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { NetworthRecord } from '../lib/data';
import { formatIdr } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Calendar, PiggyBank, Percent } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler, Legend);

interface Props {
  data: NetworthRecord[];
}

export default function NetworthProjection({ data }: Props) {
  const [projectionMonths, setProjectionMonths] = useState(24);
  const [monthlyContribution, setMonthlyContribution] = useState(0);
  const [annualReturnRate, setAnnualReturnRate] = useState(7); // percent

  const sortedData = useMemo(() => {
    return [...data]
      .filter((d) => d.total > 0)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [data]);

  // Auto-calculate monthly contribution from recent savings rate
  const avgMonthlySavings = useMemo(() => {
    if (sortedData.length < 3) return 0;
    const recent = sortedData.slice(-6); // last 6 periods
    const changes: number[] = [];
    for (let i = 1; i < recent.length; i++) {
      changes.push(recent[i].total - recent[i - 1].total);
    }
    const avg = changes.reduce((s, c) => s + c, 0) / changes.length;
    return Math.max(0, Math.round(avg));
  }, [sortedData]);

  // If user hasn't touched the slider, use calculated value
  const effectiveContribution = monthlyContribution || avgMonthlySavings;

  const projectedData = useMemo(() => {
    if (sortedData.length === 0) return { labels: [], values: [], summary: null };

    const lastRecord = sortedData[sortedData.length - 1];
    const lastValue = lastRecord.total;
    const lastDate = new Date(lastRecord.date);

    const monthlyReturn = Math.pow(1 + annualReturnRate / 100, 1 / 12) - 1;

    const labels: string[] = [];
    const values: number[] = [];
    let currentValue = lastValue;

    for (let i = 1; i <= projectionMonths; i++) {
      // Growth: contribution + investment returns
      currentValue = currentValue + effectiveContribution + currentValue * monthlyReturn;

      const projectedDate = new Date(lastDate);
      projectedDate.setMonth(projectedDate.getMonth() + i);
      const monthLabel = projectedDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
      });
      labels.push(monthLabel);
      values.push(Math.round(currentValue));
    }

    const summary = {
      at12: values[11] ?? null,
      at24: values[23] ?? null,
      at36: values[35] ?? null,
      lastValue,
      totalContributions: effectiveContribution * projectionMonths,
      investmentGains: values[projectionMonths - 1] - lastValue - effectiveContribution * projectionMonths,
    };

    return { labels, values, summary };
  }, [sortedData, projectionMonths, effectiveContribution, annualReturnRate]);

  const historicalLabels = sortedData.map((d) => d.month);
  const historicalValues = sortedData.map((d) => d.total);

  const chartData = {
    labels: [...historicalLabels, ...projectedData.labels],
    datasets: [
      {
        label: 'Historical Net Worth',
        data: [...historicalValues, ...Array(projectedData.labels.length).fill(null)],
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.08)',
        fill: true,
        tension: 0.3,
        pointRadius: 3,
        pointHoverRadius: 5,
        borderWidth: 2,
      },
      {
        label: 'Projected Net Worth',
        data: [
          ...Array(historicalValues.length - 1).fill(null),
          historicalValues[historicalValues.length - 1],
          ...projectedData.values,
        ],
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.05)',
        borderDash: [8, 4],
        borderWidth: 2.5,
        tension: 0.3,
        pointRadius: 3,
        pointHoverRadius: 5,
        fill: false,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: { boxWidth: 12, font: { size: 11 }, usePointStyle: true },
      },
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            if (ctx.raw == null) return '';
            const label = ctx.dataset.label || '';
            return `${label}: ${formatIdr(ctx.raw)}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          font: { size: 10 },
          maxRotation: 45,
          callback: function (this: any, _val: any, index: number) {
            // Show fewer labels if there are many
            const totalLabels = historicalLabels.length + projectedData.labels.length;
            if (totalLabels > 24 && index % 3 !== 0 && index !== totalLabels - 1) return '';
            if (totalLabels > 12 && index % 2 !== 0 && index !== totalLabels - 1) return '';
            return this.getLabelForValue(index);
          },
        },
      },
      y: {
        beginAtZero: false,
        ticks: {
          font: { size: 10 },
          callback: (val: any) => {
            const n = Number(val);
            if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
            if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
            if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
            return val;
          },
        },
      },
    },
  };

  if (sortedData.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-slate-400">
          <p>Add net worth data to see projections.</p>
        </CardContent>
      </Card>
    );
  }

  const summary = projectedData.summary;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-violet-500" />
            Projection Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Projection length */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Projection Period
                </Label>
                <Badge variant="secondary" className="text-xs font-mono">
                  {projectionMonths} months
                </Badge>
              </div>
              <div className="flex gap-2">
                {[12, 24, 36, 60].map((m) => (
                  <button
                    key={m}
                    onClick={() => setProjectionMonths(m)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      projectionMonths === m
                        ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 ring-1 ring-violet-300 dark:ring-violet-700'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {m >= 12 ? `${m / 12}y` : `${m}m`}
                  </button>
                ))}
              </div>
            </div>

            {/* Monthly contribution */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-slate-500 flex items-center gap-1.5">
                  <PiggyBank className="w-3.5 h-3.5" />
                  Monthly Savings
                </Label>
                <Badge variant="secondary" className="text-xs font-mono">
                  {formatIdr(effectiveContribution)}
                </Badge>
              </div>
              <input
                type="range"
                min={0}
                max={Math.max(avgMonthlySavings * 3, 10_000_000)}
                step={100_000}
                value={monthlyContribution || avgMonthlySavings}
                onChange={(e) => setMonthlyContribution(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-500"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>{formatIdr(0)}</span>
                <span>{formatIdr(Math.max(avgMonthlySavings * 3, 10_000_000))}</span>
              </div>
              {monthlyContribution === 0 && avgMonthlySavings > 0 && (
                <p className="text-[10px] text-slate-400 italic">
                  Auto: {formatIdr(avgMonthlySavings)}/mo (from {sortedData.length}-period avg)
                </p>
              )}
            </div>

            {/* Annual return rate */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5" />
                  Annual Return
                </Label>
                <Badge variant="secondary" className="text-xs font-mono">
                  {annualReturnRate}%
                </Badge>
              </div>
              <input
                type="range"
                min={0}
                max={20}
                step={0.5}
                value={annualReturnRate}
                onChange={(e) => setAnnualReturnRate(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-500"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>0%</span>
                <span>10%</span>
                <span>20%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Projection Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-violet-500" />
            Net Worth Projection
          </CardTitle>
          <p className="text-xs text-slate-400">
            Solid line = historical. Dashed amber line = projected with {effectiveContribution > 0 ? `${formatIdr(effectiveContribution)}/mo contributions` : 'no additional contributions'} and {annualReturnRate}% annual return.
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-[350px]">
            <Line data={chartData} options={chartOptions} />
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-slate-500 mb-1">Current Net Worth</p>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-100">
                {formatIdr(summary.lastValue)}
              </p>
            </CardContent>
          </Card>
          {summary.at12 && (
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-slate-500 mb-1">In 12 Months</p>
                <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                  {formatIdr(summary.at12)}
                </p>
                <p className="text-[10px] text-slate-400">
                  +{formatIdr(summary.at12 - summary.lastValue)} (
                  {summary.lastValue > 0
                    ? ((summary.at12 / summary.lastValue - 1) * 100).toFixed(1)
                    : 0}
                  %)
                </p>
              </CardContent>
            </Card>
          )}
          {summary.at24 && (
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-slate-500 mb-1">In 24 Months</p>
                <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                  {formatIdr(summary.at24)}
                </p>
                <p className="text-[10px] text-slate-400">
                  +{formatIdr(summary.at24 - summary.lastValue)} (
                  {summary.lastValue > 0
                    ? ((summary.at24 / summary.lastValue - 1) * 100).toFixed(1)
                    : 0}
                  %)
                </p>
              </CardContent>
            </Card>
          )}
          {summary.at36 && (
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-slate-500 mb-1">In 36 Months</p>
                <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                  {formatIdr(summary.at36)}
                </p>
                <p className="text-[10px] text-slate-400">
                  +{formatIdr(summary.at36 - summary.lastValue)} (
                  {summary.lastValue > 0
                    ? ((summary.at36 / summary.lastValue - 1) * 100).toFixed(1)
                    : 0}
                  %)
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Breakdown */}
      {summary && summary.totalContributions > 0 && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <span className="text-slate-500">Total contributions: </span>
                <span className="font-semibold">{formatIdr(summary.totalContributions)}</span>
              </div>
              <div>
                <span className="text-slate-500">Investment returns: </span>
                <span className={`font-semibold ${summary.investmentGains >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {summary.investmentGains >= 0 ? '+' : ''}
                  {formatIdr(summary.investmentGains)}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Projected total: </span>
                <span className="font-semibold text-violet-600 dark:text-violet-400">
                  {formatIdr(summary.lastValue + summary.totalContributions + summary.investmentGains)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
