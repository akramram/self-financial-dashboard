import React, { useMemo, useState } from 'react';
import {
  Gauge,
  Wallet,
  Repeat,
  Flag,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from './ui/skeleton';
import { formatIdr } from '../lib/utils';
import {
  simulateBoost,
  formatEtaDate,
  type PortfolioAnalysis,
  type GoalPace,
  type GoalPaceStatus,
  type FeasibilityStatus,
} from '../lib/goals-engine';

interface Props {
  analysis: PortfolioAnalysis | null;
  capacityLoading: boolean;
  today: string;
}

const STATUS_META: Record<GoalPaceStatus, { label: string; cls: string; icon: React.ReactNode }> = {
  ahead: {
    label: 'Di Maju Jadwal',
    cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    icon: <TrendingUp className="w-3 h-3" />,
  },
  on_track: {
    label: 'Sesuai Jadwal',
    cls: 'bg-mint-500/15 text-mint-700 dark:bg-mint-500/10 dark:text-mint-400',
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  behind: {
    label: 'Terlambat',
    cls: 'bg-gold-500/15 text-gold-700 dark:bg-gold-500/10 dark:text-gold-300',
    icon: <Clock className="w-3 h-3" />,
  },
  at_risk: {
    label: 'Berisiko',
    cls: 'bg-coral-500/15 text-coral-700 dark:bg-coral-500/10 dark:text-coral-400',
    icon: <AlertTriangle className="w-3 h-3" />,
  },
  overdue: {
    label: 'Lewat Tenggat',
    cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    icon: <AlertTriangle className="w-3 h-3" />,
  },
};

const FEASIBILITY_META: Record<FeasibilityStatus, { label: string; cls: string }> = {
  unknown: { label: 'Kapasitas tidak tersedia', cls: 'bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-white/70' },
  comfortable: { label: 'Longgar', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  tight: { label: 'Pas-Pasan', cls: 'bg-gold-500/15 text-gold-700 dark:bg-gold-500/10 dark:text-gold-300' },
  stretched: { label: 'Kurang Mampu', cls: 'bg-coral-500/15 text-coral-700 dark:bg-coral-500/10 dark:text-coral-400' },
};

function etaChip(g: GoalPace): { text: string; cls: string } {
  const etaLabel = g.etaDate ? formatEtaDate(g.etaDate) : '';
  switch (g.etaStatus) {
    case 'done':
      return { text: 'Tercapai', cls: 'text-emerald-600 dark:text-emerald-400' };
    case 'no_plan':
      return { text: 'Tanpa auto-setoran', cls: 'text-slate-600 dark:text-white/60' };
    case 'on_time':
      return {
        text: `ETA ${etaLabel} (tepat waktu)`,
        cls: 'text-emerald-600 dark:text-emerald-400',
      };
    case 'slightly_late':
      return {
        text: `ETA ${etaLabel} (meleset ${Math.ceil((g.etaDeltaDays || 0) / 30.4375)} bln)`,
        cls: 'text-gold-700 dark:text-gold-400',
      };
    default:
      return {
        text: `ETA ${etaLabel} (meleset ${Math.ceil((g.etaDeltaDays || 0) / 30.4375)} bln)`,
        cls: 'text-coral-600 dark:text-coral-400',
      };
  }
}

const BOOST_PRESETS = [0, 250_000, 500_000, 1_000_000];

export default function GoalPacePanel({ analysis, capacityLoading, today }: Props) {
  const [extra, setExtra] = useState(0);

  const boost = useMemo(
    () => (analysis ? simulateBoost(analysis, extra, today) : null),
    [analysis, extra, today]
  );

  if (capacityLoading) {
    return (
      <div className="glass-card p-5 space-y-4" data-testid="pace-panel-loading">
        <Skeleton className="h-5 w-52" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    );
  }

  if (!analysis || analysis.perGoal.length === 0) {
    return (
      <div className="glass-card p-5 text-sm text-muted-foreground" data-testid="pace-panel-empty">
        Tidak ada goal aktif untuk dianalisis. Buat goal pertama untuk melihat analisis pace, ETA, dan simulator setoran.
      </div>
    );
  }

  const feas = FEASIBILITY_META[analysis.feasibility];
  const sliderMax = analysis.capacity !== null && analysis.capacity > 0
    ? Math.ceil(analysis.capacity / 100_000) * 100_000
    : 5_000_000;

  return (
    <div className="space-y-4" data-testid="goal-pace-panel">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <Gauge className="w-4 h-4 text-mint-700 dark:text-mint-400" />
            <p className="text-xs text-muted-foreground">On Track</p>
          </div>
          <p className="text-xl font-bold">
            {analysis.onTrackCount}
            <span className="text-sm text-muted-foreground"> / {analysis.perGoal.length} goal</span>
          </p>
          {analysis.overdueCount > 0 && (
            <p className="text-[11px] text-red-600 dark:text-red-400 mt-0.5">
              {analysis.overdueCount} lewat tenggat
            </p>
          )}
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <Wallet className="w-4 h-4 text-gold-700 dark:text-gold-400" />
            <p className="text-xs text-muted-foreground">Setoran Wajib</p>
          </div>
          <p className="text-xl font-bold">{formatIdr(analysis.totalRequired)}<span className="text-sm text-muted-foreground">/bln</span></p>
          <Badge className={`mt-1 text-[10px] px-1.5 py-0 ${feas.cls}`}>{feas.label}</Badge>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <Repeat className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
            <p className="text-xs text-muted-foreground">Auto Coverage</p>
          </div>
          <p className="text-xl font-bold">{Math.round(analysis.coveragePct)}%</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {formatIdr(analysis.totalPlanned)}/bln terjadwal
          </p>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <Flag className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <p className="text-xs text-muted-foreground">Milestone Terdekat</p>
          </div>
          {analysis.nearestMilestone ? (
            <>
              <p className="text-sm font-bold truncate">{analysis.nearestMilestone.name}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {analysis.nearestMilestone.pct}% (kurang {formatIdr(analysis.nearestMilestone.shortfall)})
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Semua milestone terlampaui</p>
          )}
        </div>
      </div>

      {/* Pace table */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-semibold mb-3">Analisis Pace per Goal</h3>
        <div className="space-y-3">
          {analysis.perGoal.map((g) => {
            const meta = STATUS_META[g.status];
            const chip = etaChip(g);
            return (
              <div key={g.id} className="p-3 rounded-lg bg-slate-100/60 dark:bg-white/[0.04]" data-testid={`pace-row-${g.id}`}>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-medium text-sm truncate">{g.name}</span>
                  <Badge className={`text-[10px] px-1.5 py-0 gap-1 shrink-0 ${meta.cls}`}>
                    {meta.icon}
                    {meta.label}
                  </Badge>
                </div>
                <div className="relative w-full bg-slate-200/70 dark:bg-white/10 rounded-full h-2.5 mb-1">
                  <div
                    className="h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, g.progressPct)}%`, backgroundColor: g.color }}
                  />
                  {/* marker ekspektasi waktu */}
                  <div
                    className="absolute top-[-3px] h-[16px] w-0.5 bg-slate-700 dark:bg-white/70"
                    style={{ left: `${Math.min(100, g.timePct)}%` }}
                    title={`Ekspektasi waktu: ${Math.round(g.timePct)}%`}
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-[11px]">
                  <span className="text-muted-foreground">
                    Progres {Math.round(g.progressPct)}% vs waktu {Math.round(g.timePct)}% ({g.paceDeltaPct >= 0 ? '+' : ''}{Math.round(g.paceDeltaPct)} poin)
                  </span>
                  <span className={chip.cls}>{chip.text}</span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-x-3 text-[11px] mt-0.5">
                  <span className="text-muted-foreground">
                    Butuh {formatIdr(g.requiredPerMonth)}/bln
                    {g.plannedPerMonth > 0 && ` (auto ${formatIdr(g.plannedPerMonth)}/bln)`}
                  </span>
                  <span className="text-muted-foreground">
                    {g.daysLeft >= 0 ? `${g.daysLeft} hari tersisa` : `${Math.abs(g.daysLeft)} hari lewat`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Simulator */}
      <div className="glass-card p-4" data-testid="pace-simulator">
        <h3 className="text-sm font-semibold mb-1">Simulator Setoran Ekstra</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Tambah alokasi bulanan, lihat dampaknya ke ETA tiap goal. Alokasi dibagi proporsional ke kebutuhan setoran.
        </p>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {BOOST_PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setExtra(p)}
              className={`text-xs px-2.5 py-1.5 rounded-md border transition min-h-[36px] ${
                extra === p
                  ? 'bg-mint-600 text-slate-900 dark:text-white border-mint-600 font-medium'
                  : 'border-slate-300 dark:border-white/15 text-slate-700 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              {p === 0 ? 'Reset' : `+${formatIdr(p)}`}
            </button>
          ))}
        </div>
        <input
          type="range"
          min={0}
          max={sliderMax}
          step={100_000}
          value={Math.min(extra, sliderMax)}
          onChange={(e) => setExtra(parseInt(e.target.value, 10))}
          className="w-full accent-emerald-500 cursor-pointer"
          aria-label="Setoran ekstra per bulan"
        />
        <div className="flex justify-between text-[11px] text-muted-foreground mb-3">
          <span>{formatIdr(0)}</span>
          <span className="font-medium text-slate-800 dark:text-white/90">
            Ekstra: {formatIdr(extra)}/bln
          </span>
          <span>{formatIdr(sliderMax)}</span>
        </div>

        {boost && boost.rows.length > 0 && (
          <>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="p-2.5 rounded-lg bg-slate-100/60 dark:bg-white/[0.04] text-center">
                <p className="text-[10px] text-muted-foreground">Tepat Waktu</p>
                <p className="text-sm font-bold">
                  {boost.onTimeBefore} <span className="text-muted-foreground">/</span> {boost.onTimeAfter}
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-100/60 dark:bg-white/[0.04] text-center">
                <p className="text-[10px] text-muted-foreground">Total Dipercepat</p>
                <p className="text-sm font-bold">
                  {Math.round(boost.totalMonthsSaved)} <span className="text-muted-foreground font-normal">bln</span>
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-100/60 dark:bg-white/[0.04] text-center">
                <p className="text-[10px] text-muted-foreground">Beban Total</p>
                <p className={`text-sm font-bold ${boost.overCapacity ? 'text-coral-600 dark:text-coral-400' : ''}`}>
                  {analysis.capacity !== null
                    ? `${Math.round(((analysis.totalRequired + extra) / analysis.capacity) * 100)}%`
                    : 'N/A'}
                </p>
              </div>
            </div>
            {boost.overCapacity && (
              <p className="text-[11px] text-coral-600 dark:text-coral-400 mb-2" role="alert">
                Total beban setoran melebihi kapasitas surplus. Proyeksi ini tidak berkelanjutan.
              </p>
            )}
            <div className="space-y-1.5">
              {boost.rows.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="truncate text-slate-700 dark:text-white/80">{r.name}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {r.newEtaMonths !== null
                      ? `ETA ${Math.max(1, Math.ceil(r.newEtaMonths))} bln`
                      : 'tetap tanpa plan'}
                    {r.monthsSaved !== null && r.monthsSaved >= 1 && (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        {' '}(-{Math.round(r.monthsSaved)} bln)
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Insights */}
      {analysis.insights.length > 0 && (
        <div className="glass-card p-4" data-testid="pace-insights">
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-gold-700 dark:text-gold-400" />
            Insight Portofolio
          </h3>
          <ul className="space-y-1.5">
            {analysis.insights.map((ins, i) => (
              <li key={i} className="text-xs text-slate-600 dark:text-white/60 flex gap-2">
                <span className="mt-1.5 h-1 w-1 rounded-full bg-gold-500 shrink-0" aria-hidden />
                {ins}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
