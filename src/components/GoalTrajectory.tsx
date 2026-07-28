import React, { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import Sparkline from './Sparkline';
import { formatIdr } from '../lib/utils';
import type { GoalTrajectory as GoalTrajectoryRow, GoalTrajectoryResult, TrajectoryStatus } from '../lib/goalTrajectory';
import {
  TrendingUp,
  TrendingDown,
  Target,
  CalendarClock,
  AlertTriangle,
  CheckCircle2,
  Minus,
  Gauge,
  Rocket,
  Info,
} from 'lucide-react';

/**
 * Goal Trajectory Projection widget.
 *
 * Projects each active goal's completion date from the user's actual savings
 * trend (net worth growth). Reads `/api/goal-trajectory` on mount — no props
 * are passed through the Astro devalue serialiser, so complex nested data is
 * safe.
 *
 * Empty/insufficient-data states are surfaced explicitly rather than rendered
 * as broken zeros.
 */
export default function GoalTrajectory() {
  const [data, setData] = useState<GoalTrajectoryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch('/api/goal-trajectory')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<GoalTrajectoryResult>;
      })
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setError(null);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message ?? 'Failed to load trajectory');
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Hooks must run before any early return (Rules of Hooks guard).
  const trendValues = useMemo(() => {
    if (!data?.trend?.length) return [] as number[];
    return data.trend.map((t) => t.total);
  }, [data]);

  const summary = useMemo(() => {
    if (!data) return null;
    const totalGoals = data.goals.length;
    const behind = data.goals.filter((g) => g.status === 'behind').length;
    const atRisk = data.goals.filter((g) => g.status === 'at_risk').length;
    const onTrack = data.goals.filter((g) => g.status === 'on_track').length;
    const ahead = data.goals.filter((g) => g.status === 'ahead').length;
    return { totalGoals, behind, atRisk, onTrack, ahead };
  }, [data]);

  if (loading) {
    return (
      <div className="glass-card p-5">
        Memuat proyeksi trajectory goal…
        </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-5">
        Gagal memuat proyeksi: {error}
        </div>
    );
  }

  if (!data || !summary) return null;

  if (summary.totalGoals === 0) {
    return (
      <div className="glass-card p-5">
        <h3 className="text-base font-semibold flex items-center gap-2 text-white/80">
            <Target className="w-4 h-4 text-mint-500" />
            Proyeksi Trajectory Goal
          </h3>
          <p className="text-xs text-white/50">
            Estimasi pencapaian goal berbasis kecepatan tabungan historis
          </p>
        <Info className="w-5 h-5 mx-auto mb-2 opacity-50" />
          Tidak ada goal aktif. Buat goal di halaman ini untuk melihat proyeksi.
        </div>
    );
  }

  return (
    <div className="glass-card p-5">
      <h3 className="text-base font-semibold flex items-center gap-2 text-white/80">
          <Target className="w-4 h-4 text-mint-500" />
          Proyeksi Trajectory Goal
        </h3>
        <p className="text-xs text-white/50">
          Estimasi pencapaian goal berbasis kecepatan tabungan {Math.max(2, Math.min(6, data.trend.length))} periode terakhir
        </p>
        {/* Summary chips */}
        <div className="flex flex-wrap gap-2 mt-2">
          {summary.ahead > 0 && (
            <Badge variant="outline" className="text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700">
              <Rocket className="w-3 h-3 mr-1" /> {summary.ahead} Lebih Cepat
            </Badge>
          )}
          {summary.onTrack > 0 && (
            <Badge variant="outline" className="text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700">
              <CheckCircle2 className="w-3 h-3 mr-1" /> {summary.onTrack} On Track
            </Badge>
          )}
          {summary.atRisk > 0 && (
            <Badge variant="outline" className="text-gold-600 dark:text-gold-400 border-gold-400/30 dark:border-gold-700">
              <AlertTriangle className="w-3 h-3 mr-1" /> {summary.atRisk} Berisiko
            </Badge>
          )}
          {summary.behind > 0 && (
            <Badge variant="outline" className="text-red-600 dark:text-red-400 border-red-300 dark:border-red-700">
              <TrendingDown className="w-3 h-3 mr-1" /> {summary.behind} Tertinggal
            </Badge>
          )}
        </div>
      {!data.has_sufficient_data && (
          <div className="rounded-md border border-gold-400/20 dark:border-gold-700/40/60 bg-gold-500/5 dark:bg-gold-700/20 px-3 py-2 text-xs text-gold-700 dark:text-gold-300 flex items-start gap-2">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>
              Data networth belum cukup (butuh minimal 2 entri). Proyeksi tidak dapat dihitung —
              tambahkan entri networth secara berkala untuk mengaktifkan fitur ini.
            </span>
          </div>
        )}

        {data.has_sufficient_data && (
          <div className="rounded-md border border-white/[0.06] px-3 py-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Gauge className="w-4 h-4 text-mint-500 shrink-0" />
              <div className="text-xs text-muted-foreground truncate">
                Rata-rata tabungan
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-sm font-semibold">
                {data.average_monthly_savings >= 0 ? '+' : ''}
                {formatIdr(data.average_monthly_savings)}/bln
              </div>
              {trendValues.length >= 2 && (
                <div className="w-24 h-8">
                  <Sparkline
                    data={trendValues}
                    color={data.average_monthly_savings >= 0 ? '#10b981' : '#ef4444'}
                    height={32}
                    width={96}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {data.goals.map((g) => (
          <GoalTrajectoryRowCard key={g.id} goal={g} hasData={data.has_sufficient_data} />
        ))}
      </div>
  );
}

function statusMeta(status: TrajectoryStatus): {
  label: string;
  color: string;
  icon: React.ReactNode;
} {
  switch (status) {
    case 'ahead':
      return { label: 'Lebih Cepat', color: '#10b981', icon: <Rocket className="w-3.5 h-3.5" /> };
    case 'on_track':
      return { label: 'On Track', color: '#22c55e', icon: <CheckCircle2 className="w-3.5 h-3.5" /> };
    case 'at_risk':
      return { label: 'Berisiko', color: '#f59e0b', icon: <AlertTriangle className="w-3.5 h-3.5" /> };
    case 'behind':
      return { label: 'Tertinggal', color: '#ef4444', icon: <TrendingDown className="w-3.5 h-3.5" /> };
    default:
      return { label: 'Selesai', color: '#64748b', icon: <CheckCircle2 className="w-3.5 h-3.5" /> };
  }
}

function formatDelta(days: number | null): string {
  if (days === null) return '—';
  const abs = Math.abs(Math.round(days));
  if (abs === 0) return 'tepat waktu';
  const weeks = Math.round(abs / 7);
  const months = Math.round(abs / 30);
  if (abs < 14) return `${abs} hari ${days > 0 ? 'telat' : 'lebih cepat'}`;
  if (abs < 60) return `${weeks} minggu ${days > 0 ? 'telat' : 'lebih cepat'}`;
  return `${months} bulan ${days > 0 ? 'telat' : 'lebih cepat'}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function GoalTrajectoryRowCard({ goal, hasData }: { goal: GoalTrajectoryRow; hasData: boolean }) {
  const meta = statusMeta(goal.status);
  const progressPct = goal.target_amount > 0
    ? Math.min(100, (goal.current_amount / goal.target_amount) * 100)
    : 0;
  const paceRatio = goal.required_monthly > 0
    ? goal.monthly_savings / goal.required_monthly
    : null;
  const paceLabel = paceRatio === null
    ? '—'
    : paceRatio >= 1
      ? `${(paceRatio * 100).toFixed(0)}% dari kebutuhan`
      : `${(paceRatio * 100).toFixed(0)}% dari kebutuhan`;

  return (
    <div className="rounded-lg border border-white/[0.06] p-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: goal.color }}
            aria-hidden
          />
          <span className="font-medium text-sm truncate">{goal.name}</span>
        </div>
        <Badge
          variant="outline"
          className="shrink-0"
          style={{
            color: meta.color,
            borderColor: `${meta.color}55`,
            backgroundColor: `${meta.color}11`,
          }}
        >
          {meta.icon}
          <span className="ml-1">{meta.label}</span>
        </Badge>
      </div>

      {/* Progress bar */}
      <div className="mb-2">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-muted-foreground">
            {formatIdr(goal.current_amount)} / {formatIdr(goal.target_amount)}
          </span>
          <span className="font-medium">{progressPct.toFixed(0)}%</span>
        </div>
        <Progress
          value={progressPct}
          className="h-1.5 bg-white/[0.08]"
          indicatorStyle={{ backgroundColor: goal.color }}
        />
      </div>

      {/* Key metrics grid */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
        <Metric
          icon={<CalendarClock className="w-3.5 h-3.5 text-white/40" />}
          label="Target tanggal"
          value={formatDate(goal.target_date)}
        />
        <Metric
          icon={<TrendingUp className="w-3.5 h-3.5 text-mint-400" />}
          label="Proyeksi selesai"
          value={hasData ? formatDate(goal.projected_date) : '—'}
          valueClassName={
            !hasData
              ? ''
              : goal.status === 'ahead' || goal.status === 'on_track'
                ? 'text-emerald-600 dark:text-emerald-400'
                : goal.status === 'at_risk' || goal.status === 'behind'
                  ? 'text-gold-600 dark:text-gold-400'
                  : ''
          }
        />
        <Metric
          icon={<Minus className="w-3.5 h-3.5 text-white/40" />}
          label="Selisih waktu"
          value={hasData ? formatDelta(goal.days_delta) : '—'}
        />
        <Metric
          icon={<Gauge className="w-3.5 h-3.5 text-white/40" />}
          label="Pace vs kebutuhan"
          value={hasData ? paceLabel : '—'}
          valueClassName={
            hasData && paceRatio !== null && paceRatio < 1
              ? 'text-gold-600 dark:text-gold-400'
              : hasData && paceRatio !== null && paceRatio >= 1
                ? 'text-emerald-600 dark:text-emerald-400'
                : ''
          }
        />
      </div>

      {/* Recommendation */}
      {hasData && goal.projected_gap_idr > 0 && (
        <div className="mt-2 text-xs text-gold-700 dark:text-gold-300 bg-gold-500/5 dark:bg-gold-700/20 rounded px-2 py-1.5">
          Kurang <strong>{formatIdr(goal.projected_gap_idr)}</strong> di tanggal target.
          Tingkatkan tabungan ke <strong>{formatIdr(goal.required_monthly)}/bln</strong> untuk tepat waktu.
        </div>
      )}
      {hasData && goal.projected_gap_idr === 0 && goal.status !== 'completed' && (
        <div className="mt-2 text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 rounded px-2 py-1.5">
          Laju tabungan saat ini cukup untuk mencapai target tepat waktu 🎯
        </div>
      )}
      {!hasData && (
        <div className="mt-2 text-xs text-gold-700 dark:text-gold-300 bg-gold-500/5 dark:bg-gold-700/20 rounded px-2 py-1.5">
          Proyeksi belum tersedia. Butuh minimal 2 entri networth.
        </div>
      )}
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  valueClassName = '',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className={`font-medium truncate ${valueClassName}`} title={value}>
        {value}
      </div>
    </div>
  );
}
