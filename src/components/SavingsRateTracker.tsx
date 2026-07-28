import React, { useState, useMemo, useEffect } from 'react';
import { formatIdr } from '../lib/utils';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Trophy,
  AlertTriangle,
  Target,
  Award,
  PiggyBank,
  Flame,
  Info,
} from 'lucide-react';
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

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, BarElement,
  Title, Tooltip, Legend, Filler
);

// ============================================================
// Data shapes must match SavingsRateResult in src/lib/db.ts.
// Fetched at runtime from /api/savings-rate (NOT passed as Astro
// props) to avoid the devalue serialization pitfall.
// ============================================================
interface SavingsRatePeriod {
  period_id: number;
  month: string;
  start_date: string;
  end_date: string;
  income: number;
  outcome: number;
  savings: number;
  savings_rate: number;
  is_positive: boolean;
}
interface SavingsRateResult {
  periods: SavingsRatePeriod[];
  current: SavingsRatePeriod | null;
  avg_rate: number;
  median_rate: number;
  best_rate: number;
  worst_rate: number;
  best_month: string | null;
  worst_month: string | null;
  positive_count: number;
  negative_count: number;
  total_periods: number;
  consecutive_positive: number;
  longest_positive_streak: number;
  total_saved: number;
  trailing3_avg: number;
  trailing6_avg: number;
  trend: 'improving' | 'declining' | 'stable';
}

// Savings rate benchmark tiers (widely used personal-finance guidelines)
const BENCHMARKS = [
  { label: 'Critical', min: -Infinity, max: 0, color: '#ef4444', desc: 'Spending more than you earn' },
  { label: 'Building', min: 0, max: 10, color: '#f97316', desc: 'Just starting to save' },
  { label: 'Fair', min: 10, max: 20, color: '#eab308', desc: 'On the right track' },
  { label: 'Good', min: 20, max: 30, color: '#22c55e', desc: 'Healthy savings habit' },
  { label: 'Excellent', min: 30, max: 50, color: '#10b981', desc: 'Strong financial position' },
  { label: 'FIRE-Ready', min: 50, max: Infinity, color: '#06b6d4', desc: 'Aggressive wealth building' },
];

function getBenchmark(rate: number) {
  return BENCHMARKS.find((b) => rate >= b.min && rate < b.max) ?? BENCHMARKS[0];
}

const MILESTONES = [
  { rate: 10, label: 'First 10%', icon: '🌱', desc: 'You are officially saving!' },
  { rate: 20, label: '20% Club', icon: '⭐', desc: 'Recommended minimum by financial advisors' },
  { rate: 30, label: '30% Striver', icon: '💪', desc: 'Strong savings discipline' },
  { rate: 50, label: '50% Master', icon: '👑', desc: 'FIRE-movement territory' },
  { rate: 70, label: '70% Legend', icon: '🔥', desc: 'Extreme wealth building' },
];

export default function SavingsRateTracker() {
  const [data, setData] = useState<SavingsRateResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartView, setChartView] = useState<'rate' | 'amount'>('rate');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/savings-rate')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  // Chart data — all hooks MUST be before any early return (Rules of Hooks)
  const rateChartData = useMemo(() => {
    if (!data || data.periods.length === 0) return null;
    const labels = data.periods.map((p) => p.month);
    const rates = data.periods.map((p) => p.savings_rate);
    return {
      labels,
      datasets: [
        {
          label: 'Savings Rate %',
          data: rates,
          borderColor: '#6366f1',
          backgroundColor: (ctx: any) => {
            const chart = ctx.chart;
            const { ctx: c, chartArea } = chart;
            if (!chartArea) return 'rgba(99,102,241,0.1)';
            const gradient = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            gradient.addColorStop(0, 'rgba(99,102,241,0.35)');
            gradient.addColorStop(1, 'rgba(99,102,241,0.02)');
            return gradient;
          },
          fill: true,
          tension: 0.35,
          pointRadius: data.periods.length > 20 ? 2 : 4,
          pointHoverRadius: 7,
          pointBackgroundColor: rates.map((r) => r >= 0 ? '#22c55e' : '#ef4444'),
          pointBorderColor: rates.map((r) => r >= 0 ? '#16a34a' : '#dc2626'),
          borderWidth: 2,
        },
      ],
    };
  }, [data]);

  const amountChartData = useMemo(() => {
    if (!data || data.periods.length === 0) return null;
    const labels = data.periods.map((p) => p.month);
    return {
      labels,
      datasets: [
        {
          label: 'Income',
          data: data.periods.map((p) => p.income),
          backgroundColor: 'rgba(34,197,94,0.7)',
          borderColor: '#16a34a',
          borderWidth: 1,
          borderRadius: 4,
        },
        {
          label: 'Spending',
          data: data.periods.map((p) => p.outcome),
          backgroundColor: 'rgba(239,68,68,0.7)',
          borderColor: '#dc2626',
          borderWidth: 1,
          borderRadius: 4,
        },
        {
          label: 'Savings',
          data: data.periods.map((p) => p.savings),
          backgroundColor: data.periods.map((p) =>
            p.savings >= 0 ? 'rgba(99,102,241,0.7)' : 'rgba(234,179,8,0.7)'
          ),
          borderColor: data.periods.map((p) => (p.savings >= 0 ? '#4f46e5' : '#ca8a04')),
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    };
  }, [data]);

  const milestones = useMemo(() => {
    if (!data) return [];
    const best = data.best_rate;
    return MILESTONES.map((m) => ({
      ...m,
      achieved: best >= m.rate,
    }));
  }, [data]);

  const benchmarkBuckets = useMemo(() => {
    if (!data || data.periods.length === 0) return [];
    return BENCHMARKS.map((b) => {
      const count = data.periods.filter((p) => p.savings_rate >= b.min && p.savings_rate < b.max).length;
      return { ...b, count, pct: data.total_periods > 0 ? (count / data.total_periods) * 100 : 0 };
    }).filter((b) => b.count > 0);
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-white/30">Loading savings rate data…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  if (!data || data.periods.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <PiggyBank className="w-12 h-12 text-white/15 mb-4" />
        <h3 className="text-lg font-semibold text-white/40">No savings data yet</h3>
        <p className="text-sm text-white/30 mt-2 max-w-md">
          You need income records and spending transactions to compute your savings rate.
          Try running month kickoff or adding income via the settings page.
        </p>
      </div>
    );
  }

  const current = data.current!;
  const currentBench = getBenchmark(current.savings_rate);
  const avgBench = getBenchmark(data.avg_rate);

  const rateChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false as const,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            const idx = ctx.dataIndex;
            const p = data.periods[idx];
            return [
              `Rate: ${p.savings_rate.toFixed(1)}%`,
              `Income: ${formatIdr(p.income)}`,
              `Spending: ${formatIdr(p.outcome)}`,
              `Savings: ${formatIdr(p.savings)}`,
            ];
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        ticks: { callback: (v: any) => `${v}%`, color: '#94a3b8' },
        grid: { color: 'rgba(148,163,184,0.1)' },
      },
      x: { ticks: { color: '#94a3b8', maxRotation: 45 }, grid: { display: false } },
    },
    onHover: (_e: any, elements: any[]) => {
      if (elements.length > 0) setHoveredIdx(elements[0].index);
      else setHoveredIdx(null);
    },
  };

  const amountChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false as const,
    plugins: {
      legend: { position: 'top' as const, labels: { color: '#94a3b8', boxWidth: 12 } },
      tooltip: {
        callbacks: { label: (ctx: any) => `${ctx.dataset.label}: ${formatIdr(ctx.parsed.y)}` },
      },
    },
    scales: {
      y: { ticks: { callback: (v: any) => formatIdrShort(v), color: '#94a3b8' }, grid: { color: 'rgba(148,163,184,0.1)' } },
      x: { ticks: { color: '#94a3b8', maxRotation: 45 }, grid: { display: false } },
    },
  };

  return (
    <div className="space-y-6">
      {/* === Hero — Current Savings Rate === */}
      <div className="rounded-2xl p-6 text-white shadow-lg"
        style={{ background: `linear-gradient(135deg, ${currentBench.color}, ${currentBench.color}dd)` }}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-white/80 text-sm font-medium uppercase tracking-wide">
              Current Period · {current.month}
            </p>
            <div className="flex items-baseline gap-3 mt-1">
              <span className="text-5xl font-bold">{current.savings_rate.toFixed(1)}%</span>
              <span className="text-xl text-white/70">savings rate</span>
            </div>
            <p className="text-white/90 text-sm mt-2">{currentBench.desc}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="px-2 py-1 rounded-lg bg-white/20 backdrop-blur">
                Saved: {formatIdr(current.savings)}
              </span>
              <span className="px-2 py-1 rounded-lg bg-white/20 backdrop-blur">
                Income: {formatIdr(current.income)}
              </span>
              <span className="px-2 py-1 rounded-lg bg-white/20 backdrop-blur">
                Spending: {formatIdr(current.outcome)}
              </span>
            </div>
          </div>
          <div className="text-center">
            <div className="text-6xl mb-1">{getBenchmarkIcon(currentBench.label)}</div>
            <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur text-sm font-semibold">
              {currentBench.label}
            </span>
          </div>
        </div>
      </div>

      {/* === Trend Banner === */}
      {data.total_periods >= 3 && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${
          data.trend === 'improving' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' :
          data.trend === 'declining' ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400' :
          'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
        }`}>
          {data.trend === 'improving' && <TrendingUp className="w-5 h-5" />}
          {data.trend === 'declining' && <TrendingDown className="w-5 h-5" />}
          {data.trend === 'stable' && <Minus className="w-5 h-5" />}
          <span>
            Your savings rate is <strong>{data.trend}</strong> —
            trailing 3-period avg is <strong>{data.trailing3_avg.toFixed(1)}%</strong> vs
            trailing 6-period avg of <strong>{data.trailing6_avg.toFixed(1)}%</strong>.
          </span>
        </div>
      )}

      {/* === Stat Cards === */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Target className="w-5 h-5" />}
          label="Average Rate"
          value={`${data.avg_rate.toFixed(1)}%`}
          subtitle={`Median ${data.median_rate.toFixed(1)}% · ${avgBench.label}`}
          color="text-mint-500 dark:text-mint-400"
        />
        <StatCard
          icon={<Trophy className="w-5 h-5" />}
          label="Best Month"
          value={`${data.best_rate.toFixed(1)}%`}
          subtitle={data.best_month ?? ''}
          color="text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          icon={<AlertTriangle className="w-5 h-5" />}
          label="Worst Month"
          value={`${data.worst_rate.toFixed(1)}%`}
          subtitle={data.worst_month ?? ''}
          color="text-rose-600 dark:text-rose-400"
        />
        <StatCard
          icon={<PiggyBank className="w-5 h-5" />}
          label="Total Saved"
          value={formatIdrShort(data.total_saved)}
          subtitle={`across ${data.total_periods} periods`}
          color="text-mint-500 dark:text-mint-400"
        />
      </div>

      {/* === Chart === */}
      <div className="bg-white/[0.02] backdrop-blur-sm rounded-xl p-5 border border-white/[0.06]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Savings Rate Over Time</h3>
          <div className="flex gap-1 p-1 rounded-lg bg-white/[0.06]">
            <button
              onClick={() => setChartView('rate')}
              className={`px-3 py-1 text-xs rounded-md transition ${
                chartView === 'rate' ? 'bg-white/[0.08] shadow-sm font-semibold text-white' : 'text-white/40'
              }`}
            >
              Rate %
            </button>
            <button
              onClick={() => setChartView('amount')}
              className={`px-3 py-1 text-xs rounded-md transition ${
                chartView === 'amount' ? 'bg-white/[0.08] shadow-sm font-semibold text-white' : 'text-white/40'
              }`}
            >
              Amounts
            </button>
          </div>
        </div>
        <div style={{ height: 320 }}>
          {chartView === 'rate' && rateChartData && <Line data={rateChartData} options={rateChartOptions} />}
          {chartView === 'amount' && amountChartData && <Bar data={amountChartData} options={amountChartOptions} />}
        </div>
        {hoveredIdx !== null && data.periods[hoveredIdx] && (
          <div className="mt-3 p-3 rounded-lg bg-white/[0.04] text-sm">
            <strong>{data.periods[hoveredIdx].month}</strong>: {data.periods[hoveredIdx].savings_rate.toFixed(1)}% rate ·
            Saved {formatIdr(data.periods[hoveredIdx].savings)} of {formatIdr(data.periods[hoveredIdx].income)}
          </div>
        )}
      </div>

      {/* === Two-column: Streaks + Benchmarks === */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Streak Card */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-4">
            <Flame className="w-5 h-5 text-coral-500/50" />
            <h3 className="font-semibold">Positive Savings Streaks</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-coral-500/5 dark:bg-coral-700/10/30">
              <span className="text-sm font-medium">Current Streak</span>
              <span className="text-2xl font-bold text-coral-500 dark:text-coral-400">
                {data.consecutive_positive}
                <span className="text-sm font-normal ml-1">periods</span>
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
              <span className="text-sm font-medium">Longest Ever</span>
              <span className="text-2xl font-bold text-slate-700 dark:text-slate-300">
                {data.longest_positive_streak}
                <span className="text-sm font-normal ml-1">periods</span>
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
              <span className="text-sm font-medium">Positive vs Negative</span>
              <span className="text-sm font-semibold">
                <span className="text-emerald-600 dark:text-emerald-400">{data.positive_count} positive</span>
                {' / '}
                <span className="text-rose-600 dark:text-rose-400">{data.negative_count} negative</span>
              </span>
            </div>
          </div>
        </div>

        {/* Benchmark Distribution */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-mint-500" />
            <h3 className="font-semibold">Rate Distribution</h3>
          </div>
          <p className="text-xs text-slate-500 mb-3">How often your savings rate lands in each tier</p>
          <div className="space-y-2">
            {benchmarkBuckets.map((b) => (
              <div key={b.label} className="flex items-center gap-3">
                <div className="w-24 text-xs font-medium" style={{ color: b.color }}>{b.label}</div>
                <div className="flex-1 h-6 rounded-md bg-slate-100 dark:bg-slate-700 overflow-hidden relative">
                  <div
                    className="h-full rounded-md transition-all"
                    style={{ width: `${b.pct}%`, backgroundColor: b.color }}
                  />
                  <span className="absolute inset-0 flex items-center justify-end pr-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {b.count}× ({b.pct.toFixed(0)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* === Milestones === */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 mb-4">
          <Award className="w-5 h-5 text-gold-500" />
          <h3 className="font-semibold">Savings Milestones</h3>
          <span className="text-xs text-slate-500 ml-auto">Based on your best rate: {data.best_rate.toFixed(1)}%</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {milestones.map((m) => (
            <div
              key={m.label}
              className={`p-4 rounded-xl text-center transition ${
                m.achieved
                  ? 'bg-gradient-to-br from-gold-500/5 to-gold-500/5 dark:from-gold-700/10/40 dark:to-gold-700/5/40 border-2 border-gold-400/30 dark:border-gold-700'
                  : 'bg-slate-50 dark:bg-slate-700/50 border-2 border-transparent opacity-60'
              }`}
            >
              <div className={`text-3xl mb-1 ${m.achieved ? '' : 'grayscale'}`}>{m.icon}</div>
              <div className={`text-sm font-bold ${m.achieved ? 'text-gold-700 dark:text-gold-400' : 'text-slate-500'}`}>
                {m.label}
              </div>
              <div className="text-[10px] text-slate-400 mt-1 leading-tight">{m.desc}</div>
              {m.achieved && (
                <div className="mt-2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">✓ ACHIEVED</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* === Per-Period Detail Table === */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold">Period-by-Period Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Period</th>
                <th className="text-right px-4 py-2 font-medium">Income</th>
                <th className="text-right px-4 py-2 font-medium">Spending</th>
                <th className="text-right px-4 py-2 font-medium">Saved</th>
                <th className="text-right px-4 py-2 font-medium">Rate</th>
                <th className="text-left px-4 py-2 font-medium">Tier</th>
              </tr>
            </thead>
            <tbody>
              {[...data.periods].reverse().map((p) => {
                const bench = getBenchmark(p.savings_rate);
                return (
                  <tr key={p.period_id} className="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="px-4 py-2 font-medium">{p.month}</td>
                    <td className="px-4 py-2 text-right text-slate-600 dark:text-slate-300">{formatIdr(p.income)}</td>
                    <td className="px-4 py-2 text-right text-slate-600 dark:text-slate-300">{formatIdr(p.outcome)}</td>
                    <td className={`px-4 py-2 text-right font-medium ${p.savings >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {formatIdr(p.savings)}
                    </td>
                    <td className={`px-4 py-2 text-right font-bold ${p.savings_rate >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {p.savings_rate.toFixed(1)}%
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: bench.color }}
                      >
                        {bench.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-start gap-2 text-xs text-slate-400 dark:text-slate-500 px-1">
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>
          Savings Rate = (Income − Spending) / Income × 100. Spending includes cash and credit-card payments (done=1).
          The FIRE benchmark (50%+) is the threshold recommended by the FIRE (Financial Independence, Retire Early) movement.
        </span>
      </div>
    </div>
  );
}

// ─── Helper components ───────────────────────────────────────────────────────

function StatCard({ icon, label, value, subtitle, color }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle: string;
  color: string;
}) {
  return (
    <div className="bg-white/[0.02] backdrop-blur-sm rounded-xl p-4 border border-white/[0.06]">
      <div className={`flex items-center gap-2 mb-2 ${color}`}>
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide text-white/40">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-white/30 mt-1">{subtitle}</div>
    </div>
  );
}

function formatIdrShort(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return Math.round(n).toString();
}

function getBenchmarkIcon(label: string): string {
  switch (label) {
    case 'Critical': return '🚨';
    case 'Building': return '🌱';
    case 'Fair': return '📈';
    case 'Good': return '✅';
    case 'Excellent': return '🌟';
    case 'FIRE-Ready': return '🔥';
    default: return '💰';
  }
}
