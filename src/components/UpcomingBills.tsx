import React, { useMemo } from 'react';
import type { RecurringTransaction, Transaction } from '../lib/data';
import { formatIdr } from '../lib/utils';
import { CalendarClock, CheckCircle2, Circle, CreditCard, Loader2, Wallet } from 'lucide-react';

interface Props {
  recurring: RecurringTransaction[];
  transactions: Transaction[];
  activePeriodId: number | null;
  activeMonth: string; // display label, e.g. "August 2026" (period ends 20th of that month)
  onTogglePaid?: (bill: { txId: number; title: string; amount: number; done: boolean }) => void;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Resolve a period display label ("August 2026") to its date range: 21st of prev month → 20th of that month. */
function getPeriodDates(activeMonth: string): { start: Date; end: Date } | null {
  const [name, yearStr] = activeMonth.split(' ');
  const monthIdx = MONTHS.indexOf(name);
  if (monthIdx < 0) return null;
  const year = parseInt(yearStr || String(new Date().getFullYear()), 10);
  const startMonth = monthIdx === 0 ? 11 : monthIdx - 1;
  const startYear = monthIdx === 0 ? year - 1 : year;
  return { start: new Date(startYear, startMonth, 21), end: new Date(year, monthIdx, 20, 23, 59, 59, 999) };
}

interface Bill {
  id: number;
  title: string;
  amount: number;
  type: RecurringTransaction['type'];
  dueDate: Date;
  /** true when a matching generated transaction exists AND is marked done */
  paid: boolean;
  /** id of the generated transaction in the active period, if any (enables tap-to-toggle) */
  txId: number | null;
  endLabel: string | null;
}

export default function UpcomingBills({ recurring, transactions, activePeriodId, activeMonth, onTogglePaid }: Props) {
  const { bills, unpaidTotal } = useMemo(() => {
    const range = getPeriodDates(activeMonth);

    // Actual payment state comes from the generated transaction in the active period —
    // NOT from the recurring template's global `done` flag (that one never resets per period).
    const periodTxs = activePeriodId != null ? transactions.filter((t) => t.period_id === activePeriodId) : [];
    const txByTitle = new Map<string, Transaction>();
    for (const t of periodTxs) {
      const key = t.title.trim().toLowerCase();
      if (!txByTitle.has(key)) txByTitle.set(key, t); // first match wins if duplicates exist
    }

    const all: Bill[] = [];
    for (const r of recurring) {
      if (!r.active) continue;
      // end_date is "YYYY-MM" of the LAST period the item bills into — skip after that
      if (r.end_date && range && range.end.getFullYear() * 100 + (range.end.getMonth() + 1) > parseInt(r.end_date.replace('-', ''), 10)) continue;

      const day = parseInt(r.created_at, 10);
      const dayOfMonth = day >= 1 && day <= 28 ? day : 21;

      // dueDate for the ACTIVE period: day >= 21 falls in the previous calendar month
      let due: Date | null = null;
      if (range) {
        const d = new Date(range.end.getFullYear(), range.end.getMonth(), 1);
        if (dayOfMonth >= 21) d.setMonth(d.getMonth() - 1);
        d.setDate(dayOfMonth);
        // If that day already passed the period end (e.g. day 28 in a short window), clamp to period
        due = d;
      }

      if (due) {
        const tx = txByTitle.get(r.title.trim().toLowerCase()) || null;
        all.push({
          id: r.id,
          title: r.title,
          amount: tx ? tx.amount : r.amount, // prefer the real billed amount when present
          type: r.type,
          dueDate: due,
          paid: tx ? Boolean(tx.done) : false,
          txId: tx ? tx.id : null,
          endLabel: r.end_date ? MONTHS[new Date(r.end_date + '-01T12:00:00Z').getUTCMonth()] + ' ' + r.end_date.slice(0, 4) : null,
        });
      }
    }

    // Sort: unpaid first, then by due date
    all.sort((a, b) => {
      if (a.paid !== b.paid) return a.paid ? 1 : -1;
      return a.dueDate.getTime() - b.dueDate.getTime();
    });

    const unpaidTotal = all.filter((b) => !b.paid).reduce((s, b) => s + b.amount, 0);
    return { bills: all, unpaidTotal };
  }, [recurring, transactions, activePeriodId, activeMonth]);

  if (bills.length === 0) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-white/80">Upcoming Bills</h3>
        {unpaidTotal > 0 && (
          <span className="text-xs text-slate-500 dark:text-white/40">
            <span className="font-semibold text-coral-400">{formatIdr(unpaidTotal)}</span> pending
          </span>
        )}
      </div>

      <ul className="space-y-1.5">
        {bills.map((b) => {
          const daysLeft = Math.ceil((b.dueDate.getTime() - today.getTime()) / 86400000);
          const overdue = !b.paid && daysLeft < 0;
          const imminent = !b.paid && !overdue && daysLeft <= 3;
          const toggleable = Boolean(onTogglePaid) && b.txId != null;
          return (
            <li
              key={b.id}
              className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-slate-100/70 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.04] ${toggleable ? 'cursor-pointer hover:bg-slate-200/70 dark:hover:bg-white/[0.06] transition' : ''}`}
              onClick={toggleable ? () => onTogglePaid!({ txId: b.txId!, title: b.title, amount: b.amount, done: !b.paid }) : undefined}
              role={toggleable ? 'button' : undefined}
              aria-label={toggleable ? `Mark ${b.title} as ${b.paid ? 'unpaid' : 'paid'}` : undefined}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${b.type === 'cash' ? 'bg-mint-500/10' : 'bg-gold-500/10'}`}>
                  {b.type === 'cash' ? <Wallet className="w-3.5 h-3.5 text-mint-500" strokeWidth={1.8} /> : <CreditCard className="w-3.5 h-3.5 text-gold-400" strokeWidth={1.8} />}
                </span>
                <div className="min-w-0">
                  <p className={`text-sm font-medium truncate ${b.paid ? 'text-slate-400 dark:text-white/35 line-through' : 'text-slate-800 dark:text-white/80'}`}>{b.title}</p>
                  <p className="text-[11px] text-slate-500 dark:text-white/40 flex items-center gap-1">
                    <CalendarClock className="w-3 h-3" />
                    due {b.dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {b.endLabel && <span className="text-slate-400 dark:text-white/30">· ends {b.endLabel}</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <span className="text-sm font-semibold text-slate-800 dark:text-white/80 tabular-nums">{formatIdr(b.amount)}</span>
                {b.paid ? (
                  toggleable ? (
                    <CheckCircle2 className="w-4 h-4 text-mint-500" strokeWidth={1.8} />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-mint-500" strokeWidth={1.8} />
                  )
                ) : overdue ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-coral-500/15 text-coral-400">OVERDUE</span>
                ) : imminent ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gold-500/15 text-gold-400">{daysLeft === 0 ? 'TODAY' : `${daysLeft}d`}</span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium text-slate-500 dark:text-white/30">{daysLeft}d</span>
                    {toggleable && <Circle className="w-4 h-4 text-slate-300 dark:text-white/20" strokeWidth={1.8} />}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-2 text-[10px] text-slate-400 dark:text-white/25">Tap a bill to mark it paid / unpaid</p>
      <a href="/recurring" className="block mt-1.5 text-xs text-mint-500 hover:text-mint-400 no-underline">Manage recurring →</a>
    </div>
  );
}
