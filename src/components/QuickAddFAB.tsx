import React, { useState, useEffect } from 'react';
import QuickAddTransactionModal from './QuickAddTransactionModal';
import { Plus } from 'lucide-react';

/**
 * Floating Action Button (FAB) + global quick-add sheet.
 *
 * Renders a green "+" button fixed in the bottom-right corner (desktop only —
 * mobile uses the bottom-tab center button). Also listens for keyboard
 * shortcut Shift+N, Command Palette "quick-add", and `quick-add-open` events
 * (calendar day cells pin `detail.date`).
 *
 * KUR-245 regresi 1: the FAB/tab path now opens QuickAddTransactionModal (the
 * A3/A5-compliant bottom sheet: drag handle, swipe-dismiss, safe-area footer,
 * 44px Paid row) instead of the legacy desktop-style QuickAddDialog — one
 * mobile pattern. QuickAddDialog remains only on /share-target (ShareCapture
 * needs presetTitle/presetAmount on a standalone page).
 */
export default function QuickAddFAB() {
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<{ title?: string | null; amount?: string | null; date?: string | null } | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Shift+N — open quick add
      if (e.shiftKey && (e.key === 'N' || e.key === 'n')) {
        // Don't intercept if user is typing in an input/textarea
        const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) {
          return;
        }
        e.preventDefault();
        setPreset(null); // keyboard shortcut = today, empty form
        setOpen(true);
      }
      // Escape closes
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Listen for custom event from Command Palette / Calendar day cells.
    // detail: { date?: string } — YYYY-MM-DD pins the new transaction to that day.
    const handleQuickAddOpen = (e: Event) => {
      const date = (e as CustomEvent).detail?.date;
      setPreset(
        typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
          ? { date }
          : null,
      );
      setOpen(true);
    };
    window.addEventListener('quick-add-open', handleQuickAddOpen);

    // App shortcut "Quick Add" (long-press icon) → /?quick-add=1 opens sheet.
    if (window.location.search.includes('quick-add=1')) {
      setPreset(null);
      setOpen(true);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('quick-add-open', handleQuickAddOpen);
    };
  }, []);

  return (
    <>
      {/* Floating Action Button, desktop only (mobile uses bottom-tab center button) */}
      <button
        onClick={() => { setPreset(null); setOpen(true); }}
        className="hidden lg:flex fixed bottom-8 right-8 z-40 w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg hover:shadow-xl transition-all hover:scale-110 items-center justify-center group"
        aria-label="Quick add transaction (Shift+N)"
        title="Quick Add Transaction (Shift+N)"
      >
        <Plus className="w-7 h-7 transition-transform group-hover:rotate-90" />
      </button>

      {/* Quick Add — same sheet modal everywhere (KUR-245 regresi 1) */}
      <QuickAddTransactionModal open={open} onOpenChange={setOpen} preset={preset} />
    </>
  );
}
