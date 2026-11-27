import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
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
 * /api/pending-email; any queued email is shown ONE card at a time with every
 * field editable. Only "Simpan" writes to `transactions`
 * (POST /api/pending-email action=approve → approvePendingEmailTx).
 * "Tolak" marks it rejected and skips. Closing with "Nanti" leaves the queue
 * intact so it reappears the next time the app opens.
 */

interface PendingItem {
  id: number;
  subject: string;
  tx_date: string;
  merchant: string;
  amount: number;
  card_last4: string;
  suggested_category: string | null;
}

export default function EmailReviewModal() {
  const [items, setItems] = useState<PendingItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ title: '', category: '', amount: '', date: '', payment_method: 'Jenius CC' });

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/pending-email', { headers: { accept: 'application/json' } });
      if (!res.ok) return; // not logged in / viewer → stay silent
      const data = await res.json();
      const list: PendingItem[] = data.items || [];
      setCategories(data.categories || []);
      setItems(list);
      setIndex(0);
      setOpen(list.length > 0);
    } catch {
      /* offline — try again next open */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const current = items[index];

  useEffect(() => {
    if (!current) return;
    setForm({
      title: current.merchant || 'Transaksi Kartu Kredit Jenius',
      category: current.suggested_category || 'Others',
      amount: String(current.amount),
      date: current.tx_date,
      payment_method: 'Jenius CC',
    });
  }, [current]);

  const next = (approved: boolean) => {
    const remaining = items.length - index - 1;
    setIndex((i) => i + 1);
    if (remaining <= 0) {
      setOpen(false);
      setItems([]);
      if (approved) window.location.reload(); // refresh dashboard numbers once
    }
  };

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
          payment_method: form.payment_method.trim() || 'Jenius CC',
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
      next(action === 'approve');
    } catch (e: any) {
      toast.error(e?.message || 'Gagal menyimpan');
    } finally {
      setBusy(false);
    }
  };

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
                {[...new Set([form.category, 'Other', ...categories].filter(Boolean))].map((c) => (
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

          <div className="grid grid-cols-2 gap-3">
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
              <Label htmlFor="er-pm" className="text-xs text-muted-foreground">Metode</Label>
              <Input
                id="er-pm"
                value={form.payment_method}
                onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
              />
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Nominal email: {formatIdr(current.amount)} · masuk sebagai <span className="font-medium">credit expense</span> (lunas)
          </p>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={busy}>
            Nanti
          </Button>
          <div className="flex gap-2">
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