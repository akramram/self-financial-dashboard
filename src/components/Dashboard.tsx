import React, { useState, useMemo } from 'react';
import type { Transaction, NetworthRecord, MonthlySummary } from '../lib/data';
import { formatIdr } from '../lib/utils';
import { updateTransactionApi, deleteTransactionApi, toggleTransactionDoneApi } from '../lib/api';
import OutcomeChart from './OutcomeChart';
import NetworthChart from './NetworthChart';
import CategoryChart from './CategoryChart';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  const months = useMemo(() => [...summaries].reverse().map((s) => s.month), [summaries]);
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
    ? Math.max(0, Math.min(100, ((latest.income - latest.outcome.total) / latest.income) * 100))
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

  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort(
      (a, b) => parseCreatedTime(b).getTime() - parseCreatedTime(a).getTime()
    );
  }, [filteredTransactions]);

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
        <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Period:</label>
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

      {/* Outcome Breakdown — TOP */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <h2 className="text-lg font-semibold mb-4">Outcome Breakdown ({latest?.month})</h2>
        <div className="space-y-4 max-w-xl">
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
            const budgetPct = latest?.income > 0
              ? Math.min(100, Math.max(0, ((latest?.outcome.total ?? 0) / latest.income) * 100))
              : 0;
            const budgetColor = budgetPct > 80 ? 'bg-red-500' : budgetPct > 50 ? 'bg-amber-500' : 'bg-emerald-500';
            return (
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600 dark:text-slate-300">Budget Used</span>
                  <span className={`font-semibold ${budgetPct > 80 ? 'text-red-600 dark:text-red-400' : budgetPct > 50 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {budgetPct.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div className={`${budgetColor} h-2 rounded-full transition-all`} style={{ width: `${budgetPct}%` }} />
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {formatIdr(latest?.outcome.total ?? 0)} spent of {formatIdr(latest?.income ?? 0)}
                </p>
              </div>
            );
          })()}

          <div className="border-t border-slate-200 dark:border-slate-700" />

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
          <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Current Month Credit Expenses</span>
              <span className="font-semibold">{formatIdr(latest?.outcome.credit_expenses ?? 0)}</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">These will be paid next month</p>
          </div>
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
                <TableHead>Paid</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Type</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedTransactions.map((row) => {
                const isEditing = editingId === row.id;
                const typeClass =
                  row.type === 'cash'
                    ? 'text-blue-600 dark:text-blue-400'
                    : row.type === 'credit_payment'
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-purple-600 dark:text-purple-400';
                const typeLabel =
                  row.type === 'cash' ? 'Cash' : row.type === 'credit_payment' ? 'Credit Pay' : 'Credit';
                const createdDate = parseCreatedTime(row);
                const dateStr = isNaN(createdDate.getTime())
                  ? row.date
                  : createdDate.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });

                if (isEditing) {
                  return (
                    <TableRow key={row.id} className="bg-muted/30">
                      <TableCell>
                        <label className="inline-flex items-center cursor-pointer gap-2">
                          <input
                            type="checkbox"
                            checked={!!editForm.done}
                            onChange={(e) => handleChange('done', e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="text-xs">{editForm.done ? 'Paid' : 'Unpaid'}</span>
                        </label>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          value={editForm.title ?? ''}
                          onChange={(e) => handleChange('title', e.target.value)}
                          className="h-8 text-xs"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          value={editForm.category ?? ''}
                          onChange={(e) => handleChange('category', e.target.value)}
                          className="h-8 text-xs"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          value={editForm.created_time ?? ''}
                          onChange={(e) => handleChange('created_time', e.target.value)}
                          className="h-8 text-xs"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={editForm.amount ?? 0}
                          onChange={(e) => handleChange('amount', Number(e.target.value))}
                          className="h-8 text-xs text-right"
                        />
                      </TableCell>
                      <TableCell>
                        <Select value={editForm.type ?? 'cash'} onValueChange={(v) => handleChange('type', v)}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TYPE_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" className="h-7 text-xs" onClick={saveEdit}>Save</Button>
                          <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={cancelEdit}>Cancel</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                }

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
                      <Badge variant="secondary">{row.category}</Badge>
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

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold mb-4">Networth Trend</h2>
          <NetworthChart data={filteredNetworth} />
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold mb-4">
            {isAllTime ? 'Latest Month Categories' : `${latest.month} Categories`}
          </h2>
          {latest?.category_totals && Object.keys(latest.category_totals).length > 0 ? (
            <CategoryChart data={latest.category_totals} />
          ) : (
            <p className="text-slate-500 text-sm">No category data available.</p>
          )}
        </div>
      </div>

      {/* Summary Cards — BOTTOM */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Total Income {isAllTime ? '(Latest)' : `(${latest.month})`}
          </p>
          <p className="text-2xl font-bold mt-2">{formatIdr(latest?.income ?? 0)}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Total Outcome {isAllTime ? '(Latest)' : `(${latest.month})`}
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
            Savings Rate {isAllTime ? '(Latest)' : `(${latest.month})`}
          </p>
          <p className="text-2xl font-bold mt-2">{savingsRate.toFixed(1)}%</p>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mt-3">
            <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${Math.min(100, savingsRate)}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
