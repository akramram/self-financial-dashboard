import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Skeleton } from './ui/skeleton';
import { onDataChanged } from '../lib/dataSync';

/**
 * AKSes (KSEI) live asset card (KUR-40, replaces BbriCard from KUR-29).
 *
 * Renders always from cached /api/ksei data; the server refreshes from AKSes
 * behind the scenes at most once per hour (day walk-back to the latest posted
 * EOD snapshot). Hierarchy: total portfolio value (largest) → snapshot date →
 * per-type breakdown bars (EKUITAS, REKSADANA, …). No toasts; inline error
 * line only.
 */

export interface KseiCardData {
  snapshot_date: string;
  total_value: number;
  breakdown: { type: string; amount: number; percent: number }[];
  fetched_at: string;
  stale?: boolean;
  tokenExpired?: boolean;
  error?: string;
}

interface Props {
  /** Pre-fetched API payload (dashboard passes null while loading) */
  data?: KseiCardData | null;
}

const fmtIdr = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');
const MS_PER_DAY = 86_400_000;

function daysOld(fetchedAt: string, now: number): number {
  return Math.floor((now - new Date(fetchedAt).getTime()) / MS_PER_DAY);
}

function fmtDate(iso: string): string {
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

const TYPE_COLORS: Record<string, string> = {
  EKUITAS: '#10b981',
  REKSADANA: '#6366f1',
  KAS: '#f59e0b',
  OBLIGASI: '#06b6d4',
  LAINNYA: '#94a3b8',
};

function typeColor(type: string): string {
  return TYPE_COLORS[type] ?? '#94a3b8';
}

function typeLabel(type: string): string {
  const map: Record<string, string> = {
    EKUITAS: 'Saham',
    REKSADANA: 'Reksadana',
    KAS: 'Kas',
    OBLIGASI: 'Obligasi',
    LAINNYA: 'Lainnya',
  };
  return map[type] ?? type;
}

export default function KseiCard({ data }: Props) {
  const [portfolio, setPortfolio] = useState<KseiCardData | null>(data ?? null);
  const [loading, setLoading] = useState(!data);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const ref = useRef<KseiCardData | null>(portfolio);
  ref.current = portfolio;

  useEffect(() => {
    if (data === undefined) return; // dashboard supplies data
    setPortfolio(data ?? null);
    setLoading(false);
    setFetchError(null);
  }, [data]);

  // Self-fetch when the dashboard doesn't supply data; live-sync on data changes.
  useEffect(() => {
    if (data !== undefined) return;
    let cancelled = false;
    const load = () =>
      fetch('/api/ksei')
        .then(r => (r.ok ? r.json() : Promise.reject(new Error('Data KSEI tidak tersedia'))))
        .then((d: KseiCardData) => {
          if (!cancelled) {
            setPortfolio(d);
            setFetchError(null);
            setLoading(false);
          }
        })
        .catch(() => {
          if (!ref.current) setLoading(false);
          setFetchError('Gagal memuat data KSEI — coba refresh.');
        });
    load();
    const off = onDataChanged(() => load());
    return () => {
      cancelled = true;
      off();
    };
  }, [data]);

  const now = Date.now();
  const total = portfolio?.total_value ?? null;
  const staleDays = portfolio?.stale ? daysOld(portfolio.fetched_at, now) : null;

  // Breakdown sorted descending by amount; zero-amount slices are hidden.
  const breakdown = [...(portfolio?.breakdown ?? [])]
    .filter(s => s.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  return (
    <motion.div
      data-testid="ksei-card"
      className="relative p-4 rounded-2xl bg-slate-100 dark:bg-white/[0.03] backdrop-blur-sm border border-slate-200 dark:border-white/[0.06] select-none"
      whileHover={{ scale: 1.01, y: -2 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      aria-label="Portfolio KSEI via AKSes"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-medium text-slate-500 dark:text-white/40">KSEI · AKSes</p>
          {staleDays != null && (
            <span
              data-testid="ksei-stale"
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500"
            >
              data {staleDays} hr lalu
            </span>
          )}
          {portfolio?.tokenExpired && (
            <span
              data-testid="ksei-token-expired"
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-500"
            >
              token kedaluwarsa
            </span>
          )}
        </div>
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-200/70 dark:bg-white/[0.06] text-slate-500 dark:text-white/50">
          EOD
        </span>
      </div>

      {loading ? (
        <div className="space-y-2" data-testid="ksei-skeleton">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-40" />
        </div>
      ) : !portfolio || total == null ? (
        <p data-testid="ksei-error" className="text-xs text-slate-500 dark:text-white/50">
          {fetchError || 'Data KSEI tidak tersedia.'}
        </p>
      ) : (
        <div>
          {/* 1 — total portfolio value (hero number) */}
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {fmtIdr(total)}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-white/40 mb-3">
            Total asset · posisi {fmtDate(portfolio.snapshot_date)}
          </p>

          {/* 2 — per-type breakdown bars */}
          <div className="space-y-2">
            {breakdown.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-white/50">Tidak ada holding aktif.</p>
            ) : (
              breakdown.map(s => (
                <div key={s.type}>
                  <div className="flex items-center justify-between text-xs mb-0.5">
                    <span className="text-slate-600 dark:text-white/60">{typeLabel(s.type)}</span>
                    <span className="font-medium text-slate-700 dark:text-white/80">
                      {fmtIdr(s.amount)}
                      <span className="text-slate-400 dark:text-white/40">
                        {' '}
                        · {s.percent.toFixed(1).replace('.', ',')}%
                      </span>
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-200/70 dark:bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.max(2, Math.min(100, s.percent))}%`, background: typeColor(s.type) }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* inline fetch error (single line, no toast) */}
          {fetchError && (
            <p data-testid="ksei-error" className="text-[11px] text-amber-600 dark:text-amber-400/80 mt-2">
              {fetchError}
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
}
