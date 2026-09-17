import React, { useEffect, useState } from 'react';
import QuickAddDialog from './QuickAddDialog';
import { parseQuickAmount } from '../lib/utils';
import { Share2, Loader2 } from 'lucide-react';

/**
 * Quick Capture — bridges the Android Web Share Target into Quick Add.
 * Shared text arrives as ?title=&text=. We extract a title (first text
 * line) and an amount (first quick-amount token like "25rb"/"1,5jt"),
 * then open Quick Add pre-filled and pinned to today.
 *
 * ponytail: single-line heuristics only; if shared text gets richer
 * (URLs, receipts), add a smarter parser then.
 */

interface Props {
  shareTitle: string;
  shareText: string;
}

/** Extract { title, amount } from shared title/text. */
export function extractShared(
  shareTitle: string,
  shareText: string,
): { title: string; amount: string } {
  const lines = [shareTitle, ...shareText.split('\n')]
    .map((l) => l.trim())
    .filter(Boolean);
  let title = '';
  let amount = '';
  for (const line of lines) {
    // First quick-amount token in the line wins: "Kopi 25rb" → 25rb
    const m = line.match(/([\d.,]+\s*(?:jt|juta|rb|ribu|k|m)\b|[\d.,]{4,})/i);
    const amtToken = m?.[1]?.replace(/\s+/g, '');
    const parsed = amtToken ? parseQuickAmount(amtToken) : null;
    if (parsed && !amount) {
      amount = String(parsed);
      const stripped = (line.replace(m![0], '').trim().replace(/[–—-]\s*$/, '')).trim();
      if (!title) title = stripped;
    } else if (!title) {
      title = line;
    }
  }
  return { title: title.slice(0, 120), amount };
}

export default function ShareCapture({ shareTitle, shareText }: Props) {
  const [ready, setReady] = useState(false);
  const [preset, setPreset] = useState<{ title: string; amount: string }>({ title: '', amount: '' });

  useEffect(() => {
    const { title, amount } = extractShared(shareTitle, shareText);
    setPreset({ title, amount });
    setReady(true);
  }, [shareTitle, shareText]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center gap-3">
      <div className="w-14 h-14 rounded-2xl bg-mint-500/10 flex items-center justify-center">
        <Share2 className="w-7 h-7 text-mint-500" />
      </div>
      <h1 className="text-xl font-bold text-slate-900 dark:text-white">Quick Capture</h1>
      <p className="text-sm text-slate-500 dark:text-white/40 max-w-sm">
        {ready
          ? preset.title
            ? `Menambahkan "${preset.title}"${preset.amount ? ` · ${preset.amount}` : ''} ke transaksi.`
            : 'Tidak ada teks — menambahkan transaksi kosong.'
          : 'Menyiapkan…'}
      </p>
      {!ready && <Loader2 className="w-5 h-5 animate-spin text-mint-500" />}
      <QuickAddDialog
        open={ready}
        onOpenChange={(o) => {
          if (!o) {
            // Close = done (added or cancelled) — return to the dashboard.
            window.location.href = '/';
          }
        }}
        presetTitle={preset.title || null}
        presetAmount={preset.amount || null}
      />
    </div>
  );
}
