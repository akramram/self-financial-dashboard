import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { NetworthRecord, Investment } from '../lib/data';
import { formatIdr } from '../lib/utils';
import {
  fetchInvestments,
  createInvestmentApi,
  updateInvestmentApi,
  deleteInvestmentApi,
} from '../lib/api';
import {
  computeRebalance,
  REBALANCE_PRESETS,
  type AssetItem,
} from '../lib/portfolio-rebalance';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Scale,
  Briefcase,
  Coins,
  TrendingUp,
  TrendingDown,
  Plus,
  Pencil,
  Trash2,
  Wallet,
  CheckCircle2,
  AlertCircle,
  Calculator,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { useSortState } from '../hooks/useSortState';
import SortableHeader from './SortableHeader';

interface Props {
  data: NetworthRecord[];
}

interface BbriQuoteState {
  symbol: string;
  price: number;
  prev_close: number;
  ttm_dividend: number;
  fetched_at: string;
  last_dividend_date?: string;
  dividends?: { date: string; amount: number }[];
}

const EMPTY_INVESTMENT: Partial<Investment> = {
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

export default function PortfolioHub({ data }: Props) {
  // Navigation tab state
  const [activeTab, setActiveTab] = useState<'rebalance' | 'holdings' | 'dividends'>('rebalance');

  // Investments holdings state
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loadingInvestments, setLoadingInvestments] = useState(true);
  const [invError, setInvError] = useState<string | null>(null);

  // Modal dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<Investment>>({ ...EMPTY_INVESTMENT });
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // BBRI quote state
  const [bbriQuote, setBbriQuote] = useState<BbriQuoteState | null>(null);

  // Rebalancing calculator state
  const [presetKey, setPresetKey] = useState<string>('balanced');
  const [customTargets, setCustomTargets] = useState<Record<string, number>>({});
  const [cashInflow, setCashInflow] = useState<number>(2000000); // Rp 2.000.000 default injection

  // Load holdings from API
  const loadInvestments = useCallback(async () => {
    try {
      setLoadingInvestments(true);
      setInvError(null);
      const items = await fetchInvestments();
      setInvestments(items);
    } catch (err: any) {
      setInvError(err.message || 'Gagal memuat data investasi');
    } finally {
      setLoadingInvestments(false);
    }
  }, []);

  // Fetch BBRI cached quote
  useEffect(() => {
    fetch('/api/bbri/quote')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.quote) {
          setBbriQuote(d.quote);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadInvestments();
  }, [loadInvestments]);

  // Sorting for holdings table
  const { toggleSort, sortData, isSorted } = useSortState();

  const getCellValue = useCallback((inv: Investment, key: string): string | number => {
    switch (key) {
      case 'name':
        return inv.name;
      case 'ticker':
        return inv.ticker;
      case 'type':
        return inv.type;
      case 'quantity':
        return inv.quantity;
      case 'avg_purchase_price':
        return inv.avg_purchase_price;
      case 'current_price':
        return inv.current_price;
      case 'current_value':
        return inv.current_price * inv.quantity;
      case 'gain_loss':
        return (inv.current_price - inv.avg_purchase_price) * inv.quantity;
      default:
        return '';
    }
  }, []);

  const sortedInvestments = useMemo(() => {
    return sortData(investments, getCellValue, (items) =>
      [...items].sort((a, b) => b.current_price * b.quantity - a.current_price * a.quantity)
    );
  }, [investments, sortData, getCellValue]);

  // Networth latest breakdown
  const latestNetworth = useMemo(() => {
    if (!data || data.length === 0) return null;
    return [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[
      data.length - 1
    ];
  }, [data]);

  // Asset breakdown items
  const assetItems: AssetItem[] = useMemo(() => {
    if (!latestNetworth?.breakdown) return [];
    return Object.entries(latestNetworth.breakdown)
      .map(([key, value]) => ({ key, value: Number(value) }))
      .filter((a) => a.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [latestNetworth]);

  // Synchronize target weights
  const activeTargets: Record<string, number> = useMemo(() => {
    if (presetKey !== 'custom' && REBALANCE_PRESETS[presetKey]) {
      const preset = REBALANCE_PRESETS[presetKey].targets;
      // Map preset keys to available asset breakdown or retain raw
      const mapped: Record<string, number> = {};
      const knownKeys = assetItems.map((a) => a.key);

      for (const asset of assetItems) {
        if (preset[asset.key] !== undefined) {
          mapped[asset.key] = preset[asset.key];
        } else if (asset.key.toLowerCase().includes('saham') && preset['Saham']) {
          mapped[asset.key] = preset['Saham'];
        } else if (asset.key.toLowerCase().includes('reksa') && preset['Reksadana']) {
          mapped[asset.key] = preset['Reksadana'];
        } else if (asset.key.toLowerCase().includes('cash') || asset.key.toLowerCase().includes('kas')) {
          mapped[asset.key] = preset['Kas'] ?? 20;
        } else if (asset.key.toLowerCase().includes('crypto') && preset['Crypto']) {
          mapped[asset.key] = preset['Crypto'];
        } else {
          mapped[asset.key] = 10;
        }
      }

      // Normalize if there are assets
      const sum = Object.values(mapped).reduce((s, v) => s + v, 0);
      if (sum > 0 && knownKeys.length > 0) {
        const normalized: Record<string, number> = {};
        for (const k of knownKeys) {
          normalized[k] = Math.round(((mapped[k] ?? 10) / sum) * 100);
        }
        return normalized;
      }
      return mapped;
    }

    // Custom targets
    const res: Record<string, number> = {};
    for (const asset of assetItems) {
      res[asset.key] = customTargets[asset.key] ?? Math.round(100 / Math.max(1, assetItems.length));
    }
    return res;
  }, [presetKey, assetItems, customTargets]);

  // Compute rebalance metrics
  const rebalanceData = useMemo(() => {
    return computeRebalance(assetItems, activeTargets, {
      cashInflow,
      driftTolerance: 1.5,
    });
  }, [assetItems, activeTargets, cashInflow]);

  // Holdings valuation metrics
  const holdingsMetrics = useMemo(() => {
    let totalInvested = 0;
    let totalCurrent = 0;
    for (const inv of investments) {
      totalInvested += inv.avg_purchase_price * inv.quantity;
      totalCurrent += inv.current_price * inv.quantity;
    }
    const gainLoss = totalCurrent - totalInvested;
    const gainLossPct = totalInvested > 0 ? (gainLoss / totalInvested) * 100 : 0;
    return { totalInvested, totalCurrent, gainLoss, gainLossPct, count: investments.length };
  }, [investments]);

  // BBRI 32 lots calculation
  const bbriStats = useMemo(() => {
    const lots = 32;
    const shares = lots * 100; // 3,200 lembar
    const price = bbriQuote?.price ?? 3100;
    const ttmDiv = bbriQuote?.ttm_dividend ?? 346;
    const currentVal = shares * price;
    const annualDividend = shares * ttmDiv;
    const monthlyEquivalent = Math.round(annualDividend / 12);
    const dividendYield = price > 0 ? (ttmDiv / price) * 100 : 0;

    return {
      lots,
      shares,
      price,
      ttmDiv,
      currentVal,
      annualDividend,
      monthlyEquivalent,
      dividendYield,
    };
  }, [bbriQuote]);

  // Check if BBRI is in holdings
  const hasBbriHolding = useMemo(() => {
    return investments.some((i) => i.ticker?.toUpperCase().includes('BBRI') || i.name.toUpperCase().includes('BBRI'));
  }, [investments]);

  // Quick action: Add BBRI 32 Lots
  const handleAddBbriPreset = async () => {
    try {
      setSaving(true);
      await createInvestmentApi({
        name: 'Bank Rakyat Indonesia',
        ticker: 'BBRI.JK',
        type: 'stock',
        quantity: 3200,
        avg_purchase_price: bbriStats.price,
        current_price: bbriStats.price,
        currency: 'IDR',
        platform: 'KSEI',
        notes: 'Hold jangka panjang dividen 32 lot',
        purchase_date: new Date().toISOString().slice(0, 10),
      } as any);
      await loadInvestments();
    } catch (err: any) {
      setInvError(err.message || 'Gagal menambahkan preset BBRI');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setForm({ ...EMPTY_INVESTMENT });
    setDialogOpen(true);
  };

  const handleOpenEdit = (inv: Investment) => {
    setEditingId(inv.id);
    setForm({ ...inv });
    setDialogOpen(true);
  };

  const handleSaveHolding = async () => {
    if (!form.name) return;
    try {
      setSaving(true);
      if (editingId) {
        await updateInvestmentApi(editingId, form);
      } else {
        await createInvestmentApi(form as any);
      }
      setDialogOpen(false);
      await loadInvestments();
    } catch (err: any) {
      setInvError(err.message || 'Gagal menyimpan instrumen investasi');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteHolding = async (id: number) => {
    try {
      await deleteInvestmentApi(id);
      setDeleteConfirmId(null);
      await loadInvestments();
    } catch (err: any) {
      setInvError(err.message || 'Gagal menghapus instrumen investasi');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Portfolio Value */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-mint-500/10 text-mint-600 dark:text-mint-400">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-white/60">Total Net Worth Portfolio</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">
                {latestNetworth ? formatIdr(latestNetworth.total) : 'Rp 0'}
              </p>
              {latestNetworth?.month_over_month_pct != null && (
                <p
                  className={`text-xs mt-0.5 font-medium ${
                    latestNetworth.month_over_month_pct >= 0
                      ? 'text-mint-600 dark:text-mint-400'
                      : 'text-coral-500'
                  }`}
                >
                  {latestNetworth.month_over_month_pct >= 0 ? '+' : ''}
                  {latestNetworth.month_over_month_pct}% MoM ({latestNetworth.month})
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Rebalance Alignment Health */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${
                rebalanceData.isBalanced
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-gold-500/10 text-gold-600 dark:text-gold-400'
              }`}
            >
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-white/60">Status Rebalancing</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">
                {rebalanceData.isBalanced ? 'Seimbang' : `Drift ${rebalanceData.maxDrift}%`}
              </p>
              <p className="text-xs text-slate-500 dark:text-white/60 mt-0.5">
                {rebalanceData.isBalanced
                  ? 'Semua aset dalam toleransi ideal'
                  : 'Ada aset yang melenceng dari target'}
              </p>
            </div>
          </div>
        </div>

        {/* Projected Annual Dividend */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-white/60">Est. Dividen Tahunan (BBRI)</p>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatIdr(bbriStats.annualDividend)}
              </p>
              <p className="text-xs text-slate-500 dark:text-white/60 mt-0.5">
                Yield {bbriStats.dividendYield.toFixed(1)}% ({formatIdr(bbriStats.monthlyEquivalent)}/bln)
              </p>
            </div>
          </div>
        </div>

        {/* Registered Holdings */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-white/60">Posisi Instrumen Tercatat</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">
                {holdingsMetrics.count} Instrumen
              </p>
              <p className="text-xs text-slate-500 dark:text-white/60 mt-0.5">
                {holdingsMetrics.gainLoss >= 0 ? '+' : ''}
                {formatIdr(holdingsMetrics.gainLoss)} ({holdingsMetrics.gainLossPct.toFixed(1)}%)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/[0.06] pb-3 gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-white/[0.04]">
          <button
            type="button"
            onClick={() => setActiveTab('rebalance')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all min-h-[44px] ${
              activeTab === 'rebalance'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Scale className="w-4 h-4 text-mint-500" />
            Alokasi & Rebalancing
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('holdings')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all min-h-[44px] ${
              activeTab === 'holdings'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Briefcase className="w-4 h-4 text-sky-500" />
            Holdings & Posisi ({investments.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('dividends')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all min-h-[44px] ${
              activeTab === 'dividends'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Coins className="w-4 h-4 text-emerald-500" />
            Radar Dividen & Yield
          </button>
        </div>

        {activeTab === 'holdings' && (
          <div className="flex items-center gap-2">
            {!hasBbriHolding && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddBbriPreset}
                disabled={saving}
                className="text-xs min-h-[44px] border-mint-500/30 text-mint-600 dark:text-mint-400 hover:bg-mint-500/10"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1 text-mint-500" />
                Tambah BBRI (32 Lot)
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleOpenAdd}
              className="text-xs min-h-[44px] bg-mint-600 hover:bg-mint-700 text-white"
            >
              <Plus className="w-4 h-4 mr-1" />
              Tambah Posisi
            </Button>
          </div>
        )}
      </div>

      {/* TAB 1: REBALANCING & ASSET ALLOCATION */}
      {activeTab === 'rebalance' && (
        <div className="space-y-6">
          {/* Preset Selector & Controls */}
          <div className="glass-card p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-mint-500" />
                  Target Alokasi Aset
                </h2>
                <p className="text-xs text-slate-500 dark:text-white/60">
                  Pilih model alokasi target atau sesuaikan bobot persentase untuk mengevaluasi deviasi aset.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Label htmlFor="preset-select" className="text-xs text-slate-500 dark:text-white/60 whitespace-nowrap">
                  Model Portofolio:
                </Label>
                <Select value={presetKey} onValueChange={setPresetKey}>
                  <SelectTrigger id="preset-select" className="w-[220px] min-h-[44px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(REBALANCE_PRESETS).map(([k, p]) => (
                      <SelectItem key={k} value={k}>
                        {p.label}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Custom (Atur Manual)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Custom Sliders / Target Inputs if custom */}
            {presetKey === 'custom' && (
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/[0.06] grid grid-cols-2 sm:grid-cols-4 gap-3">
                {assetItems.map((asset) => (
                  <div key={asset.key} className="space-y-1">
                    <Label className="text-xs text-slate-600 dark:text-white/70">{asset.key} (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={activeTargets[asset.key] ?? 0}
                      onChange={(e) => {
                        const val = Math.max(0, parseInt(e.target.value) || 0);
                        setCustomTargets((prev) => ({ ...prev, [asset.key]: val }));
                      }}
                      className="min-h-[44px]"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Allocation Breakdown Comparison Table & Bars */}
          <div className="glass-card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Perbandingan Alokasi Aktual vs Target
            </h3>

            <div className="space-y-3">
              {rebalanceData.items.map((item) => (
                <div
                  key={item.key}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02]"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">{item.key}</span>
                      <span className="text-xs text-slate-500 dark:text-white/50">
                        {formatIdr(item.currentValue)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-600 dark:text-white/70">
                        Aktual: <span className="font-bold text-slate-900 dark:text-white">{item.currentPct}%</span>
                        {' '}/ Target: <span className="font-bold text-slate-900 dark:text-white">{item.targetPct}%</span>
                      </span>

                      {item.status === 'overweight' && (
                        <Badge variant="outline" className="text-[11px] border-gold-500/30 text-gold-600 dark:text-gold-400 bg-gold-500/10">
                          Overweight (+{item.driftPct}%)
                        </Badge>
                      )}
                      {item.status === 'underweight' && (
                        <Badge variant="outline" className="text-[11px] border-sky-500/30 text-sky-600 dark:text-sky-400 bg-sky-500/10">
                          Underweight ({item.driftPct}%)
                        </Badge>
                      )}
                      {item.status === 'balanced' && (
                        <Badge variant="outline" className="text-[11px] border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                          Seimbang
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Dual Bar (Actual vs Target) */}
                  <div className="space-y-1">
                    <div className="h-2 w-full bg-slate-200 dark:bg-white/[0.08] rounded-full overflow-hidden flex">
                      <div
                        className={`h-full transition-all rounded-full ${
                          item.status === 'overweight'
                            ? 'bg-gold-500'
                            : item.status === 'underweight'
                            ? 'bg-sky-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, item.currentPct)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Smart Inflow Rebalancer (Injeksi Modal Baru) */}
          <div className="glass-card p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  Rekomendasi Rebalancing via Alokasi Modal Baru (Cash Inflow)
                </h3>
                <p className="text-xs text-slate-500 dark:text-white/60">
                  Cara paling efisien rebalancing tanpa menjual aset: alokasikan simpanan/gaji baru khusus ke aset underweight.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Label htmlFor="inflow-input" className="text-xs text-slate-500 dark:text-white/60 whitespace-nowrap">
                  Tambah Dana:
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-xs text-slate-400">Rp</span>
                  <Input
                    id="inflow-input"
                    type="number"
                    step={500000}
                    min={0}
                    value={cashInflow}
                    onChange={(e) => setCashInflow(Math.max(0, parseInt(e.target.value) || 0))}
                    className="pl-9 w-[170px] min-h-[44px]"
                  />
                </div>
              </div>
            </div>

            {/* Inflow Recommendations */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
              {rebalanceData.items.map((item) => (
                <div
                  key={item.key}
                  className="p-4 rounded-xl border border-slate-200 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02] flex flex-col justify-between"
                >
                  <div>
                    <span className="text-xs text-slate-500 dark:text-white/60">{item.key}</span>
                    <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                      {formatIdr(item.inflowAllocation)}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-white/50 mt-0.5">
                      {cashInflow > 0
                        ? `${((item.inflowAllocation / cashInflow) * 100).toFixed(0)}% dari dana baru`
                        : '0%'}
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-200 dark:border-white/[0.06]">
                    <span
                      className={`text-[11px] font-medium ${
                        item.inflowAllocation > 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-400 dark:text-white/40'
                      }`}
                    >
                      {item.inflowAllocation > 0 ? '+ Prioritas Tambah' : 'Pertahankan (Cukup)'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action List Summary */}
          <div className="glass-card p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-mint-500" />
              Catatan Evaluasi Portofolio
            </h3>
            <div className="space-y-2">
              {rebalanceData.actions.map((act) => (
                <div
                  key={act.key}
                  className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02]"
                >
                  {act.action === 'buy' && <TrendingUp className="w-4 h-4 text-sky-500 mt-0.5 shrink-0" />}
                  {act.action === 'sell' && <AlertCircle className="w-4 h-4 text-gold-500 mt-0.5 shrink-0" />}
                  {act.action === 'hold' && <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />}
                  <p className="text-xs text-slate-700 dark:text-white/80 leading-relaxed">
                    <strong className="font-semibold text-slate-900 dark:text-white">{act.key}:</strong>{' '}
                    {act.message}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: HOLDINGS & POSITIONS */}
      {activeTab === 'holdings' && (
        <div className="space-y-6">
          {invError && (
            <div className="p-3.5 rounded-lg border border-coral-500/20 bg-coral-500/10 text-xs text-coral-600 dark:text-coral-400">
              {invError}
            </div>
          )}

          {/* Holdings Table */}
          <div className="glass-card overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-white/[0.06] flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">Daftar Instrumen Investasi</h2>
                <p className="text-xs text-slate-500 dark:text-white/60">
                  Pencatatan detail lembar, harga beli rata-rata, harga terkini, dan keuntungan/kerugian belum terealisasi.
                </p>
              </div>
            </div>

            {loadingInvestments ? (
              <div className="p-8 text-center text-xs text-slate-500 dark:text-white/50">
                Memuat data instrumen investasi...
              </div>
            ) : sortedInvestments.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Briefcase className="w-10 h-10 text-slate-400 dark:text-white/30 mx-auto" />
                <p className="text-sm font-medium text-slate-700 dark:text-white/70">
                  Belum ada instrumen investasi yang dicatat.
                </p>
                <p className="text-xs text-slate-500 dark:text-white/50 max-w-sm mx-auto">
                  Catat saham (seperti BBRI), reksa dana, obligasi, atau kripto untuk memantau performa portofolio secara spesifik.
                </p>
                <div className="pt-2 flex justify-center gap-2">
                  <Button
                    size="sm"
                    onClick={handleAddBbriPreset}
                    className="min-h-[44px] bg-mint-600 hover:bg-mint-700 text-white"
                  >
                    <Sparkles className="w-4 h-4 mr-1.5" />
                    Tambah BBRI (32 Lot) Otomatis
                  </Button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableHeader sortKey="name" currentDirection={isSorted('name')} onSort={toggleSort}>
                        Aset / Nama
                      </SortableHeader>
                      <SortableHeader sortKey="ticker" currentDirection={isSorted('ticker')} onSort={toggleSort}>
                        Kode
                      </SortableHeader>
                      <SortableHeader sortKey="type" currentDirection={isSorted('type')} onSort={toggleSort}>
                        Tipe
                      </SortableHeader>
                      <SortableHeader sortKey="quantity" currentDirection={isSorted('quantity')} onSort={toggleSort} className="text-right">
                        Jumlah
                      </SortableHeader>
                      <SortableHeader sortKey="avg_purchase_price" currentDirection={isSorted('avg_purchase_price')} onSort={toggleSort} className="text-right">
                        Harga Rata-Rata
                      </SortableHeader>
                      <SortableHeader sortKey="current_price" currentDirection={isSorted('current_price')} onSort={toggleSort} className="text-right">
                        Harga Kini
                      </SortableHeader>
                      <SortableHeader sortKey="current_value" currentDirection={isSorted('current_value')} onSort={toggleSort} className="text-right">
                        Nilai Total
                      </SortableHeader>
                      <SortableHeader sortKey="gain_loss" currentDirection={isSorted('gain_loss')} onSort={toggleSort} className="text-right">
                        Untung / Rugi
                      </SortableHeader>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedInvestments.map((inv) => {
                      const totalVal = inv.current_price * inv.quantity;
                      const invested = inv.avg_purchase_price * inv.quantity;
                      const gainLoss = totalVal - invested;
                      const gainLossPct = invested > 0 ? (gainLoss / invested) * 100 : 0;

                      return (
                        <TableRow key={inv.id}>
                          <TableCell className="font-semibold text-slate-900 dark:text-white">
                            <div>
                              <span>{inv.name}</span>
                              {inv.platform && (
                                <span className="block text-[11px] font-normal text-slate-500 dark:text-white/50">
                                  {inv.platform}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs font-mono text-slate-600 dark:text-white/70">
                            {inv.ticker || '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] capitalize">
                              {inv.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {inv.quantity.toLocaleString('id-ID')}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-slate-600 dark:text-white/70">
                            {formatIdr(inv.avg_purchase_price)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-medium">
                            {formatIdr(inv.current_price)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-bold text-slate-900 dark:text-white">
                            {formatIdr(totalVal)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            <span
                              className={`font-semibold ${
                                gainLoss >= 0
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-coral-500'
                              }`}
                            >
                              {gainLoss >= 0 ? '+' : ''}
                              {formatIdr(gainLoss)} ({gainLoss >= 0 ? '+' : ''}
                              {gainLossPct.toFixed(1)}%)
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenEdit(inv)}
                                className="h-8 w-8 p-0"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteConfirmId(inv.id)}
                                className="h-8 w-8 p-0 text-coral-500 hover:text-coral-600"
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
          </div>
        </div>
      )}

      {/* TAB 3: DIVIDEND & YIELD RADAR */}
      {activeTab === 'dividends' && (
        <div className="space-y-6">
          {/* BBRI Hero Card */}
          <div className="glass-card p-6 space-y-4">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <span className="text-xs uppercase tracking-wider font-semibold text-mint-600 dark:text-mint-400">
                  Saham Dividen Unggulan
                </span>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  Bank Rakyat Indonesia (BBRI.JK)
                </h2>
                <p className="text-xs text-slate-500 dark:text-white/60">
                  Kepemilikan aktif: {bbriStats.lots} Lot ({bbriStats.shares.toLocaleString('id-ID')} lembar saham).
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-500 dark:text-white/60">Harga Saham Terkini</span>
                <p className="text-xl font-bold text-slate-900 dark:text-white">
                  {formatIdr(bbriStats.price)}
                </p>
                <span className="text-[11px] text-slate-400 dark:text-white/40">
                  Valuasi 32 Lot: {formatIdr(bbriStats.currentVal)}
                </span>
              </div>
            </div>

            {/* Dividend Calculation Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02]">
                <span className="text-xs text-slate-500 dark:text-white/60">Dividen TTM per Lembar</span>
                <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                  Rp {bbriStats.ttmDiv.toLocaleString('id-ID')}
                </p>
                <span className="text-[11px] text-slate-500 dark:text-white/50">Trailing 12 months</span>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02]">
                <span className="text-xs text-slate-500 dark:text-white/60">Dividend Yield (TTM)</span>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  {bbriStats.dividendYield.toFixed(2)}%
                </p>
                <span className="text-[11px] text-slate-500 dark:text-white/50">Dividen per lembar / harga</span>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02]">
                <span className="text-xs text-slate-500 dark:text-white/60">Proyeksi Dividen Tahunan</span>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  {formatIdr(bbriStats.annualDividend)}
                </p>
                <span className="text-[11px] text-slate-500 dark:text-white/50">Untuk 32 lot kepemilikan</span>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02]">
                <span className="text-xs text-slate-500 dark:text-white/60">Setara Pendapatan Pasif</span>
                <p className="text-lg font-bold text-mint-600 dark:text-mint-400 mt-1">
                  {formatIdr(bbriStats.monthlyEquivalent)} / bln
                </p>
                <span className="text-[11px] text-slate-500 dark:text-white/50">Rata-rata bulanan</span>
              </div>
            </div>
          </div>

          {/* Historical Dividends Table */}
          {bbriQuote?.dividends && bbriQuote.dividends.length > 0 && (
            <div className="glass-card p-5 space-y-3">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-mint-500" />
                Riwayat Pembayaran Dividen BBRI (12 Bulan Terakhir)
              </h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal Pembayaran</TableHead>
                      <TableHead className="text-right">Nominal per Lembar</TableHead>
                      <TableHead className="text-right">Total Diterima (32 Lot)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bbriQuote.dividends.map((div, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-xs font-medium text-slate-900 dark:text-white">
                          {div.date}
                        </TableCell>
                        <TableCell className="text-xs text-right font-mono">
                          Rp {div.amount.toLocaleString('id-ID')}
                        </TableCell>
                        <TableCell className="text-xs text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatIdr(div.amount * 3200)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Holding Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Edit Instrumen Investasi' : 'Tambah Instrumen Investasi'}
            </DialogTitle>
            <DialogDescription>
              Isi data posisi investasi Anda untuk dicatat dalam portofolio.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="form-name" className="text-xs">Nama Aset / Saham</Label>
              <Input
                id="form-name"
                value={form.name || ''}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Contoh: Bank Rakyat Indonesia"
                className="min-h-[44px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="form-ticker" className="text-xs">Kode / Ticker</Label>
                <Input
                  id="form-ticker"
                  value={form.ticker || ''}
                  onChange={(e) => setForm((p) => ({ ...p, ticker: e.target.value }))}
                  placeholder="BBRI.JK"
                  className="min-h-[44px]"
                />
              </div>

              <div>
                <Label htmlFor="form-type" className="text-xs">Tipe Aset</Label>
                <Select
                  value={form.type || 'stock'}
                  onValueChange={(val) => setForm((p) => ({ ...p, type: val as Investment['type'] }))}
                >
                  <SelectTrigger id="form-type" className="min-h-[44px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stock">Saham</SelectItem>
                    <SelectItem value="mutual_fund">Reksa Dana</SelectItem>
                    <SelectItem value="bond">Obligasi / SBN</SelectItem>
                    <SelectItem value="crypto">Crypto</SelectItem>
                    <SelectItem value="other">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="form-qty" className="text-xs">Jumlah Lembar</Label>
                <Input
                  id="form-qty"
                  type="number"
                  min={0}
                  value={form.quantity || 0}
                  onChange={(e) => setForm((p) => ({ ...p, quantity: parseFloat(e.target.value) || 0 }))}
                  className="min-h-[44px]"
                />
              </div>

              <div>
                <Label htmlFor="form-buy" className="text-xs">Harga Beli</Label>
                <Input
                  id="form-buy"
                  type="number"
                  min={0}
                  value={form.avg_purchase_price || 0}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, avg_purchase_price: parseFloat(e.target.value) || 0 }))
                  }
                  className="min-h-[44px]"
                />
              </div>

              <div>
                <Label htmlFor="form-current" className="text-xs">Harga Kini</Label>
                <Input
                  id="form-current"
                  type="number"
                  min={0}
                  value={form.current_price || 0}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, current_price: parseFloat(e.target.value) || 0 }))
                  }
                  className="min-h-[44px]"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="form-platform" className="text-xs">Platform / Sekuritas</Label>
              <Input
                id="form-platform"
                value={form.platform || ''}
                onChange={(e) => setForm((p) => ({ ...p, platform: e.target.value }))}
                placeholder="Bibit, Stockbit, Mandiri Sekuritas, dll"
                className="min-h-[44px]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving} className="min-h-[44px]">
              Batal
            </Button>
            <Button
              onClick={handleSaveHolding}
              disabled={saving || !form.name}
              className="bg-mint-600 hover:bg-mint-700 text-white min-h-[44px]"
            >
              {saving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Tambah Instrumen'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus Instrumen?</DialogTitle>
            <DialogDescription>
              Instrumen investasi ini akan dihapus dari daftar posisi portofolio Anda.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)} className="min-h-[44px]">
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDeleteHolding(deleteConfirmId)}
              className="min-h-[44px]"
            >
              Hapus
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
