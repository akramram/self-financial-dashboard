import React, { useEffect, useRef } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTransactionForm } from '../hooks/useTransactionForm';
import TransactionFormFields from './TransactionFormFields';

interface QuickAddTransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SUCCESS_CLOSE_MS = 800;

/**
 * Dashboard quick-add modal (KUR-17). Mobile (<md): full-width bottom sheet —
 * rounded top, max-h 90dvh, internal scroll, sticky submit footer. Desktop:
 * centered max-w-md dialog. Shares all logic with /add via useTransactionForm.
 */
export default function QuickAddTransactionModal({ open, onOpenChange }: QuickAddTransactionModalProps) {
  const ctrl = useTransactionForm({
    onSaved: () => {
      // Brief success state, then auto-close (brief: close ≤800ms).
      window.setTimeout(() => onOpenChange(false), SUCCESS_CLOSE_MS);
    },
  });

  // Fresh "now" + cleared content every time the modal opens; focus the
  // amount field once Radix has mounted the sheet content.
  const focusTimer = useRef<number | null>(null);
  useEffect(() => {
    if (open) {
      ctrl.resetContent();
      focusTimer.current = window.setTimeout(() => ctrl.titleRef.current?.focus(), 50);
    }
    return () => {
      if (focusTimer.current) window.clearTimeout(focusTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Reset transient status when the sheet closes so a reopen starts clean.
  useEffect(() => {
    if (!open && ctrl.status !== 'idle') {
      ctrl.resetContent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const busy = ctrl.status === 'loading';
  const success = ctrl.status === 'success';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className="
          max-w-md p-0 gap-0
          max-md:top-auto max-md:bottom-0 max-md:left-0 max-md:-translate-x-0 max-md:-translate-y-0
          max-md:w-full max-md:max-w-full max-md:rounded-b-none max-md:rounded-t-2xl
          max-md:max-h-[90dvh] max-md:flex max-md:flex-col max-md:overflow-hidden
          max-md:border-x-0 max-md:border-b-0
        "
      >
        <DialogHeader className="px-5 pt-5 pb-3 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg" style={{ background: 'linear-gradient(135deg, #34d399, #0ea5e9)' }}>
              <Plus className="w-4 h-4 text-slate-900" />
            </span>
            Add Transaction
          </DialogTitle>
          <DialogDescription className="sr-only">
            Quickly add a transaction without leaving the dashboard
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable body — sheet scrolls internally, page never does (Radix locks body) */}
        <div
          data-testid="quick-add-body"
          className="max-md:flex-1 max-md:overflow-y-auto max-md:min-h-0 px-5 pb-4"
        >
          <TransactionFormFields ctrl={ctrl} variant="sheet" formId="quick-add-tx-form" />
        </div>

        {/* Sticky footer with submit (mobile sheet requirement) */}
        <div className="max-md:shrink-0 border-t border-slate-200 dark:border-white/[0.06] bg-slate-100 dark:bg-navy-800 px-5 py-3">
          <Button
            type="submit"
            form="quick-add-tx-form"
            disabled={busy || success}
            className="w-full min-h-[44px] text-base"
          >
            {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {success ? 'Added ✓' : busy ? 'Adding…' : 'Add Transaction'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
