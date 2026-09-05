import React from 'react';
import type { Transaction } from '../lib/data';
import { formatIdr } from '../lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wallet, CreditCard, Receipt, Pencil, Trash2, CheckCircle2, Circle } from 'lucide-react';

interface Props {
  open: boolean;
  transaction: Transaction | null;
  onClose: () => void;
  onToggleDone: (tx: Transaction) => void;
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
}

/**
 * Transaction detail sheet — bottom sheet on mobile (max-w-lg mx-auto, anchored
 * bottom), centered dialog on desktop. Row actions live here, not inline in the
 * feed table.
 * ponytail: no swipe-to-dismiss — Radix Dialog only; add sheet gestures if ever needed.
 */
export default function TransactionDetailSheet({ open, transaction, onClose, onToggleDone, onEdit, onDelete }: Props) {
  if (!transaction) return null;

  const d = transaction.created_time ? new Date(transaction.created_time) : new Date(transaction.date);
  const valid = !isNaN(d.getTime());
  const dateStr = valid
    ? d.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : transaction.date;
  const timeStr = valid ? d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '';

  const typeMeta = transaction.type === 'cash'
    ? { label: 'Cash', icon: Wallet, cls: 'text-mint-400' }
    : transaction.type === 'credit_payment'
      ? { label: 'Credit Payment', icon: Receipt, cls: 'text-gold-400' }
      : { label: 'Credit Expense', icon: CreditCard, cls: 'text-coral-400' };
  const TypeIcon = typeMeta.icon;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      {/* ponytail: bottom-sheet via positioning classes on DialogContent — no separate
          Sheet primitive needed until we want swipe gestures. */}
      <DialogContent
        className="max-w-lg w-full fixed left-1/2 bottom-0 -translate-x-1/2 translate-y-0 top-auto rounded-b-none sm:rounded-b-lg rounded-t-2xl border-t border-slate-300 dark:border-white/[0.08] bg-slate-100 dark:bg-navy-800 p-0 gap-0 overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        {/* drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-white/20" />
        </div>

        <DialogHeader className="px-6 pt-2 pb-4 text-left items-start">
          <div className="flex items-start justify-between w-full gap-3">
            <div className="min-w-0">
              <DialogTitle className="text-lg font-semibold leading-snug break-words text-slate-900 dark:text-white">
                {transaction.title}
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-500 dark:text-white/40">
                {transaction.month}
              </DialogDescription>
            </div>
            <span className={`shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold uppercase ${typeMeta.cls}`}>
              <TypeIcon className="w-4 h-4" strokeWidth={2} />
              {typeMeta.label}
            </span>
          </div>
        </DialogHeader>

        <div className="px-6 pb-2">
          <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {formatIdr(transaction.amount)}
          </p>
          <p className="text-xs text-slate-500 dark:text-white/40 mt-1">
            {transaction.currency}
          </p>
        </div>

        <div className="px-6 py-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500 dark:text-white/40">Category</span>
            <Badge variant="secondary">{transaction.category || '—'}</Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500 dark:text-white/40">Payment Method</span>
            <span className="font-medium text-slate-800 dark:text-white/80">{transaction.payment_method || '—'}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500 dark:text-white/40">Date</span>
            <span className="font-medium text-slate-800 dark:text-white/80 text-right">{dateStr}{timeStr ? ` · ${timeStr}` : ''}</span>
          </div>
          {transaction.notes ? (
            <div className="flex items-start justify-between text-sm gap-4">
              <span className="text-slate-500 dark:text-white/40 shrink-0">Notes</span>
              <span className="text-slate-800 dark:text-white/80 text-right break-words">{transaction.notes}</span>
            </div>
          ) : null}
        </div>

        <div className="px-6 pb-2">
          <button
            onClick={() => onToggleDone(transaction)}
            className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
              transaction.done
                ? 'bg-mint-500/10 text-mint-600 dark:text-mint-400 hover:bg-mint-500/15'
                : 'bg-slate-200/60 dark:bg-white/[0.05] text-slate-600 dark:text-white/60 hover:bg-slate-300/60 dark:hover:bg-white/[0.08]'
            }`}
          >
            {transaction.done ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
            {transaction.done ? 'Paid — tap to mark unpaid' : 'Unpaid — tap to mark paid'}
          </button>
        </div>

        <div className="px-6 pb-6 pt-2 grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            onClick={() => onEdit(transaction)}
            className="h-11 bg-slate-100 dark:bg-white/[0.05] border-slate-300 dark:border-white/[0.1] text-slate-700 dark:text-white/80 hover:bg-slate-200 dark:hover:bg-white/[0.1]"
          >
            <Pencil className="w-4 h-4 mr-2" /> Edit
          </Button>
          <Button
            variant="outline"
            onClick={() => onDelete(transaction)}
            className="h-11 bg-slate-100 dark:bg-white/[0.05] border-slate-300 dark:border-white/[0.1] text-red-400 hover:bg-red-500/10 hover:text-red-300"
          >
            <Trash2 className="w-4 h-4 mr-2" /> Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
