import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { Transaction, Category } from '../lib/data';
import { updateTransactionApi, deleteTransactionApi, toggleTransactionDoneApi, deleteTransactionsBulkApi, fetchCategories } from '../lib/api';
import { formatIdr } from '../lib/utils';
import { useSortState } from '../hooks/useSortState';
import SortableHeader from './SortableHeader';
import EditTransactionDialog from './EditTransactionDialog';
import { StickyNote } from 'lucide-react';
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
}

function parseCreatedTime(tx: Transaction): Date {
  if (tx.created_time) {
    const d = new Date(tx.created_time);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date(tx.date);
}

export default function TransactionTable({ transactions, showMonth = true }: Props) {
  const getInitialState = () => {
    if (typeof window === 'undefined') return { page: 1, filterType: 'all', filterMonth: 'all', search: '', dateFrom: '', dateTo: '', amountMin: '', amountMax: '' };
    const params = new URLSearchParams(window.location.search);
    return {
      page: Math.max(1, parseInt(params.get('page') || '1', 10) || 1),
      filterType: params.get('type') || 'all',
      filterMonth: params.get('month') || 'all',
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
  const [filterMonth, setFilterMonth] = useState<string>(initial.filterMonth);
  const [search, setSearch] = useState(initial.search);
  const [dateFrom, setDateFrom] = useState(initial.dateFrom);
  const [dateTo, setDateTo] = useState(initial.dateTo);
  const [amountMin, setAmountMin] = useState(initial.amountMin);
  const [amountMax, setAmountMax] = useState(initial.amountMax);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Transaction>>({});
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [categories, setCategories] = useState<Category[]>([]);
  const rowsPerPage = 25;
  const { toggleSort, sortData, isSorted } = useSortState();

  const getCellValue = useCallback((t: Transaction, key: string): string | number => {
    switch (key) {
      case 'paid': return t.done ? 1 : 0;
      case 'month': return t.month;
      case 'title': return t.title;
      case 'category': return t.category;
      case 'date': return new Date(t.created_time || t.date).getTime();
      case 'amount': return t.amount;
      case 'type': return t.type;
      default: return '';
    }
  }, []);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (page > 1) params.set('page', String(page)); else params.delete('page');
    if (filterType !== 'all') params.set('type', filterType); else params.delete('type');
    if (filterMonth !== 'all') params.set('month', filterMonth); else params.delete('month');
    if (search.trim()) params.set('search', search.trim()); else params.delete('search');
    if (dateFrom) params.set('dateFrom', dateFrom); else params.delete('dateFrom');
    if (dateTo) params.set('dateTo', dateTo); else params.delete('dateTo');
    if (amountMin) params.set('amountMin', amountMin); else params.delete('amountMin');
    if (amountMax) params.set('amountMax', amountMax); else params.delete('amountMax');
    const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    window.history.replaceState({}, '', newUrl);
  }, [page, filterType, filterMonth, search, dateFrom, dateTo, amountMin, amountMax]);

  const categoryMap = useMemo(() => {
    const map: Record<string, Category> = {};
    categories.forEach((c) => { map[c.name] = c; });
    return map;
  }, [categories]);

  const monthOptions = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((t) => { if (t.month) set.add(t.month); });
    return Array.from(set).sort((a, b) => {
      const da = new Date(a);
      const db = new Date(b);
      return db.getTime() - da.getTime();
    });
  }, [transactions]);

  const sorted = useMemo(() => {
    return sortData(transactions, getCellValue, (data) =>
      [...data].sort((a, b) => parseCreatedTime(b).getTime() - parseCreatedTime(a).getTime())
    );
  }, [transactions, sortData, getCellValue]);

  let filtered = sorted;
  if (filterType !== 'all') {
    filtered = filtered.filter((t) => t.type === filterType);
  }
  if (filterMonth !== 'all') {
    filtered = filtered.filter((t) => t.month === filterMonth);
  }
  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter((t) =>
      t.title.toLowerCase().includes(q) || t.category.toLowerCase().includes(q) || (t.notes || '').toLowerCase().includes(q)
    );
  }
  if (dateFrom) {
    const fromTime = new Date(dateFrom).getTime();
    filtered = filtered.filter((t) => new Date(t.date).getTime() >= fromTime);
  }
  if (dateTo) {
    const toTime = new Date(dateTo).getTime();
    filtered = filtered.filter((t) => new Date(t.date).getTime() <= toTime);
  }
  if (amountMin) {
    const min = Number(amountMin);
    if (!isNaN(min)) filtered = filtered.filter((t) => t.amount >= min);
  }
  if (amountMax) {
    const max = Number(amountMax);
    if (!isNaN(max)) filtered = filtered.filter((t) => t.amount <= max);
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const start = (page - 1) * rowsPerPage;
  const pageRows = filtered.slice(start, start + rowsPerPage);

  const startEdit = (row: Transaction) => {
    setEditingId(row.id);
    setEditForm({ ...row });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async () => {
    if (!editForm.id) return;
    const original = transactions.find((t) => t.id === editForm.id);
    if (!original) return;
    const updated: Transaction = { ...original, ...(editForm as Transaction) };
    await updateTransactionApi(updated.id, updated);
    setEditingId(null);
    setEditForm({});
    window.location.reload();
  };

  const handleChange = (field: keyof Transaction, value: string | number | boolean) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const allSelected = pageRows.every((r) => selected.has(r.id));
    setSelected((prev) => {
      const next = new Set(prev);
      pageRows.forEach((r) => {
        if (allSelected) next.delete(r.id);
        else next.add(r.id);
      });
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selected.size} transactions?`)) return;
    await deleteTransactionsBulkApi(Array.from(selected));
    setSelected(new Set());
    window.location.reload();
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Input
          type="text"
          placeholder="Search title or category..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="flex-1"
        />
        <Select value={filterType} onValueChange={(v) => { setFilterType(v); setPage(1); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="credit_expense">Credit Expense</SelectItem>
            <SelectItem value="credit_payment">Credit Payment</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterMonth} onValueChange={(v) => { setFilterMonth(v); setPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Months" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Months</SelectItem>
            {monthOptions.map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
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
            }));
            if (exportData.length === 0) {
              alert('No transactions found for this month');
              return;
            }
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const fileName = filterMonth !== 'all' ? `transactions-${filterMonth}.json` : 'transactions-all.json';
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
        <Input
          type="date"
          placeholder="From date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          className="w-full sm:w-[150px]"
        />
        <Input
          type="date"
          placeholder="To date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          className="w-full sm:w-[150px]"
        />
        <Input
          type="number"
          placeholder="Min amount"
          value={amountMin}
          onChange={(e) => { setAmountMin(e.target.value); setPage(1); }}
          className="w-full sm:w-[130px]"
        />
        <Input
          type="number"
          placeholder="Max amount"
          value={amountMax}
          onChange={(e) => { setAmountMax(e.target.value); setPage(1); }}
          className="w-full sm:w-[130px]"
        />
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            setDateFrom('');
            setDateTo('');
            setAmountMin('');
            setAmountMax('');
            setPage(1);
          }}
          className="shrink-0"
        >
          Clear Ranges
        </Button>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-3">
          <span className="text-sm text-slate-600 dark:text-slate-300">{selected.size} selected</span>
          <Button size="sm" variant="destructive" onClick={handleBulkDelete}>
            Delete Selected
          </Button>
        </div>
      )}

      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={pageRows.length > 0 && pageRows.every((r) => selected.has(r.id))}
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
                  {showMonth && <TableCell className="font-medium">{row.month}</TableCell>}
                  <TableCell>
                    <span>{row.title}</span>
                    {row.notes && (
                      <span className="inline-flex ml-1.5 align-middle" title={row.notes}>
                        <StickyNote className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 inline" />
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      style={{
                        backgroundColor: categoryMap[row.category]?.color || undefined,
                        color: categoryMap[row.category]?.color ? '#fff' : undefined,
                      }}
                    >
                      {row.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{dateStr}</TableCell>
                  <TableCell className="font-medium text-right">{formatIdr(row.amount)}</TableCell>
                  <TableCell className={`${typeClass} text-xs font-semibold uppercase`}>{typeLabel}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-blue-500 hover:text-blue-700" onClick={() => startEdit(row)}>
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500 hover:text-red-700" onClick={async () => {
                        if (confirm('Delete this transaction?')) {
                          await deleteTransactionApi(row.id);
                          window.location.reload();
                        }
                      }}>
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

      <div className="flex justify-between items-center mt-4">
        <span className="text-xs text-muted-foreground">
          Showing {start + 1}-{Math.min(start + rowsPerPage, filtered.length)} of {filtered.length}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      </div>

      <EditTransactionDialog
        open={editingId !== null}
        transaction={editForm}
        onChange={handleChange}
        onSave={saveEdit}
        onCancel={cancelEdit}
        showMonth={showMonth}
        months={monthOptions}
        categories={categories.map(c => c.name)}
      />
    </div>
  );
}
