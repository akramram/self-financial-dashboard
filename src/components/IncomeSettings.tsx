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
import { Wallet, PlusCircle } from 'lucide-react';

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
    <div className="glass-card p-5 sm:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-mint-500/10 text-mint-600 dark:text-mint-400 flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Monthly Income</h3>
              <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-muted dark:bg-white/[0.06] text-muted-foreground">
                {incomes.length} months
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Set expected take-home salary and other income per pacing period.</p>
          </div>
        </div>
      </div>

      {/* Add Form */}
      <form onSubmit={handleAdd} className="p-4 sm:p-5 rounded-xl border border-border/80 dark:border-white/[0.08] bg-surface space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div className="space-y-1.5 sm:col-span-1">
            <Label className="text-xs">Month & Year</Label>
            <div className="flex gap-2">
              <select
                value={newMonth}
                onChange={(e) => setNewMonth(e.target.value)}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {MONTH_OPTIONS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <Input
                type="number"
                value={newYear}
                onChange={(e) => setNewYear(Number(e.target.value))}
                className="w-24 h-9 text-xs"
              />
            </div>
          </div>
          <div className="space-y-1.5 sm:col-span-1">
            <Label className="text-xs">Primary Income (IDR)</Label>
            <Input
              type="number"
              value={newIncome}
              onChange={(e) => setNewIncome(e.target.value)}
              placeholder="0"
              className="h-9 text-xs"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-1">
            <Label className="text-xs">Other Income (IDR)</Label>
            <Input
              type="number"
              value={newOtherIncome}
              onChange={(e) => setNewOtherIncome(e.target.value)}
              placeholder="0"
              className="h-9 text-xs"
            />
          </div>
          <div className="sm:col-span-1">
            <Button type="submit" className="w-full h-9 text-xs font-semibold gap-1.5">
              <PlusCircle className="w-3.5 h-3.5" />
              Add / Update
            </Button>
          </div>
        </div>
      </form>

      {/* Desktop Table View */}
      {loading ? (
        <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>
      ) : sortedIncomes.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">No income entries yet.</div>
      ) : (
        <div className="hidden md:block rounded-xl border border-border/80 dark:border-white/[0.06] overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 dark:bg-white/[0.02]">
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Income</TableHead>
                <TableHead className="text-right">Other Income</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-32 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedIncomes.map((row) => {
                const isEditing = editingMonth === row.month;
                const total = (row.income || 0) + (row.other_income || 0);

                if (isEditing) {
                  return (
                    <TableRow key={row.month} className="bg-muted/30">
                      <TableCell className="font-medium text-xs">{row.month}</TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          value={editForm.income ?? ''}
                          onChange={(e) => setEditForm((p) => ({ ...p, income: Number(e.target.value) }))}
                          className="h-8 text-xs text-right w-36 ml-auto"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          value={editForm.other_income ?? ''}
                          onChange={(e) => setEditForm((p) => ({ ...p, other_income: Number(e.target.value) }))}
                          className="h-8 text-xs text-right w-36 ml-auto"
                        />
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold">
                        {formatIdr((Number(editForm.income) || 0) + (Number(editForm.other_income) || 0))}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button size="sm" className="h-7 text-xs font-semibold px-2.5" onClick={saveEdit}>
                            Save
                          </Button>
                          <Button size="sm" variant="secondary" className="h-7 text-xs px-2.5" onClick={cancelEdit}>
                            Cancel
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                }

                return (
                  <TableRow key={row.month} className="hover:bg-muted/30">
                    <TableCell className="font-semibold text-xs text-slate-900 dark:text-white">
                      {row.month}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {formatIdr(row.income)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      {row.other_income ? formatIdr(row.other_income) : '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatIdr(total)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2.5 text-xs text-mint-600 dark:text-mint-400 hover:text-mint-700 hover:bg-mint-500/10"
                          onClick={() => startEdit(row)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2.5 text-xs text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-500/10"
                          onClick={() => handleDelete(row.month)}
                        >
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

      {/* Mobile Card List View */}
      <div className="md:hidden rounded-xl border border-border/80 dark:border-white/[0.06] divide-y divide-border/80 dark:divide-white/[0.06] overflow-hidden">
        {loading ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">Loading...</div>
        ) : sortedIncomes.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No income entries yet.
          </div>
        ) : (
          sortedIncomes.map((row) => {
            const isEditing = editingMonth === row.month;
            const total = (row.income || 0) + (row.other_income || 0);

            if (isEditing) {
              return (
                <div key={row.month} className="p-4 bg-muted/30 space-y-3">
                  <p className="font-semibold text-sm text-slate-900 dark:text-white">{row.month}</p>
                  <div className="space-y-2">
                    <Label className="text-xs">Primary Income</Label>
                    <Input
                      type="number"
                      value={editForm.income ?? ''}
                      onChange={(e) => setEditForm((p) => ({ ...p, income: Number(e.target.value) }))}
                      className="h-9 text-sm"
                    />
                    <Label className="text-xs">Other Income</Label>
                    <Input
                      type="number"
                      value={editForm.other_income ?? ''}
                      onChange={(e) => setEditForm((p) => ({ ...p, other_income: Number(e.target.value) }))}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <Button size="sm" variant="secondary" className="h-9 text-xs px-3" onClick={cancelEdit}>
                      Cancel
                    </Button>
                    <Button size="sm" className="h-9 text-xs font-semibold px-3" onClick={saveEdit}>
                      Save
                    </Button>
                  </div>
                </div>
              );
            }

            return (
              <div key={row.month} className="p-3.5 flex items-center justify-between gap-3 bg-surface">
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                    {row.month}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    Income {formatIdr(row.income)} · Other {formatIdr(row.other_income || 0)}
                  </p>
                  <p className="text-xs font-semibold font-mono text-emerald-600 dark:text-emerald-400">
                    {formatIdr(total)}
                  </p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => startEdit(row)}
                    className="h-8 px-3 rounded-lg text-xs font-semibold text-mint-600 dark:text-mint-400 hover:bg-mint-500/10 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(row.month)}
                    className="h-8 px-3 rounded-lg text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
