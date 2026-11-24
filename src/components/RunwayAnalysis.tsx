import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import Sparkline from './Sparkline';
import { formatIdr } from '../lib/utils';
import {
  calculateEmergencyTiers,
  estimateMonthsToFund,
  simulateScenario,
  categorizeLiquidityLadder,
  type EmergencyTier,
  type ScenarioResult,
  type LiquidityTierGroup,
} from '../lib/runway-simulator';
import {
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
  Droplet,
  Wallet,
  CalendarClock,
  Lightbulb,
  ArrowRight,
  Activity,
  SlidersHorizontal,
  Layers,
  Zap,
  Calculator,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
} from 'lucide-react';

interface AssetBreakdown {
  name: string;
  value: number;
  liquidityPct: number;
  liquidValue: number;
}

interface RunwayHistoryPoint {
  period_id: number;
  month: string;
  liquid_assets: number;
  total_assets: number;
  runway_months: number;
}

interface RunwayData {
  liquid_assets: number;
  total_assets: number;
  illiquid_assets: number;
  monthly_expense: number;
  monthly_fixed: number;
  runway_months: number;
  fixed_coverage_months: number;
  status: 'critical' | 'caution' | 'healthy' | 'strong';
  target_months: number;
  asset_breakdown: AssetBreakdown[];
  history: RunwayHistoryPoint[];
  period_id: number | null;
  month: string | null;
  tips: string[];
}

const STATUS_CONFIG: Record<
  RunwayData['status'],
  {
    label: string;
    color: string;
    bgColor: string;
    borderColor: string;
    textColor: string;
    gaugeColor: string;
    icon: React.ReactNode;
  }
> = {
  critical: {
    label: 'Kritis',
    color: '#ef4444',
    bgColor: 'bg-red-500/10 dark:bg-red-950/30',
    borderColor: 'border-red-500/30 dark:border-red-800/40',
    textColor: 'text-red-700 dark:text-red-400',
    gaugeColor: '#ef4444',
    icon: <AlertTriangle className="w-5 h-5 text-red-500" />,
  },
  caution: {
    label: 'Perlu Perhatian',
    color: '#f59e0b',
    bgColor: 'bg-gold-500/10 dark:bg-gold-950/30',
    borderColor: 'border-gold-500/30 dark:border-gold-800/40',
    textColor: 'text-gold-700 dark:text-gold-400',
    gaugeColor: '#f59e0b',
    icon: <AlertTriangle className="w-5 h-5 text-gold-500" />,
  },
  healthy: {
    label: 'Sehat',
    color: '#10b981',
    bgColor: 'bg-emerald-500/10 dark:bg-emerald-950/30',
    borderColor: 'border-emerald-500/30 dark:border-emerald-800/40',
    textColor: 'text-emerald-700 dark:text-emerald-400',
    gaugeColor: '#10b981',
    icon: <ShieldCheck className="w-5 h-5 text-emerald-500" />,
  },
  strong: {
    label: 'Sangat Tangguh',
    color: '#06b6d4',
    bgColor: 'bg-mint-500/10 dark:bg-mint-950/30',
    borderColor: 'border-mint-500/30 dark:border-mint-800/40',
    textColor: 'text-mint-700 dark:text-mint-400',
    gaugeColor: '#06b6d4',
    icon: <ShieldCheck className="w-5 h-5 text-mint-500" />,
  },
};

/** SVG gauge showing runway months against 0-12 scale */
function RunwayGauge({ months, color }: { months: number; target: number; color: string }) {
  const max = 12;
  const pct = Math.min(months / max, 1);
  const radius = 80;
  const stroke = 14;
  const normalizedRadius = radius - stroke;
  const circumference = normalizedRadius * 2 * Math.PI;
  const offset = circumference - pct * circumference;

  return (
    <div className="relative flex flex-col items-center justify-center">
      <svg height={radius * 2} width={radius * 2} className="-rotate-90">
        <circle
          stroke="currentColor"
          className="text-slate-200 dark:text-white/10"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke={color}
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-3xl font-bold text-slate-900 dark:text-white">
          {months.toFixed(1)}
        </span>
        <span className="text-xs text-slate-500 dark:text-white/50 mt-0.5">bulan</span>
      </div>
    </div>
  );
}

/** Progress bar showing liquid vs illiquid split */
function LiquidityBar({ breakdown }: { breakdown: AssetBreakdown[] }) {
  const total = breakdown.reduce((s, b) => s + b.value, 0);
  if (total === 0) return null;

  const sorted = [...breakdown].sort((a, b) => b.liquidityPct - a.liquidityPct);

  return (
    <div>
      <div className="flex h-3 rounded-full overflow-hidden bg-slate-100 dark:bg-white/[0.05]">
        {sorted.map((b, i) => {
          const widthPct = (b.value / total) * 100;
          const hue =
            b.liquidityPct >= 0.9
              ? 'bg-emerald-500'
              : b.liquidityPct >= 0.5
              ? 'bg-gold-500'
              : 'bg-slate-400 dark:bg-slate-600';
          return (
            <div
              key={i}
              className={hue}
              style={{ width: `${widthPct}%` }}
              title={`${b.name}: ${formatIdr(b.value)} (${Math.round(b.liquidityPct * 100)}% likuid)`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2.5 text-xs">
        {sorted.map((b, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span
              className={`inline-block w-2.5 h-2.5 rounded-full ${
                b.liquidityPct >= 0.9
                  ? 'bg-emerald-500'
                  : b.liquidityPct >= 0.5
                  ? 'bg-gold-500'
                  : 'bg-slate-400 dark:bg-slate-600'
              }`}
            />
            <span className="text-slate-700 dark:text-white/70 font-medium">{b.name}</span>
            <span className="text-slate-400 dark:text-white/30">({Math.round(b.liquidityPct * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface Props {
  periodId?: number;
  compact?: boolean;
}

export default function RunwayAnalysis({ periodId, compact = false }: Props) {
  // CRITICAL: Call all hooks at top level unconditionally before any return
  const [data, setData] = useState<RunwayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Active view tab in hub
  const [activeTab, setActiveTab] = useState<'simulator' | 'tiers' | 'ladder' | 'history'>('simulator');

  // Interactive Simulator Controls
  const [simExpenseInput, setSimExpenseInput] = useState<number | null>(null);
  const [simShockInput, setSimShockInput] = useState<number>(0);
  const [selectedPreset, setSelectedPreset] = useState<string>('baseline');

  // Emergency Fund Goal Planner contribution per month
  const [monthlySavingInput, setMonthlySavingInput] = useState<number>(2000000);

  useEffect(() => {
    const url = periodId ? `/api/runway?period_id=${periodId}` : '/api/runway';
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error('Failed to fetch runway data');
        return r.json();
      })
      .then((d: RunwayData) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [periodId]);

  // Derived baseline values
  const liquidAssets = data?.liquid_assets ?? 0;
  const baselineExpense = data?.monthly_expense ?? 0;
  const monthlyFixed = data?.monthly_fixed ?? 0;

  // Sync simulator expense with baseline once loaded
  const currentSimExpense = simExpenseInput !== null ? simExpenseInput : baselineExpense;

  // Simulator scenario computation
  const activeScenario: ScenarioResult = useMemo(() => {
    return simulateScenario(liquidAssets, baselineExpense, monthlyFixed, {
      id: selectedPreset,
      name:
        selectedPreset === 'baseline'
          ? 'Normal (Baseline)'
          : selectedPreset === 'lean'
          ? 'Mode Hemat Pokok'
          : selectedPreset === 'shock'
          ? 'Syok Medis / Darurat'
          : selectedPreset === 'cut25'
          ? 'Pemotongan Biaya 25%'
          : 'Kustom',
      monthlyExpenseOverride: currentSimExpense,
      lumpSumShock: simShockInput,
    });
  }, [liquidAssets, baselineExpense, monthlyFixed, currentSimExpense, simShockInput, selectedPreset]);

  // Emergency tiers computation
  const emergencyTiers: EmergencyTier[] = useMemo(() => {
    return calculateEmergencyTiers(liquidAssets, baselineExpense, monthlyFixed);
  }, [liquidAssets, baselineExpense, monthlyFixed]);

  // Liquidity ladder groups
  const liquidityGroups: LiquidityTierGroup[] = useMemo(() => {
    return categorizeLiquidityLadder(data?.asset_breakdown ?? []);
  }, [data?.asset_breakdown]);

  // Config for status colors
  const config = useMemo(() => {
    return data ? STATUS_CONFIG[data.status] : STATUS_CONFIG.critical;
  }, [data]);

  // Sparkline history data
  const trendSparkData = useMemo(() => {
    if (!data || data.history.length === 0) return [] as number[];
    return data.history.map((h) => h.runway_months);
  }, [data]);

  // Handle Preset Selection
  const applyPreset = useCallback(
    (presetKey: string) => {
      setSelectedPreset(presetKey);
      if (presetKey === 'baseline') {
        setSimExpenseInput(baselineExpense);
        setSimShockInput(0);
      } else if (presetKey === 'lean') {
        setSimExpenseInput(monthlyFixed > 0 ? monthlyFixed : Math.round(baselineExpense * 0.6));
        setSimShockInput(0);
      } else if (presetKey === 'shock') {
        setSimExpenseInput(baselineExpense);
        setSimShockInput(15000000);
      } else if (presetKey === 'cut25') {
        setSimExpenseInput(Math.round(baselineExpense * 0.75));
        setSimShockInput(0);
      }
    },
    [baselineExpense, monthlyFixed]
  );

  // Early returns AFTER all hooks
  if (loading) {
    return (
      <div className="glass-card p-6 border border-slate-200 dark:border-white/[0.08] rounded-xl">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-48 bg-slate-200 dark:bg-white/[0.08] rounded" />
          <div className="h-40 w-40 mx-auto bg-slate-200 dark:bg-white/[0.08] rounded-full" />
          <div className="h-10 w-full bg-slate-200 dark:bg-white/[0.08] rounded" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="glass-card p-6 border border-red-200 dark:border-red-900/40 rounded-xl">
        <div className="flex items-center gap-3 text-red-600 dark:text-red-400 text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>Gagal memuat data runway. Silakan muat ulang halaman.</span>
        </div>
      </div>
    );
  }

  if (data.total_assets === 0) {
    return (
      <div className="glass-card p-6 border border-slate-200 dark:border-white/[0.08] rounded-xl">
        <div className="flex items-center gap-3 text-slate-600 dark:text-white/60 text-sm">
          <Droplet className="w-5 h-5 text-mint-500 flex-shrink-0" />
          <div className="space-y-1">
            <p>Runway membutuhkan data aset networth, dan belum ada data yang tercatat.</p>
            <a
              href="/networth"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-mint-600 dark:text-mint-400 hover:underline"
            >
              Tambah data networth sekarang
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* SECTION 1: Master Health & KPI Header */}
      <div className={`glass-card p-5 sm:p-6 border ${config.borderColor} rounded-xl`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${config.bgColor} border ${config.borderColor}`}>
              {config.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Emergency Fund Runway</h2>
                <Badge variant="outline" className={`${config.textColor} ${config.borderColor} font-semibold text-xs`}>
                  {config.label}
                </Badge>
              </div>
              <p className="text-xs text-slate-600 dark:text-white/50 mt-0.5">
                {data.month ? `Berdasarkan data periode ${data.month}` : 'Periode aktif saat ini'}
              </p>
            </div>
          </div>

          {!compact && (
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-white/[0.04] p-1 rounded-lg border border-slate-200 dark:border-white/[0.08] text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('simulator')}
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                  activeTab === 'simulator'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Stress Test
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('tiers')}
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                  activeTab === 'tiers'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Tangga Target
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('ladder')}
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                  activeTab === 'ladder'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Likuiditas
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                  activeTab === 'history'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Tren & Tips
              </button>
            </div>
          )}
        </div>

        {/* Gauge & Key Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center pt-5">
          <div className="md:col-span-5 flex flex-col items-center justify-center">
            <RunwayGauge months={data.runway_months} target={data.target_months} color={config.gaugeColor} />
            <p className="text-xs text-center text-slate-600 dark:text-white/50 mt-2 max-w-xs">
              Kemampuan bertahan tanpa pendapatan dengan tingkat pengeluaran rata-rata saat ini
            </p>
          </div>

          <div className="md:col-span-7 grid grid-cols-2 gap-3.5">
            <div className="bg-slate-50 dark:bg-white/[0.03] p-3.5 rounded-xl border border-slate-200 dark:border-white/[0.06]">
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-white/50 mb-1">
                <Droplet className="w-3.5 h-3.5 text-mint-500" />
                <span>Aset Likuid Tersedia</span>
              </div>
              <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {formatIdr(data.liquid_assets)}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-white/40 mt-0.5">
                {data.total_assets > 0
                  ? `${Math.round((data.liquid_assets / data.total_assets) * 100)}% dari total kekayaan`
                  : '100%'}
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-white/[0.03] p-3.5 rounded-xl border border-slate-200 dark:border-white/[0.06]">
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-white/50 mb-1">
                <Wallet className="w-3.5 h-3.5 text-coral-500" />
                <span>Total Kekayaan (Aset)</span>
              </div>
              <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {formatIdr(data.total_assets)}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-white/40 mt-0.5">
                Aset investasi dan tabungan
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-white/[0.03] p-3.5 rounded-xl border border-slate-200 dark:border-white/[0.06]">
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-white/50 mb-1">
                <CalendarClock className="w-3.5 h-3.5 text-gold-500" />
                <span>Pengeluaran Bulanan</span>
              </div>
              <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {formatIdr(data.monthly_expense)}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-white/40 mt-0.5">
                Rata-rata pengeluaran 3 periode
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-white/[0.03] p-3.5 rounded-xl border border-slate-200 dark:border-white/[0.06]">
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-white/50 mb-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Cakupan Biaya Pokok</span>
              </div>
              <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {data.fixed_coverage_months.toFixed(1)} bulan
              </div>
              <div className="text-[11px] text-slate-500 dark:text-white/40 mt-0.5">
                Biaya rutin: {formatIdr(data.monthly_fixed)}/bln
              </div>
            </div>
          </div>
        </div>

        {/* Asset Liquidity Composition Bar */}
        {data.asset_breakdown.length > 0 && (
          <div className="mt-5 pt-4 border-t border-slate-200 dark:border-white/[0.06]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-700 dark:text-white/70">
                Komposisi Likuiditas Portofolio
              </span>
              <span className="text-[11px] text-slate-500 dark:text-white/40">
                Aset Likuid {formatIdr(data.liquid_assets)} / Total {formatIdr(data.total_assets)}
              </span>
            </div>
            <LiquidityBar breakdown={data.asset_breakdown} />
          </div>
        )}
      </div>

      {/* SECTION 2: Dynamic Views (Tabs) */}
      {!compact && (
        <div className="space-y-6">
          {/* TAB 1: Stress Test & Skenario Darurat */}
          {activeTab === 'simulator' && (
            <div className="glass-card p-5 sm:p-6 border border-slate-200 dark:border-white/[0.08] rounded-xl space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <SlidersHorizontal className="w-5 h-5 text-mint-500" />
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                      Simulator & Stress Test Ketahanan Finansial
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-white/50">
                      Uji ketahanan dana darurat Anda terhadap perubahan pengeluaran atau pengeluaran tak terduga.
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs border-mint-500/30 text-mint-600 dark:text-mint-400">
                  Interaktif
                </Badge>
              </div>

              {/* Skenario Cepat (Presets) */}
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-white/70 block mb-2">
                  Pilih Preset Skenario Uji Cepat:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <button
                    type="button"
                    onClick={() => applyPreset('baseline')}
                    className={`p-3 rounded-lg text-left border transition-all ${
                      selectedPreset === 'baseline'
                        ? 'border-mint-500 bg-mint-500/10 text-slate-900 dark:text-white'
                        : 'border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.02] text-slate-700 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="text-xs font-semibold">Gaya Hidup Normal</div>
                    <div className="text-[11px] text-slate-500 dark:text-white/40 mt-0.5">Pengeluaran standar</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyPreset('lean')}
                    className={`p-3 rounded-lg text-left border transition-all ${
                      selectedPreset === 'lean'
                        ? 'border-emerald-500 bg-emerald-500/10 text-slate-900 dark:text-white'
                        : 'border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.02] text-slate-700 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="text-xs font-semibold">Mode Hemat Pokok</div>
                    <div className="text-[11px] text-slate-500 dark:text-white/40 mt-0.5">Hanya biaya wajib</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyPreset('cut25')}
                    className={`p-3 rounded-lg text-left border transition-all ${
                      selectedPreset === 'cut25'
                        ? 'border-gold-500 bg-gold-500/10 text-slate-900 dark:text-white'
                        : 'border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.02] text-slate-700 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="text-xs font-semibold">Pengurangan 25%</div>
                    <div className="text-[11px] text-slate-500 dark:text-white/40 mt-0.5">Penghematan moderat</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyPreset('shock')}
                    className={`p-3 rounded-lg text-left border transition-all ${
                      selectedPreset === 'shock'
                        ? 'border-red-500 bg-red-500/10 text-slate-900 dark:text-white'
                        : 'border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.02] text-slate-700 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="text-xs font-semibold">Syok Darurat</div>
                    <div className="text-[11px] text-slate-500 dark:text-white/40 mt-0.5">Biaya mendadak 15 jt</div>
                  </button>
                </div>
              </div>

              {/* Slider & Input Parameter */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06]">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-white/70">
                      Pengeluaran Bulanan yang Disimulasikan:
                    </span>
                    <span className="font-bold text-mint-600 dark:text-mint-400">
                      {formatIdr(currentSimExpense)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={Math.max(1000000, Math.round(monthlyFixed * 0.5))}
                    max={Math.max(30000000, Math.round(baselineExpense * 2.5))}
                    step={250000}
                    value={currentSimExpense}
                    onChange={(e) => {
                      setSelectedPreset('custom');
                      setSimExpenseInput(Number(e.target.value));
                    }}
                    className="w-full accent-mint-500 h-2 bg-slate-200 dark:bg-white/10 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] text-slate-500 dark:text-white/40">
                    <span>Biaya Pokok: {formatIdr(monthlyFixed)}</span>
                    <span>Baseline: {formatIdr(baselineExpense)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-white/70">
                      Syok Pengeluaran Mendadak (Satu Kali):
                    </span>
                    <span className="font-bold text-coral-600 dark:text-coral-400">
                      {formatIdr(simShockInput)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(50000000, Math.round(liquidAssets * 0.8))}
                    step={1000000}
                    value={simShockInput}
                    onChange={(e) => {
                      setSelectedPreset('custom');
                      setSimShockInput(Number(e.target.value));
                    }}
                    className="w-full accent-coral-500 h-2 bg-slate-200 dark:bg-white/10 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] text-slate-500 dark:text-white/40">
                    <span>Rp 0 (Tanpa Syok)</span>
                    <span>Maksimal Rp 50.000.000</span>
                  </div>
                </div>
              </div>

              {/* Hasil Komparasi Skenario */}
              <div className="p-4 rounded-xl border border-mint-500/30 bg-mint-500/5 dark:bg-mint-950/20">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
                  <div>
                    <span className="text-xs text-slate-600 dark:text-white/50 block">Skenario Aktif</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {activeScenario.name}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs text-slate-600 dark:text-white/50 block">Aset Likuid Efektif</span>
                    <span className="text-base font-bold text-slate-900 dark:text-white">
                      {formatIdr(activeScenario.effectiveLiquid)}
                    </span>
                    {activeScenario.lumpSumShock > 0 && (
                      <span className="text-[11px] text-red-500 block">
                        -{formatIdr(activeScenario.lumpSumShock)} syok
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-xs text-slate-600 dark:text-white/50 block">Runway Simulasi</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-2xl font-bold text-slate-900 dark:text-white">
                        {activeScenario.runwayMonths.toFixed(1)}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-white/50">bulan</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs text-slate-600 dark:text-white/50 block">Deviasi vs Normal</span>
                    <div className="flex items-center gap-1">
                      {activeScenario.deltaMonths >= 0 ? (
                        <>
                          <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                          <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                            +{activeScenario.deltaMonths.toFixed(1)} bln
                          </span>
                        </>
                      ) : (
                        <>
                          <ArrowDownRight className="w-4 h-4 text-coral-500" />
                          <span className="text-sm font-semibold text-coral-600 dark:text-coral-400">
                            {activeScenario.deltaMonths.toFixed(1)} bln
                          </span>
                        </>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-white/40 block">
                      Status: {STATUS_CONFIG[activeScenario.status].label}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Tangga Target Dana Darurat (3, 6, 12 Bulan) */}
          {activeTab === 'tiers' && (
            <div className="glass-card p-5 sm:p-6 border border-slate-200 dark:border-white/[0.08] rounded-xl space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Activity className="w-5 h-5 text-emerald-500" />
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                      Tangga Target Dana Darurat (Emergency Fund Tiers)
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-white/50">
                      Pantau kecukupan dana darurat Anda di setiap tingkatan keamanan finansial.
                    </p>
                  </div>
                </div>
              </div>

              {/* 3 Tier Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {emergencyTiers.map((tier) => {
                  const isCompleted = tier.fundedPct >= 100;
                  const monthsNeeded = estimateMonthsToFund(tier.shortfall, monthlySavingInput);

                  return (
                    <div
                      key={tier.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isCompleted
                          ? 'bg-emerald-500/5 dark:bg-emerald-950/20 border-emerald-500/30'
                          : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.08]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-white/50">
                          {tier.targetMonths} Bulan
                        </span>
                        {isCompleted ? (
                          <Badge className="bg-emerald-500 text-white text-[11px] flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Tercapai
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-gold-600 dark:text-gold-400 border-gold-500/30 text-[11px]">
                            {tier.fundedPct}% Siap
                          </Badge>
                        )}
                      </div>

                      <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                        {tier.name}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-white/60 mb-3 min-h-[32px]">
                        {tier.description}
                      </p>

                      <div className="space-y-1.5 mb-3">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500 dark:text-white/40">Kebutuhan Target:</span>
                          <span className="font-semibold text-slate-800 dark:text-white/90">
                            {formatIdr(tier.targetAmount)}
                          </span>
                        </div>
                        <Progress
                          value={tier.fundedPct}
                          className="h-2 bg-slate-200 dark:bg-white/10"
                          indicatorClassName={isCompleted ? 'bg-emerald-500' : 'bg-gold-500'}
                        />
                      </div>

                      <div className="pt-2 border-t border-slate-200 dark:border-white/[0.06] text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-white/40">Kekurangan:</span>
                          <span className="font-medium text-slate-700 dark:text-white/70">
                            {tier.shortfall > 0 ? formatIdr(tier.shortfall) : 'Rp 0'}
                          </span>
                        </div>
                        {tier.shortfall > 0 && monthlySavingInput > 0 && (
                          <div className="flex justify-between text-[11px] text-mint-600 dark:text-mint-400 font-medium">
                            <span>Estimasi tercapai:</span>
                            <span>{monthsNeeded} bulan lagi</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Kalkulator Rencana Menabung */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-mint-500" />
                    <div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-white">
                        Kalkulator Proyeksi Menabung Dana Darurat
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-white/40">
                        Sesuaikan alokasi tabungan bulanan untuk melihat kecepatan pencapaian target
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600 dark:text-white/60">Alokasi/Bulan:</span>
                    <span className="text-sm font-bold text-mint-600 dark:text-mint-400">
                      {formatIdr(monthlySavingInput)}
                    </span>
                  </div>
                </div>

                <input
                  type="range"
                  min={500000}
                  max={15000000}
                  step={500000}
                  value={monthlySavingInput}
                  onChange={(e) => setMonthlySavingInput(Number(e.target.value))}
                  className="w-full accent-mint-500 h-2 bg-slate-200 dark:bg-white/10 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* TAB 3: Tangga Likuiditas Aset (Liquidity Ladder) */}
          {activeTab === 'ladder' && (
            <div className="glass-card p-5 sm:p-6 border border-slate-200 dark:border-white/[0.08] rounded-xl space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Layers className="w-5 h-5 text-mint-500" />
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                      Tangga Likuiditas Aset (Liquidity Ladder)
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-white/50">
                      Klasifikasi aset berdasarkan kecepatan pencairan dan diskon likuiditas saat kondisi darurat.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {liquidityGroups.map((group) => (
                  <div
                    key={group.tier}
                    className="p-4 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02]"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${group.badgeColor}`}>
                            {group.title}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-white/40 mt-1">
                          {group.timeframe}
                        </p>
                      </div>

                      <div className="text-right">
                        <div className="text-xs text-slate-500 dark:text-white/40">Kas Likuid Bersih</div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white">
                          {formatIdr(group.totalLiquid)}
                        </div>
                        {group.liquidityDiscount > 0 && (
                          <div className="text-[11px] text-slate-500 dark:text-white/40">
                            Diskon likuiditas: {formatIdr(group.liquidityDiscount)}
                          </div>
                        )}
                      </div>
                    </div>

                    {group.assets.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-200 dark:border-white/[0.06]">
                        {group.assets.map((a, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-lg bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/[0.05] flex items-center justify-between text-xs"
                          >
                            <div>
                              <span className="font-semibold text-slate-800 dark:text-white/90 block">
                                {a.name}
                              </span>
                              <span className="text-[11px] text-slate-500 dark:text-white/40">
                                Nominal: {formatIdr(a.value)}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-mint-600 dark:text-mint-400 block">
                                {formatIdr(a.liquidValue)}
                              </span>
                              <span className="text-[10px] text-slate-500 dark:text-white/40">
                                {Math.round(a.liquidityPct * 100)}% likuid
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 dark:text-white/40 italic pt-1">
                        Tidak ada aset di tingkatan likuiditas ini.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: Riwayat & Rekomendasi */}
          {activeTab === 'history' && (
            <div className="glass-card p-5 sm:p-6 border border-slate-200 dark:border-white/[0.08] rounded-xl space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <TrendingUp className="w-5 h-5 text-mint-500" />
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                      Tren Historis & Rekomendasi Taktis
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-white/50">
                      Evaluasi stabilitas dana darurat dari waktu ke waktu dan rekomendasi penguatan likuiditas.
                    </p>
                  </div>
                </div>
              </div>

              {/* Sparkline & History list */}
              {trendSparkData.length >= 2 && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-semibold text-slate-800 dark:text-white/90 block">
                        Lintasan Runway ({data.history.length} Periode Terakhir)
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-white/40">
                        Fluktuasi jumlah bulan cadangan hidup
                      </span>
                    </div>
                    <Sparkline data={trendSparkData} width={160} height={42} color={config.gaugeColor} />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 pt-2 border-t border-slate-200 dark:border-white/[0.06]">
                    {data.history.map((h, i) => (
                      <div
                        key={i}
                        className="p-2 rounded-lg bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-white/[0.04] text-center"
                      >
                        <div className="text-[11px] text-slate-500 dark:text-white/40 truncate">{h.month}</div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                          {h.runway_months.toFixed(1)} bln
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tips Section */}
              {data.tips.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-white/50">
                    <Lightbulb className="w-3.5 h-3.5 text-gold-500" />
                    <span>Rekomendasi Tindakan</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {data.tips.map((tip, i) => (
                      <div
                        key={i}
                        className="p-3.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02] flex items-start gap-2.5"
                      >
                        <Zap className="w-4 h-4 text-mint-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-slate-700 dark:text-white/70 leading-relaxed">{tip}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Compact View link */}
      {compact && (
        <a
          href="/runway"
          className="flex items-center justify-center gap-1.5 text-xs font-medium text-mint-600 dark:text-mint-400 hover:underline pt-1"
        >
          <span>Buka Command Center Runway Lengkap</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </a>
      )}
    </div>
  );
}
