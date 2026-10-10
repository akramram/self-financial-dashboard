import React, { useEffect, useRef, useState } from 'react';
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
/** Swipe-down distance (px) that counts as a dismiss gesture (KUR-213 A3). */
const SWIPE_DISMISS_PX = 120;

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

  // ── Swipe-down-to-dismiss (mobile sheet, KUR-213 A3) ─────────────
  // Drag from the handle/header area; the sheet follows the pointer 1:1 and
  // dismisses past SWIPE_DISMISS_PX, otherwise springs back. Touch-only:
  // desktop keeps the centered dialog + close button.
  const [dragY, setDragY] = useState(0);
  const dragStartY = useRef<number | null>(null);

  const onDragStart = (e: React.TouchEvent) => {
    if (window.innerWidth >= 768) return; // desktop: no sheet, no drag
    dragStartY.current = e.touches[0].clientY;
  };
  const onDragMove = (e: React.TouchEvent) => {
    if (dragStartY.current == null) return;
    const dy = e.touches[0].clientY - dragStartY.current;
    if (dy > 0) {
      setDragY(dy);
      if (dy >= SWIPE_DISMISS_PX) {
        dragStartY.current = null;
        setDragY(0);
        onOpenChange(false);
      }
    }
  };
  const onDragEnd = () => {
    dragStartY.current = null;
    setDragY(0);
  };

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
        {/* Drag handle — visual affordance (36×4 bar) + swipe surface (KUR-213 A3).
            touch-none: the gesture belongs to the sheet, not the browser. */}
        <div
          data-testid="sheet-drag-handle"
          onTouchStart={onDragStart}
          onTouchMove={onDragMove}
          onTouchEnd={onDragEnd}
          className="hidden max-md:flex max-md:shrink-0 max-md:touch-none flex justify-center pt-2 pb-1 cursor-grab active:cursor-grabbing"
        >
          <span aria-hidden="true" className="w-9 h-1 rounded-full bg-slate-300 dark:bg-white/20" />
        </div>
        <div
          style={dragY ? { transform: `translateY(${dragY}px)`, transition: 'none' } : undefined}
          className="max-md:flex max-md:flex-col max-md:min-h-0 max-md:flex-1"
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

        {/* Scrollable body — sheet scrolls internally, page never does (Radix locks body).
            pb-20 keeps the last field (Notes) clear of the sticky footer (KUR-213 A5). */}
        <div
          data-testid="quick-add-body"
          className="max-md:flex-1 max-md:overflow-y-auto max-md:min-h-0 px-5 pb-4 max-md:pb-20"
        >
          <TransactionFormFields ctrl={ctrl} variant="sheet" formId="quick-add-tx-form" />
        </div>

        {/* Sticky footer with submit (mobile sheet requirement); safe-area aware (KUR-213 A5) */}
        <div
          className="max-md:shrink-0 border-t border-slate-200 dark:border-white/[0.06] bg-slate-100 dark:bg-navy-800 px-5 py-3"
          style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
        >
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
