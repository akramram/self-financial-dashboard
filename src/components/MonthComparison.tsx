import React, { useMemo, useState, useEffect, useCallback } from 'react';
import type { Transaction, NetworthRecord, MonthlySummary, Category } from '../lib/data';
import type { CompareResult, CategoryCompareRow } from '../lib/db';
import { formatIdr } from '../lib/utils';
import { fpGrid } from '../lib/chartConfig';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  Landmark,
  Receipt,
  CreditCard,
  Banknote,
  ArrowLeftRight,
  Sparkles,
  BarChart3,
  Layers,
  Search,
  Crosshair,
  Calendar,
  AlertCircle,
  Eye,
} from 'lucide-react';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import CategoryRadarChart from './CategoryRadarChart';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Filler,
  Tooltip,
  Legend
);

interface Props {
  transactions?: Transaction[];
  networth?: NetworthRecord[];
  summaries?: MonthlySummary[];
  categories?: Category[];
}

interface DeltaProps {
  current: number;
  previous: number;
  isPct?: boolean;
  inverse?: boolean;
}

function DeltaBadge({ current, previous, isPct, inverse }: DeltaProps) {
  if (previous === 0 && current === 0) {
    return (
      <span className="text-xs text-slate-500 dark:text-white/40 flex items-center gap-1 font-medium">
        <Minus className="w-3 h-3" /> 0%
      </span>
    );
  }
  if (previous === 0) {
    return (
      <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
        <ArrowUpRight className="w-3 h-3" /> Baru
      </span>
    );
  }
  const change = current - previous;
  const pct = (change / Math.abs(previous)) * 100;
  const isPositive = change > 0;
  const isGood = inverse ? !isPositive : isPositive;
  const colorClass = isGood
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-rose-600 dark:text-rose-400';
  const Icon = isPositive ? ArrowUpRight : ArrowDownRight;

  return (
    <span className={`text-xs flex items-center gap-1 font-semibold ${colorClass}`}>
      <Icon className="w-3.5 h-3.5" />
      {isPct ? `${Math.abs(change).toFixed(1)}%` : `${Math.abs(pct).toFixed(1)}%`}
    </span>
  );
}

function DeltaValue({ current, previous, isPct, inverse }: DeltaProps) {
  if (previous === 0 && current === 0) {
    return <span className="text-xs text-slate-500 dark:text-white/40">-</span>;
  }
  if (previous === 0) {
    return <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">Baru</span>;
  }
  const change = current - previous;
  const isPositive = change > 0;
  const isGood = inverse ? !isPositive : isPositive;
  const colorClass = isGood
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-rose-600 dark:text-rose-400';
  const prefix = change > 0 ? '+' : '';

  return (
    <span className={`text-xs font-semibold ${colorClass}`}>
      {prefix}{isPct ? `${change.toFixed(1)}%` : formatIdr(change)}
    </span>
  );
}

export default function MonthComparison({ categories: initialCategories }: Props) {
  // Query param initialization
  const initialParams = useMemo(() => {
    if (typeof window === 'undefined') return { periodA: '', periodB: '' };
    const p = new URLSearchParams(window.location.search);
    return {
      periodA: p.get('period_a') || '',
      periodB: p.get('period_b') || '',
    };
  }, []);

  const [data, setData] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedPeriodA, setSelectedPeriodA] = useState<string>(initialParams.periodA);
  const [selectedPeriodB, setSelectedPeriodB] = useState<string>(initialParams.periodB);

  // Tab and filter states
  const [visualView, setVisualView] = useState<'bar' | 'cash_credit' | 'radar'>('bar');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'up' | 'down' | 'new'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Drilldown dialog state
  const [drilldownCategory, setDrilldownCategory] = useState<string | null>(null);
  const [drilldownLoading, setDrilldownLoading] = useState(false);
  const [drilldownTxs, setDrilldownTxs] = useState<{
    category: string;
    periodA: Array<{ id: number; title: string; amount: number; date: string; type: string }>;
    periodB: Array<{ id: number; title: string; amount: number; date: string; type: string }>;
  } | null>(null);

  // Fetch comparison data
  const loadComparison = useCallback(async (periodA?: string, periodB?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (periodA) params.set('period_a', periodA);
      if (periodB) params.set('period_b', periodB);

      const res = await fetch(`/api/compare?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: CompareResult = await res.json();
      setData(json);

      setSelectedPeriodA(String(json.periodA.id));
      setSelectedPeriodB(String(json.periodB.id));

      // Sync URL
      if (typeof window !== 'undefined') {
        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.set('period_a', String(json.periodA.id));
        nextUrl.searchParams.set('period_b', String(json.periodB.id));
        window.history.replaceState({}, '', nextUrl.toString());
      }
    } catch (e: any) {
      setError(e.message || 'Gagal memuat perbandingan');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadComparison(initialParams.periodA, initialParams.periodB);
  }, [loadComparison, initialParams.periodA, initialParams.periodB]);

  // Load drilldown transactions for a category
  const handleOpenDrilldown = useCallback(async (category: string) => {
    setDrilldownCategory(category);
    setDrilldownLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedPeriodA) params.set('period_a', selectedPeriodA);
      if (selectedPeriodB) params.set('period_b', selectedPeriodB);
      params.set('category', category);

      const res = await fetch(`/api/compare?${params.toString()}`);
      if (!res.ok) throw new Error('Gagal memuat transaksi kategori');
      const json: CompareResult = await res.json();
      if (json.categoryTransactions) {
        setDrilldownTxs(json.categoryTransactions);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDrilldownLoading(false);
    }
  }, [selectedPeriodA, selectedPeriodB]);

  // Handlers for period selection
  const handlePeriodAChange = (val: string) => {
    setSelectedPeriodA(val);
    loadComparison(val, selectedPeriodB);
  };

  const handlePeriodBChange = (val: string) => {
    setSelectedPeriodB(val);
    loadComparison(selectedPeriodA, val);
  };

  const handleSwap = () => {
    const nextA = selectedPeriodB;
    const nextB = selectedPeriodA;
    setSelectedPeriodA(nextA);
    setSelectedPeriodB(nextB);
    loadComparison(nextA, nextB);
  };

  // Presets
  const availablePeriods = data?.availablePeriods || [];

  const handlePresetLatestVsPrevious = () => {
    if (availablePeriods.length >= 2) {
      const pB = String(availablePeriods[0].id);
      const pA = String(availablePeriods[1].id);
      setSelectedPeriodA(pA);
      setSelectedPeriodB(pB);
      loadComparison(pA, pB);
    }
  };

  const handlePresetLatestVsTwoAgo = () => {
    if (availablePeriods.length >= 3) {
      const pB = String(availablePeriods[0].id);
      const pA = String(availablePeriods[2].id);
      setSelectedPeriodA(pA);
      setSelectedPeriodB(pB);
      loadComparison(pA, pB);
    }
  };

  const handlePresetYoY = () => {
    if (availablePeriods.length > 0) {
      const latest = availablePeriods[0];
      const matchMonthName = latest.month.split(' ')[0];
      const sameMonthPriorYear = availablePeriods.find(
        (p, idx) => idx > 0 && p.month.startsWith(matchMonthName)
      );
      if (sameMonthPriorYear) {
        const pB = String(latest.id);
        const pA = String(sameMonthPriorYear.id);
        setSelectedPeriodA(pA);
        setSelectedPeriodB(pB);
        loadComparison(pA, pB);
      }
    }
  };

  // Filtered categories
  const filteredCategories = useMemo(() => {
    if (!data) return [];
    let list = data.categories;

    if (categoryFilter === 'up') {
      list = list.filter((c) => c.status === 'up' || c.status === 'new');
    } else if (categoryFilter === 'down') {
      list = list.filter((c) => c.status === 'down');
    } else if (categoryFilter === 'new') {
      list = list.filter((c) => c.status === 'new');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q));
    }

    return list;
  }, [data, categoryFilter, searchQuery]);

  // Grouped Bar Chart data
  const barChartData = useMemo(() => {
    if (!data) return null;
    const topCats = [...data.categories]
      .filter((c) => c.leftAmount > 0 || c.rightAmount > 0)
      .slice(0, 10);

    const labels = topCats.map((c) => c.name);
    const leftVals = topCats.map((c) => c.leftAmount);
    const rightVals = topCats.map((c) => c.rightAmount);

    return {
      labels,
      datasets: [
        {
          label: data.periodA.month,
          data: leftVals,
          backgroundColor: 'rgba(59, 130, 246, 0.75)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 1,
          borderRadius: 6,
        },
        {
          label: data.periodB.month,
          data: rightVals,
          backgroundColor: 'rgba(16, 185, 129, 0.75)',
          borderColor: 'rgba(16, 185, 129, 1)',
          borderWidth: 1,
          borderRadius: 6,
        },
      ],
    };
  }, [data]);

  const barChartOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top' as const,
          labels: {
            color: '#94a3b8',
            font: { family: 'inherit', size: 12, weight: 500 as const },
            boxWidth: 14,
            boxHeight: 14,
            borderRadius: 4,
          },
        },
        tooltip: {
          callbacks: {
            label: (ctx: any) => `${ctx.dataset.label}: ${formatIdr(ctx.raw || 0)}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#94a3b8', font: { size: 11 } },
        },
        y: {
          grid: { color: fpGrid() },
          ticks: {
            color: '#94a3b8',
            font: { size: 11 },
            callback: (v: any) => (v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : `${v / 1000}k`),
          },
        },
      },
    };
  }, []);

  // Radar compatibility
  const radarCategories = useMemo(() => {
    if (initialCategories && initialCategories.length > 0) return initialCategories;
    if (!data) return [];
    return data.categories.map((c, i) => ({
      id: i + 1,
      name: c.name,
      color: c.color,
      monthly_limit: 0,
      created_at: new Date().toISOString(),
    }));
  }, [initialCategories, data]);

  const radarLeftSummary = useMemo(() => {
    if (!data) return undefined;
    const totals: Record<string, number> = {};
    data.categories.forEach((c) => {
      totals[c.name] = c.leftAmount;
    });
    return {
      id: data.periodA.id,
      month: data.periodA.month,
      date: data.periodA.start_date,
      start_date: data.periodA.start_date,
      end_date: data.periodA.end_date,
      outcome: data.periodA.outcome,
      category_totals: totals,
      savings: data.periodA.savings,
      savings_rate_pct: data.periodA.savings_rate_pct,
      income: data.periodA.income,
    } as unknown as MonthlySummary;
  }, [data]);

  const radarRightSummary = useMemo(() => {
    if (!data) return undefined;
    const totals: Record<string, number> = {};
    data.categories.forEach((c) => {
      totals[c.name] = c.rightAmount;
    });
    return {
      id: data.periodB.id,
      month: data.periodB.month,
      date: data.periodB.start_date,
      start_date: data.periodB.start_date,
      end_date: data.periodB.end_date,
      outcome: data.periodB.outcome,
      category_totals: totals,
      savings: data.periodB.savings,
      savings_rate_pct: data.periodB.savings_rate_pct,
      income: data.periodB.income,
    } as unknown as MonthlySummary;
  }, [data]);

  // Loading state
  if (loading && !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-14 bg-slate-200 dark:bg-white/[0.05] rounded-2xl w-full" />
        <div className="h-32 bg-slate-200 dark:bg-white/[0.05] rounded-2xl w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-32 bg-slate-200 dark:bg-white/[0.05] rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <div className="rounded-2xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 p-8 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h3 className="text-lg font-semibold text-rose-900 dark:text-rose-200">Gagal Memuat Komparasi</h3>
        <p className="text-sm text-rose-700 dark:text-rose-400">{error || 'Data komparasi tidak tersedia.'}</p>
        <Button onClick={() => loadComparison(selectedPeriodA, selectedPeriodB)} variant="outline">
          Coba Lagi
        </Button>
      </div>
    );
  }

  const { periodA, periodB, topDrivers, insights } = data;

  return (
    <div className="space-y-6">
      {/* ─── Control Bar: Selectors & Quick Presets ─── */}
      <div className="glass-card p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Selectors */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Periode A (Baseline)
              </span>
              <Select value={selectedPeriodA} onValueChange={handlePeriodAChange}>
                <SelectTrigger className="w-[190px] h-10 rounded-xl bg-background border-border font-medium">
                  <SelectValue placeholder="Pilih Periode A" />
                </SelectTrigger>
                <SelectContent>
                  {availablePeriods.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.month} ({p.tx_count} tx)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="pt-5">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSwap}
                className="h-10 w-10 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10"
                title="Tukar Periode A dan B"
                aria-label="Tukar Periode A dan B"
              >
                <ArrowLeftRight className="w-4 h-4 text-muted-foreground" />
              </Button>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Periode B (Komparasi)
              </span>
              <Select value={selectedPeriodB} onValueChange={handlePeriodBChange}>
                <SelectTrigger className="w-[190px] h-10 rounded-xl bg-background border-border font-medium">
                  <SelectValue placeholder="Pilih Periode B" />
                </SelectTrigger>
                <SelectContent>
                  {availablePeriods.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.month} ({p.tx_count} tx)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5 self-start lg:self-center">
            <span className="text-xs text-muted-foreground mr-1 hidden sm:inline">Preset Cepat:</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePresetLatestVsPrevious}
              className="h-8 text-xs rounded-lg px-2.5"
            >
              Bulan Ini vs Lalu
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePresetLatestVsTwoAgo}
              className="h-8 text-xs rounded-lg px-2.5"
            >
              vs 2 Bulan Lalu
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePresetYoY}
              className="h-8 text-xs rounded-lg px-2.5"
            >
              Tahun Lalu (YoY)
            </Button>
          </div>
        </div>
      </div>

      {/* ─── Executive Intelligence Briefing ─── */}
      {insights && insights.length > 0 && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] dark:bg-emerald-500/[0.06] p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Ringkasan Eksekutif & Variansi ({periodA.month} vs {periodB.month})
            </h2>
          </div>
          <ul className="space-y-1.5 text-xs sm:text-sm text-slate-700 dark:text-slate-200">
            {insights.map((pt, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-emerald-500 mt-1 shrink-0">•</span>
                <span>{pt}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ─── 6 Financial KPI Comparison Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Total Pengeluaran */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200">
                <Receipt className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Total Pengeluaran
              </span>
            </div>
            <DeltaBadge current={periodB.outcome.total} previous={periodA.outcome.total} inverse />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[11px] text-muted-foreground mb-0.5 truncate">{periodA.month}</p>
              <p className="text-base font-semibold">{formatIdr(periodA.outcome.total)}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground mb-0.5 truncate">{periodB.month}</p>
              <p className="text-base font-semibold">{formatIdr(periodB.outcome.total)}</p>
              <div className="mt-1">
                <DeltaValue current={periodB.outcome.total} previous={periodA.outcome.total} inverse />
              </div>
            </div>
          </div>
        </div>

        {/* Total Pemasukan */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200">
                <Wallet className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Pemasukan Bulanan
              </span>
            </div>
            <DeltaBadge current={periodB.income} previous={periodA.income} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[11px] text-muted-foreground mb-0.5 truncate">{periodA.month}</p>
              <p className="text-base font-semibold">{formatIdr(periodA.income)}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground mb-0.5 truncate">{periodB.month}</p>
              <p className="text-base font-semibold">{formatIdr(periodB.income)}</p>
              <div className="mt-1">
                <DeltaValue current={periodB.income} previous={periodA.income} />
              </div>
            </div>
          </div>
        </div>

        {/* Tabungan Bersih (Surplus) */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200">
                <PiggyBank className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Tabungan Bersih
              </span>
            </div>
            <DeltaBadge current={periodB.savings} previous={periodA.savings} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[11px] text-muted-foreground mb-0.5 truncate">{periodA.month}</p>
              <p className="text-base font-semibold">{formatIdr(periodA.savings)}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground mb-0.5 truncate">{periodB.month}</p>
              <p className="text-base font-semibold">{formatIdr(periodB.savings)}</p>
              <div className="mt-1">
                <DeltaValue current={periodB.savings} previous={periodA.savings} />
              </div>
            </div>
          </div>
        </div>

        {/* Savings Rate */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200">
                <TrendingUp className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Savings Rate
              </span>
            </div>
            <DeltaBadge
              current={periodB.savings_rate_pct}
              previous={periodA.savings_rate_pct}
              isPct
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[11px] text-muted-foreground mb-0.5 truncate">{periodA.month}</p>
              <p className="text-base font-semibold">{periodA.savings_rate_pct.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground mb-0.5 truncate">{periodB.month}</p>
              <p className="text-base font-semibold">{periodB.savings_rate_pct.toFixed(1)}%</p>
              <div className="mt-1">
                <DeltaValue
                  current={periodB.savings_rate_pct}
                  previous={periodA.savings_rate_pct}
                  isPct
                />
              </div>
            </div>
          </div>
        </div>

        {/* Total Networth */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200">
                <Landmark className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Total Net Worth
              </span>
            </div>
            <DeltaBadge current={periodB.networth_total} previous={periodA.networth_total} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[11px] text-muted-foreground mb-0.5 truncate">{periodA.month}</p>
              <p className="text-base font-semibold">{formatIdr(periodA.networth_total)}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground mb-0.5 truncate">{periodB.month}</p>
              <p className="text-base font-semibold">{formatIdr(periodB.networth_total)}</p>
              <div className="mt-1">
                <DeltaValue current={periodB.networth_total} previous={periodA.networth_total} />
              </div>
            </div>
          </div>
        </div>

        {/* Rata-rata per Transaksi & Frekuensi */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200">
                <Banknote className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Rata-rata per Transaksi
              </span>
            </div>
            <DeltaBadge current={periodB.avg_per_tx} previous={periodA.avg_per_tx} inverse />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[11px] text-muted-foreground mb-0.5 truncate">
                {periodA.month} ({periodA.tx_count} tx)
              </p>
              <p className="text-base font-semibold">{formatIdr(periodA.avg_per_tx)}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground mb-0.5 truncate">
                {periodB.month} ({periodB.tx_count} tx)
              </p>
              <p className="text-base font-semibold">{formatIdr(periodB.avg_per_tx)}</p>
              <div className="mt-1">
                <DeltaValue current={periodB.avg_per_tx} previous={periodA.avg_per_tx} inverse />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Top Drivers of Change: Pemicu Kenaikan vs Penghematan ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pemicu Kenaikan (Top Escalations) */}
        <div className="glass-card p-5 space-y-3">
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
            <TrendingUp className="w-4 h-4" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Pemicu Lonjakan Biaya (Top Kenaikan)
            </h3>
          </div>
          {topDrivers.topIncreases.length === 0 ? (
            <p className="text-xs text-muted-foreground py-3">Tidak ada kategori yang mengalami lonjakan biaya.</p>
          ) : (
            <div className="space-y-2">
              {topDrivers.topIncreases.map((cat) => (
                <div
                  key={cat.name}
                  onClick={() => handleOpenDrilldown(cat.name)}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] hover:bg-slate-100 dark:hover:bg-white/[0.06] cursor-pointer transition border border-transparent hover:border-slate-200 dark:hover:border-white/10"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate text-slate-900 dark:text-white">
                        {cat.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatIdr(cat.leftAmount)} → {formatIdr(cat.rightAmount)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant="destructive" className="text-[11px] font-semibold">
                      +{formatIdr(cat.delta)} (+{cat.pctChange}%)
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pemicu Penghematan (Top Reductions) */}
        <div className="glass-card p-5 space-y-3">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <TrendingDown className="w-4 h-4" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Pemicu Efisiensi Biaya (Top Penghematan)
            </h3>
          </div>
          {topDrivers.topSavings.length === 0 ? (
            <p className="text-xs text-muted-foreground py-3">Tidak ada kategori yang mengalami penurunan biaya.</p>
          ) : (
            <div className="space-y-2">
              {topDrivers.topSavings.map((cat) => (
                <div
                  key={cat.name}
                  onClick={() => handleOpenDrilldown(cat.name)}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] hover:bg-slate-100 dark:hover:bg-white/[0.06] cursor-pointer transition border border-transparent hover:border-slate-200 dark:hover:border-white/10"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate text-slate-900 dark:text-white">
                        {cat.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatIdr(cat.leftAmount)} → {formatIdr(cat.rightAmount)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge className="text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      {formatIdr(cat.delta)} ({cat.pctChange}%)
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Visual Comparison Section ─── */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200">
              <BarChart3 className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Visualisasi Komparasi ({periodA.month} vs {periodB.month})
            </h3>
          </div>

          {/* View toggle */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-border">
            <button
              onClick={() => setVisualView('bar')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                visualView === 'bar'
                  ? 'bg-white dark:bg-slate-800 text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Bar Kategori
            </button>
            <button
              onClick={() => setVisualView('cash_credit')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                visualView === 'cash_credit'
                  ? 'bg-white dark:bg-slate-800 text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Cash vs Kredit
            </button>
            <button
              onClick={() => setVisualView('radar')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                visualView === 'radar'
                  ? 'bg-white dark:bg-slate-800 text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Radar Profil
            </button>
          </div>
        </div>

        {/* Bar View */}
        {visualView === 'bar' && barChartData && (
          <div className="h-72 w-full pt-2">
            <Bar data={barChartData} options={barChartOptions} />
          </div>
        )}

        {/* Cash vs Credit Breakdown View */}
        {visualView === 'cash_credit' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Periode A */}
            <div className="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-border">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-900 dark:text-white">{periodA.month}</span>
                <span className="text-xs text-muted-foreground">Total: {formatIdr(periodA.outcome.total)}</span>
              </div>
              <div className="space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between items-center py-1 border-b border-border">
                  <span className="text-muted-foreground">Cash Expenses</span>
                  <span className="font-semibold">{formatIdr(periodA.outcome.cash)}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-border">
                  <span className="text-muted-foreground">Credit Card Payment</span>
                  <span className="font-semibold">{formatIdr(periodA.outcome.credit_payment)}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-muted-foreground">Credit Card Purchases (Belanja CC)</span>
                  <span className="font-semibold">{formatIdr(periodA.outcome.credit_expenses)}</span>
                </div>
              </div>
            </div>

            {/* Periode B */}
            <div className="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-border">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-900 dark:text-white">{periodB.month}</span>
                <span className="text-xs text-muted-foreground">Total: {formatIdr(periodB.outcome.total)}</span>
              </div>
              <div className="space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between items-center py-1 border-b border-border">
                  <span className="text-muted-foreground">Cash Expenses</span>
                  <span className="font-semibold">{formatIdr(periodB.outcome.cash)}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-border">
                  <span className="text-muted-foreground">Credit Card Payment</span>
                  <span className="font-semibold">{formatIdr(periodB.outcome.credit_payment)}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-muted-foreground">Credit Card Purchases (Belanja CC)</span>
                  <span className="font-semibold">{formatIdr(periodB.outcome.credit_expenses)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Radar View */}
        {visualView === 'radar' && (
          <div className="pt-2">
            <CategoryRadarChart
              leftSummary={radarLeftSummary}
              rightSummary={radarRightSummary}
              leftMonth={periodA.month}
              rightMonth={periodB.month}
              categories={radarCategories}
            />
          </div>
        )}
      </div>

      {/* ─── Deep-Dive Category Variance Table ─── */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Analisis Variansi Kategori ({filteredCategories.length} Kategori)
              </h3>
              <p className="text-xs text-muted-foreground">
                Klik baris kategori untuk melihat rincian transaksi side-by-side
              </p>
            </div>
          </div>

          {/* Search bar */}
          <div className="w-full sm:w-64">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Cari nama kategori..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-xs rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            variant={categoryFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCategoryFilter('all')}
            className="h-8 text-xs rounded-lg"
          >
            Semua ({data.categories.length})
          </Button>
          <Button
            variant={categoryFilter === 'up' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCategoryFilter('up')}
            className="h-8 text-xs rounded-lg text-rose-700 dark:text-rose-300"
          >
            Kenaikan / Boros ({data.categories.filter((c) => c.status === 'up' || c.status === 'new').length})
          </Button>
          <Button
            variant={categoryFilter === 'down' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCategoryFilter('down')}
            className="h-8 text-xs rounded-lg text-emerald-700 dark:text-emerald-300"
          >
            Penurunan / Hemat ({data.categories.filter((c) => c.status === 'down').length})
          </Button>
          <Button
            variant={categoryFilter === 'new' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCategoryFilter('new')}
            className="h-8 text-xs rounded-lg"
          >
            Kategori Baru ({data.categories.filter((c) => c.status === 'new').length})
          </Button>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 dark:bg-white/[0.02]">
                <TableHead className="font-semibold">Kategori</TableHead>
                <TableHead className="text-right font-semibold">{periodA.month}</TableHead>
                <TableHead className="text-right font-semibold">{periodB.month}</TableHead>
                <TableHead className="text-right font-semibold">Selisih (Delta)</TableHead>
                <TableHead className="text-right font-semibold">Perubahan</TableHead>
                <TableHead className="text-center font-semibold">Tx (A vs B)</TableHead>
                <TableHead className="text-center font-semibold">Status</TableHead>
                <TableHead className="text-right font-semibold">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCategories.map((row) => {
                const isUp = row.status === 'up';
                const isDown = row.status === 'down';
                const isNew = row.status === 'new';

                return (
                  <TableRow
                    key={row.name}
                    onClick={() => handleOpenDrilldown(row.name)}
                    className="cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors"
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: row.color || '#94a3b8' }}
                        />
                        <span className="font-medium text-slate-900 dark:text-white">{row.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground font-medium">
                      {formatIdr(row.leftAmount)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-slate-900 dark:text-white">
                      {formatIdr(row.rightAmount)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      <span
                        className={
                          isUp || isNew
                            ? 'text-rose-600 dark:text-rose-400'
                            : isDown
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-muted-foreground'
                        }
                      >
                        {row.delta > 0 ? '+' : ''}{formatIdr(row.delta)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {isNew ? (
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Baru</span>
                      ) : row.leftAmount > 0 ? (
                        <span
                          className={`text-xs font-semibold ${
                            isUp
                              ? 'text-rose-600 dark:text-rose-400'
                              : isDown
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {row.delta > 0 ? '+' : ''}{row.pctChange.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-xs text-muted-foreground">
                      {row.leftCount} vs {row.rightCount}
                    </TableCell>
                    <TableCell className="text-center">
                      {isNew ? (
                        <Badge className="text-[11px] bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                          Baru
                        </Badge>
                      ) : isUp ? (
                        <Badge variant="destructive" className="text-[11px]">
                          Naik
                        </Badge>
                      ) : isDown ? (
                        <Badge className="text-[11px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                          Hemat
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[11px]">
                          Stabil
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDrilldown(row.name);
                        }}
                        className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        Rincian
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredCategories.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    Tidak ada data kategori yang sesuai dengan filter.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ─── Top 5 Transactions Side-by-Side ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Transaksi Terbesar: {periodA.month}
            </h3>
            <span className="text-xs text-muted-foreground">Top 5</span>
          </div>
          <div className="space-y-2">
            {periodA.top_transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03]"
              >
                <div className="min-w-0 pr-2">
                  <p className="text-xs font-semibold truncate text-slate-900 dark:text-white">{tx.title}</p>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span>{tx.date}</span>
                    <span>•</span>
                    <span>{tx.category}</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-900 dark:text-white shrink-0">
                  {formatIdr(tx.amount)}
                </span>
              </div>
            ))}
            {periodA.top_transactions.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">Tidak ada transaksi.</p>
            )}
          </div>
        </div>

        <div className="glass-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Transaksi Terbesar: {periodB.month}
            </h3>
            <span className="text-xs text-muted-foreground">Top 5</span>
          </div>
          <div className="space-y-2">
            {periodB.top_transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03]"
              >
                <div className="min-w-0 pr-2">
                  <p className="text-xs font-semibold truncate text-slate-900 dark:text-white">{tx.title}</p>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span>{tx.date}</span>
                    <span>•</span>
                    <span>{tx.category}</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-900 dark:text-white shrink-0">
                  {formatIdr(tx.amount)}
                </span>
              </div>
            ))}
            {periodB.top_transactions.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">Tidak ada transaksi.</p>
            )}
          </div>
        </div>
      </div>

      {/* ─── Interactive Transaction Drill-Down Dialog ─── */}
      <Dialog
        open={!!drilldownCategory}
        onOpenChange={(open) => {
          if (!open) {
            setDrilldownCategory(null);
            setDrilldownTxs(null);
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-500" />
              Rincian Transaksi: {drilldownCategory}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Perbandingan transaksi pengeluaran di {periodA.month} vs {periodB.month}
            </DialogDescription>
          </DialogHeader>

          {drilldownLoading ? (
            <div className="py-12 text-center text-xs text-muted-foreground animate-pulse">
              Memuat transaksi kategori...
            </div>
          ) : drilldownTxs ? (
            <div className="space-y-4 pt-2">
              {/* Summary Banner */}
              <div className="grid grid-cols-2 gap-4 p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-border">
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium">{periodA.month}</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {formatIdr(drilldownTxs.periodA.reduce((sum, t) => sum + t.amount, 0))}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{drilldownTxs.periodA.length} transaksi</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium">{periodB.month}</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {formatIdr(drilldownTxs.periodB.reduce((sum, t) => sum + t.amount, 0))}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{drilldownTxs.periodB.length} transaksi</p>
                </div>
              </div>

              {/* Side-by-side columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Column A */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-white flex items-center justify-between">
                    <span>{periodA.month}</span>
                    <span className="text-[11px] text-muted-foreground">({drilldownTxs.periodA.length} item)</span>
                  </h4>
                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                    {drilldownTxs.periodA.map((t) => (
                      <div
                        key={t.id}
                        className="p-2 rounded-lg bg-slate-100 dark:bg-white/[0.04] text-xs flex justify-between items-start"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-semibold text-slate-900 dark:text-white truncate">{t.title}</p>
                          <p className="text-[10px] text-muted-foreground">{t.date} • {t.type}</p>
                        </div>
                        <span className="font-semibold text-slate-900 dark:text-white shrink-0">
                          {formatIdr(t.amount)}
                        </span>
                      </div>
                    ))}
                    {drilldownTxs.periodA.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-6">Tidak ada transaksi di periode ini.</p>
                    )}
                  </div>
                </div>

                {/* Column B */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-white flex items-center justify-between">
                    <span>{periodB.month}</span>
                    <span className="text-[11px] text-muted-foreground">({drilldownTxs.periodB.length} item)</span>
                  </h4>
                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                    {drilldownTxs.periodB.map((t) => (
                      <div
                        key={t.id}
                        className="p-2 rounded-lg bg-slate-100 dark:bg-white/[0.04] text-xs flex justify-between items-start"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-semibold text-slate-900 dark:text-white truncate">{t.title}</p>
                          <p className="text-[10px] text-muted-foreground">{t.date} • {t.type}</p>
                        </div>
                        <span className="font-semibold text-slate-900 dark:text-white shrink-0">
                          {formatIdr(t.amount)}
                        </span>
                      </div>
                    ))}
                    {drilldownTxs.periodB.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-6">Tidak ada transaksi di periode ini.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-6">Tidak ada data transaksi ditemukan.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
