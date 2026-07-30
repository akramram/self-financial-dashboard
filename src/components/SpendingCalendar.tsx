import React, { useMemo, useState, useEffect } from 'react';
import type { Transaction } from '../lib/data';
import { formatIdr } from '../lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

interface PeriodOption {
  period_id: number;
  month: string;
}

interface Props {
  transactions: Transaction[];
  periods?: PeriodOption[];
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseMonthYear(monthStr: string): { year: number; monthIndex: number } {
  const d = new Date(`${monthStr} 1`);
  if (!isNaN(d.getTime())) {
    return { year: d.getFullYear(), monthIndex: d.getMonth() };
  }
  const parts = monthStr.split(' ');
  const monthNames = [
    'january','february','march','april','may','june',
    'july','august','september','october','november','december'
  ];
  const monthNum = monthNames.indexOf(parts[0]?.toLowerCase());
  const year = parseInt(parts[parts.length - 1], 10);
  if (monthNum >= 0 && !isNaN(year)) {
    return { year, monthIndex: monthNum };
  }
  const now = new Date();
  return { year: now.getFullYear(), monthIndex: now.getMonth() };
}

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseTxDate(tx: Transaction): string | null {
  const raw = tx.created_time || tx.date;
  if (!raw) return null;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return null;
  return dateKey(d);
}

export default function SpendingCalendar({ transactions, periods }: Props) {
  const monthOptions = useMemo(() => {
    if (periods && periods.length > 0) {
      return [...periods].reverse().map((p) => p.month);
    }
    const set = new Set<string>();
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    transactions.forEach((t) => {
      const raw = t.created_time || t.date;
      if (!raw) return;
      const d = new Date(raw);
      if (!isNaN(d.getTime())) {
        set.add(`${monthNames[d.getMonth()]} ${d.getFullYear()}`);
      }
    });
    return Array.from(set).sort((a, b) => {
      const da = parseMonthYear(a);
      const db = parseMonthYear(b);
      return da.year * 100 + da.monthIndex - (db.year * 100 + db.monthIndex);
    });
  }, [transactions, periods]);

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    if (monthOptions.length > 0) return monthOptions[0];
    const now = new Date();
    return `${now.toLocaleDateString('en-US', { month: 'long' })} ${now.getFullYear()}`;
  });

  useEffect(() => {
    if (monthOptions.length > 0 && !monthOptions.includes(selectedMonth)) {
      setSelectedMonth(monthOptions[0]);
    }
  }, [monthOptions, selectedMonth]);

  const { year, monthIndex } = useMemo(() => parseMonthYear(selectedMonth), [selectedMonth]);

  // ── Period range: 21st of previous month → 20th of selected month ──
  const periodDates = useMemo(() => {
    const prevMonth = monthIndex === 0 ? 11 : monthIndex - 1;
    const prevMonthYear = monthIndex === 0 ? year - 1 : year;
    const start = new Date(prevMonthYear, prevMonth, 21);
    const end = new Date(year, monthIndex, 20);

    const dates: Date[] = [];
    const cur = new Date(start);
    while (cur <= end) {
      dates.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  }, [year, monthIndex]);

  const periodLabel = useMemo(() => {
    if (periodDates.length === 0) return selectedMonth;
    const first = periodDates[0];
    const last = periodDates[periodDates.length - 1];
    return `${MONTH_ABBR[first.getMonth()]} ${first.getDate()} – ${MONTH_ABBR[last.getMonth()]} ${last.getDate()}`;
  }, [periodDates, selectedMonth]);

  const selectedPeriodId = useMemo(() => {
    if (!periods) return null;
    const match = periods.find((p) => p.month === selectedMonth);
    return match ? match.period_id : null;
  }, [periods, selectedMonth]);

  const periodTransactions = useMemo(() => {
    if (selectedPeriodId !== null) {
      return transactions.filter((t) => t.period_id === selectedPeriodId);
    }
    return transactions.filter((tx) => {
      const raw = tx.created_time || tx.date || '';
      const d = new Date(raw);
      if (isNaN(d.getTime())) return false;
      // Salary period: 21st of prev month to 20th of current
      const prevMonth = monthIndex === 0 ? 11 : monthIndex - 1;
      const prevMonthYear = monthIndex === 0 ? year - 1 : year;
      const start = new Date(prevMonthYear, prevMonth, 21);
      const end = new Date(year, monthIndex, 20, 23, 59, 59);
      return d >= start && d <= end;
    });
  }, [transactions, selectedPeriodId, year, monthIndex]);

  const dailyTotals = useMemo(() => {
    const map: Record<string, { total: number; count: number; transactions: Transaction[] }> = {};
    periodTransactions.forEach((tx) => {
      const dKey = parseTxDate(tx);
      if (!dKey) return;
      if (!map[dKey]) {
        map[dKey] = { total: 0, count: 0, transactions: [] };
      }
      map[dKey].total += tx.amount;
      map[dKey].count += 1;
      map[dKey].transactions.push(tx);
    });
    return map;
  }, [periodTransactions]);

  const maxDaily = useMemo(() => {
    const totals = Object.values(dailyTotals).map((d) => d.total);
    return totals.length > 0 ? Math.max(...totals) : 0;
  }, [dailyTotals]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  const openDay = (dKey: string) => {
    setSelectedDateKey(dKey);
    setDialogOpen(true);
  };

  const selectedDayData = selectedDateKey ? dailyTotals[selectedDateKey] : null;

  const selectedDateLabel = useMemo(() => {
    if (!selectedDateKey) return '';
    const d = new Date(selectedDateKey + 'T00:00:00');
    if (isNaN(d.getTime())) return selectedDateKey;
    return `${MONTH_ABBR[d.getMonth()]} ${d.getDate()}`;
  }, [selectedDateKey]);

  const goToPrevMonth = () => {
    const idx = monthOptions.indexOf(selectedMonth);
    if (idx > 0) setSelectedMonth(monthOptions[idx - 1]);
  };

  const goToNextMonth = () => {
    const idx = monthOptions.indexOf(selectedMonth);
    if (idx >= 0 && idx < monthOptions.length - 1) setSelectedMonth(monthOptions[idx + 1]);
  };

  const getHeatColor = (total: number) => {
    if (total === 0) return 'bg-slate-100 dark:bg-white/[0.02] text-slate-400 dark:text-white/20';
    if (maxDaily === 0) return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400';
    const ratio = total / maxDaily;
    if (ratio <= 0.25) return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400';
    if (ratio <= 0.5) return 'bg-emerald-200 dark:bg-emerald-800/40 text-emerald-800 dark:text-emerald-300';
    if (ratio <= 0.75) return 'bg-gold-500/10 dark:bg-gold-700/20/30 text-gold-700 dark:text-gold-400';
    return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
  };

  // Grid: leading nulls for weekday alignment, then all period dates
  const firstDayOfWeek = periodDates.length > 0 ? periodDates[0].getDay() : 0;
  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  cells.push(...periodDates);

  const todayKey = dateKey(new Date());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPrevMonth}
            disabled={monthOptions.indexOf(selectedMonth) <= 0}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextMonth}
            disabled={monthOptions.indexOf(selectedMonth) >= monthOptions.length - 1}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-white/40">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-emerald-200 dark:bg-emerald-800/40" />
            <span>Low</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-gold-500/10 dark:bg-gold-700/20/30" />
            <span>Medium</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-red-100 dark:bg-red-900/30" />
            <span>High</span>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="glass-card p-5">
        <h3 className="text-base font-semibold flex items-center gap-2 text-slate-800 dark:text-white/80">
          <CalendarDays className="w-4 h-4 text-slate-500 dark:text-white/40" />
          Spending Heatmap — {periodLabel}
          <span className="text-xs font-normal text-slate-500 dark:text-white/30">
            ({selectedMonth} salary period)
          </span>
        </h3>
        <div className="grid grid-cols-7 gap-1 mt-4">
          {WEEKDAYS.map((wd) => (
            <div key={wd} className="text-center text-xs font-medium text-slate-500 dark:text-white/30 py-2">
              {wd}
            </div>
          ))}
          {cells.map((date, idx) => {
            if (date === null) {
              return <div key={`empty-${idx}`} className="aspect-square" />;
            }
            const dKey = dateKey(date);
            const data = dailyTotals[dKey];
            const total = data?.total ?? 0;
            const count = data?.count ?? 0;
            const isToday = dKey === todayKey;
            const heatClass = getHeatColor(total);
            // Show month abbreviation on period start (21st) and month boundary (1st)
            const showMonthLabel = date.getDate() === 21 || date.getDate() === 1;
            const isMonthBoundary = date.getDate() === 1;

            return (
              <button
                key={dKey}
                onClick={() => count > 0 && openDay(dKey)}
                className={`
                  aspect-square rounded-lg border transition-all hover:scale-105 hover:shadow-sm
                  flex flex-col items-center justify-center gap-0.5
                  ${heatClass}
                  ${isToday ? 'ring-2 ring-mint-500 ring-offset-1 ring-offset-slate-50 dark:ring-offset-navy-950' : 'border-slate-200 dark:border-white/[0.06]'}
                  ${count > 0 ? 'cursor-pointer' : 'cursor-default'}
                  ${isMonthBoundary ? 'ring-1 ring-slate-300 dark:ring-white/10' : ''}
                `}
              >
                <span className={`text-xs font-medium ${isToday ? 'text-mint-400' : ''}`}>
                  {date.getDate()}
                </span>
                {showMonthLabel && (
                  <span className="text-[8px] opacity-50 leading-none uppercase tracking-wide">
                    {MONTH_ABBR[date.getMonth()]}
                  </span>
                )}
                {count > 0 && (
                  <>
                    <span className="text-[10px] font-semibold leading-none">
                      {formatIdr(total)}
                    </span>
                    <span className="text-[9px] opacity-70 leading-none">
                      {count} tx
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Monthly Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5">
          <div className="text-xs text-slate-500 dark:text-white/40 mb-1">Days with Spending</div>
          <div className="text-2xl font-semibold">
            {Object.values(dailyTotals).filter((d) => d.total > 0).length}
          </div>
        </div>
        <div className="glass-card p-5">
          <div className="text-xs text-slate-500 dark:text-white/40 mb-1">Total Transactions</div>
          <div className="text-2xl font-semibold">
            {Object.values(dailyTotals).reduce((s, d) => s + d.count, 0)}
          </div>
        </div>
        <div className="glass-card p-5">
          <div className="text-xs text-slate-500 dark:text-white/40 mb-1">Period Spend</div>
          <div className="text-2xl font-semibold">
            {formatIdr(Object.values(dailyTotals).reduce((s, d) => s + d.total, 0))}
          </div>
        </div>
      </div>

      {/* Day Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-slate-500 dark:text-white/40" />
              {selectedDateLabel}
            </DialogTitle>
            <DialogDescription>
              {selectedDayData
                ? `${selectedDayData.count} transaction${selectedDayData.count !== 1 ? 's' : ''} · Total ${formatIdr(selectedDayData.total)}`
                : 'No transactions on this day'}
            </DialogDescription>
          </DialogHeader>

          {selectedDayData && selectedDayData.transactions.length > 0 ? (
            <div className="rounded-xl border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Paid</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedDayData.transactions
                    .sort((a, b) => {
                      const da = new Date(a.created_time || a.date).getTime();
                      const db = new Date(b.created_time || b.date).getTime();
                      return db - da;
                    })
                    .map((tx) => {
                      const typeClass =
                        tx.type === 'cash'
                          ? 'text-mint-500 dark:text-mint-400'
                          : tx.type === 'credit_payment'
                          ? 'text-gold-600 dark:text-gold-400'
                          : 'text-coral-500 dark:text-coral-400';
                      const typeLabel =
                        tx.type === 'cash' ? 'Cash' : tx.type === 'credit_payment' ? 'Credit Pay' : 'Credit';
                      return (
                        <TableRow key={tx.id}>
                          <TableCell className="font-medium">{tx.title}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{tx.category}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">{formatIdr(tx.amount)}</TableCell>
                          <TableCell className={`${typeClass} text-xs font-semibold uppercase`}>{typeLabel}</TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={`text-[10px] ${
                                tx.done
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                  : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                              }`}
                            >
                              {tx.done ? 'Paid' : 'Unpaid'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-slate-500 dark:text-white/30">
              No transactions recorded for this day.
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button size="sm" variant="secondary" onClick={() => setDialogOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
