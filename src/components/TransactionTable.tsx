import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { Transaction, Category } from '../lib/data';
import { updateTransactionApi, deleteTransactionApi, toggleTransactionDoneApi, deleteTransactionsBulkApi, updateTransactionsBulkApi, fetchCategories } from '../lib/api';
import { formatIdr } from '../lib/utils';
import { useSortState } from '../hooks/useSortState';
import SortableHeader from './SortableHeader';
import EditTransactionDialog from './EditTransactionDialog';
import { StickyNote } from 'lucide-react';
import { useConfirm } from './ConfirmDialog';
import { toast } from 'sonner';
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

interface Props {
  transactions: Transaction[];
  showMonth?: boolean;
  periods?: { period_id: number; month: string }[];
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
  // Build lookup maps from periods
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
    return sortData(transactions, getCellValue, (data) =>
      [...data].sort((a, b) => parseCreatedTime(b).getTime() - parseCreatedTime(a).getTime())
    );
  }, [transactions, sortData, getCellValue]);

  let filtered = sorted;
  if (filterType !== 'all') {
    filtered = filtered.filter((t) => t.type === filterType);
  }
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

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === pageRows.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pageRows.map((r) => r.id)));
    }
  };

  const handleSave = async () => {
    if (!editingId) return;
    const { id, ...updates } = editForm as any;
    // Convert period_id to number if present
    if (updates.period_id) updates.period_id = Number(updates.period_id);
    await updateTransactionApi(editingId, updates);
    setEditingId(null);
    setEditForm({});
    window.location.reload();
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    const confirmed = await confirmAction({
      title: 'Delete Transactions',
      description: `Are you sure you want to delete ${selected.size} selected transactions? This cannot be undone.`,
      confirmLabel: 'Delete All',
      variant: 'destructive',
    });
    if (!confirmed) return;
    await deleteTransactionsBulkApi(Array.from(selected));
    setSelected(new Set());
    window.location.reload();
  };

  const handleBulkCategory = async () => {
    if (selected.size === 0 || !bulkCategory) return;
    await updateTransactionsBulkApi(Array.from(selected), { category: bulkCategory });
    setSelected(new Set());
    setBulkCategory('');
    window.location.reload();
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Input
          placeholder="Search title or category..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-xs"
        />
        <Select value={filterType} onValueChange={(v) => { setFilterType(v); setPage(1); }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="credit_expense">Credit Expense</SelectItem>
            <SelectItem value="credit_payment">Credit Payment</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPeriodId} onValueChange={(v) => { setFilterPeriodId(v); setPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Periods" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Periods</SelectItem>
            {monthOptions.map((p) => (
              <SelectItem key={p.period_id} value={p.period_id.toString()}>{p.month}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          variant="outline"
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
              toast.info('No transactions found for this period');
              return;
            }
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const fileName = filterPeriodId !== 'all' ? `transactions-${filterPeriodId}.json` : 'transactions-all.json';
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }}
        >
          Export JSON
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex gap-2 items-center">
          <label className="text-xs text-slate-500">From</label>
          <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="w-auto text-xs" />
          <label className="text-xs text-slate-500">To</label>
          <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="w-auto text-xs" />
        </div>
        <div className="flex gap-2 items-center">
          <label className="text-xs text-slate-500">Min</label>
          <Input type="number" placeholder="Amount" value={amountMin} onChange={(e) => { setAmountMin(e.target.value); setPage(1); }} className="w-28 text-xs" />
          <label className="text-xs text-slate-500">Max</label>
          <Input type="number" placeholder="Amount" value={amountMax} onChange={(e) => { setAmountMax(e.target.value); setPage(1); }} className="w-28 text-xs" />
        </div>
      </div>

      {selected.size > 0 && (
        <div className="flex gap-2 mb-4 items-center">
          <span className="text-xs text-slate-500">{selected.size} selected</span>
          <select
            value={bulkCategory}
            onChange={(e) => setBulkCategory(e.target.value)}
            className="text-xs border rounded px-2 py-1"
          >
            <option value="">Change category...</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
          <Button size="sm" variant="outline" onClick={handleBulkCategory} disabled={!bulkCategory}>
            Apply
          </Button>
          <Button size="sm" variant="destructive" onClick={handleBulkDelete}>
            Delete
          </Button>
        </div>
      )}

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={selected.size === pageRows.length && pageRows.length > 0}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
              <SortableHeader sortKey="paid" currentDirection={isSorted('paid')} onSort={toggleSort}>Paid</SortableHeader>
              {showMonth && <SortableHeader sortKey="month" currentDirection={isSorted('month')} onSort={toggleSort}>Month</SortableHeader>}
              <SortableHeader sortKey="title" currentDirection={isSorted('title')} onSort={toggleSort}>Title</SortableHeader>
              <SortableHeader sortKey="category" currentDirection={isSorted('category')} onSort={toggleSort}>Category</SortableHeader>
              <SortableHeader sortKey="date" currentDirection={isSorted('date')} onSort={toggleSort}>Date</SortableHeader>
              <SortableHeader sortKey="amount" currentDirection={isSorted('amount')} onSort={toggleSort} className="text-right">Amount</SortableHeader>
              <SortableHeader sortKey="type" currentDirection={isSorted('type')} onSort={toggleSort}>Type</SortableHeader>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.map((row) => {
              const createdDate = parseCreatedTime(row);
              const dateStr = isNaN(createdDate.getTime())
                ? row.date
                : createdDate.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });

              const typeClass =
                row.type === 'cash'
                  ? 'text-blue-600 dark:text-blue-400'
                  : row.type === 'credit_payment'
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-purple-600 dark:text-purple-400';
              const typeLabel =
                row.type === 'cash' ? 'Cash' : row.type === 'credit_payment' ? 'Credit Pay' : 'Credit';

              return (
                <TableRow key={row.id}>
                  <TableCell>
                    <Checkbox
                      checked={selected.has(row.id)}
                      onCheckedChange={() => toggleSelect(row.id)}
                      aria-label={`Select ${row.title}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        await toggleTransactionDoneApi(row.id, !row.done);
                        window.location.reload();
                      }}
                      className={`h-7 text-xs font-semibold px-2 py-0 ${
                        row.done
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'
                      }`}
                    >
                      {row.done ? 'Paid' : 'Unpaid'}
                    </Button>
                  </TableCell>
                  {showMonth && <TableCell className="font-medium">{periodIdToMonth.get(row.period_id) || ''}</TableCell>}
                  <TableCell>
                    <span>{row.title}</span>
                    {row.notes && (
                      <StickyNote className="inline ml-1.5 align-middle w-3.5 h-3.5 text-amber-500 dark:text-amber-400" title={row.notes} />
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{row.category}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{dateStr}</TableCell>
                  <TableCell className="font-medium text-right">{formatIdr(row.amount)}</TableCell>
                  <TableCell className={`${typeClass} text-xs font-semibold uppercase`}>{typeLabel}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingId(row.id);
                          setEditForm({ ...row });
                        }}
                        className="h-7 text-xs text-blue-500 hover:text-blue-700"
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
                          await deleteTransactionApi(row.id);
                          window.location.reload();
                        }}
                        className="h-7 text-xs text-red-500 hover:text-red-700"
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

      <div className="flex items-center justify-between mt-4">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Showing {(safePage - 1) * rowsPerPage + 1}–{Math.min(safePage * rowsPerPage, filtered.length)} of {filtered.length}
        </p>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
          >
            Previous
          </Button>
          <span className="text-xs text-slate-500 dark:text-slate-400 min-w-[3rem] text-center">
            {safePage} / {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
          >
            Next
          </Button>
        </div>
      </div>

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
