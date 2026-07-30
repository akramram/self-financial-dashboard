import React, { useState, useEffect, useMemo } from 'react';
import type { MonthlyIncome } from '../lib/api';
import { fetchMonthlyIncome, upsertMonthlyIncomeApi, updateMonthlyIncomeApi, deleteMonthlyIncomeApi } from '../lib/api';
import { formatIdr } from '../lib/utils';
import { useConfirm } from './ConfirmDialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const MONTH_OPTIONS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function IncomeSettings() {
  const { confirm: confirmAction } = useConfirm();
  const [incomes, setIncomes] = useState<MonthlyIncome[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMonth, setEditingMonth] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<MonthlyIncome>>({});

  const [newMonth, setNewMonth] = useState('January');
  const [newYear, setNewYear] = useState(new Date().getFullYear());
  const [newIncome, setNewIncome] = useState('');
  const [newOtherIncome, setNewOtherIncome] = useState('');

  useEffect(() => {
    fetchMonthlyIncome()
      .then((rows) => {
        setIncomes(rows);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const sortedIncomes = useMemo(() => {
    return [...incomes].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [incomes]);

  const startEdit = (row: MonthlyIncome) => {
    setEditingMonth(row.month);
    setEditForm({ ...row });
  };

  const cancelEdit = () => {
    setEditingMonth(null);
    setEditForm({});
  };

  const saveEdit = async () => {
    if (!editingMonth || editForm.income == null) return;
    await updateMonthlyIncomeApi(editingMonth, {
      income: Number(editForm.income),
      other_income: Number(editForm.other_income ?? 0),
    });
    setIncomes((prev) =>
      prev.map((i) =>
        i.month === editingMonth
          ? { ...i, income: Number(editForm.income), other_income: Number(editForm.other_income ?? 0) }
          : i
      )
    );
    setEditingMonth(null);
    setEditForm({});
  };

  const handleDelete = async (month: string) => {
    const confirmed = await confirmAction({
      title: 'Delete Income Entry',
      description: `Delete income entry for ${month}?`,
      confirmLabel: 'Delete',
      variant: 'destructive',
    });
    if (!confirmed) return;
    await deleteMonthlyIncomeApi(month);
    setIncomes((prev) => prev.filter((i) => i.month !== month));
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const monthName = `${newMonth} ${newYear}`;
    const monthIdx = MONTH_OPTIONS.indexOf(newMonth) + 1;
    const date = `${newYear}-${String(monthIdx).padStart(2, '0')}-21`;
    const incomeVal = Number(newIncome);
    if (!newIncome || isNaN(incomeVal)) return;

    await upsertMonthlyIncomeApi({
      month: monthName,
      date,
      income: incomeVal,
      other_income: Number(newOtherIncome || 0),
    });

    setIncomes((prev) => {
      const filtered = prev.filter((i) => i.month !== monthName);
      return [...filtered, { month: monthName, date, income: incomeVal, other_income: Number(newOtherIncome || 0) }];
    });

    setNewMonth('January');
    setNewYear(new Date().getFullYear());
    setNewIncome('');
    setNewOtherIncome('');
  };

  return (
    <div className="glass-card p-5">
      
        <h3 className="text-slate-800 dark:text-white/80">Monthly Income</h3>
      
      
        {/* Add Form */}
        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="space-y-1.5 flex-1">
            <Label>Month</Label>
            <div className="flex gap-2">
              <select
                value={newMonth}
                onChange={(e) => setNewMonth(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
              >
                {MONTH_OPTIONS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <Input
                type="number"
                value={newYear}
                onChange={(e) => setNewYear(Number(e.target.value))}
                className="w-28"
              />
            </div>
          </div>
          <div className="space-y-1.5 flex-1">
            <Label>Income</Label>
            <Input
              type="number"
              value={newIncome}
              onChange={(e) => setNewIncome(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="space-y-1.5 flex-1">
            <Label>Other Income</Label>
            <Input
              type="number"
              value={newOtherIncome}
              onChange={(e) => setNewOtherIncome(e.target.value)}
              placeholder="0"
            />
          </div>
          <Button type="submit" className="h-9">Add / Update</Button>
        </form>

        {/* Table */}
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : sortedIncomes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No income entries yet.</p>
        ) : (
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Income</TableHead>
                  <TableHead className="text-right">Other Income</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedIncomes.map((row) => {
                  const isEditing = editingMonth === row.month;
                  if (isEditing) {
                    return (
                      <TableRow key={row.month} className="bg-muted/30">
                        <TableCell className="font-medium">{row.month}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={editForm.income ?? 0}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, income: Number(e.target.value) }))}
                            className="h-8 text-xs text-right"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={editForm.other_income ?? 0}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, other_income: Number(e.target.value) }))}
                            className="h-8 text-xs text-right"
                          />
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {formatIdr((editForm.income ?? 0) + (editForm.other_income ?? 0))}
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
                    <TableRow key={row.month}>
                      <TableCell className="font-medium">{row.month}</TableCell>
                      <TableCell className="text-right">{formatIdr(row.income)}</TableCell>
                      <TableCell className="text-right">{formatIdr(row.other_income ?? 0)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatIdr(row.income + (row.other_income ?? 0))}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-mint-500 hover:text-mint-600" onClick={() => startEdit(row)}>
                            Edit
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500 hover:text-red-700" onClick={() => handleDelete(row.month)}>
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      
    </div>
  );
}
