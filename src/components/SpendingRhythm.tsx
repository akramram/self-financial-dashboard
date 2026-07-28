import React, { useState, useMemo, useEffect } from 'react';
import { formatIdr } from '../lib/utils';
import {
  Clock,
  Calendar,
  TrendingUp,
  Sun,
  Moon,
  Sunrise,
  Sunset,
  Zap,
  Lightbulb,
} from 'lucide-react';
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

ChartJS.register(
  CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend
);

// ============================================================
// Data shapes must match SpendingRhythmResult in src/lib/db.ts.
// Fetched at runtime from /api/spending-rhythm (NOT passed as
// Astro props) to avoid the devalue serialization pitfall.
// ============================================================
interface RhythmDowStat {
  dow: number;
  label: string;
  shortLabel: string;
  isWeekend: boolean;
  txCount: number;
  totalSpend: number;
  avgPerTx: number;
  distinctDays: number;
  avgPerDay: number;
  pctOfTotal: number;
}
interface RhythmTimeBucket {
  label: string;
  rangeLabel: string;
  txCount: number;
  totalSpend: number;
  pctOfTx: number;
  pctOfSpend: number;
}
interface RhythmInsight {
  icon: string;
  title: string;
  detail: string;
  tone: 'good' | 'neutral' | 'warn';
}
interface SpendingRhythmResult {
  totalTx: number;
  totalSpend: number;
  dateRangeStart: string | null;
  dateRangeEnd: string | null;
  dowStats: RhythmDowStat[];
  weekdayVsWeekend: {
    weekdayTx: number; weekdaySpend: number; weekdayAvgPerDay: number;
    weekendTx: number; weekendSpend: number; weekendAvgPerDay: number;
    weekdayPctSpend: number; weekendPctSpend: number;
  };
  peakDay: RhythmDowStat | null;
  quietDay: RhythmDowStat | null;
  timeBuckets: RhythmTimeBucket[];
  peakHour: number | null;
  categoryHeatmap: { category: string; cells: number[] }[];
  insights: RhythmInsight[];
}

const TIME_BUCKET_ICONS: Record<string, React.ReactNode> = {
  'Late Night': <Moon className="w-5 h-5" />,
  'Morning': <Sunrise className="w-5 h-5" />,
  'Afternoon': <Sun className="w-5 h-5" />,
  'Evening': <Sunset className="w-5 h-5" />,
};

function fmtDateRange(start: string | null, end: string | null): string {
  if (!start || !end) return 'No data';
  const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${fmt(start)} → ${fmt(end)}`;
}

function toneClasses(tone: 'good' | 'neutral' | 'warn'): string {
  if (tone === 'good') return 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30';
  if (tone === 'warn') return 'border-gold-400/20 dark:border-gold-700/40 bg-gold-500/5 dark:bg-gold-700/10';
  return 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50';
}

export default function SpendingRhythm() {
  const [data, setData] = useState<SpendingRhythmResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dowMetric, setDowMetric] = useState<'avgPerDay' | 'totalSpend' | 'txCount'>('avgPerDay');

  useEffect(() => {
    fetch('/api/spending-rhythm')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  // ── Chart data — all hooks MUST be before any early return ──
  const dowChartData = useMemo(() => {
    if (!data) return null;
    const stats = data.dowStats;
    const isWeekendColors = stats.map((s) =>
      s.isWeekend ? 'rgba(168, 85, 247, 0.7)' : 'rgba(59, 130, 246, 0.7)'
    );
    const isWeekendBorders = stats.map((s) =>
      s.isWeekend ? 'rgba(168, 85, 247, 1)' : 'rgba(59, 130, 246, 1)'
    );
    return {
      labels: stats.map((s) => s.shortLabel),
      datasets: [
        {
          label:
            dowMetric === 'avgPerDay' ? 'Avg / Day (IDR)'
            : dowMetric === 'totalSpend' ? 'Total Spend (IDR)'
            : 'Transaction Count',
          data: stats.map((s) => (dowMetric === 'txCount' ? s.txCount : dowMetric === 'totalSpend' ? s.totalSpend : s.avgPerDay)),
          backgroundColor: isWeekendColors,
          borderColor: isWeekendBorders,
          borderWidth: 1,
          borderRadius: 6,
        },
      ],
    };
  }, [data, dowMetric]);

  const dowChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: false as const,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            const idx = ctx.dataIndex;
            const s = data?.dowStats[idx];
            if (!s) return '';
            if (dowMetric === 'txCount') return `${s.txCount} transactions`;
            return `${dowMetric === 'avgPerDay' ? 'Avg/day' : 'Total'}: ${formatIdr(ctx.parsed.y)}`;
          },
          afterLabel: (ctx: any) => {
            const idx = ctx.dataIndex;
            const s = data?.dowStats[idx];
            if (!s) return '';
            return [
              `${s.txCount} transactions`,
              `${s.distinctDays} distinct days`,
              `${formatIdr(s.totalSpend)} total`,
              `${s.pctOfTotal}% of all spend`,
            ];
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (val: any) =>
            dowMetric === 'txCount' ? val : formatIdr(val).replace('IDR ', ''),
        },
      },
    },
  }), [data, dowMetric]);

  // ── Category heatmap helpers ──
  const heatmapMax = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, ...data.categoryHeatmap.flatMap((c) => c.cells));
  }, [data]);

  function heatColor(value: number): string {
    if (value === 0) return 'rgba(148, 163, 184, 0.1)'; // slate-400/10
    const ratio = Math.min(1, value / heatmapMax);
    // Interpolate from mint-100 → mint-600
    if (ratio > 0.75) return 'rgba(5, 150, 105, 0.85)';   // mint-600
    if (ratio > 0.5) return 'rgba(4, 120, 87, 0.75)';     // mint-700
    if (ratio > 0.25) return 'rgba(16, 185, 129, 0.6)';   // mint-500
    if (ratio > 0.1) return 'rgba(52, 211, 153, 0.5)';    // mint-400
    return 'rgba(110, 231, 183, 0.4)';                    // mint-300
  }

  // ── Early returns AFTER all hooks ──
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-2 border-mint-500/40 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-sm">Analyzing your spending rhythm…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 p-6 text-center">
        <p className="text-rose-600 dark:text-rose-400 font-medium">Failed to load data</p>
        <p className="text-sm text-slate-500 mt-1">{error}</p>
      </div>
    );
  }

  if (!data || data.totalTx === 0) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-10 text-center">
        <Calendar className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
        <p className="text-slate-500 font-medium">No timestamped spending data yet</p>
        <p className="text-sm text-slate-400 mt-1">
          Spending Rhythm needs transactions with <code className="text-xs px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-700">created_time</code> data.
          New transactions added via the dashboard are automatically tracked.
        </p>
      </div>
    );
  }

  const { weekdayVsWeekend: wv } = data;

  return (
    <div className="space-y-6">
      {/* ── Header summary cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
            <Calendar className="w-3.5 h-3.5" /> Transactions
          </div>
          <p className="text-2xl font-bold">{data.totalTx}</p>
          <p className="text-xs text-slate-400 mt-0.5">{fmtDateRange(data.dateRangeStart, data.dateRangeEnd)}</p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
            <TrendingUp className="w-3.5 h-3.5" /> Total Spend
          </div>
          <p className="text-2xl font-bold">{formatIdr(data.totalSpend)}</p>
          <p className="text-xs text-slate-400 mt-0.5">{data.dowStats.length} weekdays tracked</p>
        </div>

        <div className="rounded-xl border border-mint-400/30 bg-mint-500/5 dark:bg-mint-500/10 p-4">
          <div className="flex items-center gap-2 text-xs text-mint-600 dark:text-mint-400 mb-1">
            <Zap className="w-3.5 h-3.5" /> Peak Day
          </div>
          <p className="text-2xl font-bold text-mint-700 dark:text-mint-300">{data.peakDay?.label ?? '—'}</p>
          <p className="text-xs text-mint-500/70 mt-0.5">{data.peakDay ? `${formatIdr(data.peakDay.avgPerDay)}/day avg` : 'no data'}</p>
        </div>

        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-4">
          <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 mb-1">
            <Clock className="w-3.5 h-3.5" /> Peak Hour
          </div>
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
            {data.peakHour !== null
              ? `${data.peakHour === 0 ? 12 : data.peakHour > 12 ? data.peakHour - 12 : data.peakHour} ${data.peakHour < 12 ? 'AM' : 'PM'}`
              : '—'}
          </p>
          <p className="text-xs text-emerald-500/70 mt-0.5">most active time</p>
        </div>
      </div>

      {/* ── Auto-generated insights ── */}
      {data.insights.length > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold mb-3">
            <Lightbulb className="w-4 h-4 text-gold-500" />
            Behavioral Insights
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.insights.map((ins, i) => (
              <div key={i} className={`rounded-lg border p-3 flex gap-3 ${toneClasses(ins.tone)}`}>
                <span className="text-xl flex-shrink-0">{ins.icon}</span>
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{ins.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{ins.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Day of week chart ── */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Calendar className="w-4 h-4 text-mint-500" />
            Spending by Day of Week
          </h3>
          <div className="flex gap-1 text-xs bg-slate-100 dark:bg-slate-700/50 rounded-lg p-1">
            {([['avgPerDay', 'Avg/Day'], ['totalSpend', 'Total'], ['txCount', 'Count']] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setDowMetric(key)}
                className={`px-2.5 py-1 rounded-md font-medium transition ${
                  dowMetric === key
                    ? 'bg-white dark:bg-slate-800 text-mint-600 dark:text-mint-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ height: 280 }}>
          {dowChartData && <Bar data={dowChartData} options={dowChartOptions} />}
        </div>

        <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded bg-mint-500/70"></span> Weekday
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded bg-coral-500/70"></span> Weekend
          </span>
        </div>
      </div>

      {/* ── Weekday vs Weekend ── */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold mb-4">
          <Calendar className="w-4 h-4 text-coral-500" />
          Weekday vs Weekend
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Weekday */}
          <div className="rounded-lg border border-mint-400/30 bg-mint-500/5 dark:bg-mint-500/10 p-4">
            <p className="text-xs font-semibold text-mint-600 dark:text-mint-400 mb-3">💼 WEEKDAYS (Mon–Fri)</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Total Spend</span>
                <span className="font-semibold">{formatIdr(wv.weekdaySpend)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Transactions</span>
                <span className="font-semibold">{wv.weekdayTx}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Avg / Day</span>
                <span className="font-semibold">{formatIdr(wv.weekdayAvgPerDay)}</span>
              </div>
              <div className="pt-2 border-t border-mint-400/30">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Share of spend</span>
                  <span className="font-medium text-mint-600 dark:text-mint-400">{wv.weekdayPctSpend}%</span>
                </div>
                <div className="h-2 rounded-full bg-mint-100 dark:bg-mint-900/40 overflow-hidden">
                  <div className="h-full bg-mint-500 rounded-full" style={{ width: `${wv.weekdayPctSpend}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Weekend */}
          <div className="rounded-lg border border-coral-400/30 bg-coral-500/5 dark:bg-coral-500/10 p-4">
            <p className="text-xs font-semibold text-coral-500 dark:text-coral-400 mb-3">🎉 WEEKENDS (Sat–Sun)</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Total Spend</span>
                <span className="font-semibold">{formatIdr(wv.weekendSpend)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Transactions</span>
                <span className="font-semibold">{wv.weekendTx}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Avg / Day</span>
                <span className="font-semibold">{formatIdr(wv.weekendAvgPerDay)}</span>
              </div>
              <div className="pt-2 border-t border-coral-400/30">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Share of spend</span>
                  <span className="font-medium text-coral-500 dark:text-coral-400">{wv.weekendPctSpend}%</span>
                </div>
                <div className="h-2 rounded-full bg-coral-100 dark:bg-coral-900/40 overflow-hidden">
                  <div className="h-full bg-coral-500 rounded-full" style={{ width: `${wv.weekendPctSpend}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Time of day distribution ── */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold mb-4">
          <Clock className="w-4 h-4 text-emerald-500" />
          Time of Day Distribution
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {data.timeBuckets.map((bucket) => (
            <div
              key={bucket.label}
              className={`rounded-lg border p-4 ${
                bucket.label === 'Late Night' ? 'border-navy-300 dark:border-navy-700 bg-navy-500/5 dark:bg-navy-500/10'
                : bucket.label === 'Morning' ? 'border-gold-400/30 bg-gold-500/5 dark:bg-gold-500/10'
                : bucket.label === 'Afternoon' ? 'border-coral-400/20 dark:border-coral-700/40 bg-coral-500/5 dark:bg-coral-700/10/30'
                : 'border-gold-400/30 bg-gold-500/5 dark:bg-gold-500/10'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                {TIME_BUCKET_ICONS[bucket.label]}
                <span className="text-xs text-slate-400">{bucket.rangeLabel}</span>
              </div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{bucket.label}</p>
              <p className="text-lg font-bold mt-1">{bucket.txCount}</p>
              <p className="text-xs text-slate-400">transactions · {bucket.pctOfTx}%</p>
              <div className="mt-2 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    bucket.label === 'Late Night' ? 'bg-navy-400'
                    : bucket.label === 'Morning' ? 'bg-gold-400'
                    : bucket.label === 'Afternoon' ? 'bg-coral-400'
                    : 'bg-gold-400'
                  }`}
                  style={{ width: `${bucket.pctOfTx}%` }}
                ></div>
              </div>
              <p className="text-xs text-slate-400 mt-2">{formatIdr(bucket.totalSpend)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Category × Weekday heatmap ── */}
      {data.categoryHeatmap.length > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold mb-4">
            <TrendingUp className="w-4 h-4 text-mint-500" />
            Category × Weekday Heatmap
          </h3>
          <p className="text-xs text-slate-400 mb-3">Spending intensity by category across weekdays. Darker = more spending.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="text-left py-2 pr-3 text-slate-400 font-medium">Category</th>
                  {data.dowStats.map((s) => (
                    <th
                      key={s.dow}
                      className={`px-1 py-2 text-center font-medium ${s.isWeekend ? 'text-coral-500' : 'text-slate-400'}`}
                    >
                      {s.shortLabel}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.categoryHeatmap.map((row) => (
                  <tr key={row.category}>
                    <td className="py-1 pr-3 text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap">
                      {row.category}
                    </td>
                    {row.cells.map((val, idx) => (
                      <td key={idx} className="px-1 py-1 text-center">
                        <div
                          className="rounded-md flex items-center justify-center h-8 text-[10px] font-medium transition hover:scale-105"
                          style={{
                            backgroundColor: heatColor(val),
                            color: val / heatmapMax > 0.5 ? 'white' : undefined,
                          }}
                          title={`${row.category} · ${data.dowStats[idx].label}: ${formatIdr(val)}`}
                        >
                          {val > 0 ? (val / 1_000_000).toFixed(val >= 1_000_000 ? 1 : 2) + 'M' : ''}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-end gap-2 mt-3 text-xs text-slate-400">
            <span>Less</span>
            <div className="flex gap-0.5">
              <span className="inline-block w-4 h-3 rounded-sm" style={{ backgroundColor: heatColor(0) }}></span>
              <span className="inline-block w-4 h-3 rounded-sm" style={{ backgroundColor: heatColor(heatmapMax * 0.15) }}></span>
              <span className="inline-block w-4 h-3 rounded-sm" style={{ backgroundColor: heatColor(heatmapMax * 0.35) }}></span>
              <span className="inline-block w-4 h-3 rounded-sm" style={{ backgroundColor: heatColor(heatmapMax * 0.6) }}></span>
              <span className="inline-block w-4 h-3 rounded-sm" style={{ backgroundColor: heatColor(heatmapMax) }}></span>
            </div>
            <span>More</span>
          </div>
        </div>
      )}
    </div>
  );
}
