import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

/**
 * Global confirmation dialog using a module-level singleton.
 *
 * Why not React Context? Astro renders each `client:load` island as a
 * SEPARATE React root. A Context Provider mounted in one root (e.g.
 * the Layout's command-palette root) is invisible to islands in other
 * roots (Dashboard, TransactionTable, etc.). The default context value
 * (`async () => false`) would silently block every delete action.
 *
 * The module-level `confirm()` function bridges all roots: any island
 * imports `confirm` (or `useConfirm()`) and the single `ConfirmRoot`
 * instance mounted in Layout handles the UI.
 */

export interface ConfirmOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

// --- Module-level singleton ---

let _confirmFn: ConfirmFn | null = null;

/**
 * Register the active confirm handler. Called once by <ConfirmRoot/> on mount.
 */
export function _registerConfirm(fn: ConfirmFn | null) {
  _confirmFn = fn;
}

/**
 * Imperative confirm — callable from any React root or non-component code.
 * Falls back to native `window.confirm` if no ConfirmRoot is mounted
 * (ensures functionality even before/during hydration).
 */
export const confirm: ConfirmFn = (options) => {
  if (_confirmFn) return _confirmFn(options);
  // Fallback: native browser confirm
  if (typeof window !== 'undefined') {
    return Promise.resolve(window.confirm(options.description || options.title));
  }
  return Promise.resolve(false);
};

/**
 * Hook version for ergonomic use inside components.
 * Returns `{ confirm }` — the module-level function, stable across re-renders.
 */
export function useConfirm() {
  return { confirm };
}

// --- UI Component (mounted once in Layout.astro) ---

interface ConfirmState extends ConfirmOptions {
  open: boolean;
  resolve: ((value: boolean) => void) | null;
}

const INITIAL_STATE: ConfirmState = {
  open: false,
  title: '',
  description: '',
  resolve: null,
};

export function ConfirmRoot() {
  const [state, setState] = useState<ConfirmState>(INITIAL_STATE);

  const handleConfirm = useCallback(() => {
    state.resolve?.(true);
    setState((prev) => ({ ...prev, open: false, resolve: null }));
  }, [state.resolve]);

  const handleCancel = useCallback(() => {
    state.resolve?.(false);
    setState((prev) => ({ ...prev, open: false, resolve: null }));
  }, [state.resolve]);

  useEffect(() => {
    const fn: ConfirmFn = (options) => {
      return new Promise<boolean>((resolve) => {
        setState({
          ...options,
          open: true,
          resolve,
        });
      });
    };
    _registerConfirm(fn);
    return () => _registerConfirm(null);
  }, []);

  return (
    <Dialog
      open={state.open}
      onOpenChange={(open) => { if (!open) handleCancel(); }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{state.title}</DialogTitle>
          <DialogDescription>{state.description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            {state.cancelLabel ?? 'Cancel'}
          </Button>
          <Button
            variant={state.variant === 'destructive' ? 'destructive' : 'default'}
            onClick={handleConfirm}
          >
            {state.confirmLabel ?? 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Backward-compat export: <ConfirmProvider> wraps children + renders <ConfirmRoot>.
 * Kept so existing Layout.astro code that references ConfirmProvider keeps working.
 * Children are rendered normally (this is no longer a Context provider).
 */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ConfirmRoot />
    </>
  );
}
