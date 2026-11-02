import React, { useState, useEffect, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Gauge,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle2,
  CalendarClock,
  Search,
  SlidersHorizontal,
  Flame,
  ChevronRight,
  Receipt,
  RotateCcw,
  Sparkles,
  Info,
} from 'lucide-react';
import { formatIdr } from '../lib/utils';
import type {
  BudgetPaceResult,
  BudgetPaceCategory,
  BudgetPaceTransaction,
  BudgetPaceTimelinePoint,
} from '../lib/db';

const STATUS_CONFIG = {
  on_track: {
    label: 'On Track',
    color: 'text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40',
    barColor: 'bg-emerald-500',
    icon: CheckCircle2,
  },
  warning: {
    label: 'Warning',
    color: 'text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40',
    barColor: 'bg-amber-500',
    icon: AlertTriangle,
  },
  over_pace: {
    label: 'Over Pace',
    color: 'text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40',
    barColor: 'bg-rose-500',
    icon: TrendingUp,
  },
  critical: {
    label: 'Critical',
    color: 'text-red-800 dark:text-red-200 border-red-400 dark:border-red-800 bg-red-100 dark:bg-red-950/60',
    barColor: 'bg-red-600',
    icon: AlertTriangle,
  },
  under_budget: {
    label: 'Under Budget',
    color: 'text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/40',
    barColor: 'bg-teal-500',
    icon: TrendingDown,
  },
  no_limit: {
    label: 'No Limit',
    color: 'text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40',
    barColor: 'bg-slate-400',
    icon: Minus,
  },
} as const;

function PaceBar({ spent, expected, limit }: { spent: number; expected: number; limit: number }) {
  const spentPct = Math.min(100, limit > 0 ? (spent / limit) * 100 : 0);
  const expectedPct = Math.min(100, limit > 0 ? (expected / limit) * 100 : 0);

  return (
    <div className="relative h-3 w-full rounded-full bg-slate-200 dark:bg-slate-700/80 overflow-hidden">
      {/* Expected spending zone */}
      <div
        className="absolute top-0 left-0 h-full bg-slate-300/60 dark:bg-slate-600/50"
        style={{ width: `${expectedPct}%` }}
        title={`Ekspektasi linear: ${expectedPct.toFixed(0)}%`}
      />

      {/* Actual spending bar */}
      <div
        className={`absolute top-0 left-0 h-full transition-all duration-500 ${
          spentPct > 100
            ? 'bg-red-600'
            : spentPct > expectedPct + 5
            ? 'bg-amber-500'
            : 'bg-emerald-500'
        }`}
        style={{ width: `${spentPct}%` }}
        title={`Realisasi: ${spentPct.toFixed(0)}%`}
      />

      {/* Expected marker needle */}
      {expectedPct > 0 && expectedPct < 100 && (
        <div
          className="absolute top-0 h-full w-1 bg-slate-900 dark:bg-white shadow-sm z-10"
          style={{ left: `calc(${expectedPct}% - 2px)` }}
          title={`Target Pacing: ${expectedPct.toFixed(0)}%`}
        />
      )}
    </div>
  );
}

interface PaceTrajectoryChartProps {
  timeline: BudgetPaceTimelinePoint[];
  daysElapsed: number;
  daysTotal: number;
  totalBudget: number;
  totalSpent: number;
  totalProjected: number;
  runOutDay: number | null;
}

function PaceTrajectoryChart({
  timeline,
  daysElapsed,
  daysTotal,
  totalBudget,
  totalSpent,
  totalProjected,
  runOutDay,
}: PaceTrajectoryChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<BudgetPaceTimelinePoint | null>(null);

  if (!timeline || timeline.length === 0) return null;

  const width = 800;
  const height = 240;
  const padLeft = 65;
  const padRight = 35;
  const padTop = 25;
  const padBottom = 40;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const maxY = Math.max(
    totalBudget * 1.15,
    totalProjected * 1.1,
    totalSpent * 1.2,
    1000000
  );

  const getX = (day: number) => {
    if (daysTotal <= 1) return padLeft;
    return padLeft + ((day - 1) / (daysTotal - 1)) * chartW;
  };

  const getY = (val: number) => {
    return padTop + chartH - (Math.min(val, maxY) / maxY) * chartH;
  };

  // Linear expected line
  const expectedP1 = `${getX(1)},${getY(timeline[0]?.expected_cumulative || 0)}`;
  const expectedP2 = `${getX(daysTotal)},${getY(totalBudget)}`;

  // Actual spend path
  const actualPoints = timeline.filter((p) => p.day <= daysElapsed);
  const actualPath = actualPoints
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(p.day)} ${getY(p.spent_cumulative)}`)
    .join(' ');

  // Gradient area path
  const areaPath =
    actualPoints.length > 0
      ? `${actualPath} L ${getX(actualPoints[actualPoints.length - 1].day)} ${getY(0)} L ${getX(
          actualPoints[0].day
        )} ${getY(0)} Z`
      : '';

  // Projected dotted path
  const projectedPoints = timeline.filter((p) => p.day >= daysElapsed);
  const projectedPath = projectedPoints
    .map((p, idx) => {
      const val = p.day === daysElapsed ? totalSpent : p.projected_cumulative ?? totalSpent;
      return `${idx === 0 ? 'M' : 'L'} ${getX(p.day)} ${getY(val)}`;
    })
    .join(' ');

  const budgetY = getY(totalBudget);
  const isOverPace = totalSpent > (totalBudget * (daysElapsed / daysTotal));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-0.5 bg-emerald-500 rounded" />
            <span>Pengeluaran Aktual</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-0.5 border-t border-dashed border-slate-500 dark:border-slate-400" />
            <span>Target Linear Ideal</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-0.5 border-t border-dotted border-amber-500" />
            <span>Trajektori Proyeksi</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-0.5 border-t border-dashed border-red-500" />
            <span>Batas Anggaran</span>
          </div>
        </div>
        {hoveredPoint && (
          <div className="text-xs font-medium text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 shadow-sm">
            Hari ke-{hoveredPoint.day} ({hoveredPoint.date}): Belanja {formatIdr(hoveredPoint.spent_daily)} | Kumulatif {formatIdr(hoveredPoint.spent_cumulative)}
          </div>
        )}
      </div>

      <div className="relative w-full overflow-hidden rounded-xl bg-slate-50 dark:bg-navy-900/60 border border-slate-200 dark:border-white/10 p-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor={isOverPace ? '#f59e0b' : '#10b981'}
                stopOpacity="0.35"
              />
              <stop
                offset="100%"
                stopColor={isOverPace ? '#f59e0b' : '#10b981'}
                stopOpacity="0.02"
              />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line
            x1={padLeft}
            y1={budgetY}
            x2={width - padRight}
            y2={budgetY}
            stroke="#ef4444"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            opacity="0.8"
          />
          <text
            x={width - padRight - 4}
            y={budgetY - 5}
            fill="#ef4444"
            fontSize="10"
            textAnchor="end"
            fontWeight="bold"
          >
            Batas: {formatIdr(totalBudget)}
          </text>

          {/* Linear expected pace line */}
          <line
            x1={expectedP1.split(',')[0]}
            y1={expectedP1.split(',')[1]}
            x2={expectedP2.split(',')[0]}
            y2={expectedP2.split(',')[1]}
            stroke="#94a3b8"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />

          {/* Gradient area fill */}
          {areaPath && <path d={areaPath} fill="url(#actualGradient)" />}

          {/* Actual line */}
          {actualPath && (
            <path
              d={actualPath}
              fill="none"
              stroke={isOverPace ? '#f59e0b' : '#10b981'}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Projected line */}
          {projectedPath && daysElapsed < daysTotal && (
            <path
              d={projectedPath}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2"
              strokeDasharray="4 4"
              strokeLinecap="round"
            />
          )}

          {/* Today pin marker */}
          {daysElapsed > 0 && daysElapsed <= daysTotal && (
            <g>
              <line
                x1={getX(daysElapsed)}
                y1={padTop}
                x2={getX(daysElapsed)}
                y2={height - padBottom}
                stroke="#38bdf8"
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />
              <circle
                cx={getX(daysElapsed)}
                cy={getY(totalSpent)}
                r="5"
                fill="#38bdf8"
                stroke="#ffffff"
                strokeWidth="2"
              />
              <text
                x={getX(daysElapsed)}
                y={padTop - 6}
                fill="#0284c7"
                fontSize="10"
                textAnchor="middle"
                fontWeight="bold"
                className="dark:fill-sky-400"
              >
                Hari Ini ({daysElapsed})
              </text>
            </g>
          )}

          {/* Run out marker */}
          {runOutDay && runOutDay < daysTotal && (
            <g>
              <circle
                cx={getX(runOutDay)}
                cy={getY(totalBudget)}
                r="5"
                fill="#ef4444"
                stroke="#ffffff"
                strokeWidth="2"
              />
              <text
                x={getX(runOutDay)}
                y={getY(totalBudget) + 16}
                fill="#dc2626"
                fontSize="10"
                textAnchor="middle"
                fontWeight="bold"
                className="dark:fill-red-400"
              >
                Habis: H-{runOutDay}
              </text>
            </g>
          )}

          {/* Axis Labels */}
          <line
            x1={padLeft}
            y1={height - padBottom}
            x2={width - padRight}
            y2={height - padBottom}
            stroke="#cbd5e1"
            className="dark:stroke-slate-700"
            strokeWidth="1"
          />

          {/* X axis ticks */}
          {timeline
            .filter((p) => p.day === 1 || p.day === 10 || p.day === 20 || p.day === daysTotal)
            .map((p) => (
              <g key={p.day}>
                <line
                  x1={getX(p.day)}
                  y1={height - padBottom}
                  x2={getX(p.day)}
                  y2={height - padBottom + 5}
                  stroke="#94a3b8"
                />
                <text
                  x={getX(p.day)}
                  y={height - padBottom + 16}
                  fill="#64748b"
                  fontSize="10"
                  textAnchor="middle"
                  className="dark:fill-slate-400"
                >
                  H-{p.day}
                </text>
              </g>
            ))}

          {/* Interactive touch/hover points */}
          {timeline.map((p) => {
            const cx = getX(p.day);
            const cy = getY(p.day <= daysElapsed ? p.spent_cumulative : (p.projected_cumulative ?? totalSpent));
            return (
              <circle
                key={p.day}
                cx={cx}
                cy={cy}
                r={hoveredPoint?.day === p.day ? 6 : 3}
                fill={p.day <= daysElapsed ? '#10b981' : '#f59e0b'}
                className="cursor-pointer transition-all hover:scale-150"
                opacity={hoveredPoint?.day === p.day ? 1 : 0.4}
                onMouseEnter={() => setHoveredPoint(p)}
                onTouchStart={() => setHoveredPoint(p)}
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
}

export default function BudgetPace() {
  const [data, setData] = useState<BudgetPaceResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Period filter
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('period_id');
      return p ? parseInt(p, 10) : null;
    }
    return null;
  });

  // Category search & status filter
  const [catFilter, setCatFilter] = useState<'all' | 'over_pace' | 'warning' | 'on_track' | 'under_budget'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // What-if simulator daily burn override
  const [simDailyBurn, setSimDailyBurn] = useState<number>(0);

  // Category drill-down dialog
  const [activeCategory, setActiveCategory] = useState<BudgetPaceCategory | null>(null);

  const fetchPaceData = (periodId?: number | null) => {
    setLoading(true);
    setError(null);
    const url = periodId ? `/api/budget-pace?period_id=${periodId}` : '/api/budget-pace';

    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error('Gagal memuat data budget pace.');
        return r.json();
      })
      .then((d: BudgetPaceResult) => {
        setData(d);
        setSimDailyBurn(Math.round(d.safe_daily_burn));
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Terjadi kesalahan sistem.');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchPaceData(selectedPeriodId);
  }, [selectedPeriodId]);

  const handlePeriodChange = (val: string) => {
    const pid = parseInt(val, 10);
    setSelectedPeriodId(pid);
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      sp.set('period_id', String(pid));
      window.history.replaceState({}, '', `${window.location.pathname}?${sp.toString()}`);
    }
  };

  const filteredCategories = useMemo(() => {
    if (!data?.categories) return [];
    return data.categories
      .filter((cat) => {
        if (catFilter !== 'all' && cat.pace_status !== catFilter) return false;
        if (searchQuery.trim() && !cat.category.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => b.pace_diff - a.pace_diff);
  }, [data, catFilter, searchQuery]);

  // What-if calculation
  const simulationResults = useMemo(() => {
    if (!data) return null;
    const daysRem = data.days_remaining;
    const currentSpent = data.total_spent;
    const simSpentFuture = simDailyBurn * daysRem;
    const simTotalProjected = currentSpent + simSpentFuture;
    const simDiff = simTotalProjected - data.total_budget;
    const simSavings = Math.max(0, data.total_budget - simTotalProjected);
    const simDeficit = Math.max(0, simTotalProjected - data.total_budget);

    return {
      simTotalProjected,
      simDiff,
      simSavings,
      simDeficit,
    };
  }, [data, simDailyBurn]);

  if (loading) {
    return (
      <div className="glass-card p-8 text-center space-y-4">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent" />
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Menganalisis kecepatan pengeluaran dan burn-rate siklus gaji...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="glass-card p-6 border-red-200 dark:border-red-900/50 text-center space-y-3">
        <AlertTriangle className="h-8 w-8 text-red-500 mx-auto" />
        <p className="font-semibold text-slate-800 dark:text-white">Gagal Memuat Data</p>
        <p className="text-sm text-slate-600 dark:text-slate-300">{error || 'Data tidak tersedia.'}</p>
        <button
          onClick={() => fetchPaceData(selectedPeriodId)}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  if (data.total_budget === 0) {
    return (
      <div className="glass-card p-6 text-center space-y-3">
        <Gauge className="h-10 w-10 text-emerald-500 mx-auto" />
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
          Belum Ada Limit Anggaran Ditetapkan
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">
          Tetapkan batas pengeluaran bulanan kategori pada halaman{' '}
          <a href="/settings" className="font-medium text-emerald-600 dark:text-emerald-400 underline">
            Pengaturan
          </a>{' '}
          untuk mengaktifkan fitur pemantauan kecepatan belanja dan burn-rate ini.
        </p>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[data.overall_status];
  const StatusIcon = statusConfig.icon;

  return (
    <div className="space-y-6">
      {/* Top Header & Period Selector */}
      <div className="glass-card p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Gauge className="h-6 w-6 text-emerald-500" />
              Budget Pace & Burn-Rate Intelligence
            </h2>
            <Badge variant="outline" className={`text-xs px-2.5 py-1 ${statusConfig.color} flex items-center gap-1.5`}>
              <StatusIcon className="h-3.5 w-3.5" />
              {statusConfig.label}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
            Analisis kecepatan pengeluaran harian, alokasi aman sisa periode, dan proyeksi deviasi anggaran.
          </p>
        </div>

        {/* Period Selector Dropdown */}
        {data.available_periods && data.available_periods.length > 0 && (
          <div className="w-full md:w-64">
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">
              Pilih Periode Siklus Gaji
            </label>
            <Select
              value={String(data.period_id)}
              onValueChange={handlePeriodChange}
            >
              <SelectTrigger className="w-full min-h-[44px] bg-white dark:bg-navy-900 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white">
                <SelectValue placeholder="Pilih Periode" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-navy-900 border-slate-200 dark:border-white/10">
                {data.available_periods.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)} className="text-slate-900 dark:text-slate-100">
                    {p.month} {p.is_active ? '(Aktif)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Status & Waktu Siklus */}
        <div className="glass-card p-5 space-y-2 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Siklus Gaji</span>
            <CalendarClock className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            Hari ke-{data.days_elapsed} <span className="text-sm font-normal text-slate-500">/ {data.days_total}</span>
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between">
            <span>{data.time_elapsed_pct.toFixed(0)}% waktu berlalu</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{data.days_remaining} hari tersisa</span>
          </div>
          <Progress value={data.time_elapsed_pct} className="h-1.5" />
        </div>

        {/* Card 2: Sisa Anggaran & Alokasi Aman */}
        <div className="glass-card p-5 space-y-2 border-l-4 border-l-sky-500">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Sisa Anggaran</span>
            <Sparkles className="h-4 w-4 text-sky-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {formatIdr(data.remaining_budget)}
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-300">
            Alokasi harian aman:{' '}
            <strong className="text-sky-700 dark:text-sky-400">
              {formatIdr(data.safe_daily_burn)} / hari
            </strong>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Batas belanja harian agar tidak melampaui limit bulanan.
          </p>
        </div>

        {/* Card 3: Kecepatan Belanja Aktual (Burn Rate) */}
        <div className="glass-card p-5 space-y-2 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Kecepatan Aktual (Burn Rate)</span>
            <Flame className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {formatIdr(data.actual_daily_burn)} <span className="text-xs font-normal text-slate-500">/ hari</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span
              className={`px-1.5 py-0.5 rounded font-semibold ${
                data.budget_burn_rate_ratio > 1.15
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                  : data.budget_burn_rate_ratio > 1.0
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
              }`}
            >
              {data.budget_burn_rate_ratio.toFixed(2)}x kecepatan ideal
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {data.budget_burn_rate_ratio > 1.0
              ? 'Belanja lebih cepat dari laju anggaran ideal.'
              : 'Belanja terkendali lebih hemat dari batas standar.'}
          </p>
        </div>

        {/* Card 4: Proyeksi Akhir & Estimasi Habis */}
        <div
          className={`glass-card p-5 space-y-2 border-l-4 ${
            data.total_projected > data.total_budget ? 'border-l-rose-500' : 'border-l-emerald-500'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Proyeksi Akhir Periode</span>
            <TrendingUp className="h-4 w-4 text-slate-500" />
          </div>
          <div
            className={`text-2xl font-bold ${
              data.total_projected > data.total_budget ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {formatIdr(data.total_projected)}
          </div>
          <div className="text-xs">
            {data.total_projected > data.total_budget ? (
              <span className="text-rose-600 dark:text-rose-400 font-medium">
                Potensi Over: +{formatIdr(data.total_projected - data.total_budget)}
              </span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                Potensi Hemat: {formatIdr(data.total_budget - data.total_projected)}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {data.run_out_date && data.run_out_day
              ? `Estimasi anggaran habis: ${data.run_out_date} (H-${data.run_out_day})`
              : 'Anggaran aman mencukupi hingga akhir periode.'}
          </p>
        </div>
      </div>

      {/* Burn-Up Trajectory Curve & Timeline */}
      <div className="glass-card p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              Kurva Pacing & Trajektori Anggaran Kumulatif
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Perbandingan pengeluaran riil per hari terhadap lintasan linier benchmark anggaran.
            </p>
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-300">
            Terpakai: <strong className="text-slate-900 dark:text-white">{formatIdr(data.total_spent)}</strong> dari{' '}
            <strong className="text-slate-900 dark:text-white">{formatIdr(data.total_budget)}</strong>
          </div>
        </div>

        <PaceTrajectoryChart
          timeline={data.daily_timeline}
          daysElapsed={data.days_elapsed}
          daysTotal={data.days_total}
          totalBudget={data.total_budget}
          totalSpent={data.total_spent}
          totalProjected={data.total_projected}
          runOutDay={data.run_out_day}
        />
      </div>

      {/* Interactive What-If Pacing Simulator */}
      {data.days_remaining > 0 && (
        <div className="glass-card p-5 sm:p-6 space-y-4 border border-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Simulator Penyesuaian Belanja Harian (What-If)
              </h3>
            </div>
            <button
              onClick={() => setSimDailyBurn(Math.round(data.safe_daily_burn))}
              className="text-xs text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 font-medium"
            >
              <RotateCcw className="h-3 w-3" />
              Reset ke Batas Aman
            </button>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
            Simulasikan jika Anda membatasi atau menaikkan pengeluaran harian selama {data.days_remaining} hari tersisa di periode ini.
          </p>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-700 dark:text-slate-300 font-medium">
                Simulasi Belanja Harian:
              </span>
              <span className="text-base font-bold text-emerald-700 dark:text-emerald-400">
                {formatIdr(simDailyBurn)} / hari
              </span>
            </div>

            <input
              type="range"
              min="0"
              max={Math.max(1500000, Math.round(data.safe_daily_burn * 2.5))}
              step="25000"
              value={simDailyBurn}
              onChange={(e) => setSimDailyBurn(parseInt(e.target.value, 10))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              aria-label="Simulasi Pengeluaran Harian"
            />

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs text-slate-500">Preset Cepat:</span>
              <button
                type="button"
                onClick={() => setSimDailyBurn(Math.round(data.safe_daily_burn))}
                className="text-xs px-2.5 py-1 rounded-md bg-white dark:bg-navy-900 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-emerald-500"
              >
                Batas Pas ({formatIdr(data.safe_daily_burn)})
              </button>
              <button
                type="button"
                onClick={() => setSimDailyBurn(Math.round(data.safe_daily_burn * 0.75))}
                className="text-xs px-2.5 py-1 rounded-md bg-white dark:bg-navy-900 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-emerald-500"
              >
                Hemat 25% ({formatIdr(data.safe_daily_burn * 0.75)})
              </button>
              <button
                type="button"
                onClick={() => setSimDailyBurn(Math.round(data.safe_daily_burn * 0.5))}
                className="text-xs px-2.5 py-1 rounded-md bg-white dark:bg-navy-900 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-emerald-500"
              >
                Frugal 50% ({formatIdr(data.safe_daily_burn * 0.5)})
              </button>
            </div>
          </div>

          {/* Simulation Outcome Card */}
          {simulationResults && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-white dark:bg-navy-900/80 border border-slate-200 dark:border-white/10 text-xs">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block mb-0.5">
                  Proyeksi Total Pengeluaran
                </span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {formatIdr(simulationResults.simTotalProjected)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block mb-0.5">
                  Hasil terhadap Anggaran
                </span>
                <span
                  className={`text-sm font-bold ${
                    simulationResults.simDeficit > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {simulationResults.simDeficit > 0
                    ? `Defisit +${formatIdr(simulationResults.simDeficit)}`
                    : `Hemat ${formatIdr(simulationResults.simSavings)}`}
                </span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block mb-0.5">
                  Evaluasi Strategis
                </span>
                <span className="text-slate-700 dark:text-slate-300">
                  {simulationResults.simDeficit > 0
                    ? 'Laju ini berisiko membobol anggaran bulanan Anda.'
                    : 'Pacing sangat sehat dan memberi ruang tabungan ekstra.'}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Category Breakdown & Smart Filters */}
      <div className="glass-card p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Receipt className="h-5 w-5 text-emerald-500" />
              Rincian Kecepatan per Kategori
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Klik pada kartu kategori untuk membuka rincian transaksi dan rekomendasi taktis.
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari kategori..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-navy-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Status Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { key: 'all', label: 'Semua Kategori' },
              { key: 'over_pace', label: 'Over Pace' },
              { key: 'warning', label: 'Warning' },
              { key: 'on_track', label: 'On Track' },
              { key: 'under_budget', label: 'Under Budget' },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setCatFilter(item.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors min-h-[36px] ${
                catFilter === item.key
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Category Cards Grid */}
        {filteredCategories.length === 0 ? (
          <div className="p-8 text-center border rounded-xl border-dashed border-slate-200 dark:border-white/10 text-slate-500 text-sm">
            Tidak ada kategori yang cocok dengan filter atau pencarian.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCategories.map((cat) => {
              const cfg = STATUS_CONFIG[cat.pace_status];
              const CatIcon = cfg.icon;

              return (
                <div
                  key={cat.category}
                  onClick={() => setActiveCategory(cat)}
                  className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-navy-900/60 p-4 space-y-3 cursor-pointer hover:border-emerald-500/50 hover:shadow-md transition-all group"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setActiveCategory(cat);
                    }
                  }}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-3.5 h-3.5 rounded-full inline-block shadow-sm"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="font-semibold text-slate-900 dark:text-white text-sm group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {cat.category}
                      </span>
                    </div>
                    <Badge variant="outline" className={`text-xs px-2 py-0.5 ${cfg.color}`}>
                      <CatIcon className="h-3 w-3 mr-1" />
                      {cfg.label}
                    </Badge>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <PaceBar
                      spent={cat.spent}
                      expected={cat.expected_pct > 0 ? cat.limit * (cat.expected_pct / 100) : 0}
                      limit={cat.limit}
                    />
                    <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>
                        {formatIdr(cat.spent)} / {formatIdr(cat.limit)}
                      </span>
                      <span>{cat.spent_pct.toFixed(0)}% limit</span>
                    </div>
                  </div>

                  {/* Daily Burn Rate & Metrics */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100 dark:border-white/5">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Kecepatan Aktual</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {formatIdr(cat.actual_daily_burn)} / hari
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Alokasi Aman</span>
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">
                        {formatIdr(cat.safe_daily_burn)} / hari
                      </span>
                    </div>
                  </div>

                  {/* Card Footer: Projected Deviation & Action Button */}
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <span className="text-slate-500 dark:text-slate-400">
                      Proyeksi:{' '}
                      <strong className={cat.projected_diff > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}>
                        {formatIdr(cat.projected_total)}
                        {cat.projected_diff > 0 && ` (+${formatIdr(cat.projected_diff)})`}
                      </strong>
                    </span>

                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                      Lihat Rincian ({cat.tx_count})
                      <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Category Drill-Down Modal Dialog */}
      <Dialog open={!!activeCategory} onOpenChange={(open) => !open && setActiveCategory(null)}>
        <DialogContent className="max-w-2xl bg-white dark:bg-navy-950 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white max-h-[85vh] overflow-y-auto">
          {activeCategory && (
            <div className="space-y-5">
              <DialogHeader>
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-4 h-4 rounded-full inline-block shadow-sm"
                    style={{ backgroundColor: activeCategory.color }}
                  />
                  <DialogTitle className="text-xl font-bold">
                    {activeCategory.category}
                  </DialogTitle>
                  <Badge variant="outline" className={`text-xs ${STATUS_CONFIG[activeCategory.pace_status].color}`}>
                    {STATUS_CONFIG[activeCategory.pace_status].label}
                  </Badge>
                </div>
                <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                  Rincian transaksi dan analisis kecepatan belanja untuk kategori ini pada periode aktif.
                </DialogDescription>
              </DialogHeader>

              {/* Modal KPI Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-navy-900/60 border border-slate-200 dark:border-white/10 text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block mb-0.5">Batas Anggaran</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {formatIdr(activeCategory.limit)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block mb-0.5">Realisasi Belanja</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {formatIdr(activeCategory.spent)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block mb-0.5">Sisa Anggaran</span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {formatIdr(activeCategory.remaining_budget)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block mb-0.5">Alokasi Harian Aman</span>
                  <span className="text-sm font-bold text-sky-600 dark:text-sky-400">
                    {formatIdr(activeCategory.safe_daily_burn)} / hari
                  </span>
                </div>
              </div>

              {/* Tactical Recommendation */}
              <div className="p-3.5 rounded-xl border border-sky-200 dark:border-sky-900/40 bg-sky-50 dark:bg-sky-950/20 text-xs space-y-1">
                <div className="font-semibold text-sky-900 dark:text-sky-300 flex items-center gap-1.5">
                  <Info className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                  Rekomendasi Tindakan
                </div>
                <p className="text-sky-800 dark:text-sky-200/80 leading-relaxed">
                  {activeCategory.pace_status === 'over_pace' ? (
                    <>
                      Kategori ini melebihi laju linear sebesar{' '}
                      <strong>{Math.abs(activeCategory.pace_diff).toFixed(0)}%</strong>. Untuk menghindari defisit,
                      batasi pengeluaran kategori ini maksimal <strong>{formatIdr(activeCategory.safe_daily_burn)} per hari</strong> selama sisa periode.
                    </>
                  ) : activeCategory.pace_status === 'warning' ? (
                    <>
                      Pengeluaran mulai mendekati batas ekspektasi. Pertahankan laju harian di bawah{' '}
                      <strong>{formatIdr(activeCategory.safe_daily_burn)} per hari</strong> agar tetap aman.
                    </>
                  ) : (
                    <>
                      Pengeluaran sangat terkendali. Anda memiliki ruang aman sebesar{' '}
                      <strong>{formatIdr(activeCategory.safe_daily_burn)} per hari</strong> hingga akhir periode.
                    </>
                  )}
                </p>
              </div>

              {/* Transactions List */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center justify-between">
                  <span>Daftar Transaksi Terkait ({activeCategory.tx_count})</span>
                  <span className="text-xs font-normal text-slate-500">
                    Total: {formatIdr(activeCategory.spent)}
                  </span>
                </h4>

                {!activeCategory.transactions || activeCategory.transactions.length === 0 ? (
                  <div className="p-6 text-center border rounded-lg border-dashed border-slate-200 dark:border-white/10 text-xs text-slate-500">
                    Belum ada transaksi di kategori ini pada periode terpilih.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {activeCategory.transactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-navy-900/40 text-xs"
                      >
                        <div className="space-y-0.5">
                          <p className="font-medium text-slate-900 dark:text-white">{tx.title}</p>
                          <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                            <span>{tx.date}</span>
                            <span>•</span>
                            <span className="capitalize">{tx.payment_method}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {formatIdr(tx.amount)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
