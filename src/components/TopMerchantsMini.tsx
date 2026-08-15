import React, { useMemo } from 'react';
import type { Transaction } from '../lib/data';
import { formatIdr } from '../lib/utils';

interface MerchantEntry {
  name: string;
  total: number;
  count: number;
  topCategory: string;
}

interface Props {
  transactions: Transaction[];
  activePeriodId: number | null;
}

/**
 * Compact top-5 merchant breakdown widget for Dashboard FLOW section.
 * Shows where money goes at the merchant/title level — complements Category Budgets.
 */
export default function TopMerchantsMini({ transactions, activePeriodId }: Props) {
  const merchants = useMemo(() => {
    const filtered = activePeriodId
      ? transactions.filter((t) => t.period_id === activePeriodId && t.done)
      : transactions.filter((t) => t.done);

    const map = new Map<string, { total: number; count: number; categories: Map<string, number> }>();
    for (const t of filtered) {
      const key = t.title.trim();
      if (!key) continue;
      const entry = map.get(key) || { total: 0, count: 0, categories: new Map<string, number>() };
      entry.total += t.amount;
      entry.count += 1;
      const catCount = entry.categories.get(t.category) || 0;
      entry.categories.set(t.category, catCount + t.amount);
      map.set(key, entry);
    }

    const sorted: MerchantEntry[] = [...map.entries()]
      .map(([name, data]) => {
        // Find top category by amount
        let topCat = '';
        let topCatAmount = 0;
        data.categories.forEach((amt, cat) => {
          if (amt > topCatAmount) { topCat = cat; topCatAmount = amt; }
        });
        return { name, total: data.total, count: data.count, topCategory: topCat };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return sorted;
  }, [transactions, activePeriodId]);

  const maxTotal = merchants.length > 0 ? merchants[0].total : 0;

  if (merchants.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2.5">
      {merchants.map((m, i) => {
        const pct = maxTotal > 0 ? Math.round((m.total / maxTotal) * 100) : 0;
        return (
          <div key={m.name} className="group">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0"
                  style={{
                    backgroundColor: i === 0 ? 'rgba(16,185,129,0.15)' : i === 1 ? 'rgba(245,158,11,0.12)' : 'rgba(148,163,184,0.1)',
                    color: i === 0 ? '#10b981' : i === 1 ? '#f59e0b' : '#94a3b8',
                  }}
                >
                  {i + 1}
                </span>
                <span className="text-sm font-medium text-slate-700 dark:text-white/80 truncate">
                  {m.name}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-white/25 hidden sm:inline">
                  ×{m.count}
                </span>
              </div>
              <span className="text-sm font-semibold text-slate-800 dark:text-white/90 tabular-nums shrink-0 ml-2">
                {formatIdr(m.total)}
              </span>
            </div>
            <div className="w-full bg-slate-200/60 dark:bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
              <div
                className="h-1.5 rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${pct}%`,
                  backgroundColor: i === 0 ? '#10b981' : i === 1 ? '#f59e0b' : i === 2 ? '#10b981' : '#94a3b8',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
