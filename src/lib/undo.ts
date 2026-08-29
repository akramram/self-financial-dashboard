import { toast } from 'sonner';
import type { Transaction } from './data';
import { notifyDataChanged } from './dataSync';

/**
 * Undo-able delete: shows a toast with an "Undo" action that re-inserts
 * the deleted transaction(s). Uses `force: true` to bypass the 24h
 * duplicate guard (same tx may legitimately re-exist after undo).
 */
export function showDeleteUndoToast(
  deleted: Transaction[],
  onRestored: (restored: Transaction[]) => void,
) {
  const count = deleted.length;
  const label = count === 1 ? `"${deleted[0].title}" deleted` : `${count} transactions deleted`;
  toast.success(label, {
    duration: 8000,
    action: {
      label: 'Undo',
      onClick: async () => {
        try {
          const restored: Transaction[] = [];
          for (const tx of deleted) {
            const { id: _oldId, ...body } = tx;
            const res = await fetch('/api/transactions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...body, force: true }),
            });
            if (!res.ok) throw new Error(`restore failed (${res.status})`);
            const created = await res.json();
            restored.push({ ...tx, id: created.id });
          }
          onRestored(restored);
          notifyDataChanged('transactions');
          toast.success(restored.length === 1 ? `"${restored[0].title}" restored` : `${restored.length} transactions restored`);
        } catch {
          toast.error('Failed to restore — data was deleted permanently');
        }
      },
    },
  });
}
