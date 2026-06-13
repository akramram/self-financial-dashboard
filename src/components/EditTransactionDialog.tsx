import React from 'react';
import type { Transaction } from '../lib/data';
import { formatIdr } from '../lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

const TYPE_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'credit_expense', label: 'Credit Expense' },
  { value: 'credit_payment', label: 'Credit Payment' },
];

interface Props {
  open: boolean;
  transaction: Partial<Transaction> | null;
  onChange: (field: keyof Transaction, value: string | number | boolean) => void;
  onSave: () => void;
  onCancel: () => void;
  showMonth?: boolean;
  months?: string[];
  periods?: { period_id: number; month: string }[];
  categories?: string[];
}

export default function EditTransactionDialog({
  open,
  transaction,
  onChange,
  onSave,
  onCancel,
  showMonth = false,
  months = [],
  periods = [],
  categories = [],
}: Props) {
  if (!transaction) return null;

  // Build periods list from months if periods not provided (backward compat)
  const periodOptions = periods.length > 0
    ? periods
    : months.map((m, i) => ({ period_id: i, month: m }));

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel(); }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Edit Transaction</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="edit-done"
              checked={!!transaction.done}
              onCheckedChange={(v) => onChange('done', !!v)}
            />
            <Label htmlFor="edit-done" className="text-sm font-medium">
              {transaction.done ? 'Paid' : 'Unpaid'}
            </Label>
          </div>

          {showMonth && (
            <div className="grid gap-2">
              <Label htmlFor="edit-period" className="text-xs text-muted-foreground">Period</Label>
              <select
                id="edit-period"
                value={transaction.period_id ?? ''}
                onChange={(e) => onChange('period_id', parseInt(e.target.value))}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="" disabled>Select period</option>
                {periodOptions.map((p) => (
                  <option key={p.period_id} value={p.period_id}>{p.month}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="edit-title" className="text-xs text-muted-foreground">Title</Label>
            <Input
              id="edit-title"
              type="text"
              value={transaction.title ?? ''}
              onChange={(e) => onChange('title', e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-category" className="text-xs text-muted-foreground">Category</Label>
            <input
              id="edit-category"
              list="category-list"
              type="text"
              value={transaction.category ?? ''}
              onChange={(e) => onChange('category', e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <datalist id="category-list">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-amount" className="text-xs text-muted-foreground">Amount</Label>
            <Input
              id="edit-amount"
              type="number"
              value={transaction.amount ?? ''}
              onChange={(e) => onChange('amount', parseFloat(e.target.value) || 0)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-type" className="text-xs text-muted-foreground">Type</Label>
            <select
              id="edit-type"
              value={transaction.type ?? ''}
              onChange={(e) => onChange('type', e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-payment" className="text-xs text-muted-foreground">Payment Method</Label>
            <Input
              id="edit-payment"
              type="text"
              value={transaction.payment_method ?? ''}
              onChange={(e) => onChange('payment_method', e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-notes" className="text-xs text-muted-foreground">Notes</Label>
            <Input
              id="edit-notes"
              type="text"
              value={transaction.notes ?? ''}
              onChange={(e) => onChange('notes', e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={onSave}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
