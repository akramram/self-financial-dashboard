import React, { useState, useEffect, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from 'chart.js';
import { Radar, Bar } from 'react-chartjs-2';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Shield,
  Zap,
  Brain,
  Heart,
  BarChart3,
  Trophy,
  ArrowRight,
} from 'lucide-react';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement
);

interface DnaDimensions {
  necessities: number;
  lifestyle: number;
  savingsDiscipline: number;
  creditUsage: number;
  stability: number;
  growth: number;
}

interface DnaPersonality {
  type: string;
  emoji: string;
  description: string;
}

interface DnaTimelineEntry {
  period_id: number;
  month: string;
  total_spending: number;
  income: number | null;
  savings_rate: number | null;
  category_count: number;
  transaction_count: number;
  recurring_pct: number | null;
  discretionary_ratio: number | null;
  budget_adherence: number | null;
  networth: number | null;
}

interface LoyaltyScore {
  category: string;
  total_amount: number;
  period_count: number;
  avg_amount: number;
  std_dev: number;
  cv: number;
  loyalty_score: number;
  trend: 'rising' | 'falling' | 'stable';
  top_period: string | null;
}

interface DnaSummary {
  total_periods: number;
  total_spending: number;
  avg_monthly_spend: number;
  avg_savings_rate: number;
  most_used_category: string;
  most_stable_category: string;
  category_count: number;
}

interface DnaData {
  personality: DnaPersonality;
  dimensions: DnaDimensions;
  timeline: DnaTimelineEntry[];
  loyaltyScores: LoyaltyScore[];
  insights: string[];
  summary: DnaSummary;
}

const dimensionLabels: Record<keyof DnaDimensions, string> = {
  necessities: 'Necessities',
  lifestyle: 'Lifestyle',
  savingsDiscipline: 'Savings Discipline',
  creditUsage: 'Credit Usage',
  stability: 'Stability',
  growth: 'Growth',
};

const dimensionColors: Record<keyof DnaDimensions, string> = {
  necessities: 'bg-slate-500',
  lifestyle: 'bg-pink-500',
  savingsDiscipline: 'bg-emerald-500',
  creditUsage: 'bg-amber-500',
  stability: 'bg-sky-500',
  growth: 'bg-gold-500',
};

const dimensionIcons: Record<keyof DnaDimensions, React.ReactNode> = {
  necessities: <Shield className="w-4 h-4" />,
  lifestyle: <Zap className="w-4 h-4" />,
  savingsDiscipline: <Target className="w-4 h-4" />,
  creditUsage: <BarChart3 className="w-4 h-4" />,
  stability: <Heart className="w-4 h-4" />,
  growth: <TrendingUp className="w-4 h-4" />,
};

export default function SpendingDna() {
  const [data, setData] = useState<DnaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/dna')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => setData(d))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // ── Radar chart data
  const radarData = useMemo(() => {
    if (!data) return null;
    const dims = data.dimensions;
    return {
      labels: Object.keys(dims).map((k) => dimensionLabels[k as keyof DnaDimensions]),
      datasets: [
        {
          label: 'Your Spending DNA',
          data: Object.values(dims),
          backgroundColor: 'rgba(139, 92, 246, 0.15)',
          borderColor: 'rgba(139, 92, 246, 0.8)',
          borderWidth: 2,
          pointBackgroundColor: 'rgba(139, 92, 246, 1)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgba(139, 92, 246, 1)',
          pointRadius: 5,
        },
      ],
    };
  }, [data]);

  const radarOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      scales: {
        r: {
          beginAtZero: true,
          max: 100,
          ticks: {
            stepSize: 20,
            font: { size: 10 },
            color: 'rgba(100, 116, 139, 0.6)',
            backdropColor: 'transparent',
          },
          pointLabels: {
            font: { size: 12, weight: 'bold' as const },
            color: 'rgba(71, 85, 105, 1)',
          },
          grid: {
            color: 'rgba(148, 163, 184, 0.2)',
          },
          angleLines: {
            color: 'rgba(148, 163, 184, 0.2)',
          },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx: any) => `${ctx.label}: ${ctx.parsed.r}/100`,
          },
        },
      },
    }),
    []
  );

  // ── Timeline savings rate chart data
  const savingsChartData = useMemo(() => {
    if (!data) return null;
    const entries = data.timeline.filter((t) => t.savings_rate !== null);
    if (entries.length === 0) return null;
    return {
      labels: entries.map((e) => e.month.replace(/ \d{4}$/, '')),
      datasets: [
        {
          label: 'Savings Rate %',
          data: entries.map((e) => e.savings_rate),
          backgroundColor: entries.map((e) =>
            e.savings_rate !== null && e.savings_rate >= 0
              ? 'rgba(16, 185, 129, 0.6)'
              : 'rgba(239, 68, 68, 0.6)'
          ),
          borderColor: entries.map((e) =>
            e.savings_rate !== null && e.savings_rate >= 0
              ? 'rgba(16, 185, 129, 1)'
              : 'rgba(239, 68, 68, 1)'
          ),
          borderWidth: 1,
        },
      ],
    };
  }, [data]);

  const savingsChartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      scales: {
        y: {
          ticks: {
            callback: (v: any) => `${v}%`,
            font: { size: 10 },
          },
          grid: { color: 'rgba(148, 163, 184, 0.15)' },
        },
        x: {
          ticks: { font: { size: 10 }, maxRotation: 45 },
          grid: { display: false },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx: any) => `Savings: ${ctx.parsed.y}%`,
          },
        },
      },
    }),
    []
  );

  // ── Spending composition timeline
  const compositionChartData = useMemo(() => {
    if (!data) return null;
    const entries = data.timeline.slice(-12);
    return {
      labels: entries.map((e) => e.month.replace(/ \d{4}$/, '')),
      datasets: [
        {
          label: 'Recurring %',
          data: entries.map((e) => e.recurring_pct ?? 0),
          backgroundColor: 'rgba(100, 116, 139, 0.6)',
          borderColor: 'rgba(100, 116, 139, 1)',
          borderWidth: 1,
        },
        {
          label: 'Discretionary %',
          data: entries.map((e) => e.discretionary_ratio ?? 0),
          backgroundColor: 'rgba(236, 72, 153, 0.6)',
          borderColor: 'rgba(236, 72, 153, 1)',
          borderWidth: 1,
        },
      ],
    };
  }, [data]);

  const compositionChartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      scales: {
        y: {
          stacked: true,
          max: 100,
          ticks: {
            callback: (v: any) => `${v}%`,
            font: { size: 10 },
          },
          grid: { color: 'rgba(148, 163, 184, 0.15)' },
        },
        x: {
          stacked: true,
          ticks: { font: { size: 10 }, maxRotation: 45 },
          grid: { display: false },
        },
      },
      plugins: {
        legend: {
          position: 'bottom' as const,
          labels: { font: { size: 11 }, boxWidth: 12 },
        },
        tooltip: {
          callbacks: {
            label: (ctx: any) => `${ctx.dataset.label}: ${ctx.parsed.y}%`,
          },
        },
      },
    }),
    []
  );

  // ── Loyalty score gradient color
  const loyaltyColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
    if (score >= 60) return 'text-sky-600 dark:text-sky-400';
    if (score >= 40) return 'text-amber-600 dark:text-amber-400';
    return 'text-rose-600 dark:text-rose-400';
  };

  const loyaltyBg = (score: number) => {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 60) return 'bg-sky-500';
    if (score >= 40) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const trendIcon = (trend: string) => {
    if (trend === 'rising') return <TrendingUp className="w-3 h-3 text-rose-500" />;
    if (trend === 'falling') return <TrendingDown className="w-3 h-3 text-emerald-500" />;
    return <Minus className="w-3 h-3 text-slate-400" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <Brain className="w-5 h-5 animate-pulse" />
          Analyzing your spending DNA...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-rose-500 flex items-center gap-2">
          Error: {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* ── Personality Type Hero ──────────────────────────────────────── */}
      <div className="glass-card p-5 border-white/[0.08] bg-gradient-to-br dark:from-navy-800/40 dark:to-navy-900/20">
        <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="text-7xl">{data.personality.emoji}</div>
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl font-bold text-gold-400 dark:text-gold-400">
                {data.personality.type}
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mt-2 max-w-xl">
                {data.personality.description}
              </p>
              <div className="flex flex-wrap gap-4 mt-4 justify-center md:justify-start">
                <div className="text-sm">
                  <span className="text-slate-500">Periods analyzed</span>
                  <span className="ml-2 font-semibold">{data.summary.total_periods}</span>
                </div>
                <div className="text-sm">
                  <span className="text-slate-500">Avg savings rate</span>
                  <span className="ml-2 font-semibold">{data.summary.avg_savings_rate}%</span>
                </div>
                <div className="text-sm">
                  <span className="text-slate-500">Categories</span>
                  <span className="ml-2 font-semibold">{data.summary.category_count}</span>
                </div>
              </div>
            </div>
            <div className="flex-shrink-0">
              <Trophy className="w-16 h-16 text-gold-400 dark:text-gold-500" />
            </div>
          </div>
        </div>

      {/* ── Radar Chart + Dimension Breakdown ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-5">
          <h3 className="flex items-center gap-2 text-white/80">
              <Brain className="w-5 h-5 text-gold-500" />
              Behavioral Radar
            </h3>
          <div style={{ height: 320, maxWidth: 380, margin: '0 auto' }}>
              {radarData && <Radar data={radarData} options={radarOptions} />}
            </div>
          </div>

        <div className="glass-card p-5">
          <h3 className="flex items-center gap-2 text-white/80">
              <BarChart3 className="w-5 h-5 text-slate-500" />
              Dimension Breakdown
            </h3>
          <div className="space-y-4">
              {Object.entries(data.dimensions).map(([key, value]) => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {dimensionIcons[key as keyof DnaDimensions]}
                      <span>{dimensionLabels[key as keyof DnaDimensions]}</span>
                    </div>
                    <span className="text-sm text-slate-500">{value}/100</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${dimensionColors[key as keyof DnaDimensions]}`}
                      style={{ width: `${value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
      </div>

      {/* ── Key Insights ──────────────────────────────────────────────── */}
      <div className="glass-card p-5">
        <h3 className="flex items-center gap-2 text-white/80">
            <Zap className="w-5 h-5 text-gold-500" />
            Key Insights
          </h3>
        <div className="space-y-3">
            {data.insights.map((insight, i) => (
              <div
                key={i}
                className="flex gap-3 items-start p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50"
              >
                <ArrowRight className="w-4 h-4 text-gold-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-slate-700 dark:text-slate-300">{insight}</p>
              </div>
            ))}
          </div>
        </div>

      {/* ── DNA Timeline Charts ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-5">
          <h3 className="flex items-center gap-2 text-white/80">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              Savings Rate Over Time
            </h3>
          {savingsChartData ? (
              <div style={{ height: 220 }}>
                <Bar data={savingsChartData} options={savingsChartOptions} />
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-8">
                No income data available for savings rate calculation
              </p>
            )}
          </div>

        <div className="glass-card p-5">
          <h3 className="flex items-center gap-2 text-white/80">
              <Target className="w-5 h-5 text-pink-500" />
              Recurring vs Discretionary Split
            </h3>
          {compositionChartData ? (
              <div style={{ height: 220 }}>
                <Bar data={compositionChartData} options={compositionChartOptions} />
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-8">
                No spending data available
              </p>
            )}
          </div>
      </div>

      {/* ── Timeline Sparkline Cards ─────────────────────────────────── */}
      <div className="glass-card p-5">
        <h3 className="flex items-center gap-2 text-white/80">
            <Heart className="w-5 h-5 text-rose-500" />
            Monthly DNA Timeline
          </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {data.timeline.slice(-12).map((entry) => (
              <div
                key={entry.period_id}
                className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-center"
              >
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 truncate">
                  {entry.month.replace(/ \d{4}$/, '')}
                </div>
                <div className="text-lg font-bold text-slate-800 dark:text-slate-200">
                  {entry.transaction_count}
                </div>
                <div className="text-xs text-slate-400">transactions</div>
                <div className="mt-1.5 flex justify-center gap-1">
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 ${
                      (entry.savings_rate ?? 0) >= 0
                        ? 'border-emerald-300 text-emerald-700 dark:text-emerald-400'
                        : 'border-rose-300 text-rose-700 dark:text-rose-400'
                    }`}
                  >
                    {entry.savings_rate !== null ? `${entry.savings_rate}%` : '—'}
                  </Badge>
                </div>
                <div className="mt-1">
                  <span className="text-[10px] text-slate-400">{entry.category_count} cats</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      {/* ── Category Loyalty Scores ──────────────────────────────────── */}
      <div className="glass-card p-5">
        <h3 className="flex items-center gap-2 text-white/80">
            <Shield className="w-5 h-5 text-sky-500" />
            Category Loyalty Scores
          </h3>
          <p className="text-xs text-slate-500">
            How consistent each category's spending is across periods (lower CV = more loyal)
          </p>
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-2 px-2 font-medium text-slate-500">Category</th>
                  <th className="text-right py-2 px-2 font-medium text-slate-500">Total</th>
                  <th className="text-right py-2 px-2 font-medium text-slate-500">Avg/Mo</th>
                  <th className="text-right py-2 px-2 font-medium text-slate-500">Periods</th>
                  <th className="text-center py-2 px-2 font-medium text-slate-500">CV</th>
                  <th className="text-center py-2 px-2 font-medium text-slate-500">Loyalty</th>
                  <th className="text-center py-2 px-2 font-medium text-slate-500">Trend</th>
                </tr>
              </thead>
              <tbody>
                {data.loyaltyScores.slice(0, 15).map((cat) => (
                  <tr
                    key={cat.category}
                    className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <td className="py-2 px-2 font-medium">{cat.category}</td>
                    <td className="py-2 px-2 text-right text-slate-600 dark:text-slate-400">
                      {cat.total_amount.toLocaleString()}
                    </td>
                    <td className="py-2 px-2 text-right text-slate-600 dark:text-slate-400">
                      {cat.avg_amount.toLocaleString()}
                    </td>
                    <td className="py-2 px-2 text-right text-slate-500">
                      {cat.period_count}
                    </td>
                    <td className="py-2 px-2 text-center">
                      <span
                        className={`text-xs font-medium ${loyaltyColor(cat.loyalty_score)}`}
                      >
                        {cat.cv}%
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-2 justify-center">
                        <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${loyaltyBg(cat.loyalty_score)}`}
                            style={{ width: `${cat.loyalty_score}%` }}
                          />
                        </div>
                        <span
                          className={`text-xs font-bold ${loyaltyColor(cat.loyalty_score)}`}
                        >
                          {cat.loyalty_score}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 px-2 text-center">
                      <div className="flex items-center gap-1 justify-center">
                        {trendIcon(cat.trend)}
                        <span className="text-xs capitalize text-slate-500">
                          {cat.trend}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
    </div>
  );
}
