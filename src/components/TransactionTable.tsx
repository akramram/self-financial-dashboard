import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { Transaction, Category } from '../lib/data';
import { updateTransactionApi, deleteTransactionApi, toggleTransactionDoneApi, deleteTransactionsBulkApi, updateTransactionsBulkApi, fetchCategories } from '../lib/api';
import { formatIdr } from '../lib/utils';
import { useSortState } from '../hooks/useSortState';
import SortableHeader from './SortableHeader';
import EditTransactionDialog from './EditTransactionDialog';
import { StickyNote, Search, SlidersHorizontal, Download, X, Filter, ChevronDown, FileJson, FileSpreadsheet } from 'lucide-react';
import { useConfirm } from './ConfirmDialog';
import { toast } from 'sonner';
import { showDeleteUndoToast } from '../lib/undo';
import { motion, AnimatePresence } from 'motion/react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Props {
  transactions: Transaction[];
  showMonth?: boolean;
  periods?: { period_id: number; month: string }[];
}

/** Escape a CSV field: wrap in quotes if it contains comma, quote, or newline */
function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function transactionsToCsv(data: { date: string; description: string; amount: number; type: string; category: string; paid: boolean; notes: string; period: string }[]): string {
  const headers = ['Date', 'Description', 'Amount', 'Type', 'Category', 'Period', 'Paid', 'Notes'];
  const rows = data.map((t) => [
    escapeCsvField(t.date),
    escapeCsvField(t.description),
    String(t.amount),
    escapeCsvField(t.type),
    escapeCsvField(t.category),
    escapeCsvField(t.period),
    t.paid ? 'Yes' : 'No',
    escapeCsvField(t.notes),
  ].join(','));
  return [headers.join(','), ...rows].join('\n');
}

function parseCreatedTime(tx: Transaction): Date {
  if (tx.created_time) {
    const d = new Date(tx.created_time);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date(tx.date);
}

export default function TransactionTable({ transactions, showMonth = true, periods = [] }: Props) {
  const { confirm: confirmAction } = useConfirm();

  // ── Local transaction state (mirrors props, updated optimistically) ──
  const [localTx, setLocalTx] = useState<Transaction[]>(transactions);

  const periodIdToMonth = useMemo(() => {
    const map = new Map<number, string>();
    periods.forEach((p) => map.set(p.period_id, p.month));
    return map;
  }, [periods]);

  const monthOptions = useMemo(() => {
    return [...periods].sort((a, b) => b.period_id - a.period_id);
  }, [periods]);

  const getInitialState = () => {
    if (typeof window === 'undefined') return { page: 1, filterType: 'all', filterPeriodId: 'all', search: '', dateFrom: '', dateTo: '', amountMin: '', amountMax: '' };
    const params = new URLSearchParams(window.location.search);
    return {
      page: Math.max(1, parseInt(params.get('page') || '1', 10) || 1),
      filterType: params.get('type') || 'all',
      filterPeriodId: params.get('period_id') || 'all',
      search: params.get('search') || '',
      dateFrom: params.get('dateFrom') || '',
      dateTo: params.get('dateTo') || '',
      amountMin: params.get('amountMin') || '',
      amountMax: params.get('amountMax') || '',
    };
  };

  const initial = getInitialState();
  const [page, setPage] = useState(initial.page);
  const [filterType, setFilterType] = useState<string>(initial.filterType);
  const [filterPeriodId, setFilterPeriodId] = useState<string>(initial.filterPeriodId);
  const [search, setSearch] = useState(initial.search);
  const [dateFrom, setDateFrom] = useState(initial.dateFrom);
  const [dateTo, setDateTo] = useState(initial.dateTo);
  const [amountMin, setAmountMin] = useState(initial.amountMin);
  const [amountMax, setAmountMax] = useState(initial.amountMax);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Transaction>>({});
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkCategory, setBulkCategory] = useState<string>('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const rowsPerPage = 25;
  const { toggleSort, sortData, isSorted } = useSortState();

  const getCellValue = useCallback((t: Transaction, key: string): string | number => {
    switch (key) {
      case 'paid': return t.done ? 1 : 0;
      case 'month': return periodIdToMonth.get(t.period_id) || '';
      case 'title': return t.title;
      case 'category': return t.category;
      case 'date': return new Date(t.created_time || t.date).getTime();
      case 'amount': return t.amount;
      case 'type': return t.type;
      default: return '';
    }
  }, [periodIdToMonth]);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (page > 1) params.set('page', String(page)); else params.delete('page');
    if (filterType !== 'all') params.set('type', filterType); else params.delete('type');
    if (filterPeriodId !== 'all') params.set('period_id', filterPeriodId); else params.delete('period_id');
    if (search.trim()) params.set('search', search.trim()); else params.delete('search');
    if (dateFrom) params.set('dateFrom', dateFrom); else params.delete('dateFrom');
    if (dateTo) params.set('dateTo', dateTo); else params.delete('dateTo');
    if (amountMin) params.set('amountMin', amountMin); else params.delete('amountMin');
    if (amountMax) params.set('amountMax', amountMax); else params.delete('amountMax');
    const qs = params.toString();
    const url = window.location.pathname + (qs ? '?' + qs : '');
    window.history.replaceState(null, '', url);
  }, [page, filterType, filterPeriodId, search, dateFrom, dateTo, amountMin, amountMax]);

  const sorted = useMemo(() => {
    return sortData(localTx, getCellValue, (data) =>
      [...data].sort((a, b) => parseCreatedTime(b).getTime() - parseCreatedTime(a).getTime())
    );
  }, [localTx, sortData, getCellValue]);

  let filtered = sorted;
  if (filterType !== 'all') filtered = filtered.filter((t) => t.type === filterType);
  if (filterPeriodId !== 'all') {
    const pid = parseInt(filterPeriodId, 10);
    filtered = filtered.filter((t) => t.period_id === pid);
  }
  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter((t) =>
      t.title.toLowerCase().includes(q) || t.category.toLowerCase().includes(q) || (t.notes || '').toLowerCase().includes(q)
    );
  }
  if (dateFrom) {
    const fromTime = new Date(dateFrom).getTime();
    filtered = filtered.filter((t) => parseCreatedTime(t).getTime() >= fromTime);
  }
  if (dateTo) {
    const toTime = new Date(dateTo).getTime();
    filtered = filtered.filter((t) => parseCreatedTime(t).getTime() <= toTime);
  }
  if (amountMin) {
    const min = parseFloat(amountMin);
    if (!isNaN(min)) filtered = filtered.filter((t) => t.amount >= min);
  }
  if (amountMax) {
    const max = parseFloat(amountMax);
    if (!isNaN(max)) filtered = filtered.filter((t) => t.amount <= max);
  }

  const activeFilterCount = [
    filterType !== 'all',
    filterPeriodId !== 'all',
    search.trim() !== '',
    dateFrom !== '',
    dateTo !== '',
    amountMin !== '',
    amountMax !== '',
  ].filter(Boolean).length;

  const hasAdvancedFilters = dateFrom || dateTo || amountMin || amountMax;

  const clearFilters = () => {
    setFilterType('all');
    setFilterPeriodId('all');
    setSearch('');
    setDateFrom('');
    setDateTo('');
    setAmountMin('');
    setAmountMax('');
    setPage(1);
    setAdvancedOpen(false);
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

  // ── Bulk actions ───────────────────────────────────────────────

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === pageRows.length) setSelected(new Set());
    else setSelected(new Set(pageRows.map((r) => r.id)));
  };

  const handleSave = async () => {
    if (!editingId) return;
    const { id, ...updates } = editForm as any;
    if (updates.period_id) updates.period_id = Number(updates.period_id);
    try {
      await updateTransactionApi(editingId, updates);
      // Optimistic update
      setLocalTx(prev => prev.map(t => t.id === editingId ? { ...t, ...updates } as Transaction : t));
      setEditingId(null);
      setEditForm({});
      toast.success('Transaction updated');
    } catch {
      toast.error('Failed to update transaction');
    }
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    const confirmed = await confirmAction({
      title: 'Delete Transactions',
      description: `Are you sure you want to delete ${selected.size} selected transactions? You can undo shortly after.`,
      confirmLabel: 'Delete All',
      variant: 'destructive',
    });
    if (!confirmed) return;
    try {
      const deleted = localTx.filter(t => selected.has(t.id));
      await deleteTransactionsBulkApi(Array.from(selected));
      setLocalTx(prev => prev.filter(t => !selected.has(t.id)));
      setSelected(new Set());
      showDeleteUndoToast(deleted, restored => setLocalTx(prev => [...prev, ...restored]));
    } catch {
      toast.error('Failed to delete transactions');
    }
  };

  const handleBulkCategory = async () => {
    if (selected.size === 0 || !bulkCategory) return;
    try {
      await updateTransactionsBulkApi(Array.from(selected), { category: bulkCategory });
      setLocalTx(prev => prev.map(t => selected.has(t.id) ? { ...t, category: bulkCategory } : t));
      setSelected(new Set());
      setBulkCategory('');
      toast.success(`${selected.size} transactions categorized as "${bulkCategory}"`);
    } catch {
      toast.error('Failed to update categories');
    }
  };

  // ── Render ─────────────────────────────────────────────────────

  return (
    <div>
      {/* ─── Filter Bar ────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 mb-5">
        {/* Primary row: search + type + period + export */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-white/30 pointer-events-none" />
            <Input
              placeholder="Search title, category, notes..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 bg-slate-100 dark:bg-white/[0.04] border-slate-300 dark:border-white/[0.08] text-slate-800 dark:text-white/80 placeholder:text-slate-400 dark:text-white/25 focus-visible:ring-emerald-500/30"
            />
            {search && (
              <button
                onClick={() => { setSearch(''); setPage(1); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-white/30 hover:text-slate-600 dark:text-white/60"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Type filter */}
          <Select value={filterType} onValueChange={(v) => { setFilterType(v); setPage(1); }}>
            <SelectTrigger className="w-[150px] bg-slate-100 dark:bg-white/[0.04] border-slate-300 dark:border-white/[0.08] text-slate-700 dark:text-white/70">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent className="bg-slate-100 dark:bg-navy-800 border-slate-300 dark:border-white/[0.08]">
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="cash">💵 Cash</SelectItem>
              <SelectItem value="credit_expense">💳 Credit Expense</SelectItem>
              <SelectItem value="credit_payment">🏦 Credit Payment</SelectItem>
            </SelectContent>
          </Select>

          {/* Period filter */}
          <Select value={filterPeriodId} onValueChange={(v) => { setFilterPeriodId(v); setPage(1); }}>
            <SelectTrigger className="w-[180px] bg-slate-100 dark:bg-white/[0.04] border-slate-300 dark:border-white/[0.08] text-slate-700 dark:text-white/70">
              <SelectValue placeholder="All Periods" />
            </SelectTrigger>
            <SelectContent className="bg-slate-100 dark:bg-navy-800 border-slate-300 dark:border-white/[0.08] max-h-[300px]">
              <SelectItem value="all">All Periods</SelectItem>
              {monthOptions.map((p) => (
                <SelectItem key={p.period_id} value={p.period_id.toString()}>{p.month}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Export dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="gap-1.5 text-slate-600 dark:text-white/50 hover:text-slate-800 dark:text-white/80 hover:bg-slate-200/60 dark:bg-white/[0.06] h-9"
              >
                <Download className="w-3.5 h-3.5" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  const exportData = filtered.map((t) => ({
                    date: t.date,
                    description: t.title,
                    amount: t.amount,
                    type: t.type,
                    category: t.category,
                    paid: t.done,
                    notes: t.notes || '',
                    period: periodIdToMonth.get(t.period_id) || '',
                  }));
                  if (exportData.length === 0) {
                    toast.info('No transactions found');
                    return;
                  }
                  const csv = transactionsToCsv(exportData);
                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = filterPeriodId !== 'all' ? `transactions-${filterPeriodId}.csv` : 'transactions-all.csv';
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                  toast.success(`Exported ${exportData.length} transactions as CSV`);
                }}
                className="gap-2 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  const exportData = filtered.map((t) => ({
                    date: t.date,
                    description: t.title,
                    amount: t.amount,
                    type: t.type,
                    category: t.category,
                    paid: t.done,
                    notes: t.notes || '',
                    period: periodIdToMonth.get(t.period_id) || '',
                  }));
                  if (exportData.length === 0) {
                    toast.info('No transactions found');
                    return;
                  }
                  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = filterPeriodId !== 'all' ? `transactions-${filterPeriodId}.json` : 'transactions-all.json';
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                  toast.success(`Exported ${exportData.length} transactions as JSON`);
                }}
                className="gap-2 cursor-pointer"
              >
                <FileJson className="w-4 h-4" />
                Export as JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Active filter count badge */}
          {activeFilterCount > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={clearFilters}
              className="gap-1.5 text-slate-600 dark:text-white/50 hover:text-slate-800 dark:text-white/80 hover:bg-slate-200/60 dark:bg-white/[0.06] h-9"
            >
              <X className="w-3.5 h-3.5" />
              Clear ({activeFilterCount})
            </Button>
          )}
        </div>

        {/* Advanced filters toggle */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setAdvancedOpen(!advancedOpen)}
            className={`gap-1.5 text-xs h-7 transition-colors ${
              advancedOpen || hasAdvancedFilters
                ? 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/15'
                : 'text-slate-500 dark:text-white/40 hover:text-slate-600 dark:text-white/60 hover:bg-slate-100 dark:bg-white/[0.04]'
            }`}
          >
            <SlidersHorizontal className="w-3 h-3" />
            Advanced Filters
            <ChevronDown className={`w-3 h-3 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
            {hasAdvancedFilters && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-1" />
            )}
          </Button>

          {hasAdvancedFilters && !advancedOpen && (
            <div className="flex items-center gap-2 flex-wrap">
              {dateFrom && (
                <Badge variant="outline" className="text-[10px] py-0 h-5 gap-1 border-slate-300 dark:border-white/[0.08] text-slate-600 dark:text-white/50">
                  From: {dateFrom}
                  <button onClick={() => setDateFrom('')}><X className="w-2.5 h-2.5" /></button>
                </Badge>
              )}
              {dateTo && (
                <Badge variant="outline" className="text-[10px] py-0 h-5 gap-1 border-slate-300 dark:border-white/[0.08] text-slate-600 dark:text-white/50">
                  To: {dateTo}
                  <button onClick={() => setDateTo('')}><X className="w-2.5 h-2.5" /></button>
                </Badge>
              )}
              {amountMin && (
                <Badge variant="outline" className="text-[10px] py-0 h-5 gap-1 border-slate-300 dark:border-white/[0.08] text-slate-600 dark:text-white/50">
                  ≥ {formatIdr(parseFloat(amountMin))}
                  <button onClick={() => setAmountMin('')}><X className="w-2.5 h-2.5" /></button>
                </Badge>
              )}
              {amountMax && (
                <Badge variant="outline" className="text-[10px] py-0 h-5 gap-1 border-slate-300 dark:border-white/[0.08] text-slate-600 dark:text-white/50">
                  ≤ {formatIdr(parseFloat(amountMax))}
                  <button onClick={() => setAmountMax('')}><X className="w-2.5 h-2.5" /></button>
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Advanced filters panel */}
        <AnimatePresence>
          {advancedOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0, marginTop: 0 }}
              animate={{ height: 'auto', opacity: 1, marginTop: 4 }}
              exit={{ height: 0, opacity: 0, marginTop: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="glass-card p-4 rounded-xl">
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Date range */}
                  <div className="flex-1">
                    <label className="text-[10px] font-medium text-slate-500 dark:text-white/30 uppercase tracking-wider mb-2 block">
                      Date Range
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                        className="flex-1 bg-slate-100 dark:bg-white/[0.04] border-slate-300 dark:border-white/[0.08] text-slate-700 dark:text-white/70 text-xs h-8"
                      />
                      <span className="text-slate-400 dark:text-white/20 text-xs">→</span>
                      <Input
                        type="date"
                        value={dateTo}
                        onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                        className="flex-1 bg-slate-100 dark:bg-white/[0.04] border-slate-300 dark:border-white/[0.08] text-slate-700 dark:text-white/70 text-xs h-8"
                      />
                    </div>
                  </div>

                  {/* Amount range */}
                  <div className="flex-1">
                    <label className="text-[10px] font-medium text-slate-500 dark:text-white/30 uppercase tracking-wider mb-2 block">
                      Amount Range
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/20 text-xs">Rp</span>
                        <Input
                          type="number"
                          placeholder="Min"
                          value={amountMin}
                          onChange={(e) => { setAmountMin(e.target.value); setPage(1); }}
                          className="pl-8 bg-slate-100 dark:bg-white/[0.04] border-slate-300 dark:border-white/[0.08] text-slate-700 dark:text-white/70 text-xs h-8"
                        />
                      </div>
                      <span className="text-slate-400 dark:text-white/20 text-xs">→</span>
                      <div className="relative flex-1">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/20 text-xs">Rp</span>
                        <Input
                          type="number"
                          placeholder="Max"
                          value={amountMax}
                          onChange={(e) => { setAmountMax(e.target.value); setPage(1); }}
                          className="pl-8 bg-slate-100 dark:bg-white/[0.04] border-slate-300 dark:border-white/[0.08] text-slate-700 dark:text-white/70 text-xs h-8"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick presets */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-white/[0.05]">
                  <span className="text-[10px] font-medium text-slate-400 dark:text-white/25 uppercase tracking-wider">Presets:</span>
                  {[
                    { label: 'This Month', dateFrom: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10), dateTo: '' },
                    { label: 'Last Month', dateFrom: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().slice(0, 10), dateTo: new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString().slice(0, 10) },
                    { label: 'Last 7d', dateFrom: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10), dateTo: '' },
                    { label: 'Last 30d', dateFrom: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10), dateTo: '' },
                  ].map((preset) => (
                    <Button
                      key={preset.label}
                      size="sm"
                      variant="ghost"
                      onClick={() => { setDateFrom(preset.dateFrom); setDateTo(preset.dateTo); setPage(1); }}
                      className="h-6 text-[10px] px-2 text-slate-500 dark:text-white/40 hover:text-slate-700 dark:text-white/70 hover:bg-slate-200/60 dark:bg-white/[0.06]"
                    >
                      {preset.label}
                    </Button>
                  ))}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { setDateFrom(''); setDateTo(''); setAmountMin(''); setAmountMax(''); setPage(1); }}
                    className="h-6 text-[10px] px-2 text-slate-400 dark:text-white/25 hover:text-slate-600 dark:text-white/50 ml-auto"
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── Summary Bar ────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-slate-500 dark:text-white/30">
          <span className="text-slate-600 dark:text-white/60 font-semibold">{filtered.length.toLocaleString()}</span> transaction{filtered.length !== 1 ? 's' : ''}
          {filtered.length !== transactions.length && (
            <span className="text-slate-400 dark:text-white/20"> / {transactions.length.toLocaleString()} total</span>
          )}
        </p>
      </div>

      {/* ─── Bulk Actions ───────────────────────────────────────── */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0, marginBottom: 0 }}
            animate={{ height: 'auto', opacity: 1, marginBottom: 16 }}
            exit={{ height: 0, opacity: 0, marginBottom: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-xs font-semibold text-emerald-400">{selected.size} selected</span>
              <Select value={bulkCategory} onValueChange={setBulkCategory}>
                <SelectTrigger className="w-[180px] h-8 text-xs bg-slate-100 dark:bg-white/[0.04] border-slate-300 dark:border-white/[0.08] text-slate-600 dark:text-white/60">
                  <SelectValue placeholder="Change category..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-100 dark:bg-navy-800 border-slate-300 dark:border-white/[0.08]">
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={handleBulkCategory} disabled={!bulkCategory}
                className="h-8 text-xs border-slate-300 dark:border-white/[0.08] text-slate-600 dark:text-white/60 hover:bg-slate-200/60 dark:bg-white/[0.06] hover:text-slate-900 dark:text-white"
              >
                Apply
              </Button>
              <div className="flex-1" />
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}
                className="h-8 text-xs text-slate-500 dark:text-white/40 hover:text-slate-700 dark:text-white/70"
              >
                Deselect
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleBulkDelete}
                className="h-8 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                Delete {selected.size}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Table ───────────────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/[0.06]">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-100 dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.06] hover:bg-slate-100 dark:bg-white/[0.02]">
              <TableHead className="w-10 py-3">
                <Checkbox
                  checked={selected.size === pageRows.length && pageRows.length > 0}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
              <SortableHeader sortKey="paid" currentDirection={isSorted('paid')} onSort={toggleSort} className="text-slate-500 dark:text-white/40">Paid</SortableHeader>
              {showMonth && <SortableHeader sortKey="month" currentDirection={isSorted('month')} onSort={toggleSort} className="text-slate-500 dark:text-white/40">Month</SortableHeader>}
              <SortableHeader sortKey="title" currentDirection={isSorted('title')} onSort={toggleSort} className="text-slate-500 dark:text-white/40">Title</SortableHeader>
              <SortableHeader sortKey="category" currentDirection={isSorted('category')} onSort={toggleSort} className="text-slate-500 dark:text-white/40">Category</SortableHeader>
              <SortableHeader sortKey="date" currentDirection={isSorted('date')} onSort={toggleSort} className="text-slate-500 dark:text-white/40">Date</SortableHeader>
              <SortableHeader sortKey="amount" currentDirection={isSorted('amount')} onSort={toggleSort} className="text-right text-slate-500 dark:text-white/40">Amount</SortableHeader>
              <SortableHeader sortKey="type" currentDirection={isSorted('type')} onSort={toggleSort} className="text-slate-500 dark:text-white/40">Type</SortableHeader>
              <TableHead className="text-slate-500 dark:text-white/40"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showMonth ? 9 : 8} className="text-center py-12 text-slate-400 dark:text-white/25 text-sm">
                  <Filter className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  No transactions found
                  {activeFilterCount > 0 && (
                    <div className="mt-1">
                      <button onClick={clearFilters} className="text-emerald-400 text-xs hover:underline">
                        Clear all filters
                      </button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((row) => {
                const createdDate = parseCreatedTime(row);
                const dateStr = isNaN(createdDate.getTime())
                  ? row.date
                  : createdDate.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });

                const typeColorClass =
                  row.type === 'cash'
                    ? 'text-mint-400'
                    : row.type === 'credit_payment'
                    ? 'text-gold-400'
                    : 'text-coral-400';
                const typeBgClass =
                  row.type === 'cash'
                    ? 'bg-mint-500/30/10'
                    : row.type === 'credit_payment'
                    ? 'bg-gold-500/10'
                    : 'bg-coral-500/10';
                const typeLabel =
                  row.type === 'cash' ? 'Cash' : row.type === 'credit_payment' ? 'Credit Pay' : 'Credit';

                return (
                  <TableRow key={row.id} className="border-slate-200 dark:border-white/[0.04] hover:bg-slate-100 dark:bg-white/[0.02] transition-colors">
                    <TableCell className="py-2.5">
                      <Checkbox
                        checked={selected.has(row.id)}
                        onCheckedChange={() => toggleSelect(row.id)}
                        aria-label={`Select ${row.title}`}
                      />
                    </TableCell>
                    <TableCell className="py-2.5">
                      <button
                        onClick={async () => {
                          const newDone = !row.done;
                          setLocalTx(prev => prev.map(t => t.id === row.id ? { ...t, done: newDone ? 1 : 0 } as Transaction : t));
                          try {
                            await toggleTransactionDoneApi(row.id, newDone);
                            toast.success(newDone ? 'Marked as paid' : 'Marked as unpaid');
                          } catch {
                            // Revert on failure
                            setLocalTx(prev => prev.map(t => t.id === row.id ? { ...t, done: newDone ? 0 : 1 } as Transaction : t));
                            toast.error('Failed to update payment status');
                          }
                        }}
                        className={`h-6 text-[10px] font-semibold px-2 rounded-md transition-colors ${
                          row.done
                            ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
                            : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                        }`}
                      >
                        {row.done ? 'Paid' : 'Unpaid'}
                      </button>
                    </TableCell>
                    {showMonth && <TableCell className="py-2.5 text-slate-600 dark:text-white/60 text-sm">{periodIdToMonth.get(row.period_id) || ''}</TableCell>}
                    <TableCell className="py-2.5">
                      <span className="text-slate-800 dark:text-white/80">{row.title}</span>
                      {row.notes && (
                        <StickyNote className="inline ml-1.5 align-middle w-3 h-3 text-gold-400 shrink-0" title={row.notes} />
                      )}
                    </TableCell>
                    <TableCell className="py-2.5">
                      <Badge variant="secondary" className="text-[10px] bg-slate-200/60 dark:bg-white/[0.06] text-slate-600 dark:text-white/60 border-slate-200 dark:border-white/[0.06] font-normal">
                        {row.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2.5 text-slate-500 dark:text-white/40 text-xs whitespace-nowrap">{dateStr}</TableCell>
                    <TableCell className="py-2.5 font-semibold text-right text-slate-800 dark:text-white/80 tabular-nums whitespace-nowrap">{formatIdr(row.amount)}</TableCell>
                    <TableCell className="py-2.5">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${typeColorClass} ${typeBgClass}`}>
                        {typeLabel}
                      </span>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { setEditingId(row.id); setEditForm({ ...row }); }}
                          className="h-7 text-xs text-slate-600 dark:text-white/50 hover:text-slate-900 dark:text-white hover:bg-slate-200/60 dark:bg-white/[0.06]"
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={async () => {
                            const confirmed = await confirmAction({
                              title: 'Delete Transaction',
                              description: `Delete "${row.title}" (${formatIdr(row.amount)})?`,
                              confirmLabel: 'Delete',
                              variant: 'destructive',
                            });
                            if (!confirmed) return;
                            try {
                              await deleteTransactionApi(row.id);
                              setLocalTx(prev => prev.filter(t => t.id !== row.id));
                              showDeleteUndoToast([row], restored => setLocalTx(prev => [...prev, ...restored]));
                            } catch {
                              toast.error('Failed to delete transaction');
                            }
                          }}
                          className="h-7 text-xs text-red-500 dark:text-red-300 hover:text-red-400 hover:bg-red-500/10"
                        >
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

      {/* ─── Pagination ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between mt-4">
        <p className="text-xs text-slate-500 dark:text-white/30">
          {filtered.length > 0
            ? `Showing ${(safePage - 1) * rowsPerPage + 1}–${Math.min(safePage * rowsPerPage, filtered.length)} of ${filtered.length}`
            : 'No results'}
        </p>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage(1)}
            disabled={safePage <= 1}
            className="h-7 text-xs border-slate-300 dark:border-white/[0.08] text-slate-500 dark:text-white/40 hover:bg-slate-200/60 dark:bg-white/[0.06] disabled:opacity-20"
          >
            First
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="h-7 text-xs border-slate-300 dark:border-white/[0.08] text-slate-500 dark:text-white/40 hover:bg-slate-200/60 dark:bg-white/[0.06] disabled:opacity-20"
          >
            Prev
          </Button>
          <span className="text-xs text-slate-500 dark:text-white/40 min-w-[5rem] text-center tabular-nums">
            {safePage} <span className="text-slate-300 dark:text-white/15">/</span> {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            className="h-7 text-xs border-slate-300 dark:border-white/[0.08] text-slate-500 dark:text-white/40 hover:bg-slate-200/60 dark:bg-white/[0.06] disabled:opacity-20"
          >
            Next
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage(totalPages)}
            disabled={safePage >= totalPages}
            className="h-7 text-xs border-slate-300 dark:border-white/[0.08] text-slate-500 dark:text-white/40 hover:bg-slate-200/60 dark:bg-white/[0.06] disabled:opacity-20"
          >
            Last
          </Button>
        </div>
      </div>

      {/* ─── Edit Dialog ────────────────────────────────────────── */}
      {editingId && (
        <EditTransactionDialog
          open={true}
          transaction={editForm}
          onChange={(field, value) => setEditForm((prev) => ({ ...prev, [field]: value }))}
          onSave={handleSave}
          onCancel={() => { setEditingId(null); setEditForm({}); }}
          months={monthOptions.map((p) => p.month)}
        />
      )}
    </div>
  );
}
