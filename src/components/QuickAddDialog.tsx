import React, { useState, useEffect, useRef, useMemo } from 'react';
import { fetchCategories, fetchTransactions } from '../lib/api';
import type { Category, Transaction } from '../lib/data';
import { getActivePeriod, formatIdr } from '../lib/utils';
import { useCategorySuggestion } from '../hooks/useCategorySuggestion';
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
import { Plus, Loader2, Sparkles, X, RotateCcw, StickyNote, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

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
  const [notes, setNotes] = useState('');
  const [type, setType] = useState<'cash' | 'credit_expense' | 'credit_payment'>('credit_expense');
  const [done, setDone] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showNotes, setShowNotes] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'duplicate'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [showForceBtn, setShowForceBtn] = useState(false);
  const [recentTxs, setRecentTxs] = useState<Transaction[]>([]);
  const [repeatLoading, setRepeatLoading] = useState<string | null>(null);

  // Track whether the user has manually edited the category field.
  // While true, auto-suggest will NOT override the user's input.
  const [categoryUserTouched, setCategoryUserTouched] = useState(false);

  const titleRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  // Smart category suggestion — debounced fetch based on title
  const { suggestedCategory, confidence, isLoading: suggestionLoading, isAutoFilled } =
    useCategorySuggestion(title);

  // Auto-fill category when suggestion arrives and user hasn't manually typed one
  useEffect(() => {
    if (!categoryUserTouched && suggestedCategory && suggestedCategory !== category) {
      setCategory(suggestedCategory);
    }
    // If suggestion becomes null (e.g. user cleared title) and user hasn't touched, clear category too
    if (!categoryUserTouched && !suggestedCategory && category && !title.trim()) {
      setCategory('');
    }
  }, [suggestedCategory, categoryUserTouched, category, title]);

  useEffect(() => {
    if (open) {
      fetchCategories().then(setCategories).catch(() => {});
      // Fetch recent transactions for Quick Repeat
      fetchTransactions().then((txs) => {
        // Deduplicate by title+amount, take 5 most recent unique
        const seen = new Map<string, Transaction>();
        for (const tx of txs) {
          const key = `${tx.title.toLowerCase()}|${tx.amount}`;
          if (!seen.has(key)) {
            seen.set(key, tx);
          }
        }
        setRecentTxs(txs.slice(0, 5));
      }).catch(() => {});
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
    setNotes('');
    setType('credit_expense');
    setDone(true);
    setStatus('idle');
    setErrorMsg('');
    setShowForceBtn(false);
    setCategoryUserTouched(false);
    setShowNotes(false);
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
      notes: notes.trim() || undefined,
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
        toast.success('Transaction added');
        if (onAdded) onAdded();
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

  // Quick Repeat: one-click add of a recent transaction
  const quickRepeat = async (tx: Transaction) => {
    setRepeatLoading(tx.id.toString());
    const monthName = `${defaultMonth} ${defaultYear}`;
    const monthIdx = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ].indexOf(defaultMonth) + 1;
    const date = `${defaultYear}-${String(monthIdx).padStart(2, '0')}-21`;
    const payload = {
      month: monthName,
      date,
      title: tx.title,
      category: tx.category,
      amount: tx.amount,
      currency: 'IDR',
      type: tx.type,
      payment_method: tx.payment_method,
      done: true,
      created_time: new Date().toISOString(),
      force: true, // allow repeat even if similar exists
    };
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success(`${tx.title} — ${formatIdr(tx.amount)} added`);
        onAdded?.();
        onOpenChange(false);
      } else {
        toast.error('Failed to add transaction');
      }
    } catch {
      toast.error('Connection failed');
    } finally {
      setRepeatLoading(null);
    }
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

        {/* Quick Repeat — Recent Transactions */}
        {recentTxs.length > 0 && (
          <div className="space-y-2 mb-1">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 dark:text-white/30 uppercase tracking-wider">
              <RotateCcw className="w-3 h-3" />
              Quick Repeat
            </div>
            <div className="flex flex-wrap gap-1.5">
              {recentTxs.map((tx) => (
                <button
                  key={tx.id}
                  type="button"
                  disabled={repeatLoading === tx.id.toString()}
                  onClick={() => quickRepeat(tx)}
                  className="group inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.08] hover:border-slate-300 dark:hover:border-white/[0.1] text-slate-700 dark:text-white/70 disabled:opacity-50"
                >
                  <span className="truncate max-w-[120px]">{tx.title}</span>
                  <span className="text-slate-400 dark:text-white/30 text-[11px]">{formatIdr(tx.amount)}</span>
                  {repeatLoading === tx.id.toString() ? (
                    <Loader2 className="w-3 h-3 animate-spin text-mint-500" />
                  ) : (
                    <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100 text-mint-500 transition-opacity" />
                  )}
                </button>
              ))}
            </div>
            <div className="h-px bg-slate-200 dark:bg-white/[0.06]"></div>
          </div>
        )}

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
            <div className="flex items-center justify-between">
              <Label htmlFor="qa-category">Category</Label>
              {isAutoFilled && !categoryUserTouched && suggestedCategory && (
                <button
                  type="button"
                  onClick={() => {
                    setCategory('');
                    setCategoryUserTouched(true);
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-mint-500 dark:text-mint-400 hover:text-mint-600 dark:hover:text-mint-300 transition"
                  title="Suggested based on your history — click to clear"
                >
                  <Sparkles className="w-3 h-3" />
                  Auto: {suggestedCategory}
                  <span className="opacity-60">({Math.round(confidence * 100)}%)</span>
                  <X className="w-3 h-3 ml-0.5" />
                </button>
              )}
              {suggestionLoading && (
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Matching…
                </span>
              )}
            </div>
            <Input
              id="qa-category"
              type="text"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setCategoryUserTouched(true);
              }}
              placeholder={isAutoFilled && !categoryUserTouched ? 'Auto-suggested' : 'Auto from title or pick existing'}
              list="qa-category-list"
              autoComplete="off"
              className={isAutoFilled && !categoryUserTouched ? 'border-mint-400/30 dark:border-mint-500/20 bg-mint-500/5/40 dark:bg-mint-500/10/20' : ''}
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

          {/* Notes — collapsible to keep dialog compact */}
          <div>
            {!showNotes ? (
              <button
                type="button"
                onClick={() => setShowNotes(true)}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 dark:text-white/30 hover:text-slate-600 dark:hover:text-white/50 transition-colors"
              >
                <StickyNote className="w-3.5 h-3.5" />
                Add note
              </button>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="qa-notes" className="text-xs text-slate-500 dark:text-white/40">
                    Notes (optional)
                  </Label>
                  <button
                    type="button"
                    onClick={() => { setShowNotes(false); setNotes(''); }}
                    className="text-[11px] text-slate-400 dark:text-white/20 hover:text-slate-600 dark:hover:text-white/40 transition-colors"
                  >
                    Remove
                  </button>
                </div>
                <textarea
                  id="qa-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. lunch with Budi, installment 3/12..."
                  rows={2}
                  className="w-full rounded-lg border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] px-3 py-2 text-sm text-slate-900 dark:text-white/80 placeholder:text-slate-400 dark:placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-mint-500/40 focus:border-mint-500/40 resize-none transition-colors"
                />
              </div>
            )}
          </div>

          {/* Status messages */}
          {status === 'error' && (
            <Badge variant="outline" className="w-full justify-start px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800">
              {errorMsg}
            </Badge>
          )}
          {status === 'duplicate' && (
            <Badge variant="outline" className="w-full justify-start px-3 py-2 rounded-lg bg-gold-500/5 dark:bg-gold-700/20 text-gold-700 dark:text-gold-300 border-gold-400/20 dark:border-gold-700/40">
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
