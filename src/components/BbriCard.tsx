import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Skeleton } from './ui/skeleton';
import { onDataChanged } from '../lib/dataSync';

/**
 * BBRI Dividend Yield & 32-Lot Tracking Card (KUR-29).
 *
 * Renders always from cached /api/bbri data; the server refreshes from Yahoo
 * behind the scenes at most once per hour. Hierarchy: TTM yield % (largest,
 * TTM badge) → price + daily delta (emerald/red) → 32-lot holding value →
 * small row with 12-month total dividends + last event date. Click toggles
 * an inline dividend-history expansion. No toasts; inline error line only.
 */

export const BBRI_SHARES = 3_200; // 32 lots × 100 shares

export interface BbriCardData {
  symbol: string;
  price: number;
  prev_close: number;
  ttm_dividend: number;
  fetched_at: string;
  last_dividend_date: string | null;
  dividends: { date: string; amount: number }[];
  stale?: boolean;
  error?: string;
}

interface Props {
  /** Pre-fetched API payload (dashboard passes null while loading) */
  data?: BbriCardData | null;
}

const fmtIdr = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');
const fmtPct = (n: number) => n.toFixed(2).replace('.', ',') + '%';
const UP = '#10b981';
const DOWN = '#ef4444';
const MS_PER_DAY = 86_400_000;

function daysOld(fetchedAt: string, now: number): number {
  return Math.floor((now - new Date(fetchedAt).getTime()) / MS_PER_DAY);
}

function fmtDate(iso: string): string {
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function BbriCard({ data }: Props) {
  const [quote, setQuote] = useState<BbriCardData | null>(data ?? null);
  const [loading, setLoading] = useState(!data);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const quoteRef = useRef<BbriCardData | null>(quote);
  quoteRef.current = quote;

  useEffect(() => {
    if (data === undefined) return; // self-fetch mode manages its own loading
    setQuote(data ?? null);
    setLoading(false);
    setFetchError(null);
  }, [data]);

  // Self-fetch when the dashboard doesn't supply data; live-sync on data changes.
  useEffect(() => {
    if (data !== undefined) return;
    let cancelled = false;
    const load = () =>
      fetch('/api/bbri')
        .then(r => (r.ok ? r.json() : Promise.reject(new Error('BBRI data tidak tersedia'))))
        .then((d: BbriCardData) => {
          if (!cancelled) {
            setQuote(d);
            setFetchError(null);
            setLoading(false);
          }
        })
        .catch(() => {
          if (!cancelled) {
            if (!quoteRef.current) setLoading(false);
            setFetchError('Gagal memuat data BBRI — coba refresh.');
          }
        });
    load();
    const off = onDataChanged(() => load());
    return () => {
      cancelled = true;
      off();
    };
  }, [data]);

  const now = Date.now();
  const price = quote?.price ?? null;
  const prevClose = quote?.prev_close ?? null;
  const delta = price != null && prevClose != null ? price - prevClose : null;
  const deltaPct = delta != null && prevClose ? (delta / prevClose) * 100 : null;
  const up = (delta ?? 0) >= 0;
  const yieldPct = price && quote?.ttm_dividend != null ? (quote.ttm_dividend / price) * 100 : null;
  const holdingValue = price != null ? price * BBRI_SHARES : null;
  const annualDiv = quote ? quote.ttm_dividend * BBRI_SHARES : null;
  const staleDays = quote?.stale ? daysOld(quote.fetched_at, now) : null;

  return (
    <motion.div
      data-testid="bbri-card"
      className="relative p-4 rounded-2xl bg-slate-100 dark:bg-white/[0.03] backdrop-blur-sm border border-slate-200 dark:border-white/[0.06] cursor-pointer select-none"
      onClick={() => setExpanded(e => !e)}
      whileHover={{ scale: 1.01, y: -2 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      role="button"
      aria-expanded={expanded}
      aria-label={`BBRI dividend tracker, yield ${yieldPct != null ? fmtPct(yieldPct) : 'loading'}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-medium text-slate-500 dark:text-white/40">BBRI</p>
          {staleDays != null && (
            <span
              data-testid="bbri-stale"
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500"
            >
              data {staleDays} hr lalu
            </span>
          )}
        </div>
        {yieldPct != null && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-200/70 dark:bg-white/[0.06] text-slate-500 dark:text-white/50">
            TTM
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-2" data-testid="bbri-skeleton">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-40" />
        </div>
      ) : !quote || price == null ? (
        <p data-testid="bbri-error" className="text-xs text-slate-500 dark:text-white/50">
          {fetchError || 'Data BBRI tidak tersedia.'}
        </p>
      ) : (
        <>
          {/* 1 — TTM dividend yield (hero number) */}
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {yieldPct != null ? fmtPct(yieldPct) : '—'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-white/40 mb-2">Dividend Yield TTM</p>

          {/* 2 — price + daily delta */}
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-sm font-semibold text-slate-800 dark:text-white/90">{fmtIdr(price)}</span>
            {delta != null && (
              <span className="text-xs font-semibold" style={{ color: up ? UP : DOWN }}>
                {up ? '▲' : '▼'} {Math.abs(delta).toLocaleString('id-ID')}
                {deltaPct != null && ` (${up ? '+' : '-'}${Math.abs(deltaPct).toFixed(2).replace('.', ',')}%)`}
              </span>
            )}
          </div>

          {/* 3 — 32-lot holding value */}
          {holdingValue != null && (
            <p className="text-xs text-slate-600 dark:text-white/60 mb-1">
              32 lot · {BBRI_SHARES.toLocaleString('id-ID')} shares ·{' '}
              <span className="font-semibold text-slate-800 dark:text-white/90">{fmtIdr(holdingValue)}</span>
            </p>
          )}

          {/* 4 — small row: trailing-12-month dividends */}
          <p className="text-[11px] text-slate-500 dark:text-white/40">
            {quote.ttm_dividend > 0
              ? `Dividen 12 bln: ${fmtIdr(quote.ttm_dividend)}/share · ${fmtIdr(annualDiv!)}/thn${quote.last_dividend_date ? ` · terakhir ${fmtDate(quote.last_dividend_date)}` : ''}`
              : 'Belum ada dividen 12 bulan terakhir.'}
          </p>

          {/* inline fetch error (single line, no toast) */}
          {fetchError && (
            <p data-testid="bbri-error" className="text-[11px] text-amber-600 dark:text-amber-400/80 mt-1">
              {fetchError}
            </p>
          )}

          {/* expanded: per-event dividend history (inline, no navigation) */}
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/[0.06] space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">
                  Histori Dividen
                </p>
                {quote.dividends.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-white/50">Tidak ada event dividen.</p>
                ) : (
                  quote.dividends.map(d => (
                    <div key={d.date} className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-white/50">{fmtDate(d.date)}</span>
                      <span className="font-medium text-slate-700 dark:text-white/80">{fmtIdr(d.amount)}/share</span>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
}
