import React, { useState } from 'react';
import { createTransaction } from '../lib/api';

const MONTH_OPTIONS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function AddTransactionForm() {
  const [month, setMonth] = useState('May');
  const [year, setYear] = useState(2026);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'cash' | 'credit_expense' | 'credit_payment'>('cash');
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount) {
      setMessage('Title and amount are required.');
      return;
    }
    const monthName = `${month} ${year}`;
    const date = `${year}-${String(MONTH_OPTIONS.indexOf(month) + 1).padStart(2, '0')}-01`;

    await createTransaction({
      month: monthName,
      date,
      title,
      category: category || title.split(' ')[0],
      amount: Number(amount),
      currency: 'IDR',
      type,
      payment_method: type === 'cash' ? 'Cash' : 'Credit',
      done,
      created_time: new Date().toISOString(),
    });

    setMessage('Transaction added successfully!');
    setTitle('');
    setCategory('');
    setAmount('');
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {message && (
        <div className="p-3 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 text-sm">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Month</label>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
          >
            {MONTH_OPTIONS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Year</label>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. 🏠 Kontrakan"
          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Category</label>
        <input
          type="text"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="e.g. 🏠 Kontrakan"
          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
        />
        <p className="text-xs text-slate-400 mt-1">Leave blank to use first word of title</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Amount (IDR)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="1000000"
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as any)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
          >
            <option value="cash">Cash Expense</option>
            <option value="credit_expense">Credit Expense</option>
            <option value="credit_payment">Credit Payment</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="done"
          type="checkbox"
          checked={done}
          onChange={(e) => setDone(e.target.checked)}
          className="rounded border-slate-300"
        />
        <label htmlFor="done" className="text-sm text-slate-600 dark:text-slate-300">Paid / Done</label>
      </div>

      <button
        type="submit"
        className="w-full px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition"
      >
        Add Transaction
      </button>
    </form>
  );
}
