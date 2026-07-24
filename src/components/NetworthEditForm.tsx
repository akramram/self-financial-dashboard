import React, { useState, useEffect } from 'react';
import { fetchNetworth, updateNetworthApi } from '../lib/api';
import { formatIdr } from '../lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

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
    <div className="glass-card p-5 max-w-xl">
      
        <h3 className="text-white/80">Edit Networth</h3>
      
      
        <form onSubmit={handleSubmit} className="space-y-4">
          {message && (
            <Badge variant="outline" className="w-full justify-start px-3 py-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800">
              {message}
            </Badge>
          )}

          <div className="space-y-1.5">
            <Label>Month</Label>
            <Input
              type="text"
              value={month}
              readOnly
              className="bg-muted"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <Label>Breakdown</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                + Add Item
              </Button>
            </div>
            <div className="space-y-2">
              {Object.entries(breakdown).map(([key, value]) => (
                <div key={key} className="flex gap-2 items-center">
                  <Input
                    type="text"
                    value={key}
                    readOnly
                    className="flex-1 bg-muted"
                  />
                  <Input
                    type="number"
                    value={value}
                    onChange={(e) => handleChange(key, e.target.value)}
                    placeholder="0"
                    className="w-40"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(key)}
                    className="text-red-500 hover:text-red-700"
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-muted">
            <p className="text-sm font-medium">Total: {formatIdr(total)}</p>
          </div>

          <div className="flex gap-3">
            <Button type="submit">
              Save Changes
            </Button>
            <Button variant="secondary" asChild>
              <a href="/networth">Cancel</a>
            </Button>
          </div>
        </form>
      
    </div>
  );
}
