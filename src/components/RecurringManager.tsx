import React, { useState, useEffect } from 'react';
import type { RecurringTransaction } from '../lib/data';
import { fetchRecurringTransactions, createRecurringTransaction, updateRecurringTransactionApi, deleteRecurringTransactionApi } from '../lib/api';
import { formatIdr } from '../lib/utils';
import { useConfirm } from './ConfirmDialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { fetchCategories, fetchGoals } from '../lib/api';
import type { Category } from '../lib/data';
import type { FinancialGoal } from '../lib/api';
import { Target } from 'lucide-react';

const TYPE_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'credit_expense', label: 'Credit Expense' },
  { value: 'credit_payment', label: 'Credit Payment' },
];

const defaultDay = () => "21";

export default function RecurringManager() {
  const { confirm: confirmAction } = useConfirm();
  const [recurring, setRecurring] = useState<RecurringTransaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<RecurringTransaction>>({});

  const [isAdding, setIsAdding] = useState(false);
  const [addForm, setAddForm] = useState<{
    title: string;
    category: string;
    amount: string;
    type: string;
    payment_method: string;
    done: boolean;
    end_date: string;
    created_at: string;
    goal_id: string;
  }>({
    title: '',
    category: '',
    amount: '',
    type: 'cash',
    payment_method: 'Cash',
    done: false,
    end_date: '',
    created_at: defaultDay(),
    goal_id: 'none',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [r, c, g] = await Promise.all([fetchRecurringTransactions(), fetchCategories(), fetchGoals()]);
      setRecurring(r);
      setCategories(c);
      setGoals(g);
      setError('');
    } catch (e) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  const startEdit = (item: RecurringTransaction) => {
    setEditingId(item.id);
    setEditForm({ ...item });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async () => {
    if (!editForm.id) return;
    try {
      await updateRecurringTransactionApi(editForm.id, {
        title: editForm.title,
        category: editForm.category,
        amount: editForm.amount,
        type: editForm.type,
        payment_method: editForm.payment_method,
        done: editForm.done,
        active: editForm.active,
        end_date: editForm.end_date || null,
        created_at: editForm.created_at || defaultDay(),
        goal_id: editForm.goal_id ?? null,
      });
      setEditingId(null);
      setEditForm({});
      await loadData();
    } catch (e: any) {
      setError(e.message || 'Failed to update');
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await confirmAction({
      title: 'Delete Recurring Transaction',
      description: 'Delete this recurring transaction?',
      confirmLabel: 'Delete',
      variant: 'destructive',
    });
    if (!confirmed) return;
    try {
      await deleteRecurringTransactionApi(id);
      await loadData();
    } catch (e: any) {
      setError(e.message || 'Failed to delete');
    }
  };

  const handleAdd = async () => {
    if (!addForm.title.trim()) {
      setError('Title is required');
      return;
    }
    if (!addForm.category.trim()) {
      setError('Category is required');
      return;
    }
    if (!addForm.amount || isNaN(Number(addForm.amount))) {
      setError('Valid amount is required');
      return;
    }
    try {
      await createRecurringTransaction({
        title: addForm.title.trim(),
        category: addForm.category.trim(),
        amount: Number(addForm.amount),
        type: addForm.type as any,
        payment_method: addForm.payment_method || 'Cash',
        done: addForm.done,
        active: true,
        end_date: addForm.end_date || null,
        created_at: addForm.created_at || defaultDay(),
        goal_id: addForm.goal_id === 'none' ? null : Number(addForm.goal_id),
      });
      setAddForm({ title: '', category: '', amount: '', type: 'cash', payment_method: 'Cash', done: false, end_date: '', created_at: defaultDay(), goal_id: 'none' });
      setIsAdding(false);
      setError('');
      await loadData();
    } catch (e: any) {
      setError(e.message || 'Failed to create');
    }
  };

  const toggleActive = async (item: RecurringTransaction) => {
    try {
      await updateRecurringTransactionApi(item.id, { active: !item.active });
      await loadData();
    } catch (e: any) {
      setError(e.message || 'Failed to toggle');
    }
  };

  return (
    <div className="glass-card p-5">
      
        <h3 className="text-slate-800 dark:text-white/80">Recurring Transactions</h3>
        <Button size="sm" onClick={() => setIsAdding((v) => !v)}>
          {isAdding ? 'Cancel' : '+ Add Recurring'}
        </Button>
      
      
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
            {error}
          </div>
        )}

        {isAdding && (
          <div className="mb-6 rounded-lg border p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input
                  type="text"
                  value={addForm.title}
                  onChange={(e) => setAddForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Rent"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={addForm.category} onValueChange={(v) => setAddForm((p) => ({ ...p, category: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Amount (IDR)</Label>
                <Input
                  type="number"
                  value={addForm.amount}
                  onChange={(e) => setAddForm((p) => ({ ...p, amount: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={addForm.type} onValueChange={(v) => setAddForm((p) => ({ ...p, type: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Payment Method</Label>
                <Input
                  type="text"
                  value={addForm.payment_method}
                  onChange={(e) => setAddForm((p) => ({ ...p, payment_method: e.target.value }))}
                  placeholder="e.g. Cash, BCA"
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Checkbox
                  id="add-done"
                  checked={addForm.done}
                  onCheckedChange={(v) => setAddForm((p) => ({ ...p, done: !!v }))}
                />
                <Label htmlFor="add-done" className="cursor-pointer">Mark as paid (for credit expenses)</Label>
              </div>
              <div className="space-y-1.5">
                <Label>End Date (optional)</Label>
                <Input
                  type="month"
                  value={addForm.end_date}
                  onChange={(e) => setAddForm((p) => ({ ...p, end_date: e.target.value }))}
                />
                <p className="text-xs text-slate-500 dark:text-white/40">Stop auto-adding after this month (e.g., last installment)</p>
              </div>
              <div className="space-y-1.5">
                <Label>Tgl Transaksi</Label>
                <Input
                  type="number"
                  min={1}
                  max={28}
                  value={addForm.created_at}
                  onChange={(e) => setAddForm((p) => ({ ...p, created_at: e.target.value }))}
                />
                <p className="text-xs text-slate-500 dark:text-white/40">Tanggal transaksi muncul tiap bulan (1-28, default: hari ini)</p>
              </div>
              <div className="space-y-1.5">
                <Label>Link ke Goal (opsional)</Label>
                <Select value={addForm.goal_id} onValueChange={(v) => setAddForm((p) => ({ ...p, goal_id: v }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="No goal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No goal</SelectItem>
                    {goals.filter((g) => !g.completed).map((g) => (
                      <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500 dark:text-white/40">Transfer terjadwal yang sudah dibayar otomatis menambah progres goal tiap period</p>
              </div>
            </div>
            <div className="flex justify-end">
              <Button size="sm" onClick={handleAdd}>Save Recurring</Button>
            </div>
          </div>
        )}

        {/* Desktop table (≥md) — unchanged */}
        <div className="hidden md:block rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Active</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Tgl</TableHead>
                <TableHead>Goal</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead className="w-32"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-6">Loading...</TableCell>
                </TableRow>
              ) : recurring.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-6">
                    No recurring transactions yet. Add one above.
                  </TableCell>
                </TableRow>
              ) : (
                recurring.map((item) => {
                  const isEditing = editingId === item.id;
                  if (isEditing) {
                    return (
                      <TableRow key={item.id} className="bg-muted/30">
                        <TableCell>
                          <Checkbox
                            checked={!!editForm.active}
                            onCheckedChange={(v) => setEditForm((p) => ({ ...p, active: !!v }))}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="text"
                            value={editForm.title ?? ''}
                            onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                            className="h-8 text-xs"
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={editForm.category ?? ''}
                            onValueChange={(v) => setEditForm((p) => ({ ...p, category: v }))}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((c) => (
                                <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={editForm.amount ?? 0}
                            onChange={(e) => setEditForm((p) => ({ ...p, amount: Number(e.target.value) }))}
                            className="h-8 text-xs text-right"
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={editForm.type ?? 'cash'}
                            onValueChange={(v) => setEditForm((p) => ({ ...p, type: v as any }))}
                          >
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
                          <Input
                            type="month"
                            value={editForm.end_date ?? ''}
                            onChange={(e) => setEditForm((p) => ({ ...p, end_date: e.target.value || null }))}
                            className="h-8 text-xs"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={1}
                            max={28}
                            value={editForm.created_at ?? defaultDay()}
                            onChange={(e) => setEditForm((p) => ({ ...p, created_at: e.target.value }))}
                            className="h-8 text-xs w-16"
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={editForm.goal_id != null ? String(editForm.goal_id) : 'none'}
                            onValueChange={(v) => setEditForm((p) => ({ ...p, goal_id: v === 'none' ? null : Number(v) }))}
                          >
                            <SelectTrigger className="h-8 text-xs w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No goal</SelectItem>
                              {goals.filter((g) => !g.completed || g.id === editForm.goal_id).map((g) => (
                                <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Checkbox
                            checked={!!editForm.done}
                            onCheckedChange={(v) => setEditForm((p) => ({ ...p, done: !!v }))}
                          />
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
                    <TableRow key={item.id} className={!item.active ? 'opacity-60' : undefined}>
                      <TableCell>
                        <Checkbox
                          checked={item.active}
                          onCheckedChange={() => toggleActive(item)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {item.title}
                        {item.goal_name && (
                          <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium text-gold-600 dark:text-gold-400 bg-gold-500/10 dark:bg-gold-500/15">
                            <Target className="w-3 h-3" />
                            {item.goal_name}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell className="text-right">{formatIdr(item.amount)}</TableCell>
                      <TableCell className="text-xs">
                        {item.type === 'cash' ? 'Cash' : item.type === 'credit_expense' ? 'Credit' : 'Credit Pay'}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 dark:text-white/40">
                        {item.end_date || '-'}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 dark:text-white/40">
                        {item.created_at || '-'}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 dark:text-white/40">
                        {item.goal_name ? (
                          <span className="inline-flex items-center gap-1 text-gold-600 dark:text-gold-400">
                            <Target className="w-3 h-3" />
                            {item.goal_name}
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {item.done ? (
                          <span className="text-xs text-emerald-600 font-medium">Paid</span>
                        ) : (
                          <span className="text-xs text-slate-500 dark:text-white/40">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-mint-500 hover:text-mint-600" onClick={() => startEdit(item)}>
                            Edit
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500 hover:text-red-700" onClick={() => handleDelete(item.id)}>
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile card list (<md) - mirrors TransactionTable mobile pattern (PR #259) */}
        <div className="md:hidden rounded-xl border divide-y border-slate-200 dark:border-white/[0.06]">
          {loading ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">Loading...</div>
          ) : recurring.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No recurring transactions yet. Add one above.
            </div>
          ) : (
            recurring.map((item) => {
              const typeLabel = item.type === 'cash' ? 'Cash' : item.type === 'credit_expense' ? 'Credit' : 'Credit Pay';
              const isEditing = editingId === item.id;
              if (isEditing) {
                return (
                  <div key={item.id} className="px-4 py-3 bg-muted/30">
                    <div className="grid grid-cols-2 gap-2.5">
                      <Label className="col-span-2 text-xs">Title</Label>
                      <Input
                        type="text"
                        value={editForm.title ?? ''}
                        onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                        className="col-span-2 h-9 text-sm"
                      />
                      <Label className="text-xs">Category</Label>
                      <Label className="text-xs">Amount</Label>
                      <Select value={editForm.category ?? ''} onValueChange={(v) => setEditForm((p) => ({ ...p, category: v }))}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {categories.map((c) => (
                            <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        value={editForm.amount ?? 0}
                        onChange={(e) => setEditForm((p) => ({ ...p, amount: Number(e.target.value) }))}
                        className="h-9 text-sm text-right"
                      />
                      <Label className="text-xs">Type</Label>
                      <Label className="text-xs">Tgl (1-28)</Label>
                      <Select value={editForm.type ?? 'cash'} onValueChange={(v) => setEditForm((p) => ({ ...p, type: v as any }))}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TYPE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        min={1}
                        max={28}
                        value={editForm.created_at ?? defaultDay()}
                        onChange={(e) => setEditForm((p) => ({ ...p, created_at: e.target.value }))}
                        className="h-9 text-sm"
                      />
                      <Label className="col-span-2 text-xs">End Date (optional)</Label>
                      <Input
                        type="month"
                        value={editForm.end_date ?? ''}
                        onChange={(e) => setEditForm((p) => ({ ...p, end_date: e.target.value || null }))}
                        className="col-span-2 h-9 text-sm"
                      />
                      <Label className="col-span-2 text-xs">Goal</Label>
                      <Select
                        value={editForm.goal_id != null ? String(editForm.goal_id) : 'none'}
                        onValueChange={(v) => setEditForm((p) => ({ ...p, goal_id: v === 'none' ? null : Number(v) }))}
                      >
                        <SelectTrigger className="h-9 text-xs w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No goal</SelectItem>
                          {goals.filter((g) => !g.completed || g.id === editForm.goal_id).map((g) => (
                            <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="col-span-2 flex items-center gap-4 pt-1">
                        <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-white/60">
                          <Checkbox checked={!!editForm.active} onCheckedChange={(v) => setEditForm((p) => ({ ...p, active: !!v }))} />
                          Active
                        </label>
                        <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-white/60">
                          <Checkbox checked={!!editForm.done} onCheckedChange={(v) => setEditForm((p) => ({ ...p, done: !!v }))} />
                          Paid
                        </label>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-3">
                      <Button size="sm" variant="secondary" className="h-9 text-xs" onClick={cancelEdit}>Cancel</Button>
                      <Button size="sm" className="h-9 text-xs" onClick={saveEdit}>Save</Button>
                    </div>
                  </div>
                );
              }
              return (
                <div
                  key={item.id}
                  className={`px-4 py-3 flex flex-col gap-2 ${!item.active ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Checkbox
                          checked={!!item.active}
                          onCheckedChange={() => toggleActive(item)}
                          aria-label={`Toggle ${item.title}`}
                          className="mt-0.5"
                        />
                        <span className="font-medium text-sm text-slate-900 dark:text-white/90 truncate">{item.title}</span>
                        {item.goal_name && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium text-gold-600 dark:text-gold-400 bg-gold-500/10">
                            <Target className="w-3 h-3 shrink-0" />
                            {item.goal_name}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-slate-500 dark:text-white/40 truncate">
                        {item.category} · {typeLabel}{item.end_date ? ` · until ${item.end_date}` : ''}{item.done ? ' · Paid' : ''}
                      </p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums whitespace-nowrap text-slate-900 dark:text-white/90">
                      {formatIdr(item.amount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 dark:text-white/30">Tgl {item.created_at || '—'}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(item)}
                        className="h-8 px-3 rounded-lg text-xs font-medium text-mint-500 hover:bg-mint-500/10 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="h-8 px-3 rounded-lg text-xs font-medium text-red-500 hover:bg-red-500/10 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
    </div>
  );
}
