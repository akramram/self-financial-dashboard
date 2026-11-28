import React, { useState } from 'react';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * EmailSyncButton — "Recheck email" placed on the dashboard and transactions
 * pages. Runs the IMAP ingest on demand (POST /api/pending-email-sync) and then
 * broadcasts `email-review-refresh`, which EmailReviewModal listens for to
 * re-read the queue. The modal itself decides whether to open, so this button
 * never has to know about the review flow.
 */
export default function EmailSyncButton({ className = '' }: { className?: string }) {
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/pending-email-sync', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        toast.error(data.error || 'Recheck email gagal');
        return;
      }
      window.dispatchEvent(new CustomEvent('email-review-refresh'));
      toast.success(
        data.pending > 0
          ? `Recheck selesai · ${data.pending} transaksi menunggu konfirmasi`
          : 'Recheck selesai · tidak ada transaksi baru'
      );
    } catch (e: any) {
      toast.error(e?.message || 'Recheck email gagal');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={run}
      disabled={busy}
      aria-label="Recheck email Jenius"
      title="Ambil email transaksi Jenius sekarang"
      className={className}
    >
      <RefreshCw className={`mr-1.5 h-4 w-4 ${busy ? 'animate-spin' : ''}`} />
      {busy ? 'Recheck…' : 'Recheck email'}
    </Button>
  );
}