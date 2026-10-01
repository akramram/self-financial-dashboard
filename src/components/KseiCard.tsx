import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Skeleton } from './ui/skeleton';
import { onDataChanged, notifyDataChanged } from '../lib/dataSync';

/**
 * AKSes (KSEI) live asset card (KUR-40, replaces BbriCard from KUR-29).
 *
 * Renders always from cached /api/ksei data; the server refreshes from AKSes
 * behind the scenes at most once per hour (day walk-back to the latest posted
 * EOD snapshot). Hierarchy: total portfolio value (largest) → snapshot date →
 * per-type breakdown bars (EKUITAS, REKSADANA, …). No toasts; inline error
 * line only.
 *
 * Token rotation (KUR-40 follow-up): when the AKSes bearer token expires the
 * card shows a red badge + an inline paste field that accepts the raw JWT or
 * a full "copy as cURL" command; saving it POSTs to /api/ksei/token which
 * persists + hot-applies the token and refreshes the snapshot immediately.
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

  // Token rotation (KUR-40): inline paste field, auto-shown while the AKSes
  // token is expired. Accepts a raw JWT or a full "copy as cURL" command —
  // extraction + validation happen server-side at POST /api/ksei/token.
  const [tokenFormOpen, setTokenFormOpen] = useState(false);
  const [tokenDismissed, setTokenDismissed] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [tokenSaving, setTokenSaving] = useState(false);
  const [tokenMsg, setTokenMsg] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);

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
  const tokenExpired = portfolio?.tokenExpired === true;

  // Auto-open the rotation form while the token is expired (unless dismissed).
  useEffect(() => {
    if (tokenExpired && !tokenDismissed) setTokenFormOpen(true);
  }, [tokenExpired, tokenDismissed]);

  const submitToken = async () => {
    if (tokenSaving) return;
    const input = tokenInput.trim();
    if (!input) {
      setTokenError('Paste token atau curl dulu.');
      return;
    }
    setTokenSaving(true);
    setTokenError(null);
    setTokenMsg(null);
    try {
      const res = await fetch('/api/ksei/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: input, refresh: true }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok || !d?.ok) {
        setTokenError(d?.error ?? 'Gagal menyimpan token.');
        return;
      }
      if (d.refreshed) {
        setTokenMsg(`Token aktif · exp ${d.expires ?? '—'} · data diperbarui`);
      } else {
        setTokenMsg(`Token tersimpan · exp ${d.expires ?? '—'}${d.error ? ` · ${d.error}` : ''}`);
      }
      setTokenInput('');
      setTokenFormOpen(false);
      setTokenDismissed(false);
      notifyDataChanged('transactions'); // dashboard + other tabs refetch /api/ksei
      // Belt & braces: refetch locally too, in case no listener is mounted.
      fetch('/api/ksei')
        .then(r => (r.ok ? r.json() : null))
        .then((d2: KseiCardData | null) => {
          if (d2) {
            setPortfolio(d2);
            setFetchError(null);
          }
        })
        .catch(() => {});
    } catch {
      setTokenError('Gagal menghubungi server — coba lagi.');
    } finally {
      setTokenSaving(false);
    }
  };

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
            <button
              type="button"
              data-testid="ksei-token-expired"
              onClick={() => setTokenFormOpen(o => !o)}
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-500 cursor-pointer hover:bg-rose-500/25"
              aria-label="Token kedaluwarsa — klik untuk memperbarui"
            >
              token kedaluwarsa
            </button>
          )}
        </div>
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-200/70 dark:bg-white/[0.06] text-slate-500 dark:text-white/50">
          EOD
        </span>
      </div>

      {/* Token rotation form (KUR-40) — inline, no modal. Auto-shown while
          the token is expired; toggleable via the badge afterwards. */}
      {tokenFormOpen && (
        <div data-testid="ksei-token-form" className="mt-2 rounded-xl bg-slate-200/50 dark:bg-white/[0.04] p-2.5">
          <textarea
            data-testid="ksei-token-input"
            value={tokenInput}
            onChange={e => setTokenInput(e.target.value)}
            placeholder="Paste JWT atau full curl dari devtools AKSes di sini…"
            rows={3}
            autoComplete="off"
            spellCheck={false}
            className="w-full text-[11px] font-mono rounded-lg bg-white dark:bg-white/[0.06] border border-slate-300 dark:border-white/10 px-2 py-1.5 text-slate-700 dark:text-white/80 placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:border-emerald-500/60 resize-y"
          />
          <div className="flex items-center gap-1.5 mt-1.5">
            <button
              type="button"
              data-testid="ksei-token-save"
              onClick={submitToken}
              disabled={tokenSaving}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {tokenSaving ? 'Menyimpan…' : 'Simpan & refresh'}
            </button>
            <button
              type="button"
              data-testid="ksei-token-cancel"
              onClick={() => {
                setTokenFormOpen(false);
                setTokenDismissed(true);
              }}
              className="text-[11px] px-2 py-1 rounded-lg text-slate-500 dark:text-white/50 hover:bg-slate-200 dark:hover:bg-white/[0.06] cursor-pointer"
            >
              Nanti
            </button>
          </div>
          {tokenError && (
            <p data-testid="ksei-token-error" className="text-[10px] text-rose-500 mt-1.5">
              {tokenError}
            </p>
          )}
          <p className="text-[10px] text-slate-400 dark:text-white/30 mt-1.5">
            DevTools AKSes → Network → request myportofolio → copy "Authorization: Bearer …"
          </p>
        </div>
      )}

      {tokenMsg && (
        <p data-testid="ksei-token-msg" className="text-[11px] text-emerald-600 dark:text-emerald-400/80 mt-1.5">
          {tokenMsg}
        </p>
      )}

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
