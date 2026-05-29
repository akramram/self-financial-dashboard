import React, { useState, useEffect } from 'react';
import { createNetworth, fetchNetworth } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

  useEffect(() => {
    fetchNetworth().then((all) => {
      if (all.length === 0) return;
      const latest = all[all.length - 1];
      if (latest) {
        const [latestMonth, latestYear] = latest.month.split(' ');
        if (latestMonth && MONTH_OPTIONS.includes(latestMonth)) {
          setMonth(latestMonth);
        }
        if (latestYear) {
          setYear(Number(latestYear));
        }
        if (latest.breakdown && Object.keys(latest.breakdown).length > 0) {
          setBreakdown({ ...latest.breakdown });
        }
      }
    });
  }, []);

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
    const monthIdx = MONTH_OPTIONS.indexOf(month) + 1;
    const date = `${year}-${String(monthIdx).padStart(2, '0')}-21`;
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
    <Card>
      <CardHeader>
        <CardTitle>Add / Update Networth</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {message && (
            <Badge variant="outline" className="w-full justify-start px-3 py-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800">
              {message}
            </Badge>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Month</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_OPTIONS.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Year</Label>
              <Input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <Label>Breakdown</Label>
              <Button type="button" variant="outline" size="sm" onClick={addBreakdownItem}>
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
                    onChange={(e) => handleBreakdownChange(key, e.target.value)}
                    placeholder="0"
                    className="w-32"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeBreakdownItem(key)}
                    className="text-red-500 hover:text-red-700"
                  >
                    ✕
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-muted">
            <p className="text-sm font-medium">
              Total: IDR {Object.values(breakdown).reduce((s, v) => s + v, 0).toLocaleString('id-ID')}
            </p>
          </div>

          <Button type="submit" className="w-full">
            Add / Update Networth
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
