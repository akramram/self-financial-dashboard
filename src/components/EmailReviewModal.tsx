import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { animate } from 'animejs';
import { ChevronLeft, ChevronRight, Mail, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatIdr } from '../lib/utils';

/**
 * EmailReviewModal — gates Jenius email transactions before they reach the
 * transaction list.
 *
 * Mounted once in Layout.astro's client root. Queued emails are walked ONE card
 * at a time, pagination-style: Sebelumnya / Berikutnya buttons, arrow keys, or
 * swiping the card left/right (anime.js drives the slide-out / slide-in).
 *   Simpan            → POST action=approve (the ONLY write path into `transactions`)
 *   Tolak             → POST action=reject
 *   Berikutnya        → moves on WITHOUT resolving; the email stays pending
 *   Nanti             → closes the dialog; the floating mail button (with count) reopens it
 *
 * `items` is the unresolved queue, so navigating never mutates server state and
 * the badge count always equals what still needs a decision.
 */

interface PendingItem {
  id: number;
  subject: string;
  tx_date: string;
  tx_time: string;
  merchant: string;
  amount: number;
  card_last4: string;
  suggested_category: string | null;
}

const DEFAULT_PAYMENT = 'Credit';
const SWIPE_THRESHOLD = 70;

export default function EmailReviewModal() {
  const [items, setItems] = useState<PendingItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState({
    title: '',
    category: '',
    amount: '',
    date: '',
    time: '',
    payment_method: DEFAULT_PAYMENT,
  });

  const cardRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ active: boolean; x: number; dx: number }>({ active: false, x: 0, dx: 0 });

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/pending-email', { headers: { accept: 'application/json' } });
      if (!res.ok) return; // not logged in / viewer → stay silent
      const data = await res.json();
      const list: PendingItem[] = (data.items || []).filter(
        (it: PendingItem & { status?: string }) => !it.status || it.status === 'pending'
      );
      setCategories(data.categories || []);
      setItems(list);
      setIndex(0);
      setOpen(list.length > 0);
    } catch {
      /* offline — try again next open */
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // "Recheck email" buttons on the dashboard / transactions pages broadcast this
  // so the queue re-reads without a full page reload.
  useEffect(() => {
    const onRefresh = () => load();
    window.addEventListener('email-review-refresh', onRefresh);
    return () => window.removeEventListener('email-review-refresh', onRefresh);
  }, [load]);

  const current = items[index];

  useEffect(() => {
    if (!current) return;
    setForm({
      title: current.merchant || 'Transaksi Kartu Kredit Jenius',
      category: current.suggested_category || 'Others',
      amount: String(current.amount),
      date: current.tx_date,
      time: (current.tx_time || '00:00:00').slice(0, 5),
      payment_method: DEFAULT_PAYMENT,
    });
  }, [current]);

  /**
   * Page to another card. The index switch is synchronous — the anime.js slide
   * is cosmetic only, so a tab where requestAnimationFrame is throttled (hidden
   * tab, reduced motion) still navigates instead of stalling mid-animation.
   */
  const navigate = useCallback(
    (dir: -1 | 1) => {
      const target = index + dir;
      const inRange = target >= 0 && target < items.length;
      if (!inRange) {
        // edge of the queue → rubber-band the current card back into place
        requestAnimationFrame(() => {
          const el = cardRef.current;
          if (el) animate(el, { x: 0, opacity: 1, duration: 220, ease: 'outQuad' });
        });
        return;
      }
      setIndex(target);
      requestAnimationFrame(() => {
        const el = cardRef.current;
        if (!el) return;
        el.style.transform = `translateX(${dir * 160}px)`;
        el.style.opacity = '0';
        animate(el, { x: 0, opacity: 1, duration: 260, ease: 'outQuad' });
      });
    },
    [index, items.length]
  );

  /** Drop a resolved row from the local queue; close (and refresh) when empty. */
  const resolve = useCallback((id: number, refresh: boolean) => {
    requestAnimationFrame(() => {
      const el = cardRef.current;
      if (el) animate(el, { y: -36, opacity: 0, duration: 150, ease: 'inQuad' });
    });
    setItems((prev) => {
      const next = prev.filter((it) => it.id !== id);
      setIndex((i) => Math.min(i, Math.max(next.length - 1, 0)));
      if (next.length === 0) setOpen(false);
      return next;
    });
    if (refresh) window.location.reload(); // dashboard numbers changed
  }, []);

  const submit = async (action: 'approve' | 'reject') => {
    if (!current) return;
    setBusy(true);
    try {
      const payload: Record<string, unknown> = { id: current.id, action };
      if (action === 'approve') {
        const amount = Number(form.amount);
        if (!Number.isFinite(amount) || amount <= 0) {
          toast.error('Nominal tidak valid');
          return;
        }
        payload.edits = {
          title: form.title.trim(),
          category: form.category.trim() || 'Others',
          amount,
          date: form.date,
          time: (form.time || '00:00').slice(0, 5),
          payment_method: form.payment_method.trim() || DEFAULT_PAYMENT,
        };
      }
      const res = await fetch('/api/pending-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Gagal menyimpan');
        return;
      }
      toast.success(action === 'approve' ? 'Transaksi disimpan' : 'Email ditolak');
      resolve(current.id, action === 'approve' && items.length === 1);
    } catch (e: any) {
      toast.error(e?.message || 'Gagal menyimpan');
    } finally {
      setBusy(false);
    }
  };

  /** Manual sync: run the IMAP fetcher now, then reload the queue. */
  const syncEmail = useCallback(async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/pending-email-sync', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        toast.error(data.error || 'Sync gagal');
        return;
      }
      const fresh = await fetch('/api/pending-email', { headers: { accept: 'application/json' } });
      const payload = fresh.ok ? await fresh.json() : { items: [], categories: [] };
      const list: PendingItem[] = payload.items || [];
      setCategories(payload.categories || []);
      setItems(list);
      setIndex(0);
      toast.success(`Sync selesai · ${list.length} transaksi menunggu konfirmasi`);
    } catch (e: any) {
      toast.error(e?.message || 'Sync gagal');
    } finally {
      setSyncing(false);
    }
  }, []);

  // ── swipe: pointer drag on the card; anime.js snaps back or commits ──
  const onPointerDown = (e: React.PointerEvent) => {
    if (busy) return;
    dragRef.current = { active: true, x: e.clientX, dx: 0 };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    const el = cardRef.current;
    if (!drag.active || !el) return;
    drag.dx = e.clientX - drag.x;
    el.style.transform = `translateX(${drag.dx}px)`;
    el.style.opacity = String(1 - Math.min(Math.abs(drag.dx) / 500, 0.45));
  };

  const endDrag = () => {
    const drag = dragRef.current;
    const el = cardRef.current;
    if (!drag.active) return;
    drag.active = false;
    if (!el) return;
    if (Math.abs(drag.dx) >= SWIPE_THRESHOLD) {
      navigate(drag.dx < 0 ? 1 : -1); // swipe left → next, swipe right → prev
    } else {
      animate(el, { x: 0, opacity: 1, duration: 200, ease: 'outQuad' });
    }
    drag.dx = 0;
  };

  // arrow keys page through the queue (ignored while typing in a field)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); navigate(-1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); navigate(1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, navigate]);

  const categoryOptions = useMemo(
    () => [...new Set([form.category, 'Others', ...categories].filter(Boolean))],
    [form.category, categories]
  );

  // Floating entry point — always available once the queue is known, so a manual
// sync is reachable even when nothing is pending. The badge only appears when
// there is something to decide.
  if (!open) {
    if (!loaded) return null;
    return (
      <button
        type="button"
        onClick={() => { setOpen(true); load(); }}
        className="fixed left-4 bottom-24 lg:bottom-6 z-40 flex items-center gap-2 rounded-full border border-border bg-background/95 px-4 py-3 text-sm font-medium shadow-lg backdrop-blur transition hover:bg-accent dark:border-white/10 dark:bg-navy-900/95 dark:hover:bg-white/10"
        aria-label={`Buka konfirmasi transaksi email (${items.length})`}
      >
        <Mail className="h-4 w-4" />
        <span className="hidden sm:inline">Konfirmasi</span>
        {items.length > 0 && (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
            {items.length}
          </span>
        )}
      </button>
    );
  }

  // Queue empty (all resolved, or nothing fetched yet) — keep the dialog usable
  // so the user can sync manually instead of waiting for the 5-minute job.
  if (!current) {
    return (
      <Dialog open={open} onOpenChange={(v) => { if (!v) setOpen(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Tidak ada transaksi menunggu</DialogTitle>
            <DialogDescription className="text-xs">
              Email Jenius dipindai otomatis tiap 5 menit. Pakai tombol di bawah untuk memindai sekarang.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={syncing}>
              Tutup
            </Button>
            <Button size="sm" onClick={syncEmail} disabled={syncing}>
              <RefreshCw className={`mr-1 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Sync…' : 'Sync email'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setOpen(false); }}>
      <DialogContent className="max-w-md overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Konfirmasi Transaksi
            <Badge variant="secondary" className="text-[10px] font-normal">
              {index + 1} / {items.length}
            </Badge>
          </DialogTitle>
          <DialogDescription className="text-xs">
            {current.subject}
            {current.card_last4 ? ` · kartu •••• ${current.card_last4}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div
          ref={cardRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="grid touch-pan-y gap-3 py-2 select-none"
        >
          <div className="grid gap-1.5">
            <Label htmlFor="er-title" className="text-xs text-muted-foreground">Nama</Label>
            <Input
              id="er-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Nama merchant"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="er-category" className="text-xs text-muted-foreground">Kategori</Label>
              <select
                id="er-category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {categoryOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="er-amount" className="text-xs text-muted-foreground">Harga</Label>
              <Input
                id="er-amount"
                type="text"
                inputMode="decimal"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="er-date" className="text-xs text-muted-foreground">Tanggal</Label>
              <Input
                id="er-date"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="er-time" className="text-xs text-muted-foreground">Jam</Label>
              <Input
                id="er-time"
                type="time"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="er-pm" className="text-xs text-muted-foreground">Metode</Label>
              <Input
                id="er-pm"
                value={form.payment_method}
                onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
              />
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Nominal email: {formatIdr(current.amount)} · masuk sebagai{' '}
            <span className="font-medium">credit expense</span> (lunas)
          </p>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border pt-2 dark:border-white/10">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            disabled={busy || index === 0}
            aria-label="Transaksi sebelumnya"
          >
            <ChevronLeft className="mr-1 h-4 w-4" /> Sebelumnya
          </Button>
          <span className="text-[11px] text-muted-foreground">geser kartu ← →</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(1)}
            disabled={busy || index >= items.length - 1}
            aria-label="Transaksi berikutnya (tetap pending)"
          >
            Berikutnya <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={busy || syncing}>
              Nanti
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={syncEmail}
              disabled={busy || syncing}
              aria-label="Sync email sekarang"
              title="Ambil email Jenius sekarang (tanpa menunggu jadwal 5 menit)"
            >
              <RefreshCw className={`mr-1 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Sync…' : 'Sync email'}
            </Button>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => submit('reject')} disabled={busy}>
              Tolak
            </Button>
            <Button size="sm" onClick={() => submit('approve')} disabled={busy}>
              {busy ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}