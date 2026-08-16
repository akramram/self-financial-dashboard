import React, { useState, useEffect } from 'react';
import QuickAddDialog from './QuickAddDialog';
import { Plus } from 'lucide-react';

/**
 * Floating Action Button (FAB) + global Quick Add dialog.
 *
 * Renders a green "+" button fixed in the bottom-right corner on every page.
 * Also listens for keyboard shortcut Shift+N to open the dialog.
 *
 * The dialog auto-reloads the page on success to refresh server-rendered data.
 */
export default function QuickAddFAB() {
  const [open, setOpen] = useState(false);

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
        setOpen(true);
      }
      // Escape closes
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Listen for custom event from Command Palette
    const handleQuickAddOpen = () => setOpen(true);
    window.addEventListener('quick-add-open', handleQuickAddOpen);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('quick-add-open', handleQuickAddOpen);
    };
  }, []);

  return (
    <>
      {/* Floating Action Button — desktop only (mobile uses bottom-tab center button) */}
      <button
        onClick={() => setOpen(true)}
        className="hidden lg:flex fixed bottom-8 right-8 z-40 w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg hover:shadow-xl transition-all hover:scale-110 items-center justify-center group"
        aria-label="Quick add transaction (Shift+N)"
        title="Quick Add Transaction (Shift+N)"
      >
        <Plus className="w-7 h-7 transition-transform group-hover:rotate-90" />
      </button>

      {/* Quick Add Dialog */}
      <QuickAddDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
