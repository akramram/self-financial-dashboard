/**
 * Tiny same-tab data-change event bus.
 * Mutations (quick add, table edits, deletes) broadcast here; data-heavy
 * components (Dashboard, TransactionTable) refetch server truth on notify.
 * ponytail: cross-tab sync via BroadcastChannel — add when multi-tab editing becomes real.
 */
const EVENT = 'fin-data-changed';

export type DataScope = 'transactions' | 'networth' | 'summaries';

export function notifyDataChanged(scope: DataScope = 'transactions') {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { scope } }));
}

export function onDataChanged(cb: () => void): () => void {
  const handler = () => cb();
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
