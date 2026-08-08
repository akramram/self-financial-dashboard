import React, { useMemo } from 'react';
import type { Transaction } from '../lib/data';
import { formatIdr } from '../lib/utils';
import { Wallet, CalendarDays, TrendingDown, CheckCircle2 } from 'lucide-react';

interface Props {
  transactions: Transaction[];
  income: number;
  spent: number;
  activeMonth: string;
}

function getPeriodDates(activeMonth: string): { start: Date; end: Date } {
  const parts = activeMonth.split(' ');
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const monthIdx = monthNames.indexOf(parts[0]);
  const year = parseInt(parts[1] || String(new Date().getFullYear()), 10);

  if (monthIdx < 0) {
    const now = new Date();
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 21),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 20),
    };
  }

  const startMonth = monthIdx === 0 ? 11 : monthIdx - 1;
  const startYear = monthIdx === 0 ? year - 1 : year;
  const start = new Date(startYear, startMonth, 21);
  const end = new Date(year, monthIdx, 20, 23, 59, 59, 999);

  return { start, end };
}

export default function DailyBudgetIndicator({ transactions, income, spent, activeMonth }: Props) {
  const data = useMemo(() => {
    if (!activeMonth || income <= 0) return null;

    const { end } = getPeriodDates(activeMonth);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // If period is over, no daily budget to show
    if (today > end) return null;

    // Days remaining (including today)
    const daysRemaining = Math.max(1, Math.ceil((end.getTime() - today.getTime()) / 86400000) + 1);

    // Remaining budget
    const remaining = Math.max(0, income - spent);

    // Daily allowance = remaining / days remaining
    const dailyAllowance = Math.round(remaining / daysRemaining);

    // Calculate spent today from transactions
    const todayStr = today.toISOString().slice(0, 10);
    const spentToday = transactions
      .filter(t => {
        if (!t.created_time) return false;
        const txDate = t.created_time.slice(0, 10);
        return txDate === todayStr && t.done === 1 && (t.type === 'cash' || t.type === 'credit_expense');
      })
      .reduce((sum, t) => sum + t.amount, 0);

    // Remaining for today
    const remainingToday = dailyAllowance - spentToday;
    const pctToday = dailyAllowance > 0 ? Math.min(100, Math.round((spentToday / dailyAllowance) * 100)) : (spentToday > 0 ? 100 : 0);

    // Status
    let status: 'safe' | 'warning' | 'danger' | 'over';
    if (remainingToday < 0) status = 'over';
    else if (pctToday >= 90) status = 'danger';
    else if (pctToday >= 70) status = 'warning';
    else status = 'safe';

    return { dailyAllowance, spentToday, remainingToday, pctToday, status, daysRemaining, remaining };
  }, [transactions, income, spent, activeMonth]);

  if (!data) return null;

  const { dailyAllowance, spentToday, remainingToday, pctToday, status, daysRemaining, remaining } = data;

  const statusColors = {
    safe: { bg: 'rgba(52,211,153,0.10)', text: '#34d399', border: 'rgba(52,211,153,0.25)', icon: <CheckCircle2 className="w-4 h-4" style={{ color: '#34d399' }} /> },
    warning: { bg: 'rgba(245,158,11,0.10)', text: '#f59e0b', border: 'rgba(245,158,11,0.25)', icon: <Wallet className="w-4 h-4" style={{ color: '#f59e0b' }} /> },
    danger: { bg: 'rgba(239,68,68,0.10)', text: '#ef4444', border: 'rgba(239,68,68,0.25)', icon: <TrendingDown className="w-4 h-4" style={{ color: '#ef4444' }} /> },
    over: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444', border: 'rgba(239,68,68,0.35)', icon: <TrendingDown className="w-4 h-4" style={{ color: '#ef4444' }} /> },
  };

  const colors = statusColors[status];
  const barColor = status === 'safe' ? '#34d399' : status === 'warning' ? '#f59e0b' : '#ef4444';

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <CalendarDays className="w-4 h-4 text-slate-500 dark:text-white/40" strokeWidth={1.8} />
        <h3 className="text-sm font-semibold text-slate-800 dark:text-white/80">Today's Budget</h3>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        {/* Main daily budget card */}
        <div
          className="flex-1 rounded-xl p-4 border transition-all"
          style={{ backgroundColor: colors.bg, borderColor: colors.border }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-white/40 mb-1">
                Daily Allowance
              </p>
              <p className="text-xl font-bold" style={{ color: colors.text }}>
                {formatIdr(dailyAllowance)}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-white/40 mt-1">
                {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} left • {formatIdr(remaining)} remaining
              </p>
            </div>
            {colors.icon}
          </div>

          {/* Today's progress */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-slate-500 dark:text-white/40">Today</span>
              <span className="text-[11px] font-medium" style={{ color: colors.text }}>
                {formatIdr(Math.abs(spentToday))} / {formatIdr(dailyAllowance)} ({pctToday}%)
              </span>
            </div>
            <div className="w-full h-2 rounded-full overflow-hidden bg-white/10">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pctToday}%`, backgroundColor: barColor }}
              />
            </div>
          </div>
        </div>

        {/* Spent today summary */}
        <div className="flex flex-col gap-2 sm:w-48">
          <div className="rounded-lg p-3 bg-slate-100 dark:bg-white/[0.04]">
            <p className="text-[11px] text-slate-500 dark:text-white/40">Spent Today</p>
            <p className="text-sm font-bold text-slate-800 dark:text-white/90">{formatIdr(spentToday)}</p>
          </div>
          <div className="rounded-lg p-3 bg-slate-100 dark:bg-white/[0.04]">
            <p className="text-[11px] text-slate-500 dark:text-white/40">
              {status === 'over' ? 'Over by' : 'Left Today'}
            </p>
            <p className="text-sm font-bold" style={{ color: colors.text }}>
              {remainingToday < 0 ? '-' : ''}{formatIdr(Math.abs(remainingToday))}
            </p>
          </div>
        </div>
      </div>

      {/* Tip for overspend */}
      {status === 'over' && (
        <p className="mt-2 text-[11px] text-slate-500 dark:text-white/40 flex items-center gap-1">
          <TrendingDown className="w-3 h-3" style={{ color: '#ef4444' }} />
          Over today's budget — try to spend less tomorrow to compensate.
        </p>
      )}
      {status === 'warning' && (
        <p className="mt-2 text-[11px] text-slate-500 dark:text-white/40 flex items-center gap-1">
          Approaching today's limit — consider postponing non-essential purchases.
        </p>
      )}
    </div>
  );
}
