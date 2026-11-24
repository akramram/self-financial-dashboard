import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Skeleton } from './ui/skeleton';
import type { MonthlySummary, Category } from '../lib/data';
import type {
  HealthFactor,
  HealthResult,
  HealthSimulationInput,
} from '../lib/health-engine';
import { simulateHealthScore } from '../lib/health-engine';
import { formatIdr } from '../lib/utils';
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
  RadialLinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Radar } from 'react-chartjs-2';
import { fpGrid } from '../lib/chartConfig';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  PiggyBank,
  Target,
  Wallet,
  Activity,
  Heart,
  ArrowUpRight,
  ArrowDownRight,
  Lightbulb,
  Trophy,
  Sliders,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  History,
  Crosshair,
  RefreshCw,
} from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface Props {
  summaries?: MonthlySummary[];
  categories?: Category[];
}

type ActiveTab = 'overview' | 'simulator' | 'history';

const GRADE_STYLE: Record<string, { hex: string; cardBg: string; text: string; badge: string }> = {
  emerald: {
    hex: '#10b981',
    cardBg: 'bg-emerald-50/80 dark:bg-emerald-950/30',
    text: 'text-emerald-700 dark:text-emerald-300',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/70 dark:text-emerald-200',
  },
  green: {
    hex: '#22c55e',
    cardBg: 'bg-emerald-50/60 dark:bg-emerald-950/20',
    text: 'text-emerald-700 dark:text-emerald-300',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200',
  },
  yellow: {
    hex: '#eab308',
    cardBg: 'bg-amber-50/80 dark:bg-amber-950/25',
    text: 'text-amber-700 dark:text-amber-300',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200',
  },
  amber: {
    hex: '#f59e0b',
    cardBg: 'bg-amber-50/80 dark:bg-amber-950/25',
    text: 'text-amber-700 dark:text-amber-300',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200',
  },
  orange: {
    hex: '#f97316',
    cardBg: 'bg-orange-50/80 dark:bg-orange-950/25',
    text: 'text-orange-700 dark:text-orange-300',
    badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900/60 dark:text-orange-200',
  },
  red: {
    hex: '#ef4444',
    cardBg: 'bg-red-50/80 dark:bg-red-950/30',
    text: 'text-red-700 dark:text-red-300',
    badge: 'bg-red-100 text-red-800 dark:bg-red-900/70 dark:text-red-200',
  },
};

function ScoreGauge({
  score,
  grade,
  gradeColor,
  subtitle = 'Financial Health Score',
  compact = false,
}: {
  score: number;
  grade: string;
  gradeColor: string;
  subtitle?: string;
  compact?: boolean;
}) {
  const radius = compact ? 56 : 70;
  const stroke = compact ? 10 : 12;
  const normalizedRadius = radius - stroke;
  const circumference = normalizedRadius * 2 * Math.PI;
  const offset = circumference - (Math.max(0, Math.min(100, score)) / 100) * circumference;
  const palette = GRADE_STYLE[gradeColor] || GRADE_STYLE.amber;

  return (
    <div
      className={`flex flex-col items-center justify-center ${
        compact ? 'p-5' : 'p-7'
      } rounded-2xl ${palette.cardBg} border border-slate-200 dark:border-white/[0.08]`}
    >
      <div className="relative">
        <svg height={radius * 2} width={radius * 2} className="-rotate-90" aria-hidden="true">
          <circle
            stroke="currentColor"
            fill="transparent"
            strokeWidth={stroke}
            className="text-slate-200 dark:text-white/15"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          <circle
            stroke={palette.hex}
            fill="transparent"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            style={{ strokeDashoffset: offset, transition: 'stroke-dashoffset 0.7s ease-out' }}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`${compact ? 'text-3xl' : 'text-4xl'} font-bold tabular-nums ${palette.text}`}>
            {score}
          </span>
          <span className="text-xs text-slate-600 dark:text-white/60">/ 100</span>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Badge className={`${palette.badge} text-base font-bold px-3 py-0.5 border-0`}>{grade}</Badge>
      </div>
      <p className="mt-2 text-xs font-medium text-slate-600 dark:text-white/60 text-center">{subtitle}</p>
    </div>
  );
}

function FactorIcon({ icon, score, maxScore }: { icon: string; score: number; maxScore: number }) {
  const pct = (score / maxScore) * 100;
  const color =
    pct >= 80
      ? 'text-emerald-600 dark:text-emerald-400'
      : pct >= 60
        ? 'text-amber-600 dark:text-amber-400'
        : pct >= 40
          ? 'text-orange-600 dark:text-orange-400'
          : 'text-red-600 dark:text-red-400';

  const iconMap: Record<string, React.ReactNode> = {
    'piggy-bank': <PiggyBank className={`w-4 h-4 ${color}`} />,
    target: <Target className={`w-4 h-4 ${color}`} />,
    'trending-up': <TrendingUp className={`w-4 h-4 ${color}`} />,
    wallet: <Wallet className={`w-4 h-4 ${color}`} />,
    activity: <Activity className={`w-4 h-4 ${color}`} />,
  };

  return <>{iconMap[icon] || <Heart className={`w-4 h-4 ${color}`} />}</>;
}

function FactorCard({ factor, prevScore }: { factor: HealthFactor; prevScore?: number }) {
  const pct = Math.max(0, Math.min(100, (factor.score / factor.maxScore) * 100));
  const barColor =
    pct >= 80
      ? 'bg-emerald-500'
      : pct >= 60
        ? 'bg-amber-500'
        : pct >= 40
          ? 'bg-orange-500'
          : 'bg-red-500';
  const delta = prevScore !== undefined ? factor.score - prevScore : null;

  return (
    <div className="glass-card p-4 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <FactorIcon icon={factor.icon} score={factor.score} maxScore={factor.maxScore} />
            <span className="font-semibold text-sm text-slate-900 dark:text-white truncate">
              {factor.name}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {delta !== null && delta !== 0 && (
              <span
                className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${
                  delta > 0
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                }`}
              >
                {delta > 0 ? `+${delta}` : delta}
              </span>
            )}
            <span className="text-sm font-bold tabular-nums text-slate-900 dark:text-white">
              {factor.score}
              <span className="text-xs font-normal text-slate-500 dark:text-white/50">/{factor.maxScore}</span>
            </span>
          </div>
        </div>

        <div className="w-full bg-slate-200 dark:bg-white/[0.08] rounded-full h-2 mb-2.5 overflow-hidden">
          <div
            className={`${barColor} h-2 rounded-full transition-all duration-500`}
            style={{ width: `${pct}%` }}
          />
        </div>

        <p className="text-xs font-semibold text-slate-800 dark:text-white/90">{factor.label}</p>
        <p className="text-xs text-slate-600 dark:text-white/60 mt-1">{factor.detail}</p>
      </div>

      <p className="text-[11px] text-slate-500 dark:text-white/50 mt-3 pt-2 border-t border-slate-200/80 dark:border-white/[0.06]">
        {factor.targetHint}
      </p>
    </div>
  );
}

const DEFAULT_SIM: HealthSimulationInput = {
  extraMonthlySavings: 0,
  resolvedOverBudgetCount: 0,
  targetNwGrowthPct: null,
};

export default function HealthScore({ summaries: initialSummaries }: Props) {
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const urlMonth = new URLSearchParams(window.location.search).get('month');
      if (urlMonth) return urlMonth;
    }
    return 'all';
  });
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [healthData, setHealthData] = useState<HealthResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [simInput, setSimInput] = useState<HealthSimulationInput>(DEFAULT_SIM);

  const loadHealth = useCallback((monthToFetch: string) => {
    setLoading(true);
    setError(null);
    const params = monthToFetch !== 'all' ? `?month=${encodeURIComponent(monthToFetch)}` : '';
    fetch(`/api/health${params}`)
      .then(async (res) => {
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload.error || `HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((data: HealthResult) => {
        setHealthData(data);
        setSimInput(DEFAULT_SIM);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Gagal memuat skor kesehatan finansial');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadHealth(selectedMonth);
  }, [selectedMonth, loadHealth]);

  // Sync URL query param with selected period
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (selectedMonth !== 'all') {
      params.set('month', selectedMonth);
    } else {
      params.delete('month');
    }
    const qs = params.toString();
    const nextUrl = `${window.location.pathname}${qs ? `?${qs}` : ''}`;
    window.history.replaceState({}, '', nextUrl);
  }, [selectedMonth]);

  const months = useMemo(() => {
    if (healthData?.availableMonths && healthData.availableMonths.length > 0) {
      return healthData.availableMonths;
    }
    if (initialSummaries && initialSummaries.length > 0) {
      return [...initialSummaries].reverse().map((s) => s.month);
    }
    return [];
  }, [healthData, initialSummaries]);

  const trendChart = useMemo(() => {
    if (!healthData?.history || healthData.history.length === 0) return null;
    return {
      labels: healthData.history.map((h) => h.month),
      datasets: [
        {
          label: 'Health Score',
          data: healthData.history.map((h) => h.score),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.12)',
          fill: true,
          tension: 0.3,
          pointBackgroundColor: healthData.history.map((h) =>
            h.score >= 80 ? '#10b981' : h.score >= 50 ? '#f59e0b' : '#ef4444'
          ),
          pointRadius: 5,
          pointHoverRadius: 7,
        },
      ],
    };
  }, [healthData]);

  const radarChart = useMemo(() => {
    if (!healthData?.factors) return null;
    const labels = healthData.factors.map((f) => f.name);
    const currentVals = healthData.factors.map((f) => f.score);
    const hasPrev = healthData.prevFactors && Object.keys(healthData.prevFactors).length > 0;
    const prevVals = healthData.factors.map((f) => healthData.prevFactors?.[f.name] ?? 0);

    const datasets = [
      {
        label: healthData.month,
        data: currentVals,
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        borderColor: '#10b981',
        borderWidth: 2,
        pointBackgroundColor: '#10b981',
        pointRadius: 4,
      },
    ];

    if (hasPrev) {
      datasets.push({
        label: 'Bulan Sebelumnya',
        data: prevVals,
        backgroundColor: 'rgba(148, 163, 184, 0.14)',
        borderColor: '#94a3b8',
        borderWidth: 1.5,
        pointBackgroundColor: '#94a3b8',
        pointRadius: 3,
      });
    }

    return { labels, datasets };
  }, [healthData]);

  const trendOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx: any) => `Skor: ${ctx.parsed.y}/100`,
          },
        },
      },
      scales: {
        y: {
          min: 0,
          max: 100,
          grid: { color: fpGrid() },
          ticks: {
            callback: (value: any) => `${value}`,
          },
        },
        x: {
          grid: { display: false },
          ticks: { maxRotation: 0 },
        },
      },
    }),
    []
  );

  const radarOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom' as const,
          labels: { boxWidth: 12, font: { size: 11 } },
        },
      },
      scales: {
        r: {
          min: 0,
          max: 20,
          ticks: {
            stepSize: 5,
            backdropColor: 'transparent',
            font: { size: 10 },
          },
          grid: { color: fpGrid() },
          angleLines: { color: fpGrid() },
        },
      },
    }),
    []
  );

  const simResult = useMemo(() => {
    if (!healthData?.rawContext) return null;
    return simulateHealthScore(healthData.rawContext, healthData.factors, simInput);
  }, [healthData, simInput]);

  const maxPotentialLift = useMemo(() => {
    if (!healthData) return 0;
    return Math.max(0, 100 - healthData.overall);
  }, [healthData]);

  const reversedHistory = useMemo(() => {
    if (!healthData?.history) return [];
    return [...healthData.history].reverse();
  }, [healthData]);

  // ── UI States (Loading, Error, Empty) ─────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Memuat Financial Health Hub">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64 rounded-2xl" />
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
          </div>
        </div>
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-6 text-center space-y-3" role="alert">
        <AlertTriangle className="mx-auto h-10 w-10 text-red-500" />
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">
          Gagal Memuat Skor Kesehatan Finansial
        </h2>
        <p className="text-sm text-slate-600 dark:text-white/60">{error}</p>
        <Button
          type="button"
          onClick={() => loadHealth(selectedMonth)}
          className="min-h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Coba Lagi
        </Button>
      </div>
    );
  }

  if (!healthData) {
    return (
      <div className="glass-card p-8 text-center space-y-3">
        <Heart className="mx-auto h-12 w-12 text-slate-500 dark:text-white/50" />
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">
          Belum Ada Data untuk Menghitung Health Score
        </h2>
        <p className="text-sm text-slate-600 dark:text-white/60">
          Catat transaksi dan pemasukan siklus gaji terlebih dahulu untuk melihat analisis kesehatan finansial.
        </p>
        <div className="pt-2">
          <a
            href="/add"
            className="inline-flex items-center justify-center min-h-[44px] px-5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium no-underline transition-colors"
          >
            Catat Transaksi Pertama
          </a>
        </div>
      </div>
    );
  }

  const overBudgetCount = healthData.rawContext?.overBudgetCount ?? 0;

  return (
    <div className="space-y-6">
      {/* Top Toolbar: Period Selector & Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <label
            htmlFor="health-period-select"
            className="text-sm font-medium text-slate-700 dark:text-white/70"
          >
            Periode:
          </label>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger id="health-period-select" className="w-[190px] min-h-[44px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Periode Terbaru</SelectItem>
              {months.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="outline" className="text-xs font-medium text-slate-700 dark:text-white/80">
            {healthData.month}
          </Badge>
        </div>

        {/* Interactive Hub Tabs */}
        <div
          role="tablist"
          aria-label="Tampilan Financial Health Hub"
          className="inline-flex rounded-xl p-1 bg-slate-200/70 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] overflow-x-auto max-w-full"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'overview'}
            onClick={() => setActiveTab('overview')}
            className={`min-h-[44px] px-3.5 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Crosshair className="w-4 h-4" />
            Ringkasan & Pilar
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'simulator'}
            onClick={() => setActiveTab('simulator')}
            className={`min-h-[44px] px-3.5 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'simulator'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sliders className="w-4 h-4" />
            Simulator Skor
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'history'}
            onClick={() => setActiveTab('history')}
            className={`min-h-[44px] px-3.5 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            Riwayat & Metodologi
          </button>
        </div>
      </div>

      {/* Hero Command Strip: Main Gauge + 4 Executive Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 flex flex-col">
          <ScoreGauge
            score={healthData.overall}
            grade={healthData.grade}
            gradeColor={healthData.gradeColor}
            subtitle={`Skor Periode ${healthData.month}`}
          />
          {healthData.trend !== 'new' && healthData.prevScore !== null && (
            <div className="mt-3 flex items-center justify-center gap-1.5">
              {healthData.trend === 'up' ? (
                <>
                  <ArrowUpRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                    +{healthData.overall - healthData.prevScore} poin vs bulan lalu
                  </span>
                </>
              ) : healthData.trend === 'down' ? (
                <>
                  <ArrowDownRight className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <span className="text-sm font-semibold text-red-700 dark:text-red-400">
                    {healthData.overall - healthData.prevScore} poin vs bulan lalu
                  </span>
                </>
              ) : (
                <>
                  <Minus className="w-4 h-4 text-slate-600 dark:text-white/60" />
                  <span className="text-sm font-medium text-slate-600 dark:text-white/60">
                    Stabil ({healthData.overall - healthData.prevScore >= 0 ? '+' : ''}
                    {healthData.overall - healthData.prevScore} poin vs bulan lalu)
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="glass-card p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-white/50">
                Pilar Terkuat
              </p>
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="mt-2">
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                {healthData.strongestFactor?.name ?? 'N/A'}
              </p>
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 mt-0.5 tabular-nums">
                {healthData.strongestFactor ? `${healthData.strongestFactor.score} / 20 poin` : '-'}
              </p>
            </div>
          </div>

          <div className="glass-card p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-white/50">
                Bottleneck Utama
              </p>
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="mt-2">
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                {healthData.weakestFactor?.name ?? 'N/A'}
              </p>
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 mt-0.5 tabular-nums">
                {healthData.weakestFactor ? `${healthData.weakestFactor.score} / 20 poin` : '-'}
              </p>
            </div>
          </div>

          <div className="glass-card p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-white/50">
                Ruang Kenaikan Skor
              </p>
              <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="mt-2">
              <p className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                +{maxPotentialLift} poin
              </p>
              <p className="text-xs text-slate-600 dark:text-white/60 mt-0.5">
                {maxPotentialLift === 0
                  ? 'Skor sempurna 100/100 tercapai'
                  : `Menuju skor maksimal 100 (Grade A+)`}
              </p>
            </div>
          </div>

          <div className="glass-card p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-white/50">
                Rata-rata 3 Siklus
              </p>
              <Trophy className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="mt-2">
              <p className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                {healthData.avgLast3Score ?? healthData.overall} / 100
              </p>
              <p className="text-xs text-slate-600 dark:text-white/60 mt-0.5">
                Baseline kesehatan 3 periode terakhir
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* TAB 1: Ringkasan & Pilar */}
      {activeTab === 'overview' && (
        <div role="tabpanel" aria-label="Ringkasan dan Pilar" className="space-y-6">
          {/* Radar + Score Trend */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Crosshair className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                    Radar Keseimbangan 5 Pilar
                  </h2>
                </div>
                <span className="text-xs text-slate-500 dark:text-white/50">Skala 0-20</span>
              </div>
              <div className="h-[260px]">
                {radarChart ? (
                  <Radar data={radarChart} options={radarOptions} />
                ) : (
                  <div className="flex items-center justify-center h-full text-sm text-slate-500 dark:text-white/50">
                    Data radar belum tersedia
                  </div>
                )}
              </div>
            </div>

            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                    Tren Skor Antar Periode
                  </h2>
                </div>
                <span className="text-xs text-slate-500 dark:text-white/50">
                  {healthData.history.length} siklus
                </span>
              </div>
              <div className="h-[260px]">
                {trendChart && healthData.history.length > 1 ? (
                  <Line data={trendChart} options={trendOptions} />
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-600 dark:text-white/60 text-sm">
                    Butuh minimal 2 siklus gaji untuk grafik tren
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 5 Factor Breakdown */}
          <div>
            <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Rincian 5 Pilar Skor
                </h2>
              </div>
              <span className="text-xs text-slate-600 dark:text-white/60">
                Masing-masing pilar bernilai 0-20 poin (Investasi dihitung sebagai tabungan)
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {healthData.factors.map((factor) => (
                <FactorCard
                  key={factor.name}
                  factor={factor}
                  prevScore={healthData.prevFactors?.[factor.name]}
                />
              ))}
            </div>
          </div>

          {/* Prioritized Action Prescriptions */}
          {healthData.prescriptions && healthData.prescriptions.length > 0 && (
            <div className="glass-card p-6">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                    Rencana Aksi Prioritas (Urut Potensi Poin Tertinggi)
                  </h2>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveTab('simulator')}
                  className="min-h-[44px] text-xs"
                >
                  <Sliders className="w-3.5 h-3.5 mr-1.5" />
                  Simulasikan di What-If
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {healthData.prescriptions.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/70 dark:bg-white/[0.02] flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                          {item.factor}
                        </span>
                        <Badge className="bg-emerald-600 text-white border-0 text-xs">
                          +{item.potentialGain} pts max
                        </Badge>
                      </div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                        {item.title}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-white/60 mt-1">
                        {item.description}
                      </p>
                    </div>
                    <div>
                      <a
                        href={item.href}
                        className="inline-flex items-center justify-center min-h-[44px] px-3.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white text-xs font-medium no-underline transition-colors"
                      >
                        {item.ctaLabel}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Simulator Skor (What-If Score Booster) */}
      {activeTab === 'simulator' && simResult && healthData.rawContext && (
        <div role="tabpanel" aria-label="Simulator Skor What-If" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Controls */}
            <div className="lg:col-span-2 glass-card p-6 space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                    Simulator Kenaikan Skor (What-If Booster)
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-white/60 mt-0.5">
                    Uji skenario penghematan, kepatuhan budget, dan pertumbuhan aset untuk melihat dampak langsung ke skor dan grade.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSimInput(DEFAULT_SIM)}
                  className="min-h-[44px] text-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                  Reset
                </Button>
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setSimInput((prev) => ({ ...prev, extraMonthlySavings: 1_000_000 }))
                  }
                  className="min-h-[44px] text-xs"
                >
                  +Rp 1 Jt Tabungan
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setSimInput((prev) => ({ ...prev, extraMonthlySavings: 2_500_000 }))
                  }
                  className="min-h-[44px] text-xs"
                >
                  +Rp 2,5 Jt Tabungan
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={overBudgetCount === 0}
                  onClick={() =>
                    setSimInput((prev) => ({
                      ...prev,
                      resolvedOverBudgetCount: overBudgetCount,
                    }))
                  }
                  className="min-h-[44px] text-xs"
                >
                  Bebas Over-Budget ({overBudgetCount})
                </Button>
                <Button
                  type="button"
                  onClick={() =>
                    setSimInput({
                      extraMonthlySavings: 3_000_000,
                      resolvedOverBudgetCount: overBudgetCount,
                      targetNwGrowthPct: 5,
                    })
                  }
                  className="min-h-[44px] text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Skenario Optimal
                </Button>
              </div>

              {/* Slider 1: Extra Monthly Savings */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <label
                    htmlFor="sim-savings-slider"
                    className="font-medium text-slate-800 dark:text-white"
                  >
                    Tambahan Tabungan / Pengurangan Konsumsi
                  </label>
                  <span className="font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                    +{formatIdr(simInput.extraMonthlySavings)}
                  </span>
                </div>
                <input
                  id="sim-savings-slider"
                  type="range"
                  min={0}
                  max={10_000_000}
                  step={250_000}
                  value={simInput.extraMonthlySavings}
                  onChange={(e) =>
                    setSimInput((prev) => ({
                      ...prev,
                      extraMonthlySavings: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-emerald-600 cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-slate-500 dark:text-white/50">
                  <span>Proyeksi Savings Rate: {simResult.simulatedSavingsRatePct.toFixed(1)}%</span>
                  <span>Rasio Konsumsi: {simResult.simulatedSpendRatioPct.toFixed(0)}%</span>
                </div>
              </div>

              {/* Slider 2: Resolve Over-Budget Categories */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <label
                    htmlFor="sim-budget-slider"
                    className="font-medium text-slate-800 dark:text-white"
                  >
                    Kategori Over-Budget yang Dikendalikan
                  </label>
                  <span className="font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                    {simInput.resolvedOverBudgetCount} / {overBudgetCount} kategori
                  </span>
                </div>
                <input
                  id="sim-budget-slider"
                  type="range"
                  min={0}
                  max={Math.max(1, overBudgetCount)}
                  step={1}
                  disabled={overBudgetCount === 0}
                  value={simInput.resolvedOverBudgetCount}
                  onChange={(e) =>
                    setSimInput((prev) => ({
                      ...prev,
                      resolvedOverBudgetCount: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-emerald-600 cursor-pointer disabled:opacity-40"
                />
                <p className="text-[11px] text-slate-500 dark:text-white/50">
                  {overBudgetCount === 0
                    ? 'Tidak ada kategori over-budget pada periode ini.'
                    : `Saat ini ${overBudgetCount} kategori melewati batas bulanan.`}
                </p>
              </div>

              {/* Slider 3: Target Networth MoM Growth */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <label
                    htmlFor="sim-nw-slider"
                    className="font-medium text-slate-800 dark:text-white"
                  >
                    Target Pertumbuhan Networth Bulanan (MoM)
                  </label>
                  <span className="font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                    {simInput.targetNwGrowthPct === null
                      ? 'Baseline Aktual'
                      : `${simInput.targetNwGrowthPct >= 0 ? '+' : ''}${simInput.targetNwGrowthPct}%`}
                  </span>
                </div>
                <input
                  id="sim-nw-slider"
                  type="range"
                  min={-5}
                  max={10}
                  step={1}
                  value={simInput.targetNwGrowthPct ?? 0}
                  onChange={(e) =>
                    setSimInput((prev) => ({
                      ...prev,
                      targetNwGrowthPct: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-emerald-600 cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-slate-500 dark:text-white/50">
                  <span>-5%</span>
                  <span>Target optimal: +5% MoM (20/20 poin)</span>
                  <span>+10%</span>
                </div>
              </div>
            </div>

            {/* Live Projected Result */}
            <div className="lg:col-span-1 space-y-4">
              <ScoreGauge
                score={simResult.overall}
                grade={simResult.grade}
                gradeColor={simResult.gradeColor}
                subtitle={`Proyeksi Simulasi (${simResult.delta >= 0 ? `+${simResult.delta}` : simResult.delta} poin)`}
              />

              <div className="glass-card p-5 space-y-3">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Perubahan per Pilar
                </h3>
                {simResult.factors.map((f) => (
                  <div key={f.name} className="flex items-center justify-between text-xs">
                    <span className="text-slate-700 dark:text-white/70">{f.name}</span>
                    <div className="flex items-center gap-2 tabular-nums">
                      <span className="text-slate-500 dark:text-white/50">
                        {f.baselineScore} &rarr; {f.simulatedScore}
                      </span>
                      <span
                        className={`font-semibold min-w-[36px] text-right ${
                          f.delta > 0
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : f.delta < 0
                              ? 'text-red-700 dark:text-red-400'
                              : 'text-slate-500 dark:text-white/50'
                        }`}
                      >
                        {f.delta > 0 ? `+${f.delta}` : f.delta}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Riwayat & Metodologi */}
      {activeTab === 'history' && (
        <div role="tabpanel" aria-label="Riwayat dan Metodologi" className="space-y-6">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Riwayat Skor per Siklus Gaji
              </h2>
              <span className="text-xs text-slate-600 dark:text-white/60">
                Klik baris periode untuk membuka detail analisisnya
              </span>
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/[0.08]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Periode</TableHead>
                    <TableHead className="text-right">Skor</TableHead>
                    <TableHead className="text-center">Grade</TableHead>
                    <TableHead className="text-right">Savings</TableHead>
                    <TableHead className="text-right">Budget</TableHead>
                    <TableHead className="text-right">Networth</TableHead>
                    <TableHead className="text-right">Control</TableHead>
                    <TableHead className="text-right">Consistency</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reversedHistory.map((row) => {
                    const isActive = row.month === healthData.month;
                    return (
                      <TableRow
                        key={row.period_id}
                        onClick={() => {
                          setSelectedMonth(row.month);
                          setActiveTab('overview');
                        }}
                        className={`cursor-pointer transition-colors hover:bg-slate-100 dark:hover:bg-white/[0.05] ${
                          isActive ? 'bg-emerald-50/70 dark:bg-emerald-950/30 font-semibold' : ''
                        }`}
                      >
                        <TableCell className="text-slate-900 dark:text-white">{row.month}</TableCell>
                        <TableCell className="text-right tabular-nums text-slate-900 dark:text-white">
                          {row.score}/100
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{row.grade}</Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.factors['Savings Rate'] ?? '-'}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.factors['Budget Adherence'] ?? '-'}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.factors['Networth Growth'] ?? '-'}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.factors['Spending Control'] ?? '-'}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.factors['Consistency'] ?? '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="glass-card p-6">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-4">
              Metodologi Penilaian 5 Pilar (Total 100 Poin)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-600 dark:text-white/70">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                  1. Savings Rate (0-20 poin)
                </h3>
                <p>
                  Rasio tabungan bersih (Invest dihitung sebagai tabungan). Rasio 30% ke atas meraih 20 poin penuh.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                  2. Budget Adherence (0-20 poin)
                </h3>
                <p>
                  Proporsi kategori dengan monthly limit yang pengeluarannya tetap berada di dalam batas anggaran.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                  3. Networth Growth (0-20 poin)
                </h3>
                <p>
                  Pertumbuhan kekayaan bersih month-over-month. Kenaikan minimal +5% meraih 20 poin penuh.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                  4. Spending Control (0-20 poin)
                </h3>
                <p>
                  Rasio konsumsi bersih (total keluar dikurangi pos Invest) terhadap income. Rasio di bawah 50% meraih 20 poin.
                </p>
              </div>
              <div className="md:col-span-2">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                  5. Consistency (0-20 poin)
                </h3>
                <p>
                  Stabilitas savings rate selama 3 siklus gaji terakhir (deviasi standar di bawah 5% meraih 20 poin).
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
