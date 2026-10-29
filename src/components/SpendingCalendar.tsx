import React, { useMemo, useState, useEffect } from 'react';
import type { Transaction, Category } from '../lib/data';
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
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Filter,
  Sparkles,
  Zap,
  CheckCircle2,
  TrendingUp,
  DollarSign,
  CreditCard,
  Banknote,
  RotateCcw,
  Flame,
  Calendar,
} from 'lucide-react';

interface PeriodOption {
  period_id: number;
  month: string;
}

interface Props {
  transactions: Transaction[];
  periods?: PeriodOption[];
  categories?: Category[];
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseMonthYear(monthStr: string): { year: number; monthIndex: number } {
  const d = new Date(`${monthStr} 1`);
  if (!isNaN(d.getTime())) {
    return { year: d.getFullYear(), monthIndex: d.getMonth() };
  }
  const parts = monthStr.split(' ');
  const monthNames = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december',
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

export default function SpendingCalendar({ transactions, periods, categories }: Props) {
  const monthOptions = useMemo(() => {
    if (periods && periods.length > 0) {
      return [...periods].reverse().map((p) => p.month);
    }
    const set = new Set<string>();
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
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

  // Salary cycle period range: 21st of previous month to 20th of selected month
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
    return `${MONTH_ABBR[first.getMonth()]} ${first.getDate()} to ${MONTH_ABBR[last.getMonth()]} ${last.getDate()}`;
  }, [periodDates, selectedMonth]);

  const selectedPeriodId = useMemo(() => {
    if (!periods) return null;
    const match = periods.find((p) => p.month === selectedMonth);
    return match ? match.period_id : null;
  }, [periods, selectedMonth]);

  // All transactions belonging to this salary cycle period
  const rawPeriodTransactions = useMemo(() => {
    if (selectedPeriodId !== null) {
      return transactions.filter((t) => t.period_id === selectedPeriodId);
    }
    return transactions.filter((tx) => {
      const raw = tx.created_time || tx.date || '';
      const d = new Date(raw);
      if (isNaN(d.getTime())) return false;
      const prevMonth = monthIndex === 0 ? 11 : monthIndex - 1;
      const prevMonthYear = monthIndex === 0 ? year - 1 : year;
      const start = new Date(prevMonthYear, prevMonth, 21);
      const end = new Date(year, monthIndex, 20, 23, 59, 59);
      return d >= start && d <= end;
    });
  }, [transactions, selectedPeriodId, year, monthIndex]);

  // Available categories in the current period
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    rawPeriodTransactions.forEach((tx) => {
      if (tx.category) cats.add(tx.category);
    });
    if (categories && categories.length > 0) {
      categories.forEach((c) => cats.add(c.name));
    }
    return Array.from(cats).sort();
  }, [rawPeriodTransactions, categories]);

  // Filtering states
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<'all' | 'cash' | 'credit' | 'payment'>('all');
  const [intensityFilter, setIntensityFilter] = useState<'all' | 'high' | 'medium' | 'low' | 'zero'>('all');
  const [noSpendMode, setNoSpendMode] = useState<boolean>(false);

  // Filtered transactions for heatmap and day calculation
  const filteredTransactions = useMemo(() => {
    return rawPeriodTransactions.filter((tx) => {
      if (selectedCategory !== 'all' && tx.category !== selectedCategory) {
        return false;
      }
      if (selectedType === 'cash' && tx.type !== 'cash') {
        return false;
      }
      if (selectedType === 'credit' && tx.type !== 'credit_expense') {
        return false;
      }
      if (selectedType === 'payment' && tx.type !== 'credit_payment') {
        return false;
      }
      if (selectedType === 'all') {
        // By default 'all' shows direct expenses (cash and credit card charges)
        // If user specifically wants credit payment, they select the payment filter
        return tx.type !== 'credit_payment';
      }
      return true;
    });
  }, [rawPeriodTransactions, selectedCategory, selectedType]);

  // Daily aggregates
  const dailyTotals = useMemo(() => {
    const map: Record<string, { total: number; count: number; transactions: Transaction[] }> = {};
    filteredTransactions.forEach((tx) => {
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
  }, [filteredTransactions]);

  const maxDaily = useMemo(() => {
    const totals = Object.values(dailyTotals).map((d) => d.total);
    return totals.length > 0 ? Math.max(...totals) : 0;
  }, [dailyTotals]);

  // KPI Metrics
  const metrics = useMemo(() => {
    const totalDays = periodDates.length;
    const totals = Object.values(dailyTotals);
    const totalSpend = totals.reduce((sum, d) => sum + d.total, 0);
    const totalTxCount = totals.reduce((sum, d) => sum + d.count, 0);
    const daysWithSpend = totals.filter((d) => d.total > 0).length;
    const noSpendDays = Math.max(0, totalDays - daysWithSpend);
    const noSpendRate = totalDays > 0 ? Math.round((noSpendDays / totalDays) * 100) : 0;
    const dailyAverage = totalDays > 0 ? Math.round(totalSpend / totalDays) : 0;
    const activeDailyAverage = daysWithSpend > 0 ? Math.round(totalSpend / daysWithSpend) : 0;

    // Peak spending day
    let peakDayKey: string | null = null;
    let peakAmount = 0;
    Object.entries(dailyTotals).forEach(([dKey, data]) => {
      if (data.total > peakAmount) {
        peakAmount = data.total;
        peakDayKey = dKey;
      }
    });

    let peakDayLabel = 'None';
    if (peakDayKey) {
      const pDate = new Date(peakDayKey + 'T00:00:00');
      if (!isNaN(pDate.getTime())) {
        peakDayLabel = `${MONTH_ABBR[pDate.getMonth()]} ${pDate.getDate()}`;
      }
    }

    // Weekday vs Weekend spending
    let weekdaySpend = 0;
    let weekendSpend = 0;
    periodDates.forEach((date) => {
      const dKey = dateKey(date);
      const spent = dailyTotals[dKey]?.total || 0;
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        weekendSpend += spent;
      } else {
        weekdaySpend += spent;
      }
    });

    const weekendPct = totalSpend > 0 ? Math.round((weekendSpend / totalSpend) * 100) : 0;

    return {
      totalDays,
      totalSpend,
      totalTxCount,
      daysWithSpend,
      noSpendDays,
      noSpendRate,
      dailyAverage,
      activeDailyAverage,
      peakDayLabel,
      peakAmount,
      weekdaySpend,
      weekendSpend,
      weekendPct,
    };
  }, [periodDates, dailyTotals]);

  // Weekday breakdown (Sun to Sat) for the mini rhythm bar
  const weekdayStats = useMemo(() => {
    const stats = WEEKDAYS.map((name, i) => ({
      dayIndex: i,
      name,
      total: 0,
      count: 0,
    }));

    periodDates.forEach((date) => {
      const dKey = dateKey(date);
      const data = dailyTotals[dKey];
      if (data) {
        const dow = date.getDay();
        stats[dow].total += data.total;
        stats[dow].count += data.count;
      }
    });

    const maxWeekdayTotal = Math.max(...stats.map((s) => s.total), 1);
    return stats.map((s) => ({
      ...s,
      pctOfMax: Math.round((s.total / maxWeekdayTotal) * 100),
    }));
  }, [periodDates, dailyTotals]);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  const openDay = (dKey: string) => {
    setSelectedDateKey(dKey);
    setDialogOpen(true);
  };

  const addForDay = (dKey: string) => {
    window.dispatchEvent(new CustomEvent('quick-add-open', { detail: { date: dKey } }));
  };

  const selectedDayData = selectedDateKey ? dailyTotals[selectedDateKey] : null;

  const selectedDateLabel = useMemo(() => {
    if (!selectedDateKey) return '';
    const d = new Date(selectedDateKey + 'T00:00:00');
    if (isNaN(d.getTime())) return selectedDateKey;
    const weekday = WEEKDAY_NAMES[d.getDay()];
    return `${weekday}, ${MONTH_ABBR[d.getMonth()]} ${d.getDate()} ${d.getFullYear()}`;
  }, [selectedDateKey]);

  // Category breakdown for selected day
  const selectedDayCategoryBreakdown = useMemo(() => {
    if (!selectedDayData || selectedDayData.transactions.length === 0) return [];
    const catMap: Record<string, number> = {};
    selectedDayData.transactions.forEach((tx) => {
      catMap[tx.category] = (catMap[tx.category] || 0) + tx.amount;
    });
    return Object.entries(catMap)
      .map(([category, amount]) => ({
        category,
        amount,
        pct: selectedDayData.total > 0 ? Math.round((amount / selectedDayData.total) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [selectedDayData]);

  // Cash vs Credit breakdown for selected day
  const selectedDayTypeBreakdown = useMemo(() => {
    if (!selectedDayData || selectedDayData.transactions.length === 0) return { cash: 0, credit: 0, payment: 0 };
    let cash = 0;
    let credit = 0;
    let payment = 0;
    selectedDayData.transactions.forEach((tx) => {
      if (tx.type === 'cash') cash += tx.amount;
      else if (tx.type === 'credit_expense') credit += tx.amount;
      else if (tx.type === 'credit_payment') payment += tx.amount;
    });
    return { cash, credit, payment };
  }, [selectedDayData]);

  const goToPrevMonth = () => {
    const idx = monthOptions.indexOf(selectedMonth);
    if (idx > 0) setSelectedMonth(monthOptions[idx - 1]);
  };

  const goToNextMonth = () => {
    const idx = monthOptions.indexOf(selectedMonth);
    if (idx >= 0 && idx < monthOptions.length - 1) setSelectedMonth(monthOptions[idx + 1]);
  };

  const resetFilters = () => {
    setSelectedCategory('all');
    setSelectedType('all');
    setIntensityFilter('all');
    setNoSpendMode(false);
  };

  const hasActiveFilters =
    selectedCategory !== 'all' ||
    selectedType !== 'all' ||
    intensityFilter !== 'all' ||
    noSpendMode;

  const getHeatColor = (total: number, isZeroDay: boolean) => {
    if (noSpendMode && isZeroDay) {
      return 'bg-mint-500/20 text-mint-700 dark:text-mint-300 border-mint-500/40 shadow-sm';
    }
    if (total === 0) {
      return 'bg-slate-100 dark:bg-white/[0.02] text-slate-500 dark:text-white/40 border-slate-200 dark:border-white/[0.06]';
    }
    if (maxDaily === 0) {
      return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40';
    }

    const ratio = total / maxDaily;
    if (ratio <= 0.25) {
      return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40';
    }
    if (ratio <= 0.5) {
      return 'bg-emerald-200 dark:bg-emerald-800/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/50';
    }
    if (ratio <= 0.75) {
      return 'bg-gold-500/10 dark:bg-gold-500/20 text-gold-700 dark:text-gold-300 border-gold-400/30 dark:border-gold-500/30';
    }
    return 'bg-coral-500/15 dark:bg-coral-500/25 text-coral-700 dark:text-coral-300 border-coral-400/30 dark:border-coral-500/40 font-semibold';
  };

  // Weekday alignment grid
  const firstDayOfWeek = periodDates.length > 0 ? periodDates[0].getDay() : 0;
  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  cells.push(...periodDates);

  const todayKey = dateKey(new Date());

  return (
    <div className="space-y-6">
      {/* Top Header & Period Selector */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPrevMonth}
            disabled={monthOptions.indexOf(selectedMonth) <= 0}
            aria-label="Previous salary period"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[210px] font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextMonth}
            disabled={monthOptions.indexOf(selectedMonth) >= monthOptions.length - 1}
            aria-label="Next salary period"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-white/60">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10" />
            <span>Zero</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-300 dark:border-emerald-800" />
            <span>Low</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-gold-500/10 dark:bg-gold-500/20 border border-gold-400/40" />
            <span>Med</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-coral-500/15 dark:bg-coral-500/25 border border-coral-400/40" />
            <span>Peak</span>
          </div>
          <span className="hidden lg:inline text-[11px] text-slate-500 dark:text-white/40 pl-2 border-l border-slate-200 dark:border-white/[0.08]">
            Tap day for details or right click to add
          </span>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="glass-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-white/50 mb-1">
            <span>Period Spend</span>
            <DollarSign className="w-3.5 h-3.5 text-mint-500" />
          </div>
          <div className="text-lg md:text-xl font-bold text-slate-900 dark:text-white truncate">
            {formatIdr(metrics.totalSpend)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-white/40 mt-1">
            {metrics.totalTxCount} transactions
          </div>
        </div>

        <div className="glass-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-white/50 mb-1">
            <span>Daily Average</span>
            <TrendingUp className="w-3.5 h-3.5 text-gold-500" />
          </div>
          <div className="text-lg md:text-xl font-bold text-slate-900 dark:text-white truncate">
            {formatIdr(metrics.dailyAverage)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-white/40 mt-1">
            across {metrics.totalDays} days
          </div>
        </div>

        <div className="glass-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-white/50 mb-1">
            <span>No-Spend Days</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-lg md:text-xl font-bold text-emerald-600 dark:text-emerald-400">
            {metrics.noSpendDays} <span className="text-xs font-normal text-slate-500 dark:text-white/50">days</span>
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400/80 mt-1 font-medium">
            {metrics.noSpendRate}% zero-spend rate
          </div>
        </div>

        <div className="glass-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-white/50 mb-1">
            <span>Peak Day</span>
            <Flame className="w-3.5 h-3.5 text-coral-500" />
          </div>
          <div className="text-lg md:text-xl font-bold text-slate-900 dark:text-white truncate">
            {metrics.peakDayLabel}
          </div>
          <div className="text-[11px] text-coral-500 dark:text-coral-400 mt-1 truncate font-medium">
            {metrics.peakAmount > 0 ? formatIdr(metrics.peakAmount) : 'No spend'}
          </div>
        </div>

        <div className="glass-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-white/50 mb-1">
            <span>Weekend Spend</span>
            <Calendar className="w-3.5 h-3.5 text-sky-500" />
          </div>
          <div className="text-lg md:text-xl font-bold text-slate-900 dark:text-white truncate">
            {formatIdr(metrics.weekendSpend)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-white/40 mt-1">
            {metrics.weekendPct}% of total spend
          </div>
        </div>

        <div className="glass-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-white/50 mb-1">
            <span>Active Days</span>
            <Zap className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-lg md:text-xl font-bold text-slate-900 dark:text-white">
            {metrics.daysWithSpend} <span className="text-xs font-normal text-slate-500 dark:text-white/50">/ {metrics.totalDays}</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-white/40 mt-1 truncate">
            avg {metrics.daysWithSpend > 0 ? formatIdr(metrics.activeDailyAverage) : 0}/act
          </div>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="glass-card p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-white/70 mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          {/* Category Filter */}
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="h-8 text-xs w-[140px] md:w-[160px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {availableCategories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Type Filter */}
          <Select value={selectedType} onValueChange={(val: any) => setSelectedType(val)}>
            <SelectTrigger className="h-8 text-xs w-[130px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Expenses</SelectItem>
              <SelectItem value="cash">Cash Only</SelectItem>
              <SelectItem value="credit">Credit Only</SelectItem>
              <SelectItem value="payment">CC Payments</SelectItem>
            </SelectContent>
          </Select>

          {/* No-Spend Days Toggle */}
          <Button
            size="sm"
            variant={noSpendMode ? 'default' : 'outline'}
            onClick={() => setNoSpendMode(!noSpendMode)}
            className={`h-8 text-xs gap-1.5 transition-colors ${
              noSpendMode ? 'bg-mint-600 hover:bg-mint-700 text-white' : ''
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            No-Spend Focus
          </Button>

          {hasActiveFilters && (
            <Button
              size="sm"
              variant="ghost"
              onClick={resetFilters}
              className="h-8 text-xs text-slate-500 hover:text-slate-800 dark:text-white/60 dark:hover:text-white"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Reset
            </Button>
          )}
        </div>

        {/* Quick Intensity Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs">
          <span className="text-slate-400 dark:text-white/30 text-[11px] whitespace-nowrap hidden sm:inline">Highlight:</span>
          {(['all', 'high', 'medium', 'low', 'zero'] as const).map((filterKey) => {
            const isActive = intensityFilter === filterKey;
            const labels = {
              all: 'All',
              high: 'Peak (>75%)',
              medium: 'Med (25-75%)',
              low: 'Low (<25%)',
              zero: 'Zero Spend',
            };
            return (
              <button
                key={filterKey}
                onClick={() => setIntensityFilter(filterKey)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-semibold shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] dark:text-white/60'
                }`}
              >
                {labels[filterKey]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div className="glass-card p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-4 border-b border-slate-200 dark:border-white/[0.06]">
          <h3 className="text-base font-semibold flex items-center gap-2 text-slate-900 dark:text-white">
            <CalendarDays className="w-4 h-4 text-mint-500" />
            Spending Heatmap: {periodLabel}
            <span className="text-xs font-normal text-slate-500 dark:text-white/40">
              ({selectedMonth} cycle)
            </span>
          </h3>

          <div className="text-xs text-slate-500 dark:text-white/50">
            {selectedCategory !== 'all' && (
              <span className="inline-flex items-center gap-1 font-medium text-mint-600 dark:text-mint-400 mr-2">
                Category: {selectedCategory}
              </span>
            )}
            {selectedType !== 'all' && (
              <span className="inline-flex items-center gap-1 font-medium text-gold-600 dark:text-gold-400">
                Type: {selectedType}
              </span>
            )}
          </div>
        </div>

        {/* Heatmap Grid */}
        <div className="grid grid-cols-7 gap-1.5 mt-4">
          {WEEKDAYS.map((wd) => (
            <div
              key={wd}
              className="text-center text-xs font-semibold text-slate-500 dark:text-white/50 py-1.5 uppercase tracking-wider"
            >
              {wd}
            </div>
          ))}

          {cells.map((date, idx) => {
            if (date === null) {
              return <div key={`empty-${idx}`} className="aspect-square rounded-lg" />;
            }

            const dKey = dateKey(date);
            const data = dailyTotals[dKey];
            const total = data?.total ?? 0;
            const count = data?.count ?? 0;
            const isToday = dKey === todayKey;
            const isFuture = date.getTime() > new Date(new Date().toDateString()).getTime();
            const isZeroDay = total === 0;

            // Intensity filter check
            let passesIntensity = true;
            if (intensityFilter === 'zero') passesIntensity = total === 0;
            else if (intensityFilter === 'low') passesIntensity = total > 0 && maxDaily > 0 && total / maxDaily <= 0.25;
            else if (intensityFilter === 'medium') passesIntensity = maxDaily > 0 && total / maxDaily > 0.25 && total / maxDaily <= 0.75;
            else if (intensityFilter === 'high') passesIntensity = maxDaily > 0 && total / maxDaily > 0.75;

            const isDimmed = !passesIntensity;
            const heatClass = getHeatColor(total, isZeroDay);
            const showMonthLabel = date.getDate() === 21 || date.getDate() === 1;
            const isMonthBoundary = date.getDate() === 1;

            return (
              <button
                key={dKey}
                onClick={() => {
                  if (count > 0) openDay(dKey);
                  else addForDay(dKey);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  addForDay(dKey);
                }}
                aria-label={`${dKey}${
                  count > 0 ? `: ${count} transactions, total ${formatIdr(total)}` : ': no transactions'
                }`}
                title={
                  count > 0
                    ? `${dKey}: ${count} tx, ${formatIdr(total)}. Click to view.`
                    : `${dKey}: No spending. Click to add transaction.`
                }
                className={`
                  aspect-square rounded-lg border transition-all p-1
                  flex flex-col items-center justify-center gap-0.5 relative group
                  ${heatClass}
                  ${isDimmed ? 'opacity-20 saturate-50' : 'hover:scale-[1.04] hover:shadow-md'}
                  ${
                    isToday
                      ? 'ring-2 ring-mint-500 ring-offset-2 ring-offset-slate-50 dark:ring-offset-navy-950 font-bold'
                      : ''
                  }
                  ${isMonthBoundary ? 'ring-1 ring-slate-400/40 dark:ring-white/20' : ''}
                  ${noSpendMode && isZeroDay ? 'ring-1 ring-mint-500/50' : ''}
                  ${count > 0 || !isFuture ? 'cursor-pointer' : 'cursor-default'}
                `}
              >
                {/* Date Number */}
                <span
                  className={`text-xs font-semibold leading-tight ${
                    isToday ? 'text-mint-600 dark:text-mint-400' : ''
                  }`}
                >
                  {date.getDate()}
                </span>

                {/* Month boundary label (e.g. Oct 21 or Nov 1) */}
                {showMonthLabel && (
                  <span className="text-[8px] font-bold opacity-60 leading-none uppercase tracking-wide">
                    {MONTH_ABBR[date.getMonth()]}
                  </span>
                )}

                {/* Amount and Count info */}
                {count > 0 ? (
                  <>
                    <span className="text-[10px] md:text-[11px] font-semibold leading-none tracking-tight">
                      {formatIdr(total)}
                    </span>
                    <span className="text-[9px] md:text-[10px] opacity-75 leading-none">
                      {count} tx
                    </span>
                  </>
                ) : (
                  noSpendMode && (
                    <span className="text-[8px] text-mint-600 dark:text-mint-400 font-semibold uppercase tracking-wider">
                      Zero
                    </span>
                  )
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Weekday Rhythm Breakdown Bar */}
      <div className="glass-card p-5">
        <h4 className="text-sm font-semibold text-slate-800 dark:text-white/90 mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gold-500" />
          Day-of-Week Spending Rhythm
          <span className="text-xs font-normal text-slate-500 dark:text-white/40">
            (Distribution across days of week)
          </span>
        </h4>

        <div className="grid grid-cols-7 gap-2">
          {weekdayStats.map((stat) => (
            <div
              key={stat.dayIndex}
              className="p-2.5 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-white/50 mb-1">
                <span>{stat.name}</span>
                <span className="text-[10px] opacity-75">{stat.count} tx</span>
              </div>
              <div className="text-xs md:text-sm font-bold text-slate-800 dark:text-white mb-2">
                {formatIdr(stat.total)}
              </div>
              <div className="w-full bg-slate-200 dark:bg-white/10 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-mint-500 h-full rounded-full transition-all"
                  style={{ width: `${stat.pctOfMax}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Day Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-2 pr-4">
              <span className="flex items-center gap-2 text-base md:text-lg">
                <CalendarDays className="w-5 h-5 text-mint-500" />
                {selectedDateLabel}
              </span>
              {selectedDayData && (
                <Badge variant="outline" className="text-xs font-bold text-mint-600 dark:text-mint-400 border-mint-500/30">
                  {formatIdr(selectedDayData.total)}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedDayData && selectedDayData.count > 0
                ? `${selectedDayData.count} transaction${
                    selectedDayData.count !== 1 ? 's' : ''
                  } recorded on this date`
                : 'No transactions recorded on this date'}
            </DialogDescription>
          </DialogHeader>

          {/* Day Category & Payment Mix Chips */}
          {selectedDayData && selectedDayData.transactions.length > 0 && (
            <div className="space-y-3 pt-1 pb-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-500 dark:text-white/50 mr-1">Categories:</span>
                {selectedDayCategoryBreakdown.map((item) => (
                  <span
                    key={item.category}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 text-xs text-slate-700 dark:text-white/80"
                  >
                    <span className="font-medium">{item.category}</span>
                    <span className="text-[11px] text-slate-500 dark:text-white/50">{formatIdr(item.amount)}</span>
                    <span className="text-[10px] text-mint-600 dark:text-mint-400 font-semibold">({item.pct}%)</span>
                  </span>
                ))}
              </div>

              {/* Cash vs Credit Pill */}
              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-white/60">
                {selectedDayTypeBreakdown.cash > 0 && (
                  <span className="flex items-center gap-1 text-mint-600 dark:text-mint-400">
                    <Banknote className="w-3.5 h-3.5" />
                    Cash: {formatIdr(selectedDayTypeBreakdown.cash)}
                  </span>
                )}
                {selectedDayTypeBreakdown.credit > 0 && (
                  <span className="flex items-center gap-1 text-coral-600 dark:text-coral-400">
                    <CreditCard className="w-3.5 h-3.5" />
                    Credit Card: {formatIdr(selectedDayTypeBreakdown.credit)}
                  </span>
                )}
                {selectedDayTypeBreakdown.payment > 0 && (
                  <span className="flex items-center gap-1 text-gold-600 dark:text-gold-400">
                    CC Payment: {formatIdr(selectedDayTypeBreakdown.payment)}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Transactions Table */}
          {selectedDayData && selectedDayData.transactions.length > 0 ? (
            <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedDayData.transactions
                    .slice()
                    .sort((a, b) => {
                      const da = new Date(a.created_time || a.date).getTime();
                      const db = new Date(b.created_time || b.date).getTime();
                      return db - da;
                    })
                    .map((tx) => {
                      const typeClass =
                        tx.type === 'cash'
                          ? 'text-mint-600 dark:text-mint-400'
                          : tx.type === 'credit_payment'
                          ? 'text-gold-600 dark:text-gold-400'
                          : 'text-coral-600 dark:text-coral-400';
                      const typeLabel =
                        tx.type === 'cash'
                          ? 'Cash'
                          : tx.type === 'credit_payment'
                          ? 'CC Pay'
                          : 'Credit';
                      return (
                        <TableRow
                          key={tx.id}
                          onClick={() => {
                            window.location.href = `/transactions?tid=${tx.id}`;
                          }}
                          className="cursor-pointer hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors"
                        >
                          <TableCell className="font-medium text-slate-900 dark:text-white">
                            {tx.title}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              {tx.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-slate-900 dark:text-white">
                            {formatIdr(tx.amount)}
                          </TableCell>
                          <TableCell className={`${typeClass} text-xs font-semibold uppercase`}>
                            {typeLabel}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={`text-[11px] font-medium ${
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
            <div className="py-8 text-center text-sm text-slate-500 dark:text-white/40">
              No transactions recorded for this day.
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-white/[0.06]">
            <Button
              size="sm"
              onClick={() => {
                setDialogOpen(false);
                addForDay(selectedDateKey!);
              }}
              className="bg-mint-600 hover:bg-mint-700 text-white gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Add for this day
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setDialogOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}