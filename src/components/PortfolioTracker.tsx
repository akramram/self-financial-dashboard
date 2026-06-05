import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import type { Investment, PortfolioSummary } from '../lib/data';
import { formatIdr } from '../lib/utils';
import {
  fetchInvestments,
  fetchPortfolioSummary,
  createInvestmentApi,
  updateInvestmentApi,
  deleteInvestmentApi,
} from '../lib/api';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSortState } from '../hooks/useSortState';
import SortableHeader from './SortableHeader';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PieChart,
  Plus,
  Pencil,
  Trash2,
  Building2,
  Coins,
  Landmark,
  Globe,
} from 'lucide-react';

ChartJS.register(ArcElement, Tooltip, Legend);

const TYPE_OPTIONS = [
  { value: 'stock', label: 'Stock' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'etf', label: 'ETF' },
  { value: 'bond', label: 'Bond' },
  { value: 'mutual_fund', label: 'Mutual Fund' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'other', label: 'Other' },
];

const TYPE_COLORS: Record<string, string> = {
  stock: '#3b82f6',
  crypto: '#f59e0b',
  etf: '#8b5cf6',
  bond: '#10b981',
  mutual_fund: '#06b6d4',
  real_estate: '#ef4444',
  other: '#6b7280',
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  stock: <Building2 className="w-4 h-4" />,
  crypto: <Coins className="w-4 h-4" />,
  etf: <Globe className="w-4 h-4" />,
  bond: <Landmark className="w-4 h-4" />,
  mutual_fund: <Wallet className="w-4 h-4" />,
  real_estate: <Building2 className="w-4 h-4" />,
  other: <Wallet className="w-4 h-4" />,
};

const DONUT_COLORS = [
  '#3b82f6', '#f59e0b', '#8b5cf6', '#10b981',
  '#06b6d4', '#ef4444', '#ec4899', '#6366f1',
  '#14b8a6', '#f97316', '#84cc16', '#a855f7',
];

const EMPTY_FORM: Partial<Investment> = {
  name: '',
  ticker: '',
  type: 'stock',
  quantity: 0,
  avg_purchase_price: 0,
  current_price: 0,
  currency: 'IDR',
  platform: '',
  notes: '',
  purchase_date: '',
};

export default function PortfolioTracker() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<Investment>>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [invData, sumData] = await Promise.all([
        fetchInvestments(),
        fetchPortfolioSummary(),
      ]);
      setInvestments(invData);
      setSummary(sumData);
    } catch (err: any) {
      setError(err.message || 'Failed to load portfolio data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setDialogOpen(true);
  };

  const openEdit = (inv: Investment) => {
    setEditingId(inv.id);
    setForm({ ...inv });
    setDialogOpen(true);
  };

  const handleChange = (field: keyof Investment, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.name) return;
    try {
      setSaving(true);
      if (editingId) {
        await updateInvestmentApi(editingId, form);
      } else {
        await createInvestmentApi(form as any);
      }
      setDialogOpen(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to save investment');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteInvestmentApi(id);
      setDeleteConfirmId(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete investment');
    }
  };

  // Sorting
  const { toggleSort, sortData, isSorted } = useSortState();

  const getCellValue = useCallback((inv: Investment, key: string): string | number => {
    switch (key) {
      case 'name': return inv.name;
      case 'ticker': return inv.ticker;
      case 'type': return inv.type;
      case 'quantity': return inv.quantity;
      case 'avg_purchase_price': return inv.avg_purchase_price;
      case 'current_price': return inv.current_price;
      case 'invested':
        return inv.avg_purchase_price * inv.quantity;
      case 'current_value':
        return inv.current_price * inv.quantity;
      case 'gain_loss':
        return (inv.current_price - inv.avg_purchase_price) * inv.quantity;
      case 'gain_loss_pct':
        return inv.avg_purchase_price > 0
          ? ((inv.current_price - inv.avg_purchase_price) / inv.avg_purchase_price) * 100
          : 0;
      default: return '';
    }
  }, []);

  const sortedInvestments = useMemo(() => {
    return sortData(investments, getCellValue, (data) =>
      [...data].sort((a, b) => {
        const valA = a.current_price * a.quantity;
        const valB = b.current_price * b.quantity;
        return valB - valA;
      })
    );
  }, [investments, sortData, getCellValue]);

  // Donut chart data - by type
  const donutData = useMemo(() => {
    if (!summary?.byType) return null;
    const entries = Object.entries(summary.byType)
      .filter(([, v]) => v.currentValue > 0)
      .sort(([, a], [, b]) => b.currentValue - a.currentValue);
    if (entries.length === 0) return null;
    return {
      labels: entries.map(([key]) => {
        const label = TYPE_OPTIONS.find((t) => t.value === key)?.label || key;
        return label;
      }),
      datasets: [{
        data: entries.map(([, val]) => val.currentValue),
        backgroundColor: entries.map(([key], i) => TYPE_COLORS[key] || DONUT_COLORS[i % DONUT_COLORS.length]),
        borderColor: entries.map(([key], i) => TYPE_COLORS[key] || DONUT_COLORS[i % DONUT_COLORS.length]),
        borderWidth: 0,
        hoverBorderWidth: 2,
        hoverBorderColor: '#fff',
      }],
    };
  }, [summary]);

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 16,
          usePointStyle: true,
          pointStyleWidth: 10,
          font: { size: 11 },
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            const total = ctx.dataset.data.reduce((s: number, v: number) => s + v, 0);
            const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : '0';
            return ` ${ctx.label}: ${formatIdr(ctx.parsed)} (${pct}%)`;
          },
        },
      },
    },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-300">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline hover:no-underline">Dismiss</button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Total Invested</p>
            <p className="text-lg font-bold text-slate-800 dark:text-slate-100">
              {formatIdr(summary?.totalInvested ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Current Value</p>
            <p className="text-lg font-bold text-slate-800 dark:text-slate-100">
              {formatIdr(summary?.totalCurrentValue ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Total Gain/Loss</p>
            <div className="flex items-center gap-1.5">
              {(summary?.totalGainLoss ?? 0) >= 0 ? (
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
              <p className={`text-lg font-bold ${
                (summary?.totalGainLoss ?? 0) >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {formatIdr(summary?.totalGainLoss ?? 0)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Return</p>
            <p className={`text-lg font-bold ${
              (summary?.totalGainLossPct ?? 0) >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-red-600 dark:text-red-400'
            }`}>
              {(summary?.totalGainLossPct ?? 0) >= 0 ? '+' : ''}
              {(summary?.totalGainLossPct ?? 0).toFixed(2)}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Holdings</p>
            <p className="text-lg font-bold text-slate-800 dark:text-slate-100">
              {summary?.holdingsCount ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Allocation Chart + By-Type Breakdown */}
      {donutData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <PieChart className="w-4 h-4 text-slate-500" />
                Allocation by Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <Doughnut data={donutData} options={donutOptions} />
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Wallet className="w-4 h-4 text-slate-500" />
                Breakdown by Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(summary?.byType ?? {}).map(([type, data]) => {
                  const pct = summary && summary.totalCurrentValue > 0
                    ? (data.currentValue / summary.totalCurrentValue) * 100
                    : 0;
                  const gainLoss = data.currentValue - data.invested;
                  const gainLossPct = data.invested > 0
                    ? ((data.currentValue - data.invested) / data.invested) * 100
                    : 0;
                  const label = TYPE_OPTIONS.find((t) => t.value === type)?.label || type;
                  return (
                    <div
                      key={type}
                      className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${TYPE_COLORS[type] || '#6b7280'}20` }}
                      >
                        <span style={{ color: TYPE_COLORS[type] || '#6b7280' }}>
                          {TYPE_ICONS[type] || TYPE_ICONS.other}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                            {formatIdr(data.currentValue)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center mt-0.5">
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {data.count} holding{data.count !== 1 ? 's' : ''} · {pct.toFixed(1)}% of portfolio
                          </span>
                          <span className={`text-xs font-medium ${
                            gainLoss >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                          }`}>
                            {gainLoss >= 0 ? '+' : ''}{gainLossPct.toFixed(2)}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 mt-1.5">
                          <div
                            className="h-1.5 rounded-full"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: TYPE_COLORS[type] || '#6b7280',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Investments Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Wallet className="w-4 h-4 text-slate-500" />
              Holdings ({investments.length})
            </CardTitle>
            <Button size="sm" onClick={openAdd} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="w-4 h-4 mr-1" />
              Add Holding
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {investments.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              <Wallet className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No investments tracked yet</p>
              <p className="text-xs mt-1">Add your first holding to start tracking your portfolio.</p>
              <Button size="sm" onClick={openAdd} className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white">
                <Plus className="w-4 h-4 mr-1" />
                Add First Holding
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHeader sortKey="name" currentDirection={isSorted('name')} onSort={toggleSort}>Name</SortableHeader>
                    <SortableHeader sortKey="ticker" currentDirection={isSorted('ticker')} onSort={toggleSort}>Ticker</SortableHeader>
                    <SortableHeader sortKey="type" currentDirection={isSorted('type')} onSort={toggleSort}>Type</SortableHeader>
                    <SortableHeader sortKey="quantity" currentDirection={isSorted('quantity')} onSort={toggleSort} className="text-right">Qty</SortableHeader>
                    <SortableHeader sortKey="avg_purchase_price" currentDirection={isSorted('avg_purchase_price')} onSort={toggleSort} className="text-right">Avg Price</SortableHeader>
                    <SortableHeader sortKey="current_price" currentDirection={isSorted('current_price')} onSort={toggleSort} className="text-right">Current</SortableHeader>
                    <SortableHeader sortKey="invested" currentDirection={isSorted('invested')} onSort={toggleSort} className="text-right">Invested</SortableHeader>
                    <SortableHeader sortKey="current_value" currentDirection={isSorted('current_value')} onSort={toggleSort} className="text-right">Value</SortableHeader>
                    <SortableHeader sortKey="gain_loss_pct" currentDirection={isSorted('gain_loss_pct')} onSort={toggleSort} className="text-right">P/L</SortableHeader>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedInvestments.map((inv) => {
                    const invested = inv.avg_purchase_price * inv.quantity;
                    const currentValue = inv.current_price * inv.quantity;
                    const gainLoss = currentValue - invested;
                    const gainLossPct = invested > 0 ? (gainLoss / invested) * 100 : 0;

                    return (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium text-sm">{inv.name}</TableCell>
                        <TableCell className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                          {inv.ticker || '—'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0"
                            style={{
                              backgroundColor: `${TYPE_COLORS[inv.type] || '#6b7280'}20`,
                              color: TYPE_COLORS[inv.type] || '#6b7280',
                            }}
                          >
                            {TYPE_OPTIONS.find((t) => t.value === inv.type)?.label || inv.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm">{inv.quantity.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-sm">{formatIdr(inv.avg_purchase_price)}</TableCell>
                        <TableCell className="text-right text-sm">{formatIdr(inv.current_price)}</TableCell>
                        <TableCell className="text-right text-sm text-slate-600 dark:text-slate-300">
                          {formatIdr(invested)}
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          {formatIdr(currentValue)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {gainLoss >= 0 ? (
                              <TrendingUp className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <TrendingDown className="w-3 h-3 text-red-500" />
                            )}
                            <span className={`text-xs font-semibold ${
                              gainLoss >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                            }`}>
                              {gainLoss >= 0 ? '+' : ''}{gainLossPct.toFixed(2)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEdit(inv)}
                              className="h-7 w-7 p-0"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDeleteConfirmId(inv.id)}
                              className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Holding' : 'Add Holding'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Update investment details.' : 'Add a new investment to your portfolio.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2">
              <Label htmlFor="inv-name">Name *</Label>
              <Input
                id="inv-name"
                value={form.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g. Apple Inc."
              />
            </div>
            <div>
              <Label htmlFor="inv-ticker">Ticker</Label>
              <Input
                id="inv-ticker"
                value={form.ticker || ''}
                onChange={(e) => handleChange('ticker', e.target.value)}
                placeholder="e.g. AAPL"
              />
            </div>
            <div>
              <Label htmlFor="inv-type">Type</Label>
              <Select
                value={form.type || 'stock'}
                onValueChange={(v) => handleChange('type', v)}
              >
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
            <div>
              <Label htmlFor="inv-qty">Quantity</Label>
              <Input
                id="inv-qty"
                type="number"
                step="any"
                min="0"
                value={form.quantity || 0}
                onChange={(e) => handleChange('quantity', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label htmlFor="inv-platform">Platform</Label>
              <Input
                id="inv-platform"
                value={form.platform || ''}
                onChange={(e) => handleChange('platform', e.target.value)}
                placeholder="e.g. IBKR"
              />
            </div>
            <div>
              <Label htmlFor="inv-avg-price">Avg Purchase Price</Label>
              <Input
                id="inv-avg-price"
                type="number"
                step="any"
                min="0"
                value={form.avg_purchase_price || 0}
                onChange={(e) => handleChange('avg_purchase_price', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label htmlFor="inv-current-price">Current Price</Label>
              <Input
                id="inv-current-price"
                type="number"
                step="any"
                min="0"
                value={form.current_price || 0}
                onChange={(e) => handleChange('current_price', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label htmlFor="inv-purchase-date">Purchase Date</Label>
              <Input
                id="inv-purchase-date"
                type="date"
                value={form.purchase_date || ''}
                onChange={(e) => handleChange('purchase_date', e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="inv-notes">Notes</Label>
              <Input
                id="inv-notes"
                value={form.notes || ''}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Optional notes..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !form.name}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Holding'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Holding?</DialogTitle>
            <DialogDescription>
              This will permanently remove this investment from your portfolio. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
