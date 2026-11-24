import React, { useState, useEffect, useCallback } from 'react';
import { formatIdr } from '../lib/utils';
import { TrendingUp, TrendingDown, Minus, CalendarClock, Wallet, Flame, RefreshCw } from 'lucide-react';

interface SafeToSpendData {
  period_id: number;
  period_label: string;
  start_date: string;
  end_date: string;
  income: number;
  total_spent: number;
  remaining_budget: number;
  days_elapsed: number;
  days_total: number;
  days_remaining: number;
  daily_safe_to_spend: number;
  spent_today: number;
  left_today: number;
  avg_7d: number;
  status: 'healthy' | 'tight' | 'over';
  time_elapsed_pct: number;
}

interface Props {
  /** Optional period ID. If omitted, uses the active period from the API. */
  periodId?: number;
}

const STATUS_CONFIG = {
  healthy: {
    accent: 'bg-emerald-500',
    text: 'text-emerald-700 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    border: 'border-emerald-200 dark:border-emerald-800',
    icon: <TrendingUp className="w-4 h-4" />,
    label: 'Sehat',
    description: 'Masih ada ruang untuk pengeluaran hari ini',
  },
  tight: {
    accent: 'bg-gold-500',
    text: 'text-gold-700 dark:text-gold-400',
    bg: 'bg-gold-500/10 dark:bg-gold-700/20',
    border: 'border-gold-400/40 dark:border-gold-700/40',
    icon: <Minus className="w-4 h-4" />,
    label: 'Hemat',
    description: 'Pengeluaran hari ini melebihi batas aman',
  },
  over: {
    accent: 'bg-red-500',
    text: 'text-red-700 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
    icon: <TrendingDown className="w-4 h-4" />,
    label: 'Over Budget',
    description: 'Pengeluaran sudah melebihi income periode ini',
  },
} as const;

export default function SafeToSpend({ periodId }: Props) {
  const [data, setData] = useState<SafeToSpendData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [noPeriod, setNoPeriod] = useState(false);

  const load = useCallback(() => {
    setError(false);
    setNoPeriod(false);
    setLoading(true);
    const url = periodId
      ? `/api/safe-to-spend?period_id=${periodId}`
      : '/api/safe-to-spend';
    fetch(url)
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) {
          // 404 no_active_period = legitimate pre-kickoff state, not a failure
          if (r.status === 404 && (body as { error?: string }).error === 'no_active_period') {
            setNoPeriod(true);
          }
          throw new Error('Failed to fetch');
        }
        return body as SafeToSpendData;
      })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [periodId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="glass-card p-5 shadow-none animate-pulse" data-testid="sts-loading">
        <div className="h-24 bg-slate-100 dark:bg-slate-800 rounded-lg" />
      </div>
    );
  }

  if (error || !data) {
    if (noPeriod) {
      return (
        <div className="glass-card p-5 shadow-none" data-testid="sts-empty">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-5 h-5 text-slate-500 dark:text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Safe to Spend</h3>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
            Periode gaji baru belum di-kickoff. Jalankan kickoff bulan baru untuk mulai melacak anggaran harian.
          </p>
        </div>
      );
    }
    return (
      <div className="glass-card p-5 shadow-none" data-testid="sts-error">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Gagal memuat safe-to-spend.
        </p>
        <button
          onClick={load}
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition min-h-[44px]"
        >
          <RefreshCw className="w-4 h-4" /> Coba lagi
        </button>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[data.status];

  // Left today indicator
  const leftTodayPositive = data.left_today >= 0;
  const pctLeftToday = data.daily_safe_to_spend > 0
    ? Math.min(100, (data.spent_today / data.daily_safe_to_spend) * 100)
    : data.spent_today > 0 ? 100 : 0;

  // Compare avg7d to safe-to-spend
  const avgVsSafe = data.daily_safe_to_spend > 0
    ? Math.round((data.avg_7d / data.daily_safe_to_spend) * 100)
    : 0;

  return (
    <div data-testid="sts-card" className={`bg-card relative overflow-hidden glass-card border ${cfg.border} shadow-none`}>
      {/* Top accent bar, status color marker (hierarchy, not decoration) */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${cfg.accent}`} />

      <div className="flex flex-col sm:flex-row items-start gap-4">
        {/* Left: Big Number */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Wallet className={`w-5 h-5 ${cfg.text}`} />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Safe to Spend
            </h3>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${cfg.bg} border ${cfg.border} ${cfg.text} flex items-center gap-1`}>
              {cfg.icon}
              {cfg.label}
            </span>
          </div>

          {/* The big number */}
          <div className="flex items-baseline gap-3 mt-2">
            <p className={`text-3xl font-bold tracking-tight ${leftTodayPositive ? 'text-slate-800 dark:text-slate-100' : 'text-red-600 dark:text-red-400'}`}>
              {formatIdr(Math.abs(data.daily_safe_to_spend))}
            </p>
            <span className="text-xs text-slate-500 dark:text-slate-400">/ hari</span>
          </div>

          <p className={`text-xs mt-1 ${cfg.text}`}>
            {cfg.description}
          </p>

          {/* Mini progress: spent today vs safe-to-spend */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
              <span>Hari ini: {formatIdr(data.spent_today)}</span>
              <span className={leftTodayPositive ? '' : 'text-red-600 dark:text-red-400 font-semibold'}>
                {leftTodayPositive ? `Sisa ${formatIdr(data.left_today)}` : `Over ${formatIdr(Math.abs(data.left_today))}`}
              </span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all ${leftTodayPositive ? 'bg-emerald-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min(100, pctLeftToday)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right: Context Metrics */}
        <div className="flex flex-row sm:flex-col gap-3 sm:min-w-[140px] w-full sm:w-auto">
          <div className={`flex-1 rounded-lg p-2.5 ${cfg.bg} border ${cfg.border}`}>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">
              <CalendarClock className="w-3 h-3" />
              Hari tersisa
            </div>
            <p className={`text-lg font-bold ${cfg.text}`}>
              {data.days_remaining}
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1">/ {data.days_total} hari</span>
            </p>
          </div>

          <div className="flex-1 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">
              <Flame className="w-3 h-3" />
              Rata-rata 7 hari
            </div>
            <p className="text-lg font-bold text-slate-700 dark:text-slate-200">
              {formatIdr(data.avg_7d)}
            </p>
            {data.daily_safe_to_spend > 0 && (
              <p className={`text-[11px] ${avgVsSafe > 100 ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>
                {avgVsSafe}% dari safe-to-spend
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Bottom: remaining budget bar */}
      <div className="mt-4 pt-3 border-t border-slate-200/50 dark:border-slate-700/50">
        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
          <span>
            Sisa budget periode:{' '}
            <span className={`font-semibold ${data.remaining_budget < 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>
              {formatIdr(data.remaining_budget)}
            </span>
          </span>
          <span>{data.time_elapsed_pct}% waktu terpakai</span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-1.5 rounded-full transition-all ${
              data.remaining_budget < 0
                ? 'bg-red-500'
                : data.time_elapsed_pct > 80
                  ? 'bg-gold-500'
                  : 'bg-mint-400 dark:bg-mint-500/50'
            }`}
            style={{ width: `${Math.min(100, data.time_elapsed_pct)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
