import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { Transaction, NetworthRecord, MonthlySummary, Category } from '../lib/data';
import { formatIdr, getActivePeriod } from '../lib/utils';
import { updateTransactionApi, deleteTransactionApi, toggleTransactionDoneApi, fetchCategories } from '../lib/api';
import OutcomeChart from './OutcomeChart';
import NetworthChart from './NetworthChart';
import CategoryChart from './CategoryChart';
import CategoryTrendChart from './CategoryTrendChart';
import SavingsRateChart from './SavingsRateChart';
import FinancialInsights from './FinancialInsights';
import OutcomeBarChart from './OutcomeBarChart';
import MonthKickoffModal from './MonthKickoffModal';
import { fetchRecurringTransactions } from '../lib/api';
import { useSortState } from '../hooks/useSortState';
import SortableHeader from './SortableHeader';
import EditTransactionDialog from './EditTransactionDialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
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

function parseCreatedTime(tx: Transaction): Date {
  if (tx.created_time) {
    const d = new Date(tx.created_time);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date(tx.date);
}

const TYPE_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'credit_expense', label: 'Credit Expense' },
  { value: 'credit_payment', label: 'Credit Payment' },
];

interface Props {
  transactions: Transaction[];
  networth: NetworthRecord[];
  summaries: MonthlySummary[];
}

export default function Dashboard({ transactions, networth, summaries }: Props) {
  const activePeriod = useMemo(() => {
    const { month, year } = getActivePeriod();
    return `${month} ${year}`;
  }, []);
  const dbMonths = useMemo(() => [...summaries].map((s) => s.month), [summaries]);
  const months = useMemo(() => {
    // Active period first (even if no data yet), then existing DB months in reverse
    const set = new Set(dbMonths);
    const list = set.has(activePeriod)
      ? [activePeriod, ...dbMonths.filter((m) => m !== activePeriod).reverse()]
      : [activePeriod, ...dbMonths.reverse()];
    return list;
  }, [dbMonths, activePeriod]);
  const [filterMonth, setFilterMonth] = useState<string>('all');

  const isAllTime = filterMonth === 'all';

  const activeSummary = useMemo(() => {
    if (isAllTime) return summaries[summaries.length - 1];
    return summaries.find((s) => s.month === filterMonth) ?? summaries[summaries.length - 1];
  }, [filterMonth, summaries, isAllTime]);

  const filteredSummaries = useMemo(() => {
    if (isAllTime) return summaries;
    return summaries.filter((s) => s.month === filterMonth);
  }, [filterMonth, summaries, isAllTime]);

  const filteredNetworth = useMemo(() => {
    if (isAllTime) return networth;
    return networth.filter((n) => n.month === filterMonth);
  }, [filterMonth, networth, isAllTime]);

  const filteredTransactions = useMemo(() => {
    if (!activeSummary) return [];
    if (isAllTime) return transactions.filter((t) => t.month === activeSummary.month);
    return transactions.filter((t) => t.month === filterMonth);
  }, [filterMonth, transactions, activeSummary, isAllTime]);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Transaction>>({});

  const startEdit = (row: Transaction) => {
    setEditingId(row.id);
    setEditForm({ ...row });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async () => {
    if (!editForm.id) return;
    const original = transactions.find((t) => t.id === editForm.id);
    if (!original) return;
    const updated: Transaction = { ...original, ...(editForm as Transaction) };
    await updateTransactionApi(updated.id, updated);
    setEditingId(null);
    setEditForm({});
    window.location.reload();
  };

  const handleChange = (field: keyof Transaction, value: string | number | boolean) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const latest = activeSummary;
  const latestNetworth = filteredNetworth[filteredNetworth.length - 1] ?? networth[networth.length - 1];

  const savingsRate = latest?.income > 0
    ? Math.min(100, ((latest.income - latest.outcome.total) / latest.income) * 100)
    : 0;

  const cashPct = latest?.outcome.total > 0
    ? Math.round((latest.outcome.cash / latest.outcome.total) * 100)
    : 0;
  const creditPct = latest?.outcome.total > 0
    ? Math.round((latest.outcome.credit_payment / latest.outcome.total) * 100)
    : 0;

  // Pagination state for transactions
  const [txPage, setTxPage] = useState(1);
  const txPerPage = 10;

  const [categories, setCategories] = useState<Category[]>([]);
  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {});
  }, []);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // Month kickoff banner state
  const [kickoffBanner, setKickoffBanner] = useState<{
    show: boolean;
    currentMonth: string;
    nextMonth: string;
    recurringCount: number;
  } | null>(null);
  const [kickoffOpen, setKickoffOpen] = useState(false);

  useEffect(() => {
    // Check if we should show the salary kickoff banner
    const today = new Date();
    if (today.getDate() < 21) return;

    const latest = summaries[summaries.length - 1];
    if (!latest) return;

    // Compute next month
    const latestDate = new Date(latest.month + ' 1');
    const nextDate = new Date(latestDate);
    nextDate.setMonth(nextDate.getMonth() + 1);
    const nextMonthStr = nextDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    // Check if next month already has data (income or transactions) via the kickoff API
    fetch('/api/kickoff')
      .then((res) => res.json())
      .then((status: { hasNextMonth: boolean; nextMonth: string | null }) => {
        if (status.hasNextMonth) {
          setKickoffBanner(null);
          return; // Already started — hide banner
        }

        // Fetch active recurring count
        fetchRecurringTransactions().then((recurring) => {
          const activeCount = recurring.filter((r) => r.active).length;
          setKickoffBanner({
            show: true,
            currentMonth: latest.month,
            nextMonth: status.nextMonth || nextMonthStr,
            recurringCount: activeCount,
          });
        }).catch(() => {});
      })
      .catch(() => {});
  }, [summaries]);

  const openCategoryDialog = (cat: string) => {
    setSelectedCategory(cat);
    setDialogOpen(true);
  };

  const categoryMap = useMemo(() => {
    const map: Record<string, Category> = {};
    categories.forEach((c) => { map[c.name] = c; });
    return map;
  }, [categories]);

  const { toggleSort, sortData, isSorted } = useSortState();

  const getTxCellValue = useCallback((t: Transaction, key: string): string | number => {
    switch (key) {
      case 'paid': return t.done ? 1 : 0;
      case 'title': return t.title;
      case 'category': return t.category;
      case 'date': return new Date(t.created_time || t.date).getTime();
      case 'amount': return t.amount;
      case 'type': return t.type;
      default: return '';
    }
  }, []);

  const sortedTransactions = useMemo(() => {
    return sortData(filteredTransactions, getTxCellValue, (data) =>
      [...data].sort((a, b) => parseCreatedTime(b).getTime() - parseCreatedTime(a).getTime())
    );
  }, [filteredTransactions, sortData, getTxCellValue]);

  const totalTxPages = Math.max(1, Math.ceil(sortedTransactions.length / txPerPage));
  const pagedTransactions = sortedTransactions.slice(
    (txPage - 1) * txPerPage,
    txPage * txPerPage
  );

  const goToPage = (page: number) => {
    const clamped = Math.max(1, Math.min(totalTxPages, page));
    setTxPage(clamped);
  };

  return (
    <div className="space-y-6">
      {/* Month Filter */}
      <div className="flex items-center gap-3">
        <Label className="text-sm font-medium text-slate-600 dark:text-slate-300">Period:</Label>
        <Select value={filterMonth} onValueChange={(v) => { setFilterMonth(v); setTxPage(1); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All-time</SelectItem>
            {months.map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Salary Kickoff Banner */}
      {kickoffBanner?.show && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-900/20 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              💰 Have you received your salary for {kickoffBanner.currentMonth}?
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
              Confirm to start {kickoffBanner.nextMonth} with {kickoffBanner.recurringCount} recurring transaction{kickoffBanner.recurringCount !== 1 ? 's' : ''} preloaded.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setKickoffBanner((prev) => prev ? { ...prev, show: false } : null)}
            >
              Later
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => setKickoffOpen(true)}
            >
              Confirm & Start {kickoffBanner.nextMonth}
            </Button>
          </div>
        </div>
      )}

      <MonthKickoffModal
        open={kickoffOpen}
        onOpenChange={setKickoffOpen}
        nextMonth={kickoffBanner?.nextMonth || ''}
        recurringCount={kickoffBanner?.recurringCount || 0}
        onSuccess={() => {
          setKickoffBanner(null);
          window.location.reload();
        }}
      />

      {/* Financial Insights */}
      <FinancialInsights
        transactions={transactions}
        networth={networth}
        summaries={summaries}
        categories={categories}
        activeMonth={isAllTime ? activeSummary?.month : filterMonth}
      />

      {/* Outcome Breakdown — TOP */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <h2 className="text-lg font-semibold mb-4">Outcome Breakdown ({latest?.month})</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          {/* Total Income */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-600 dark:text-slate-300">Total Income</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatIdr(latest?.income ?? 0)}</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
              <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '100%' }} />
            </div>
          </div>

          {/* Budget Used */}
          {(() => {
            const rawBudgetPct = latest?.income > 0
              ? ((latest?.outcome.total ?? 0) / latest.income) * 100
              : 0;
            const budgetPct = Math.max(0, rawBudgetPct);
            const visualBudgetPct = Math.min(100, budgetPct);
            const isOverBudget = budgetPct > 100;
            const budgetColor = isOverBudget
              ? 'bg-red-600'
              : budgetPct > 80
                ? 'bg-red-500'
                : budgetPct > 50
                  ? 'bg-amber-500'
                  : 'bg-emerald-500';
            const budgetTextColor = isOverBudget
              ? 'text-red-700 dark:text-red-300'
              : budgetPct > 80
                ? 'text-red-600 dark:text-red-400'
                : budgetPct > 50
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-emerald-600 dark:text-emerald-400';
            return (
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600 dark:text-slate-300">Budget Used</span>
                  <span className={`font-semibold ${budgetTextColor}`}>
                    {budgetPct.toFixed(1)}%
                    {isOverBudget && <span className="ml-1 text-xs">(Over)</span>}
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div className={`${budgetColor} h-2 rounded-full transition-all`} style={{ width: `${visualBudgetPct}%` }} />
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {formatIdr(latest?.outcome.total ?? 0)} spent of {formatIdr(latest?.income ?? 0)}
                </p>
              </div>
            );
          })()}

          <div className="border-t border-slate-200 dark:border-slate-700 md:col-span-2" />

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-600 dark:text-slate-300">Cash Expenses</span>
              <span className="font-semibold">{formatIdr(latest?.outcome.cash ?? 0)}</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
              <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${cashPct}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-600 dark:text-slate-300">Credit Payment (Prior Month)</span>
              <span className="font-semibold">{formatIdr(latest?.outcome.credit_payment ?? 0)}</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
              <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${creditPct}%` }} />
            </div>
          </div>
          <div className="md:col-span-2 pt-2 border-t border-slate-200 dark:border-slate-700">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Current Month Credit Expenses</span>
              <span className="font-semibold">{formatIdr(latest?.outcome.credit_expenses ?? 0)}</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">These will be paid next month</p>
          </div>

          {/* Category Budgets */}
          {latest?.category_totals && Object.keys(latest.category_totals).length > 0 && (
            <div className="md:col-span-2 pt-4 border-t border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-semibold mb-3 text-slate-700 dark:text-slate-200">Category Budgets</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                {Object.entries(latest.category_totals)
                  .sort(([, a], [, b]) => b - a)
                  .map(([cat, amount]) => {
                    const limit = categoryMap[cat]?.monthly_limit ?? 0;
                    const catColor = categoryMap[cat]?.color;
                    const trackStyle = catColor
                      ? { backgroundColor: `${catColor}26` } // 15% opacity hex
                      : undefined;
                    if (limit <= 0) {
                      return (
                        <div key={cat} className="cursor-pointer" onClick={() => openCategoryDialog(cat)}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-slate-600 dark:text-slate-300">{cat}</span>
                            <span className="font-semibold">{formatIdr(amount)}</span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5" style={trackStyle}>
                            <div className="h-1.5 rounded-full" style={{ width: '100%', backgroundColor: catColor || '#94a3b8' }} />
                          </div>
                        </div>
                      );
                    }
                    const pct = Math.min(100, (amount / limit) * 100);
                    const isOver = amount > limit;
                    const barColor = isOver ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-emerald-500';
                    const textColor = isOver ? 'text-red-600 dark:text-red-400' : pct > 80 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400';
                    return (
                      <div key={cat} className="cursor-pointer" onClick={() => openCategoryDialog(cat)}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-600 dark:text-slate-300">{cat}</span>
                          <span className={`font-semibold ${textColor}`}>
                            {formatIdr(amount)} / {formatIdr(limit)}
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5" style={trackStyle}>
                          <div className={`${barColor} h-1.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Transactions — TOP (paginated) */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Transactions ({latest?.month})</h2>
          <a href="/transactions" className="text-xs text-blue-500 hover:text-blue-700">View all →</a>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader sortKey="paid" currentDirection={isSorted('paid')} onSort={toggleSort}>Paid</SortableHeader>
                <SortableHeader sortKey="title" currentDirection={isSorted('title')} onSort={toggleSort}>Title</SortableHeader>
                <SortableHeader sortKey="category" currentDirection={isSorted('category')} onSort={toggleSort}>Category</SortableHeader>
                <SortableHeader sortKey="date" currentDirection={isSorted('date')} onSort={toggleSort}>Date</SortableHeader>
                <SortableHeader sortKey="amount" currentDirection={isSorted('amount')} onSort={toggleSort} className="text-right">Amount</SortableHeader>
                <SortableHeader sortKey="type" currentDirection={isSorted('type')} onSort={toggleSort}>Type</SortableHeader>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedTransactions.map((row) => {
                const createdDate = parseCreatedTime(row);
                const dateStr = isNaN(createdDate.getTime())
                  ? row.date
                  : createdDate.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });

                const typeClass =
                  row.type === 'cash'
                    ? 'text-blue-600 dark:text-blue-400'
                    : row.type === 'credit_payment'
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-purple-600 dark:text-purple-400';
                const typeLabel =
                  row.type === 'cash' ? 'Cash' : row.type === 'credit_payment' ? 'Credit Pay' : 'Credit';

                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          await toggleTransactionDoneApi(row.id, !row.done);
                          window.location.reload();
                        }}
                        className={`h-7 text-xs font-semibold px-2 py-0 ${
                          row.done
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'
                        }`}
                      >
                        {row.done ? 'Paid' : 'Unpaid'}
                      </Button>
                    </TableCell>
                    <TableCell>{row.title}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        style={{
                          backgroundColor: categoryMap[row.category]?.color || undefined,
                          color: categoryMap[row.category]?.color ? '#fff' : undefined,
                        }}
                      >
                        {row.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">{dateStr}</TableCell>
                    <TableCell className="font-medium text-right">{formatIdr(row.amount)}</TableCell>
                    <TableCell className={`${typeClass} text-xs font-semibold uppercase`}>{typeLabel}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-blue-500 hover:text-blue-700" onClick={() => startEdit(row)}>Edit</Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500 hover:text-red-700" onClick={async () => {
                          if (confirm('Delete this transaction?')) {
                            await deleteTransactionApi(row.id);
                            window.location.reload();
                          }
                        }}>Delete</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <EditTransactionDialog
          open={editingId !== null}
          transaction={editForm}
          onChange={handleChange}
          onSave={saveEdit}
          onCancel={cancelEdit}
          months={months}
          categories={categories.map(c => c.name)}
        />

        {/* Pagination controls */}
        {sortedTransactions.length > txPerPage && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Showing {(txPage - 1) * txPerPage + 1}–{Math.min(txPage * txPerPage, sortedTransactions.length)} of {sortedTransactions.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(txPage - 1)}
                disabled={txPage <= 1}
              >
                Previous
              </Button>
              <span className="text-xs text-slate-500 dark:text-slate-400 min-w-[3rem] text-center">
                {txPage} / {totalTxPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(txPage + 1)}
                disabled={txPage >= totalTxPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Outcome Chart */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <h2 className="text-lg font-semibold mb-4">Cash Outcome vs Credit Payment by Month</h2>
        <OutcomeChart data={filteredSummaries} />
      </div>

      {/* Savings Rate Trend */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <h2 className="text-lg font-semibold mb-4">Savings Rate Trend</h2>
        <SavingsRateChart data={filteredSummaries} />
      </div>

      {/* Category Spending Trend */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Category Spending Trend</h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">Top categories by total spend</span>
        </div>
        <CategoryTrendChart data={filteredSummaries} categories={categories} />
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold mb-4">Networth Trend</h2>
          <NetworthChart data={filteredNetworth} />
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold mb-4">
            {isAllTime ? 'Latest Month Categories' : `${latest?.month ?? ''} Categories`}
          </h2>
          {latest?.category_totals && Object.keys(latest.category_totals).length > 0 ? (
            <CategoryChart data={latest.category_totals} categories={categories} onCategoryClick={openCategoryDialog} />
          ) : (
            <p className="text-slate-500 text-sm">No category data available.</p>
          )}
        </div>
      </div>

      {/* Summary Cards — BOTTOM */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Total Income {isAllTime ? '(Latest)' : `(${latest?.month ?? ''})`}
          </p>
          <p className="text-2xl font-bold mt-2">{formatIdr(latest?.income ?? 0)}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Total Outcome {isAllTime ? '(Latest)' : `(${latest?.month ?? ''})`}
          </p>
          <p className="text-2xl font-bold mt-2">{formatIdr(latest?.outcome.total ?? 0)}</p>
          <p className="text-xs text-slate-400 mt-1">Cash + Credit Payment</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Net Worth {isAllTime ? '(Latest)' : `(${latestNetworth?.month ?? ''})`}
          </p>
          <p className="text-2xl font-bold mt-2">{formatIdr(latestNetworth?.total ?? 0)}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Savings Rate {isAllTime ? '(Latest)' : `(${latest?.month ?? ''})`}
          </p>
          <p className="text-2xl font-bold mt-2" style={{ color: savingsRate < 0 ? '#ef4444' : undefined }}>{savingsRate.toFixed(1)}%</p>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mt-3">
            <div className={`h-2 rounded-full transition-all ${savingsRate < 0 ? 'bg-red-500 ml-auto' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, Math.abs(savingsRate))}%` }} />
          </div>
        </div>
      </div>
      {/* Category Transactions Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedCategory} — {isAllTime ? activeSummary?.month : filterMonth}</DialogTitle>
            <DialogDescription>
              {(() => {
                const targetMonth = isAllTime ? activeSummary?.month : filterMonth;
                const catTxs = transactions.filter((t) => t.category === selectedCategory && t.month === targetMonth);
                const total = catTxs.reduce((sum, t) => sum + t.amount, 0);
                return `${catTxs.length} transaction${catTxs.length !== 1 ? 's' : ''} • Total: ${formatIdr(total)}`;
              })()}
            </DialogDescription>
          </DialogHeader>

          {/* Outcome by Category Bar Chart */}
          <div className="mt-2 mb-4">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
              Outcome by Category
            </h4>
            <OutcomeBarChart
              data={activeSummary?.category_totals || {}}
              categories={categories}
              highlightCategory={selectedCategory}
              summaries={summaries}
            />
          </div>

          <div className="mt-2">
            {(() => {
              const targetMonth = isAllTime ? activeSummary?.month : filterMonth;
              const catTxs = transactions
                .filter((t) => t.category === selectedCategory && t.month === targetMonth)
                .sort((a, b) => parseCreatedTime(b).getTime() - parseCreatedTime(a).getTime());
              if (catTxs.length === 0) {
                return <p className="text-sm text-slate-500">No transactions found for this category.</p>;
              }
              return (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {catTxs.map((t) => {
                      const d = parseCreatedTime(t);
                      const dateStr = isNaN(d.getTime())
                        ? t.date
                        : d.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });
                      const typeLabel =
                        t.type === 'cash' ? 'Cash' : t.type === 'credit_payment' ? 'Credit Pay' : 'Credit';
                      return (
                        <TableRow key={t.id}>
                          <TableCell className="font-medium">{t.title}</TableCell>
                          <TableCell className="text-muted-foreground text-xs">{dateStr}</TableCell>
                          <TableCell className="text-right font-medium">{formatIdr(t.amount)}</TableCell>
                          <TableCell className="text-xs font-semibold uppercase">
                            <Badge variant="outline">{typeLabel}</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
