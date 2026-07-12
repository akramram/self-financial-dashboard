import React, { useState, useEffect, useRef } from 'react';
import { fetchCategories } from '../lib/api';
import type { Category } from '../lib/data';
import { getActivePeriod, formatIdr } from '../lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Loader2 } from 'lucide-react';

const TYPE_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'credit_expense', label: 'Credit Expense' },
  { value: 'credit_payment', label: 'Credit Payment' },
];

interface QuickAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded?: () => void;
}

export default function QuickAddDialog({ open, onOpenChange, onAdded }: QuickAddDialogProps) {
  const { month: defaultMonth, year: defaultYear } = getActivePeriod();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'cash' | 'credit_expense' | 'credit_payment'>('credit_expense');
  const [done, setDone] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'duplicate'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [showForceBtn, setShowForceBtn] = useState(false);

  const titleRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      fetchCategories().then(setCategories).catch(() => {});
      setStatus('idle');
      setErrorMsg('');
      setShowForceBtn(false);
      setTimeout(() => titleRef.current?.focus(), 100);
    }
  }, [open]);

  const resetForm = () => {
    setTitle('');
    setCategory('');
    setAmount('');
    setType('credit_expense');
    setDone(true);
    setStatus('idle');
    setErrorMsg('');
    setShowForceBtn(false);
  };

  const buildPayload = (force = false) => {
    const monthName = `${defaultMonth} ${defaultYear}`;
    const monthIdx = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ].indexOf(defaultMonth) + 1;
    const date = `${defaultYear}-${String(monthIdx).padStart(2, '0')}-21`;
    return {
      month: monthName,
      date,
      title: title.trim(),
      category: (category || title.split(' ')[0]).trim(),
      amount: Number(amount),
      currency: 'IDR',
      type,
      payment_method: type === 'cash' ? 'Cash' : 'Credit',
      done,
      created_time: new Date().toISOString(),
      ...(force ? { force: true } : {}),
    };
  };

  const submitTransaction = async (force = false) => {
    if (!title.trim() || !amount) {
      setErrorMsg('Judul dan jumlah wajib diisi.');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setErrorMsg('');

    const payload = buildPayload(force);
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.status === 409) {
        setStatus('duplicate');
        setShowForceBtn(true);
        return;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(err.error || 'Gagal menambahkan transaksi.');
        setStatus('error');
        return;
      }

      setStatus('success');
      setTimeout(() => {
        resetForm();
        onOpenChange(false);
        if (onAdded) onAdded();
        else window.location.reload();
      }, 600);
    } catch {
      setErrorMsg('Koneksi gagal. Coba lagi.');
      setStatus('error');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitTransaction(false);
  };

  const handleAmountKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitTransaction(false);
    }
  };

  const isAmountValid = amount && Number(amount) > 0;
  const previewAmount = isAmountValid ? formatIdr(Number(amount)) : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-emerald-600" />
            Quick Add Transaction
          </DialogTitle>
          <DialogDescription>
            Add a transaction to {defaultMonth} {defaultYear}. Press Enter in the amount field to submit.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title + Amount row */}
          <div className="space-y-1.5">
            <Label htmlFor="qa-title">Title <span className="text-red-500">*</span></Label>
            <Input
              id="qa-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Kopi Senja"
              ref={titleRef}
              autoComplete="off"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="qa-amount">Amount <span className="text-red-500">*</span></Label>
              <Input
                id="qa-amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onKeyDown={handleAmountKeyDown}
                placeholder="25000"
                ref={amountRef}
                className="text-right"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Category autocomplete */}
          <div className="space-y-1.5">
            <Label htmlFor="qa-category">Category</Label>
            <Input
              id="qa-category"
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Auto from title or pick existing"
              list="qa-category-list"
              autoComplete="off"
            />
            <datalist id="qa-category-list">
              {categories.map((c) => (
                <option key={c.id} value={c.name} />
              ))}
            </datalist>
          </div>

          {/* Paid checkbox */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="qa-done"
              checked={done}
              onCheckedChange={(v) => setDone(!!v)}
            />
            <Label htmlFor="qa-done" className="text-sm text-slate-600 dark:text-slate-300 cursor-pointer">
              Already paid
            </Label>
          </div>

          {/* Status messages */}
          {status === 'error' && (
            <Badge variant="outline" className="w-full justify-start px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800">
              {errorMsg}
            </Badge>
          )}
          {status === 'duplicate' && (
            <Badge variant="outline" className="w-full justify-start px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800">
              Possible duplicate detected — similar entry in last 24h.
            </Badge>
          )}
          {status === 'success' && (
            <Badge variant="outline" className="w-full justify-start px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
              {previewAmount || 'Transaction'} added successfully! Reloading…
            </Badge>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={status === 'loading'}
            >
              Cancel
            </Button>
            {showForceBtn ? (
              <Button
                type="button"
                onClick={() => submitTransaction(true)}
                disabled={status === 'loading'}
              >
                {status === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Anyway'}
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={status === 'loading' || !title.trim() || !isAmountValid}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {status === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : `Add ${previewAmount ? previewAmount : 'Transaction'}`}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
