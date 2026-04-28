import React, { useState, useMemo } from 'react';
import type { Transaction } from '../lib/data';
import { updateTransactionApi, deleteTransactionApi, toggleTransactionDoneApi } from '../lib/api';
import { formatIdr } from '../lib/utils';

interface Props {
  transactions: Transaction[];
  showMonth?: boolean;
}

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

export default function TransactionTable({ transactions, showMonth = true }: Props) {
  const [page, setPage] = useState(1);
  const [filterType, setFilterType] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Transaction>>({});
  const rowsPerPage = 25;

  const sorted = useMemo(() => {
    return [...transactions].sort((a, b) => {
      const da = parseCreatedTime(a);
      const db = parseCreatedTime(b);
      return db.getTime() - da.getTime();
    });
  }, [transactions]);

  let filtered = sorted;
  if (filterType !== 'all') {
    filtered = filtered.filter((t) => t.type === filterType);
  }
  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter((t) =>
      t.title.toLowerCase().includes(q) || t.category.toLowerCase().includes(q)
    );
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const start = (page - 1) * rowsPerPage;
  const pageRows = filtered.slice(start, start + rowsPerPage);

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

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="Search title or category..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm flex-1"
        />
        <select
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"
        >
          <option value="all">All Types</option>
          <option value="cash">Cash</option>
          <option value="credit_expense">Credit Expense</option>
          <option value="credit_payment">Credit Payment</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 font-medium">Paid</th>
              {showMonth && <th className="px-4 py-3 font-medium">Month</th>}
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium text-right">Amount</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {pageRows.map((row) => {
              const isEditing = editingId === row.id;
              const createdDate = parseCreatedTime(row);
              const dateStr = isNaN(createdDate.getTime())
                ? row.date
                : createdDate.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });

              if (isEditing) {
                return (
                  <tr key={row.id} className="bg-slate-50 dark:bg-slate-700/30">
                    <td className="px-4 py-2">
                      <label className="inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!editForm.done}
                          onChange={(e) => handleChange('done', e.target.checked)}
                          className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="ml-2 text-xs">{editForm.done ? 'Paid' : 'Unpaid'}</span>
                      </label>
                    </td>
                    {showMonth && (
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={editForm.month ?? ''}
                          onChange={(e) => handleChange('month', e.target.value)}
                          className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs"
                        />
                      </td>
                    )}
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
                        placeholder="Created time"
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
                        <button
                          onClick={saveEdit}
                          className="px-2 py-1 rounded bg-emerald-600 text-white text-xs hover:bg-emerald-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-2 py-1 rounded bg-slate-300 dark:bg-slate-600 text-xs hover:bg-slate-400 dark:hover:bg-slate-500"
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }

              const typeClass =
                row.type === 'cash'
                  ? 'text-blue-600 dark:text-blue-400'
                  : row.type === 'credit_payment'
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-purple-600 dark:text-purple-400';
              const typeLabel =
                row.type === 'cash' ? 'Cash' : row.type === 'credit_payment' ? 'Credit Pay' : 'Credit';

              return (
                <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="px-4 py-3">
                    <button
                      onClick={async () => {
                        await toggleTransactionDoneApi(row.id, !row.done);
                        window.location.reload();
                      }}
                      className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                        row.done
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'
                      }`}
                    >
                      {row.done ? 'Paid' : 'Unpaid'}
                    </button>
                  </td>
                  {showMonth && <td className="px-4 py-3 font-medium">{row.month}</td>}
                  <td className="px-4 py-3">{row.title}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded-full text-xs bg-slate-100 dark:bg-slate-700">{row.category}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">{dateStr}</td>
                  <td className="px-4 py-3 font-medium text-right">{formatIdr(row.amount)}</td>
                  <td className={`px-4 py-3 ${typeClass} text-xs font-semibold uppercase`}>{typeLabel}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(row)}
                        className="text-blue-500 hover:text-blue-700 text-xs"
                      >
                        Edit
                      </button>
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

      <div className="flex justify-between items-center mt-4">
        <span className="text-xs text-slate-500 dark:text-slate-400">
          Showing {start + 1}-{Math.min(start + rowsPerPage, filtered.length)} of {filtered.length}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 rounded bg-slate-200 dark:bg-slate-700 text-xs hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50"
          >
            Prev
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 rounded bg-slate-200 dark:bg-slate-700 text-xs hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
