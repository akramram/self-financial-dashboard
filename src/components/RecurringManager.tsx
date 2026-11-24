import React, { useState, useEffect, useMemo } from 'react';
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
import {
  Target,
  Repeat,
  Wallet,
  CreditCard,
  PiggyBank,
  Search,
  X,
  Calendar,
  CheckCircle2,
  PauseCircle,
} from 'lucide-react';

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

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'active' | 'paused' | 'cash' | 'credit' | 'goals'>('all');

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

  // Memoized financial statistics across recurring commitments
  const stats = useMemo(() => {
    let activeTotal = 0;
    let cashTotal = 0;
    let creditTotal = 0;
    let goalTotal = 0;
    let activeCount = 0;
    let pausedCount = 0;

    for (const r of recurring) {
      if (r.active) {
        activeCount++;
        activeTotal += r.amount;
        if (r.type === 'cash') cashTotal += r.amount;
        if (r.type === 'credit_expense' || r.type === 'credit_payment') creditTotal += r.amount;
        if (r.goal_id != null) goalTotal += r.amount;
      } else {
        pausedCount++;
      }
    }

    return {
      activeTotal,
      cashTotal,
      creditTotal,
      goalTotal,
      activeCount,
      pausedCount,
      totalCount: recurring.length,
    };
  }, [recurring]);

  // Filtered recurring items by query and filter tabs
  const filteredItems = useMemo(() => {
    return recurring.filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (item.title || '').toLowerCase().includes(q);
        const matchCat = (item.category || '').toLowerCase().includes(q);
        const matchGoal = item.goal_name ? item.goal_name.toLowerCase().includes(q) : false;
        if (!matchTitle && !matchCat && !matchGoal) return false;
      }

      if (typeFilter === 'active') return !!item.active;
      if (typeFilter === 'paused') return !item.active;
      if (typeFilter === 'cash') return item.type === 'cash';
      if (typeFilter === 'credit') return item.type === 'credit_expense' || item.type === 'credit_payment';
      if (typeFilter === 'goals') return item.goal_id != null;
      return true;
    });
  }, [recurring, searchQuery, typeFilter]);

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
    <div className="space-y-6">
      {/* Overview KPI Glance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4 rounded-xl border border-slate-200/80 dark:border-white/[0.08] relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-white/60 uppercase tracking-wider">
              Total Bulanan Aktif
            </span>
            <div className="w-8 h-8 rounded-lg bg-mint-500/10 dark:bg-mint-500/20 text-mint-600 dark:text-mint-400 flex items-center justify-center">
              <Repeat className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
            {formatIdr(stats.activeTotal)}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-white/50">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-mint-500/10 text-mint-600 dark:text-mint-400">
              <CheckCircle2 className="w-3 h-3" />
              {stats.activeCount} Aktif
            </span>
            {stats.pausedCount > 0 && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-white/60">
                <PauseCircle className="w-3 h-3" />
                {stats.pausedCount} Jeda
              </span>
            )}
          </div>
        </div>

        <div className="glass-card p-4 rounded-xl border border-slate-200/80 dark:border-white/[0.08]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-white/60 uppercase tracking-wider">
              Komitmen Cash
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
            {formatIdr(stats.cashTotal)}
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-white/50">
            Beban tunai / rekening periodik
          </p>
        </div>

        <div className="glass-card p-4 rounded-xl border border-slate-200/80 dark:border-white/[0.08]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-white/60 uppercase tracking-wider">
              Kewajiban Kredit
            </span>
            <div className="w-8 h-8 rounded-lg bg-coral-500/10 dark:bg-coral-500/20 text-coral-600 dark:text-coral-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
            {formatIdr(stats.creditTotal)}
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-white/50">
            Beban tagihan otomatis kartu kredit
          </p>
        </div>

        <div className="glass-card p-4 rounded-xl border border-slate-200/80 dark:border-white/[0.08]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-white/60 uppercase tracking-wider">
              Auto-Alokasi Goal
            </span>
            <div className="w-8 h-8 rounded-lg bg-gold-500/10 dark:bg-gold-500/20 text-gold-600 dark:text-gold-400 flex items-center justify-center">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
            {formatIdr(stats.goalTotal)}
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-white/50">
            Terhubung tabungan target berkala
          </p>
        </div>
      </div>

      <div className="glass-card p-5">
        {/* Header & Add Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white/90">
              Recurring Transactions
            </h3>
            <p className="text-xs text-slate-500 dark:text-white/50">
              Total {recurring.length} transaksi terjadwal ({stats.activeCount} aktif)
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setIsAdding((v) => !v)}
            className="bg-mint-600 hover:bg-mint-700 text-white shrink-0"
          >
            {isAdding ? 'Cancel' : '+ Add Recurring'}
          </Button>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {[
              { id: 'all', label: 'All', count: recurring.length },
              { id: 'active', label: 'Active', count: stats.activeCount },
              { id: 'paused', label: 'Paused', count: stats.pausedCount },
              { id: 'cash', label: 'Cash', count: recurring.filter((r) => r.type === 'cash').length },
              { id: 'credit', label: 'Credit', count: recurring.filter((r) => r.type === 'credit_expense' || r.type === 'credit_payment').length },
              { id: 'goals', label: 'Goals', count: recurring.filter((r) => r.goal_id != null).length },
            ].map((tab) => {
              const isActive = typeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTypeFilter(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-mint-500/15 text-mint-700 dark:text-mint-300 border border-mint-500/30'
                      : 'text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.04]'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    isActive
                      ? 'bg-mint-500/25 text-mint-800 dark:text-mint-200'
                      : 'bg-slate-200/80 dark:bg-white/10 text-slate-600 dark:text-white/50'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative w-full md:w-64 shrink-0">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/40 pointer-events-none" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari judul / kategori..."
              className="pl-9 pr-8 h-9 text-xs rounded-lg border-slate-200 dark:border-white/[0.08] bg-white/70 dark:bg-white/[0.03]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white/80"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

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

        {/* Desktop table (≥md) */}
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
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-6">Loading...</TableCell>
                </TableRow>
              ) : filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                    {recurring.length === 0 ? (
                      'No recurring transactions yet. Add one above.'
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-2">
                        <p className="text-sm">Tidak ada transaksi recurring yang cocok dengan filter.</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-mint-600 dark:text-mint-400"
                          onClick={() => {
                            setSearchQuery('');
                            setTypeFilter('all');
                          }}
                        >
                          Reset Filter
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item) => {
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
                          <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-medium text-gold-600 dark:text-gold-400 bg-gold-500/10 dark:bg-gold-500/15">
                            <Target className="w-3 h-3" />
                            {item.goal_name}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatIdr(item.amount)}</TableCell>
                      <TableCell className="text-xs">
                        {item.type === 'cash' ? (
                          <span className="text-blue-600 dark:text-blue-400 font-medium">Cash</span>
                        ) : item.type === 'credit_expense' ? (
                          <span className="text-coral-600 dark:text-coral-400 font-medium">Credit</span>
                        ) : (
                          <span className="text-slate-600 dark:text-white/60">Credit Pay</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 dark:text-white/40">
                        {item.end_date ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-white/70 border border-slate-200 dark:border-white/10">
                            <Calendar className="w-3 h-3 text-slate-400 dark:text-white/40" />
                            until {item.end_date}
                          </span>
                        ) : '-'}
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
          ) : filteredItems.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              {recurring.length === 0 ? (
                'No recurring transactions yet. Add one above.'
              ) : (
                <div className="flex flex-col items-center justify-center gap-2">
                  <p>Tidak ada transaksi recurring yang cocok dengan filter.</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-mint-600 dark:text-mint-400"
                    onClick={() => {
                      setSearchQuery('');
                      setTypeFilter('all');
                    }}
                  >
                    Reset Filter
                  </Button>
                </div>
              )}
            </div>
          ) : (
            filteredItems.map((item) => {
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
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-medium text-gold-600 dark:text-gold-400 bg-gold-500/10">
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
                    <span className="text-[11px] text-slate-500 dark:text-white/30">Tgl {item.created_at || '-'}</span>
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
    </div>
  );
}
