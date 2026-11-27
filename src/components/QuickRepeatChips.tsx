import React, { useEffect, useState } from 'react';
import { Repeat } from 'lucide-react';
import { formatIdr } from '../lib/utils';

export interface RepeatPick {
  title: string;
  category?: string;
  amount?: number;
  type?: string;
}

interface Props {
  onPick: (pick: RepeatPick) => void;
  /** Chips shown; title-presets returns up to 30. */
  limit?: number;
}

const VALID_TYPES = ['cash', 'credit_expense', 'credit_payment'];

/**
 * One-tap "repeat" chips for Quick Add: the user's most frequent paid titles
 * with their usual amount/category/type, from GET /api/title-presets.
 * Renders nothing on empty data or fetch failure (form still works).
 */
export default function QuickRepeatChips({ onPick, limit = 5 }: Props) {
  const [items, setItems] = useState<RepeatPick[]>([]);

  useEffect(() => {
    let alive = true;
    fetch('/api/title-presets')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive || !Array.isArray(d?.titles)) return;
        const rows: RepeatPick[] = d.titles
          .filter((t: RepeatPick | null) => t && typeof t.title === 'string' && t.title.trim() !== '')
          .slice(0, limit)
          .map((t: RepeatPick) => ({
            title: t.title,
            category: t.category,
            amount: typeof t.amount === 'number' ? t.amount : undefined,
            type: typeof t.type === 'string' && VALID_TYPES.includes(t.type) ? t.type : undefined,
          }));
        setItems(rows);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [limit]);

  if (items.length === 0) return null;

  return (
    <div className="mb-3" data-testid="quick-repeat-chips">
      <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-white/60 mb-1.5">
        <Repeat className="w-3.5 h-3.5" aria-hidden="true" />
        Repeat
      </p>
      <div className="flex gap-2 overflow-x-auto overscroll-x-contain pb-1">
        {items.map((item) => (
          <button
            key={item.title}
            type="button"
            onClick={() => onPick(item)}
            aria-label={`Repeat ${item.title}${item.amount != null ? `, ${formatIdr(item.amount)}` : ''}`}
            className="shrink-0 min-h-[44px] max-w-[180px] text-left px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-white/80 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
          >
            <span className="block text-[13px] font-medium truncate">{item.title}</span>
            {item.amount != null && (
              <span className="block text-[11px] text-slate-500 dark:text-white/60">{formatIdr(item.amount)}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}