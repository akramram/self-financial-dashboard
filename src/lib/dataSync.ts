/**
 * Same-tab data-change event bus + cross-tab sync via BroadcastChannel.
 * Mutations (quick add, table edits, deletes) broadcast here; data-heavy
 * components (Dashboard, TransactionTable) refetch server truth on notify.
 *
 * Cross-tab: one BroadcastChannel per page (module singleton). postMessage
 * skips the sender channel itself, so same-tab listeners never echo — only
 * OTHER tabs/windows of the same origin relay, re-dispatching the local
 * event so listeners see one uniform flow.
 */

const EVENT = 'fin-data-changed';

export type DataScope = 'transactions' | 'networth' | 'summaries';

const CHANNEL_NAME = 'fin-data-sync';

let channel: BroadcastChannel | null | undefined;

function getChannel(): BroadcastChannel | null {
  if (channel !== undefined) return channel;
  try {
    channel = new BroadcastChannel(CHANNEL_NAME);
  } catch {
    channel = null; // very old browsers — same-tab bus still works
  }
  return channel;
}

export function notifyDataChanged(scope: DataScope = 'transactions') {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { scope } }));
  getChannel()?.postMessage({ scope });
}

export function onDataChanged(cb: () => void): () => void {
  const handler = () => cb();
  window.addEventListener(EVENT, handler);
  const ch = getChannel();
  const remote = ch
    ? (event: MessageEvent) => {
        window.dispatchEvent(
          new CustomEvent(EVENT, { detail: { scope: event.data?.scope ?? 'transactions', remote: true } })
        );
      }
    : null;
  if (ch && remote) ch.addEventListener('message', remote);
  return () => {
    window.removeEventListener(EVENT, handler);
    if (ch && remote) ch.removeEventListener('message', remote);
    // channel stays open for the page lifetime (shared singleton)
  };
}
