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
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { TrendingUp, Calendar, PiggyBank, Percent, Coins, RotateCcw } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler, Legend);

interface Props {
  data: NetworthRecord[];
}

export default function NetworthProjection({ data }: Props) {
  const [projectionMonths, setProjectionMonths] = useState(24);
  // null = auto (median-based); number = user-overridden via slider
  const [contributionInput, setContributionInput] = useState<number | null>(null);
  const [annualReturnRate, setAnnualReturnRate] = useState(7); // percent
  const [realTerms, setRealTerms] = useState(false);
  const [inflationRate, setInflationRate] = useState(3); // percent

  const sortedData = useMemo(() => {
    return [...data]
      .filter((d) => d.total > 0)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [data]);

  // Default contribution: median MoM change over the last 6 periods.
  // NOTE: net-worth MoM change mixes deposits AND market appreciation — the
  // default is therefore an estimate that already includes market returns,
  // and it is labeled as such in the UI (see source label below).
  // Edge cases: <7 records -> 0; extreme negative median -> floored to 0.
  const autoMedianContribution = useMemo(() => {
    if (sortedData.length < 7) return 0;
    const recent = sortedData.slice(-7); // last 7 records -> 6 MoM changes
    const changes: number[] = [];
    for (let i = 1; i < recent.length; i++) {
      changes.push(recent[i].total - recent[i - 1].total);
    }
    const sorted = [...changes].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    return Math.max(0, Math.round(median));
  }, [sortedData]);

  const isAutoContribution = contributionInput == null;
  const effectiveContribution = isAutoContribution ? autoMedianContribution : contributionInput;

  // Real terms: deflate projected nominal values into today's money.
  const deflate = (nominal: number, monthsFromNow: number) => {
    if (!realTerms) return nominal;
    return nominal / Math.pow(1 + inflationRate / 100, monthsFromNow / 12);
  };

  const projectedData = useMemo(() => {
    if (sortedData.length === 0) return { labels: [], values: [], nominalValues: [], summary: null };

    const lastRecord = sortedData[sortedData.length - 1];
    const lastValue = lastRecord.total;
    const lastDate = new Date(lastRecord.date);

    const monthlyReturn = Math.pow(1 + annualReturnRate / 100, 1 / 12) - 1;

    const labels: string[] = [];
    const values: number[] = []; // displayed (deflated when real terms ON)
    const nominalValues: number[] = [];
    let currentValue = lastValue;

    for (let i = 1; i <= projectionMonths; i++) {
      // Growth: contribution + investment returns (nominal)
      currentValue = currentValue + effectiveContribution + currentValue * monthlyReturn;

      const projectedDate = new Date(lastDate);
      projectedDate.setMonth(projectedDate.getMonth() + i);
      const monthLabel = projectedDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
      });
      labels.push(monthLabel);
      nominalValues.push(Math.round(currentValue));
      values.push(Math.round(deflate(currentValue, i)));
    }

    const summary = {
      at12: values[11] ?? null,
      at24: values[23] ?? null,
      at36: values[35] ?? null,
      lastValue,
      totalContributions: effectiveContribution * projectionMonths,
      investmentGains:
        nominalValues[projectionMonths - 1] - lastValue - effectiveContribution * projectionMonths,
    };

    return { labels, values, nominalValues, summary };
    // deflate depends on realTerms/inflationRate — included via closure deps below
  }, [sortedData, projectionMonths, effectiveContribution, annualReturnRate, realTerms, inflationRate]);

  const historicalLabels = sortedData.map((d) => d.month);
  const historicalValues = sortedData.map((d) => d.total);

  const chartData = {
    labels: [...historicalLabels, ...projectedData.labels],
    datasets: [
      {
        label: 'Historical Net Worth',
        data: [...historicalValues, ...Array(projectedData.labels.length).fill(null)],
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.08)',
        fill: true,
        tension: 0.3,
        pointRadius: 3,
        pointHoverRadius: 5,
        borderWidth: 2,
      },
      {
        label: realTerms ? 'Projected (real terms)' : 'Projected Net Worth',
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
          font: { size: 11 },
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
          font: { size: 11 },
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
      <div className="glass-card p-5">

          Add net worth data to see projections.

      </div>
    );
  }

  const summary = projectedData.summary;
  const sliderMax = Math.max(effectiveContribution * 3, 10_000_000);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="glass-card p-5">

          <h3 className="text-base font-semibold flex items-center gap-2 text-slate-800 dark:text-white/80">
            <TrendingUp className="w-4 h-4 text-gold-500" />
            Projection Settings
          </h3>


          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Projection length */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-slate-600 dark:text-white/50 flex items-center gap-1.5">
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
                        ? 'bg-gold-900/40 text-gold-300 ring-1 ring-gold-700'
                        : 'bg-slate-100 dark:bg-white/[0.05] text-slate-600 dark:text-white/50 hover:bg-slate-200/60 dark:bg-white/[0.08]'
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
                <Label className="text-xs text-slate-600 dark:text-white/50 flex items-center gap-1.5">
                  <PiggyBank className="w-3.5 h-3.5" />
                  Monthly Savings
                </Label>
                <div className="flex items-center gap-1.5">
                  <Badge variant="secondary" className="text-xs font-mono">
                    {formatIdr(effectiveContribution)}
                  </Badge>
                  {!isAutoContribution && (
                    <button
                      onClick={() => setContributionInput(null)}
                      title="Reset to auto (median-based estimate)"
                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[11px] text-slate-500 dark:text-white/40 hover:text-gold-500 hover:bg-gold-500/10 transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Auto
                    </button>
                  )}
                </div>
              </div>
              <input
                type="range"
                min={0}
                max={sliderMax}
                step={100_000}
                value={effectiveContribution}
                onChange={(e) => setContributionInput(Number(e.target.value))}
                className="w-full h-2 bg-slate-200/60 dark:bg-white/[0.08] rounded-lg appearance-none cursor-pointer accent-gold-500"
              />
              <div className="flex justify-between text-[11px] text-slate-500 dark:text-white/40">
                <span>{formatIdr(0)}</span>
                <span>{formatIdr(sliderMax)}</span>
              </div>
              {isAutoContribution ? (
                autoMedianContribution > 0 ? (
                  <p className="text-[11px] text-slate-500 dark:text-white/40 italic">
                    Auto: {formatIdr(autoMedianContribution)}/mo — median of last 6 MoM changes;
                    estimate including market appreciation
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-500 dark:text-white/40 italic">
                    {sortedData.length < 7
                      ? 'Insufficient data (< 7 periods) — default 0. Drag slider to set.'
                      : 'Auto estimate floored to 0 (recent MoM median negative). Drag slider to set.'}
                  </p>
                )
              ) : (
                <p className="text-[11px] text-slate-500 dark:text-white/40 italic">
                  Custom contribution — assumption set manually.
                </p>
              )}
            </div>

            {/* Annual return rate */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-slate-600 dark:text-white/50 flex items-center gap-1.5">
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
                className="w-full h-2 bg-slate-200/60 dark:bg-white/[0.08] rounded-lg appearance-none cursor-pointer accent-gold-500"
              />
              <div className="flex justify-between text-[11px] text-slate-500 dark:text-white/40">
                <span>0%</span>
                <span>10%</span>
                <span>20%</span>
              </div>
            </div>

            {/* Real terms toggle + inflation */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-slate-600 dark:text-white/50 flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5" />
                  Real terms
                </Label>
                <Switch checked={realTerms} onCheckedChange={setRealTerms} aria-label="Toggle inflation-adjusted projection" />
              </div>
              {realTerms ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 dark:text-white/40">Inflation</span>
                    <Badge variant="secondary" className="text-xs font-mono">
                      {inflationRate}%
                    </Badge>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={8}
                    step={0.5}
                    value={inflationRate}
                    onChange={(e) => setInflationRate(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200/60 dark:bg-white/[0.08] rounded-lg appearance-none cursor-pointer accent-gold-500"
                  />
                  <p className="text-[11px] text-slate-500 dark:text-white/40 italic">
                    Projection shown in today's money (deflated). 0% inflation = nominal.
                  </p>
                </>
              ) : (
                <p className="text-[11px] text-slate-500 dark:text-white/40 italic">
                  Off — projection in nominal values.
                </p>
              )}
            </div>
          </div>

      </div>

      {/* Projection Chart */}
      <div className="glass-card p-5">

          <h3 className="text-base font-semibold flex items-center gap-2 text-slate-800 dark:text-white/80">
            <TrendingUp className="w-4 h-4 text-gold-500" />
            Net Worth Projection
          </h3>
          <p className="text-xs text-slate-600 dark:text-white/50">
            Solid line = historical. Dashed amber line = projected with{' '}
            {effectiveContribution > 0 ? `${formatIdr(effectiveContribution)}/mo contributions` : 'no additional contributions'} and{' '}
            {annualReturnRate}% annual return
            {realTerms ? `, displayed in real terms (inflation ${inflationRate}% — today's money; history shown nominal)` : ''}.
          </p>


          <div className="h-[350px]">
            <Line data={chartData} options={chartOptions} />
          </div>

      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-card p-5">

              <p className="text-xs text-slate-600 dark:text-white/50 mb-1">Current Net Worth</p>
              <p className="text-lg font-bold text-slate-800 dark:text-white/90">
                {formatIdr(summary.lastValue)}
              </p>

          </div>
          {summary.at12 && (
            <div className="glass-card p-5">

                <p className="text-xs text-slate-600 dark:text-white/50 mb-1">
                  In 12 Months{realTerms ? ' (real)' : ''}
                </p>
                <p className="text-lg font-bold text-gold-400">
                  {formatIdr(summary.at12)}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-white/40">
                  +{formatIdr(summary.at12 - summary.lastValue)} (
                  {summary.lastValue > 0
                    ? ((summary.at12 / summary.lastValue - 1) * 100).toFixed(1)
                    : 0}
                  %)
                </p>


            </div>
          )}
          {summary.at24 && (
            <div className="glass-card p-5">

                <p className="text-xs text-slate-600 dark:text-white/50 mb-1">
                  In 24 Months{realTerms ? ' (real)' : ''}
                </p>
                <p className="text-lg font-bold text-gold-400">
                  {formatIdr(summary.at24)}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-white/40">
                  +{formatIdr(summary.at24 - summary.lastValue)} (
                  {summary.lastValue > 0
                    ? ((summary.at24 / summary.lastValue - 1) * 100).toFixed(1)
                    : 0}
                  %)
                </p>


            </div>
          )}
          {summary.at36 && (
            <div className="glass-card p-5">

                <p className="text-xs text-slate-600 dark:text-white/50 mb-1">
                  In 36 Months{realTerms ? ' (real)' : ''}
                </p>
                <p className="text-lg font-bold text-gold-400">
                  {formatIdr(summary.at36)}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-white/40">
                  +{formatIdr(summary.at36 - summary.lastValue)} (
                  {summary.lastValue > 0
                    ? ((summary.at36 / summary.lastValue - 1) * 100).toFixed(1)
                    : 0}
                  %)
                </p>


            </div>
          )}
        </div>
      )}

      {/* Breakdown */}
      {summary && summary.totalContributions > 0 && (
        <div className="glass-card p-5">

            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <span className="text-slate-600 dark:text-white/50">Total contributions (nominal): </span>
                <span className="font-semibold">{formatIdr(summary.totalContributions)}</span>
              </div>
              <div>
                <span className="text-slate-600 dark:text-white/50">Investment returns (nominal): </span>
                <span className={`font-semibold ${summary.investmentGains >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {summary.investmentGains >= 0 ? '+' : ''}
                  {formatIdr(summary.investmentGains)}
                </span>
              </div>
              <div>
                <span className="text-slate-600 dark:text-white/50">Projected total (nominal): </span>
                <span className="font-semibold text-gold-400">
                  {formatIdr(summary.lastValue + summary.totalContributions + summary.investmentGains)}
                </span>
              </div>
            </div>


        </div>
      )}
    </div>
  );
}
