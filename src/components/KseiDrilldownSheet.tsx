import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { fmtIdr, fmtDate } from '../lib/format';
import {
  KSEI_TYPE_COLORS,
  kseiTypeLabel,
  type KseiInstrument,
} from '../lib/kseiInstruments';

/**
 * KUR-145 — KseiCard drill-down sheet (spec KUR-144, FINAL).
 *
 * Opens from the EKUITAS / REKSADANA slice buttons on KseiCard; lists the
 * individual instruments behind one asset class. Visual language follows
 * AlertsDrawer (side right, w-full sm:max-w-[400px], h-14 header, blurred
 * card surface, safe-area padding). Fetches /api/ksei/instruments on every
 * open, aborts in-flight requests on close; the card keeps owning the
 * summary breakdown, the sheet owns the instrument list and never writes
 * back. Errors stay inline (no toast) — spec §5/§10.
 */

export type KseiSliceType = 'EKUITAS' | 'REKSADANA';

interface Props {
  sliceType: KseiSliceType;
  sliceAmount: number;
  slicePercent: number;
  /** YYYY-MM-DD of the summary snapshot the slice came from. */
  snapshotDate: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** "Perbarui token" in the rose banner: close sheet, open the card's token form. */
  onRotateToken: () => void;
}

interface ApiPayload {
  snapshot_date?: string;
  fetched_at?: string;
  stale?: boolean;
  tokenExpired?: boolean;
  instruments?: KseiInstrument[];
}

const MS_PER_DAY = 86_400_000;

export default function KseiDrilldownSheet({
  sliceType,
  sliceAmount,
  slicePercent,
  snapshotDate,
  open,
  onOpenChange,
  onRotateToken,
}: Props) {
  const [instruments, setInstruments] = useState<KseiInstrument[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [staleDays, setStaleDays] = useState<number | null>(null);
  const [tokenExpired, setTokenExpired] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const sheetId = `ksei-drilldown-${sliceType.toLowerCase()}`;
  const typeLabel = kseiTypeLabel(sliceType);

  // Fetch per open (fresh data), abort on close. 404 = nothing cached yet →
  // defensive empty (retry cannot conjure data); other failures → error state.
  useEffect(() => {
    if (!open) return;
    const ctl = new AbortController();
    setLoading(true);
    setFailed(false);
    setInstruments([]);
    setStaleDays(null);
    setTokenExpired(false);
    fetch(`/api/ksei/instruments?type=${sliceType}`, { signal: ctl.signal })
      .then(async r => {
        const d = (await r.json().catch(() => null)) as ApiPayload | null;
        if (ctl.signal.aborted) return;
        if (!r.ok) {
          if (r.status === 404) {
            setFailed(false); // empty state, not an error
          } else {
            setFailed(true);
          }
          setTokenExpired(d?.tokenExpired === true);
          setLoading(false);
          return;
        }
        setInstruments(Array.isArray(d?.instruments) ? d!.instruments : []);
        setTokenExpired(d?.tokenExpired === true);
        setStaleDays(
          d?.stale && d?.fetched_at
            ? Math.max(0, Math.floor((Date.now() - new Date(d.fetched_at).getTime()) / MS_PER_DAY))
            : null
        );
        setLoading(false);
      })
      .catch(err => {
        if (ctl.signal.aborted || (err as Error)?.name === 'AbortError') return;
        setFailed(true);
        setLoading(false);
      });
    return () => ctl.abort();
  }, [open, sliceType, reloadKey]);

  const retry = useCallback(() => setReloadKey(k => k + 1), []);

  const handleRotateToken = () => {
    onOpenChange(false);
    onRotateToken();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        id={sheetId}
        side="right"
        className="w-full sm:max-w-[400px] sm:w-[calc(100vw-48px)] p-0 flex flex-col border-l border-[hsl(var(--surface-border)/0.12)] shadow-elevation-3 pb-[env(safe-area-inset-bottom)]"
        style={{
          backgroundColor: 'hsl(var(--card) / 0.95)',
          backdropFilter: 'blur(24px)',
        }}
      >
        {/* Header (spec §3): color dot + label + class value + % of total. */}
        <SheetHeader className="h-14 shrink-0 flex-row items-center gap-2 border-b border-[hsl(var(--surface-border)/0.08)] px-4 py-0 space-y-0">
          <span
            aria-hidden
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: KSEI_TYPE_COLORS[sliceType] ?? '#94a3b8' }}
          />
          <SheetTitle className="text-sm font-semibold text-slate-800 dark:text-white/90 truncate min-w-0">
            {typeLabel} · {fmtIdr(sliceAmount)}
          </SheetTitle>
          <span className="ml-auto shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-200/70 dark:bg-white/[0.06] text-slate-500 dark:text-white/50 tabular-nums">
            {slicePercent.toFixed(1).replace('.', ',')}%
          </span>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-4 outline-none sidebar-scroll">
          {/* SheetDescription is USED (spec §6) — visible position line. */}
          <SheetDescription className="flex items-center justify-between gap-2 pt-3 text-[10px] text-slate-500 dark:text-white/40">
            <span>Posisi {fmtDate(snapshotDate)}</span>
            {staleDays != null && (
              <span
                data-testid="ksei-drilldown-stale"
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500"
              >
                data {staleDays} hr lalu
              </span>
            )}
          </SheetDescription>

          {/* Token expired banner (spec §5.6) — rose, non-toggle badge +
              rotation button that hands back to the card's inline form. */}
          {tokenExpired && (
            <div
              data-testid="ksei-drilldown-token-expired"
              className="mt-3 rounded-xl bg-rose-500/10 border border-rose-500/20 px-3 py-2.5 flex items-center justify-between gap-2"
            >
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-500">
                token kedaluwarsa
              </span>
              <button
                type="button"
                data-testid="ksei-drilldown-rotate-token"
                onClick={handleRotateToken}
                className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg text-rose-500 hover:bg-rose-500/15 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Perbarui token
              </button>
            </div>
          )}

          {loading ? (
            <div className="space-y-2 pt-3" data-testid="ksei-drilldown-loading" role="status" aria-label={`Memuat instrumen ${typeLabel}`}>
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          ) : failed ? (
            <div
              data-testid="ksei-drilldown-error"
              className="flex flex-col items-center justify-center gap-3 py-10 text-center"
            >
              <p className="text-xs text-slate-500 dark:text-white/50">
                Gagal memuat daftar instrumen.
              </p>
              <Button variant="ghost" size="sm" onClick={retry}>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Coba lagi
              </Button>
            </div>
          ) : instruments.length === 0 ? (
            <p
              data-testid="ksei-drilldown-empty"
              className="py-10 text-center text-xs text-slate-500 dark:text-white/50"
            >
              Belum ada instrumen untuk kelas ini.
            </p>
          ) : (
            <ul className="pt-1">
              {/* Sort default: nilai desc (spec §3, konsisten dengan breakdown card). */}
              {[...instruments]
                .sort((a, b) => b.value - a.value)
                .map((it, i) => (
                  <InstrumentRow
                    key={`${it.code}-${i}`}
                    instrument={it}
                    sliceAmount={sliceAmount}
                    isEquity={sliceType === 'EKUITAS'}
                  />
                ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── row (internal, not exported — spec §2) ─────────────────────────────────

function InstrumentRow({
  instrument,
  sliceAmount,
  isEquity,
}: {
  instrument: KseiInstrument;
  sliceAmount: number;
  isEquity: boolean;
}) {
  // % of the asset class, computed client-side (spec §3). Display rounding
  // only — data is never rewritten.
  const pct =
    sliceAmount > 0 ? ((instrument.value / sliceAmount) * 100).toFixed(1).replace('.', ',') : '0,0';
  return (
    <li className="flex items-start justify-between gap-3 py-2.5 border-b border-[hsl(var(--surface-border)/0.08)] last:border-0">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-800 dark:text-white/90 truncate">
          {instrument.code}
        </p>
        {instrument.name && (
          <p className="text-[10px] text-slate-500 dark:text-white/40 truncate">
            {instrument.name}
          </p>
        )}
      </div>
      <div className="shrink-0 text-right">
        <p className="text-xs font-medium text-slate-700 dark:text-white/80 tabular-nums">
          {fmtIdr(instrument.value)}
        </p>
        <p className="text-[10px] text-slate-400 dark:text-white/30 tabular-nums">
          {pct}%{isEquity && instrument.volume != null ? ` · ${instrument.volume.toLocaleString('id-ID')} lembar` : ''}
        </p>
      </div>
    </li>
  );
}
