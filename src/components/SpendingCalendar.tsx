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

function parseMonthYear(monthStr: string): { year: number; monthIndex: number } {
  const d = new Date(`${monthStr} 1`);
  if (!isNaN(d.getTime())) {
    return { year: d.getFullYear(), monthIndex: d.getMonth() };
  }
  // Fallback: try to parse manually
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

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function formatDateKey(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

function parseTxDate(tx: Transaction): string | null {
  // created_time is the actual transaction timestamp; date is just the period start (always 1st)
  const raw = tx.created_time || tx.date;
  if (!raw) return null;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function SpendingCalendar({ transactions, periods }: Props) {
  // Build month options from periods prop (post-migration: transactions have no month column)
  const monthOptions = useMemo(() => {
    if (periods && periods.length > 0) {
      return [...periods].reverse().map((p) => p.month);
    }
    // Fallback: derive from created_time dates when periods not provided
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
    if (monthOptions.length > 0) return monthOptions[monthOptions.length - 1];
    const now = new Date();
    return `${now.toLocaleDateString('en-US', { month: 'long' })} ${now.getFullYear()}`;
  });

  useEffect(() => {
    if (monthOptions.length > 0 && !monthOptions.includes(selectedMonth)) {
      setSelectedMonth(monthOptions[monthOptions.length - 1]);
    }
  }, [monthOptions, selectedMonth]);

  const { year, monthIndex } = useMemo(() => parseMonthYear(selectedMonth), [selectedMonth]);

  const daysInMonth = useMemo(() => getDaysInMonth(year, monthIndex), [year, monthIndex]);
  const firstDay = useMemo(() => getFirstDayOfMonth(year, monthIndex), [year, monthIndex]);

  // Find the period_id for the selected month
  const selectedPeriodId = useMemo(() => {
    if (!periods) return null;
    const match = periods.find((p) => p.month === selectedMonth);
    return match ? match.period_id : null;
  }, [periods, selectedMonth]);

  // Filter transactions to the selected period (by period_id when available, fallback to date matching)
  const periodTransactions = useMemo(() => {
    if (selectedPeriodId !== null) {
      return transactions.filter((t) => t.period_id === selectedPeriodId);
    }
    // Fallback: match by created_time month/year
    return transactions.filter((tx) => {
      const raw = tx.created_time || tx.date || '';
      const d = new Date(raw);
      if (isNaN(d.getTime())) return false;
      return d.getFullYear() === year && d.getMonth() === monthIndex;
    });
  }, [transactions, selectedPeriodId, year, monthIndex]);

  const dailyTotals = useMemo(() => {
    const map: Record<string, { total: number; count: number; transactions: Transaction[] }> = {};
    periodTransactions.forEach((tx) => {
      const dateKey = parseTxDate(tx);
      if (!dateKey) return;

      if (!map[dateKey]) {
        map[dateKey] = { total: 0, count: 0, transactions: [] };
      }
      map[dateKey].total += tx.amount;
      map[dateKey].count += 1;
      map[dateKey].transactions.push(tx);
    });
    return map;
  }, [periodTransactions]);

  const maxDaily = useMemo(() => {
    const totals = Object.values(dailyTotals).map((d) => d.total);
    return totals.length > 0 ? Math.max(...totals) : 0;
  }, [dailyTotals]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const openDay = (day: number) => {
    setSelectedDay(day);
    setDialogOpen(true);
  };

  const selectedDayKey = selectedDay != null ? formatDateKey(year, monthIndex, selectedDay) : null;
  const selectedDayData = selectedDayKey ? dailyTotals[selectedDayKey] : null;

  const goToPrevMonth = () => {
    const idx = monthOptions.indexOf(selectedMonth);
    if (idx > 0) setSelectedMonth(monthOptions[idx - 1]);
  };

  const goToNextMonth = () => {
    const idx = monthOptions.indexOf(selectedMonth);
    if (idx >= 0 && idx < monthOptions.length - 1) setSelectedMonth(monthOptions[idx + 1]);
  };

  const getHeatColor = (total: number) => {
    if (total === 0) return 'bg-white/[0.02] text-white/20';
    if (maxDaily === 0) return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400';
    const ratio = total / maxDaily;
    if (ratio <= 0.25) return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400';
    if (ratio <= 0.5) return 'bg-emerald-200 dark:bg-emerald-800/40 text-emerald-800 dark:text-emerald-300';
    if (ratio <= 0.75) return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
    return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
  };

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === monthIndex;
  const todayDay = today.getDate();

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
        <div className="flex items-center gap-4 text-sm text-white/40">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-emerald-200 dark:bg-emerald-800/40" />
            <span>Low</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-amber-100 dark:bg-amber-900/30" />
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
        <h3 className="text-base font-semibold flex items-center gap-2 text-white/80">
            <CalendarDays className="w-4 h-4 text-white/40" />
            Spending Heatmap — {selectedMonth}
            {selectedPeriodId && (
              <span className="text-xs font-normal text-white/40">
                (Period transactions)
              </span>
            )}
          </h3>
        <div className="grid grid-cols-7 gap-1">
            {WEEKDAYS.map((wd) => (
              <div key={wd} className="text-center text-xs font-medium text-white/30 py-2">
                {wd}
              </div>
            ))}
            {days.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className="aspect-square" />;
              }
              const dateKey = formatDateKey(year, monthIndex, day);
              const data = dailyTotals[dateKey];
              const total = data?.total ?? 0;
              const count = data?.count ?? 0;
              const isToday = isCurrentMonth && day === todayDay;
              const heatClass = getHeatColor(total);

              return (
                <button
                  key={day}
                  onClick={() => openDay(day)}
                  className={`
                    aspect-square rounded-lg border transition-all hover:scale-105 hover:shadow-sm
                    flex flex-col items-center justify-center gap-0.5
                    ${heatClass}
                    ${isToday ? 'ring-2 ring-blue-500 ring-offset-1 ring-offset-navy-950' : 'border-white/[0.06]'}
                    ${count > 0 ? 'cursor-pointer' : 'cursor-default'}
                  `}
                >
                  <span className={`text-xs font-medium ${isToday ? 'text-blue-400' : ''}`}>
                    {day}
                  </span>
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
          <div className="text-xs text-white/40 mb-1">Days with Spending</div>
            <div className="text-2xl font-semibold">
              {Object.values(dailyTotals).filter((d) => d.total > 0).length}
            </div>
          </div>
        <div className="glass-card p-5">
          <div className="text-xs text-white/40 mb-1">Total Transactions</div>
            <div className="text-2xl font-semibold">
              {Object.values(dailyTotals).reduce((s, d) => s + d.count, 0)}
            </div>
          </div>
        <div className="glass-card p-5">
          <div className="text-xs text-white/40 mb-1">Monthly Spend</div>
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
              <CalendarDays className="w-5 h-5 text-white/40" />
              {selectedMonth} {selectedDay}
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
                          ? 'text-blue-600 dark:text-blue-400'
                          : tx.type === 'credit_payment'
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-purple-600 dark:text-purple-400';
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
            <div className="py-8 text-center text-sm text-white/30">
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
