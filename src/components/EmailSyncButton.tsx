import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * EmailSyncButton — "Recheck email" on the dashboard and transactions pages.
 *
 * Two guards keep repeat clicks cheap:
 *  - a lookback filter (1/3/7/30 days) sent as `days`, so the IMAP search only
 *    covers that window instead of the whole mailbox history;
 *  - a 30s cooldown persisted in localStorage, so a double tap cannot start a
 *    second scan while the first is still running.
 *
 * On success it broadcasts `email-review-refresh`; EmailReviewModal listens and
 * re-reads the queue, so this component stays ignorant of the review flow.
 */
const COOLDOWN_MS = 30_000;
const LOOKBACKS = [1, 3, 7, 30] as const;
const KEY = 'jenius-recheck-days';

export default function EmailSyncButton({ className = '' }: { className?: string }) {
  const [busy, setBusy] = useState(false);
  const [days, setDays] = useState<number>(7);
  const [left, setLeft] = useState(0);

  useEffect(() => {
    const saved = Number(localStorage.getItem(KEY));
    if (LOOKBACKS.includes(saved as any)) setDays(saved);
    const at = Number(localStorage.getItem(`${KEY}-at`) || 0);
    setLeft(Math.max(0, Math.ceil((COOLDOWN_MS - (Date.now() - at)) / 1000)));
  }, []);

  // countdown ticker, only while cooling down
  useEffect(() => {
    if (left <= 0) return;
    const t = setInterval(() => setLeft((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(t);
  }, [left]);

  const run = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/pending-email-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        toast.error(data.error || 'Recheck email gagal');
        return;
      }
      localStorage.setItem(`${KEY}-at`, String(Date.now()));
      setLeft(COOLDOWN_MS / 1000);
      window.dispatchEvent(new CustomEvent('email-review-refresh'));
      toast.success(
        data.pending > 0
          ? `Recheck ${days} hari terakhir · ${data.pending} transaksi menunggu`
          : `Recheck ${days} hari terakhir · tidak ada transaksi baru`
      );
    } catch (e: any) {
      toast.error(e?.message || 'Recheck email gagal');
    } finally {
      setBusy(false);
    }
  }, [days]);

  const cooling = left > 0 && !busy;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <label className="sr-only" htmlFor="recheck-days">
        Rentang waktu email
      </label>
      <select
        id="recheck-days"
        value={days}
        disabled={busy}
        onChange={(e) => {
          const v = Number(e.target.value);
          setDays(v);
          localStorage.setItem(KEY, String(v));
        }}
        className="h-9 rounded-md border border-input bg-background px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
        title="Hanya email dalam rentang ini yang diperiksa"
      >
        {LOOKBACKS.map((d) => (
          <option key={d} value={d}>
            {d} hari
          </option>
        ))}
      </select>
      <Button
        variant="outline"
        size="sm"
        onClick={run}
        disabled={busy || cooling}
        aria-label="Recheck email Jenius"
        title={cooling ? `Tunggu ${left} detik lagi sebelum recheck` : `Ambil email Jenius ${days} hari terakhir`}
      >
        <RefreshCw className={`mr-1.5 h-4 w-4 ${busy ? 'animate-spin' : ''}`} />
        {busy ? 'Recheck…' : cooling ? `Recheck (${left}s)` : 'Recheck email'}
      </Button>
    </div>
  );
}