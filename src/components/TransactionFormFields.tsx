import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { History, X, Loader2 } from 'lucide-react';
import DateTimePicker from '@/components/ui/datetime-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  TX_TYPE_OPTIONS,
  type TransactionFormController,
} from '../hooks/useTransactionForm';

interface TransactionFormFieldsProps {
  ctrl: TransactionFormController;
  /**
   * 'sheet' — inside the dashboard bottom-sheet modal: 44px tap targets,
   * 16px inputs (iOS anti-zoom), no submit button (modal owns the footer).
   * 'page'  — classic /add page layout and sizing (unchanged behavior).
   */
  variant: 'sheet' | 'page';
  /** id for the <form> element — lets an external submit button target it. */
  formId?: string;
}

/**
 * Presentational fields for the add-transaction form, driven entirely by
 * `useTransactionForm` state. Shared by the dashboard quick-add modal and the
 * /add page so both stay behaviorally identical (KUR-17).
 */
export default function TransactionFormFields({ ctrl, variant, formId }: TransactionFormFieldsProps) {
  const {
    txDate, txTime, handleDateChange, handleTimeChange,
    title, setTitle,
    category, setCategory, categoryUserTouched, setCategoryUserTouched,
    amount, setAmount, parsedAmount, previewAmount,
    type, setType, done, setDone, notes, setNotes,
    isJustNow, categories,
    suggestedCategory, confidence, suggestionLoading, isAutoFilled,
    status, errorMsg, showDuplicateDialog, setShowDuplicateDialog,
    titleRef,
  } = ctrl;

  const compact = variant === 'page';

  return (
    <form
      id={formId}
      onSubmit={(e) => {
        e.preventDefault();
        ctrl.submitTransaction();
      }}
      noValidate
      className="space-y-4"
    >
      {status === 'success' && (
        <Badge variant="outline" className="w-full justify-start px-3 py-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800">
          Transaction added
        </Badge>
      )}
      {status === 'error' && errorMsg && (
        <Badge variant="outline" className="w-full justify-start px-3 py-2 rounded-lg bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800">
          {errorMsg}
        </Badge>
      )}

      {/* Type — first field (KUR-213 A7): mental flow is "what kind" before "how much" */}
      <div className="space-y-1.5">
        <Label>Type</Label>
        <Select value={type} onValueChange={(v) => setType(v as TransactionFormController['type'])}>
          <SelectTrigger className={compact ? undefined : 'min-h-[44px]'}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TX_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Amount — quick-parse syntax (1.5jt / 25k). Month/Year removed (KUR-213 A6):
          redundant — Date & Time drives the period via the hook's auto-snap. */}
      <div className="space-y-1.5">
        <Label htmlFor={`tx-amount-${variant}`}>Amount (IDR)</Label>
        <Input
          id={`tx-amount-${variant}`}
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={compact ? '1000000' : '0 · coba 1.5jt / 25k'}
          /* titleRef is the hook's focus handle: Title on the /add page
             (legacy behavior), Amount-first on the sheet variant. */
          ref={compact ? undefined : titleRef}
          className={compact ? '' : 'h-11 min-h-[44px] text-base'}
          autoFocus={!compact}
        />
        {!compact && parsedAmount != null && (
          <p data-testid="amount-preview" className="text-xs font-medium text-mint-600 dark:text-mint-400">
            Rp{previewAmount}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label>Date &amp; Time</Label>
          {isJustNow && (
            <Badge
              variant="outline"
              data-testid="just-now-chip"
              className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-white/60 border-slate-200 dark:border-white/[0.08] text-[11px]"
            >
              ⏱ Just now
            </Badge>
          )}
        </div>
        <DateTimePicker
          date={txDate}
          time={txTime}
          onChange={(d, t) => { handleDateChange(d); handleTimeChange(t); }}
          className={compact ? undefined : 'h-10 min-h-[44px]'}
        />
        <p className="text-xs text-slate-600 dark:text-white/50">
          Tanggal transaksi sebenarnya, ubah kalau input untuk hari sebelumnya. Period menyesuaikan otomatis.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`tx-title-${variant}`}>Title</Label>
        <Input
          id={`tx-title-${variant}`}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. 🏠 Kontrakan"
          ref={compact ? titleRef : undefined}
          className={compact ? undefined : 'h-11 min-h-[44px] text-base'}
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
              className="inline-flex items-center gap-1 text-[11px] font-medium text-mint-500 dark:text-mint-400 hover:text-mint-600 dark:hover:text-mint-300 transition"
              title="Suggested based on your history: click to clear"
            >
              <History className="w-3 h-3" />
              Auto: {suggestedCategory}
              <span className="opacity-60">({Math.round(confidence * 100)}%)</span>
              <X className="w-3 h-3 ml-0.5" />
            </button>
          )}
          {suggestionLoading && (
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-white/40">
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
          placeholder={isAutoFilled && !categoryUserTouched ? 'Auto-suggested' : 'pilih / ketik kategori'}
          list="category-list"
          className={[
            compact ? '' : 'h-11 min-h-[44px] text-base',
            isAutoFilled && !categoryUserTouched ? 'border-mint-400/40 dark:border-mint-500/30 bg-mint-500/10 dark:bg-mint-950/40 text-slate-900 dark:text-mint-200' : '',
          ].join(' ')}
        />
        <datalist id="category-list">
          {categories.map((c) => (
            <option key={c.id} value={c.name} />
          ))}
        </datalist>
        <p className="text-xs text-slate-600 dark:text-white/50">
          {isAutoFilled && !categoryUserTouched
            ? 'Category auto-suggested from your history, override anytime'
            : 'Pick an existing category or type a new one'}
        </p>
      </div>

      {/* Paid/Done — whole row is the tap target (KUR-213 A2, ≥44px) */}
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        onClick={() => setDone(!done)}
        data-testid="tx-done-row"
        className={`w-full flex items-center gap-3 rounded-lg text-left transition-colors hover:bg-slate-100 dark:hover:bg-white/[0.04] ${compact ? 'py-1' : 'min-h-[44px] py-2'}`}
      >
        <Checkbox
          id={`tx-done-${variant}`}
          checked={done}
          onCheckedChange={(v) => setDone(!!v)}
          onClick={(e) => e.stopPropagation()}
          tabIndex={-1}
          aria-hidden="true"
        />
        <span className="text-sm text-slate-600 dark:text-white/60 select-none">Paid / Done</span>
      </button>

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

      {compact && (
        <Button type="submit" className="w-full">
          Add Transaction
        </Button>
      )}

      {/* Duplicate guard (409 from API) — works on /add page and inside the modal */}
      <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <DialogContent className="max-md:top-auto max-md:bottom-0 max-md:left-0 max-md:-translate-x-0 max-md:-translate-y-0 max-md:w-full max-md:max-w-full max-md:rounded-b-none max-md:rounded-t-2xl">
          <DialogHeader>
            <DialogTitle>Possible Duplicate</DialogTitle>
            <DialogDescription>
              A similar transaction was added within the last 24 hours. Are you sure you want to add it again?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setShowDuplicateDialog(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={ctrl.confirmDuplicate}>
              Add Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
