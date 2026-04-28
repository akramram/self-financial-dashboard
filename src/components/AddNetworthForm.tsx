import React, { useState } from 'react';
import { createNetworth } from '../lib/api';

const MONTH_OPTIONS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function AddNetworthForm() {
  const [month, setMonth] = useState('May');
  const [year, setYear] = useState(2026);
  const [breakdown, setBreakdown] = useState<Record<string, number>>({
    'CashCow Jenius': 0,
    'Saham': 0,
    'Saham Luar': 0,
    'Reksa Dana': 0,
    'Cash': 0,
  });
  const [message, setMessage] = useState('');

  const handleBreakdownChange = (key: string, value: string) => {
    setBreakdown((prev) => ({ ...prev, [key]: Number(value) || 0 }));
  };

  const addBreakdownItem = () => {
    const name = prompt('Enter investment name:');
    if (name) {
      setBreakdown((prev) => ({ ...prev, [name]: 0 }));
    }
  };

  const removeBreakdownItem = (key: string) => {
    setBreakdown((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const monthName = `${month} ${year}`;
    const date = `${year}-${String(MONTH_OPTIONS.indexOf(month) + 1).padStart(2, '0')}-01`;
    const total = Object.values(breakdown).reduce((s, v) => s + v, 0);

    await createNetworth({
      month: monthName,
      date,
      total,
      currency: 'IDR',
      month_over_month_change: null,
      month_over_month_pct: null,
      breakdown: { ...breakdown },
    });

    setMessage('Networth entry added successfully!');
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
        <div className="flex justify-between items-center mb-2">
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Breakdown</label>
          <button
            type="button"
            onClick={addBreakdownItem}
            className="text-xs px-2 py-1 rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600"
          >
            + Add Item
          </button>
        </div>
        <div className="space-y-2">
          {Object.entries(breakdown).map(([key, value]) => (
            <div key={key} className="flex gap-2 items-center">
              <input
                type="text"
                value={key}
                readOnly
                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700/50 text-sm"
              />
              <input
                type="number"
                value={value}
                onChange={(e) => handleBreakdownChange(key, e.target.value)}
                placeholder="0"
                className="w-32 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"
              />
              <button
                type="button"
                onClick={() => removeBreakdownItem(key)}
                className="text-red-500 hover:text-red-700 text-xs px-2"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-700/50">
        <p className="text-sm font-medium">
          Total: IDR {Object.values(breakdown).reduce((s, v) => s + v, 0).toLocaleString('id-ID')}
        </p>
      </div>

      <button
        type="submit"
        className="w-full px-4 py-2 rounded-lg bg-violet-600 text-white font-medium hover:bg-violet-700 transition"
      >
        Add / Update Networth
      </button>
    </form>
  );
}
