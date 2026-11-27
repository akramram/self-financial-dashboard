import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Mail } from 'lucide-react';
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
 * Mounted once in Layout.astro's client root. On mount it asks
 * /api/pending-email; queued emails are shown ONE card at a time with every
 * field editable (name, category, amount, date, time, payment method).
 *   Simpan  → POST action=approve (the ONLY path that writes to `transactions`)
 *   Tolak   → POST action=reject
 *   Lewati  → next card, the email STAYS pending for later
 *   Nanti   → closes the dialog; the floating mail button (with count) reopens it
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

export default function EmailReviewModal() {
  const [items, setItems] = useState<PendingItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [skipped, setSkipped] = useState<number[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState({
    title: '',
    category: '',
    amount: '',
    date: '',
    time: '',
    payment_method: DEFAULT_PAYMENT,
  });

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/pending-email', { headers: { accept: 'application/json' } });
      if (!res.ok) return; // not logged in / viewer → stay silent
      const data = await res.json();
      const list: PendingItem[] = data.items || [];
      setCategories(data.categories || []);
      setItems(list);
      setIndex(0);
      setSkipped([]);
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

  const current = items[index];
  const remaining = items.length - skipped.length;

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

  /** Advance to the next card that has not been skipped; close when none is left. */
  const advance = useCallback(
    (skipId?: number) => {
      const nextSkipped = skipId ? [...skipped, skipId] : skipped;
      if (skipId) setSkipped(nextSkipped);
      let i = index + 1;
      while (i < items.length && nextSkipped.includes(items[i].id)) i++;
      if (i >= items.length) {
        setIndex(0);
        setOpen(false);
        return;
      }
      setIndex(i);
    },
    [index, items, skipped]
  );

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
          time: form.time || '00:00:00',
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
      const wasLast = index + 1 >= items.length;
      advance();
      if (wasLast && action === 'approve') window.location.reload(); // refresh dashboard numbers
    } catch (e: any) {
      toast.error(e?.message || 'Gagal menyimpan');
    } finally {
      setBusy(false);
    }
  };

  const categoryOptions = useMemo(
    () => [...new Set([form.category, 'Others', ...categories].filter(Boolean))],
    [form.category, categories]
  );

  // Floating reopen button — shown whenever the dialog is dismissed but the
  // queue still holds unresolved emails (Lewati / Nanti).
  if (!open) {
    if (!loaded || remaining <= 0) return null;
    return (
      <button
        type="button"
        onClick={() => {
          const first = items.findIndex((it) => !skipped.includes(it.id));
          setIndex(first < 0 ? 0 : first);
          setOpen(true);
        }}
        className="fixed left-4 bottom-24 lg:bottom-6 z-40 flex items-center gap-2 rounded-full border border-border bg-background/95 px-4 py-3 text-sm font-medium shadow-lg backdrop-blur transition hover:bg-accent dark:border-white/10 dark:bg-navy-900/95 dark:hover:bg-white/10"
        aria-label={`Buka konfirmasi transaksi email (${remaining})`}
      >
        <Mail className="h-4 w-4" />
        <span className="hidden sm:inline">Konfirmasi</span>
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
          {remaining}
        </span>
      </button>
    );
  }

  if (!current) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setOpen(false); }}>
      <DialogContent className="max-w-md">
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

        <div className="grid gap-3 py-2">
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
                type="number"
                inputMode="numeric"
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

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={busy}>
            Nanti
          </Button>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => advance(current.id)} disabled={busy}>
              Lewati
            </Button>
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