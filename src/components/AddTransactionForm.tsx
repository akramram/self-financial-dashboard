import React, { useState, useRef, useEffect } from 'react';
import { createTransaction, fetchCategories } from '../lib/api';
import type { Category } from '../lib/data';
import { getActivePeriod } from '../lib/utils';
import { useCategorySuggestion } from '../hooks/useCategorySuggestion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Sparkles, X, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const MONTH_OPTIONS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const TYPE_OPTIONS = [
  { value: 'cash', label: 'Cash Expense' },
  { value: 'credit_expense', label: 'Credit Expense' },
  { value: 'credit_payment', label: 'Credit Payment' },
];

export default function AddTransactionForm() {
  const { month: defaultMonth, year: defaultYear } = getActivePeriod();
  const [month, setMonth] = useState(defaultMonth);
  const [year, setYear] = useState(defaultYear);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'cash' | 'credit_expense' | 'credit_payment'>('credit_expense');
  const [done, setDone] = useState(true);
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryUserTouched, setCategoryUserTouched] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  // Smart category suggestion — debounced fetch based on title
  const { suggestedCategory, confidence, isLoading: suggestionLoading, isAutoFilled } =
    useCategorySuggestion(title);

  // Auto-fill category when suggestion arrives and user hasn't manually typed one
  useEffect(() => {
    if (!categoryUserTouched && suggestedCategory && suggestedCategory !== category) {
      setCategory(suggestedCategory);
    }
    if (!categoryUserTouched && !suggestedCategory && category && !title.trim()) {
      setCategory('');
    }
  }, [suggestedCategory, categoryUserTouched, category, title]);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {});
  }, []);

  const buildPayload = () => {
    const monthName = `${month} ${year}`;
    const monthIdx = MONTH_OPTIONS.indexOf(month) + 1;
    const date = `${year}-${String(monthIdx).padStart(2, '0')}-21`;
    return {
      month: monthName,
      date,
      title,
      category: category || title.split(' ')[0],
      amount: Number(amount),
      currency: 'IDR',
      type,
      payment_method: type === 'cash' ? 'Cash' : 'Credit',
      done,
      notes: notes.trim() || undefined,
      created_time: new Date().toISOString(),
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount) {
      setMessage('Title and amount are required.');
      return;
    }
    const payload = buildPayload();
    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.status === 409) {
      setShowDuplicateDialog(true);
      return;
    }
    if (!res.ok) {
      setMessage('Failed to add transaction.');
      return;
    }
    setMessage('Transaction added successfully!');
    setTitle('');
    setCategory('');
    setAmount('');
    setNotes('');
    setTimeout(() => setMessage(''), 3000);
    titleRef.current?.focus();
  };

  const confirmDuplicate = async () => {
    const payload = buildPayload();
    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, force: true }),
    });
    setShowDuplicateDialog(false);
    if (res.ok) {
      setMessage('Transaction added successfully!');
      setTitle('');
      setCategory('');
      setAmount('');
      setNotes('');
      setTimeout(() => setMessage(''), 3000);
      titleRef.current?.focus();
    } else {
      setMessage('Failed to add transaction.');
    }
  };

  return (
    <div className="glass-card p-5">
      
        <h3 className="text-white/80">Add Transaction</h3>
      
      
        <form onSubmit={handleSubmit} className="space-y-4">
          {message && (
            <Badge variant="outline" className="w-full justify-start px-3 py-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800">
              {message}
            </Badge>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Month</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_OPTIONS.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Year</Label>
              <Input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 🏠 Kontrakan"
              ref={titleRef}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Category</Label>
              {isAutoFilled && !categoryUserTouched && suggestedCategory && (
                <button
                  type="button"
                  onClick={() => {
                    setCategory('');
                    setCategoryUserTouched(true);
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition"
                  title="Suggested based on your history — click to clear"
                >
                  <Sparkles className="w-3 h-3" />
                  Auto: {suggestedCategory}
                  <span className="opacity-60">({Math.round(confidence * 100)}%)</span>
                  <X className="w-3 h-3 ml-0.5" />
                </button>
              )}
              {suggestionLoading && (
                <span className="inline-flex items-center gap-1 text-[11px] text-white/40">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Matching…
                </span>
              )}
            </div>
            <Input
              type="text"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setCategoryUserTouched(true);
              }}
              placeholder={isAutoFilled && !categoryUserTouched ? 'Auto-suggested' : 'e.g. 🏠 Kontrakan'}
              list="category-list"
              className={isAutoFilled && !categoryUserTouched ? 'border-violet-300 dark:border-violet-700 bg-violet-50/40 dark:bg-violet-950/20' : ''}
            />
            <datalist id="category-list">
              {categories.map((c) => (
                <option key={c.id} value={c.name} />
              ))}
            </datalist>
            <p className="text-xs text-white/50">
              {isAutoFilled && !categoryUserTouched
                ? 'Category auto-suggested from your history — override anytime'
                : 'Pick an existing category or type a new one'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Amount (IDR)</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="1000000"
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

          <div className="flex items-center gap-2">
            <Checkbox
              id="done"
              checked={done}
              onCheckedChange={(v) => setDone(!!v)}
            />
            <Label htmlFor="done" className="text-sm text-white/60">Paid / Done</Label>
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="flex min-h-[48px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
              placeholder="Optional notes about this transaction..."
            />
          </div>

          <Button type="submit" className="w-full">
            Add Transaction
          </Button>
        </form>
      

      <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Possible Duplicate</DialogTitle>
            <DialogDescription>
              A similar transaction was added within the last 24 hours. Are you sure you want to add it again?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowDuplicateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmDuplicate}>
              Add Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
