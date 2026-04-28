import React, { useState, useMemo } from 'react';
import type { Transaction, NetworthRecord, MonthlySummary } from '../lib/data';
import { formatIdr } from '../lib/utils';
import { updateTransactionApi, deleteTransactionApi } from '../lib/api';
import OutcomeChart from './OutcomeChart';
import NetworthChart from './NetworthChart';
import CategoryChart from './CategoryChart';

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

  return (
    <div className="space-y-6">
      {/* Month Filter */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Period:</label>
        <select
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"
        >
          <option value="all">All-time</option>
          {months.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      {/* Summary Cards */}
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

      {/* Outcome Breakdown */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <h2 className="text-lg font-semibold mb-4">Outcome Breakdown ({latest?.month})</h2>
        <div className="space-y-4 max-w-xl">
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
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Current Month Credit Expenses</span>
              <span className="font-semibold">{formatIdr(latest?.outcome.credit_expenses ?? 0)}</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">These will be paid next month</p>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Transactions ({latest?.month})</h2>
          <a href="/transactions" className="text-xs text-blue-500 hover:text-blue-700">View all →</a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium text-right">Amount</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredTransactions
                .sort((a, b) => parseCreatedTime(b).getTime() - parseCreatedTime(a).getTime())
                .slice(0, 10)
                .map((row) => {
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
                      <tr key={row.id} className="bg-slate-50 dark:bg-slate-700/30">
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={editForm.title ?? ''}
                            onChange={(e) => handleChange('title', e.target.value)}
                            className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={editForm.category ?? ''}
                            onChange={(e) => handleChange('category', e.target.value)}
                            className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={editForm.created_time ?? ''}
                            onChange={(e) => handleChange('created_time', e.target.value)}
                            className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            value={editForm.amount ?? 0}
                            onChange={(e) => handleChange('amount', Number(e.target.value))}
                            className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs text-right"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <select
                            value={editForm.type ?? 'cash'}
                            onChange={(e) => handleChange('type', e.target.value)}
                            className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs"
                          >
                            {TYPE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex gap-1">
                            <button onClick={saveEdit} className="px-2 py-1 rounded bg-emerald-600 text-white text-xs hover:bg-emerald-700">Save</button>
                            <button onClick={cancelEdit} className="px-2 py-1 rounded bg-slate-300 dark:bg-slate-600 text-xs hover:bg-slate-400 dark:hover:bg-slate-500">Cancel</button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="px-4 py-3">{row.title}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 rounded-full text-xs bg-slate-100 dark:bg-slate-700">{row.category}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">{dateStr}</td>
                      <td className="px-4 py-3 font-medium text-right">{formatIdr(row.amount)}</td>
                      <td className={`px-4 py-3 ${typeClass} text-xs font-semibold uppercase`}>{typeLabel}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => startEdit(row)} className="text-blue-500 hover:text-blue-700 text-xs">Edit</button>
                          <button
                            onClick={async () => {
                              if (confirm('Delete this transaction?')) {
                                await deleteTransactionApi(row.id);
                                window.location.reload();
                              }
                            }}
                            className="text-red-500 hover:text-red-700 text-xs"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
