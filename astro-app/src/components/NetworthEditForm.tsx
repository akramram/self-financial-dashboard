import React, { useState, useEffect } from 'react';
import { fetchNetworth, updateNetworthApi } from '../lib/api';
import { formatIdr } from '../lib/utils';

export default function NetworthEditForm() {
  const [month, setMonth] = useState('');
  const [breakdown, setBreakdown] = useState<Record<string, number>>({});
  const [message, setMessage] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const m = params.get('month') || '';
    setMonth(m);
    fetchNetworth().then((all) => {
      const found = all.find((n) => n.month === m);
      if (found) {
        setBreakdown({ ...found.breakdown });
      }
      setLoaded(true);
    });
  }, []);

  const handleChange = (key: string, value: string) => {
    setBreakdown((prev) => ({ ...prev, [key]: Number(value) || 0 }));
  };

  const addItem = () => {
    const name = window.prompt('Enter investment name:');
    if (name) {
      setBreakdown((prev) => ({ ...prev, [name]: 0 }));
    }
  };

  const removeItem = (key: string) => {
    setBreakdown((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!month) return;
    const total = Object.values(breakdown).reduce((s, v) => s + v, 0);
    await updateNetworthApi(month, { month, date: '', total, currency: 'IDR', breakdown });
    setMessage('Networth updated successfully!');
    setTimeout(() => setMessage(''), 3000);
  };

  const total = Object.values(breakdown).reduce((s, v) => s + v, 0);

  if (!loaded) {
    return <p className="text-slate-500 text-sm">Loading...</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
      {message && (
        <div className="p-3 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 text-sm">
          {message}
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Month</label>
        <input
          type="text"
          value={month}
          readOnly
          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700/50"
        />
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Breakdown</label>
          <button
            type="button"
            onClick={addItem}
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
                onChange={(e) => handleChange(key, e.target.value)}
                placeholder="0"
                className="w-40 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"
              />
              <button
                type="button"
                onClick={() => removeItem(key)}
                className="text-red-500 hover:text-red-700 text-xs px-2"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-700/50">
        <p className="text-sm font-medium">Total: {formatIdr(total)}</p>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-violet-600 text-white font-medium hover:bg-violet-700 transition"
        >
          Save Changes
        </button>
        <a
          href="/networth"
          className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-sm font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}
