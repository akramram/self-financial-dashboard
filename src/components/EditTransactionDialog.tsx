import React from 'react';
import type { Transaction } from '../lib/data';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

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
  categories = [],
}: Props) {
  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel(); }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Edit Transaction</DialogTitle>
          <DialogDescription>
            Modify transaction details below. Changes are saved immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="flex items-center gap-3">
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
              <Label htmlFor="edit-month" className="text-xs text-muted-foreground">Month</Label>
              <select
                id="edit-month"
                value={transaction.month ?? ''}
                onChange={(e) => onChange('month', e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="" disabled>Select month</option>
                {months.map((m) => (
                  <option key={m} value={m}>{m}</option>
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
            <Label htmlFor="edit-date" className="text-xs text-muted-foreground">Date</Label>
            <Input
              id="edit-date"
              type="date"
              value={transaction.created_time ? transaction.created_time.slice(0, 10) : ''}
              onChange={(e) => onChange('created_time', e.target.value ? e.target.value + 'T12:00:00.000Z' : (transaction.created_time ?? ''))}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-amount" className="text-xs text-muted-foreground">Amount</Label>
            <Input
              id="edit-amount"
              type="number"
              value={transaction.amount ?? 0}
              onChange={(e) => onChange('amount', Number(e.target.value))}
              className="text-right"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-type" className="text-xs text-muted-foreground">Type</Label>
            <select
              id="edit-type"
              value={transaction.type ?? 'cash'}
              onChange={(e) => onChange('type', e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button onClick={onSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
