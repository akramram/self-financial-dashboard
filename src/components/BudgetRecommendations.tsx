import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Skeleton } from './ui/skeleton';
import { formatIdr } from '../lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DialogFooter,
} from '@/components/ui/dialog';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Gauge,
  Target,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  BarChart3,
  Search,
  Sliders,
  Check,
  RefreshCw,
  Info,
  Scale,
  X,
} from 'lucide-react';

export interface CategoryStat {
  categoryId: number;
  category: string;
  periodCount: number;
  totalSpent: number;
  avgSpent: number;
  medianSpent: number;
  p80Spent: number;
  maxSpent: number;
  minSpent: number;
  stdDev: number;
  trend: 'rising' | 'falling' | 'stable';
  trendPct: number;
  volatility: 'low' | 'medium' | 'high';
  currentLimit: number;
  recommendedLimit: number;
  confidence: 'high' | 'medium' | 'low';
}

export type RecommendationStrategy = 'smart' | 'conservative' | 'strict' | 'custom';
export type FilterStatus = 'all' | 'needs_update' | 'over_budget' | 'no_limit' | 'rising' | 'high_vol';

const CONFIDENCE_LABELS: Record<string, string> = {
  high: '12+ periode',
  medium: '6-11 periode',
  low: '<6 periode',
};

const CONFIDENCE_COLORS: Record<string, string> = {
  high: 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
  medium: 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
  low: 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
};

export function roundToStep(val: number, step = 50000): number {
  if (val <= 0) return 0;
  return Math.max(step, Math.round(val / step) * step);
}

export function computeRecommendedLimit(
  stat: CategoryStat,
  strategy: RecommendationStrategy,
  customBufferPct = 0
): number {
  if (strategy === 'smart') {
    return roundToStep(stat.recommendedLimit);
  }
  if (strategy === 'conservative') {
    // 10% safety buffer on top of base recommendation
    return roundToStep(stat.recommendedLimit * 1.1);
  }
  if (strategy === 'strict') {
    // Discipline mode: lean towards median or average without safety margin
    const base = stat.medianSpent > 0 ? stat.medianSpent : stat.avgSpent;
    return roundToStep(base);
  }
  if (strategy === 'custom') {
    const factor = 1 + customBufferPct / 100;
    return roundToStep(stat.recommendedLimit * factor);
  }
  return roundToStep(stat.recommendedLimit);
}

export default function BudgetRecommendations() {
  const [stats, setStats] = useState<CategoryStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Strategy and adjustment
  const [strategy, setStrategy] = useState<RecommendationStrategy>('smart');
  const [customBuffer, setCustomBuffer] = useState<number>(10);

  // Search and filter
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');

  // Application states
  const [applyingCategory, setApplyingCategory] = useState<string | null>(null);
  const [appliedCategories, setAppliedCategories] = useState<Set<string>>(new Set());
  const [isApplyingAll, setIsApplyingAll] = useState(false);
  const [batchSuccessMessage, setBatchSuccessMessage] = useState<string | null>(null);

  // Detail Modal
  const [selectedStat, setSelectedStat] = useState<CategoryStat | null>(null);
  const [modalCustomLimit, setModalCustomLimit] = useState<string>('');

  const loadData = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch('/api/recommendations')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Summary Metrics
  const summary = useMemo(() => {
    const total = stats.length;
    let totalCurrentBudget = 0;
    let totalRecommendedBudget = 0;
    let noLimit = 0;
    let overBudget = 0;
    let underBudget = 0;
    let rising = 0;
    let highVol = 0;
    let needsUpdate = 0;

    stats.forEach((s) => {
      const rec = computeRecommendedLimit(s, strategy, customBuffer);
      totalCurrentBudget += s.currentLimit;
      totalRecommendedBudget += rec;

      if (s.currentLimit === 0) noLimit++;
      if (s.currentLimit > 0 && s.avgSpent > s.currentLimit) overBudget++;
      if (s.currentLimit > 0 && s.avgSpent <= s.currentLimit) underBudget++;
      if (s.trend === 'rising') rising++;
      if (s.volatility === 'high') highVol++;
      if (rec !== s.currentLimit) needsUpdate++;
    });

    const budgetDelta = totalRecommendedBudget - totalCurrentBudget;

    return {
      total,
      noLimit,
      overBudget,
      underBudget,
      rising,
      highVol,
      needsUpdate,
      totalCurrentBudget,
      totalRecommendedBudget,
      budgetDelta,
    };
  }, [stats, strategy, customBuffer]);

  // Filtered Categories
  const filteredStats = useMemo(() => {
    return stats.filter((stat) => {
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        if (!stat.category.toLowerCase().includes(q)) return false;
      }

      const rec = computeRecommendedLimit(stat, strategy, customBuffer);
      const isOver = stat.currentLimit > 0 && stat.avgSpent > stat.currentLimit;
      const isNoLimit = stat.currentLimit === 0;
      const isNeedsUpdate = rec !== stat.currentLimit;

      if (activeFilter === 'needs_update') return isNeedsUpdate;
      if (activeFilter === 'over_budget') return isOver;
      if (activeFilter === 'no_limit') return isNoLimit;
      if (activeFilter === 'rising') return stat.trend === 'rising';
      if (activeFilter === 'high_vol') return stat.volatility === 'high';

      return true;
    });
  }, [stats, searchQuery, activeFilter, strategy, customBuffer]);

  // Handle Single Apply
  const handleApplySingle = async (stat: CategoryStat, customVal?: number) => {
    const targetLimit = customVal !== undefined ? customVal : computeRecommendedLimit(stat, strategy, customBuffer);
    setApplyingCategory(stat.category);

    try {
      let ok = false;
      if (stat.categoryId > 0) {
        const res = await fetch(`/api/categories/${stat.categoryId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ monthly_limit: targetLimit }),
        });
        ok = res.ok;
      } else {
        const res = await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: stat.category, monthly_limit: targetLimit }),
        });
        ok = res.ok;
      }

      if (ok) {
        setAppliedCategories((prev) => new Set(prev).add(stat.category));
        setStats((prev) =>
          prev.map((s) => (s.category === stat.category ? { ...s, currentLimit: targetLimit } : s))
        );
        if (selectedStat && selectedStat.category === stat.category) {
          setSelectedStat({ ...selectedStat, currentLimit: targetLimit });
        }
      }
    } catch (e) {
      console.error('Failed to update category limit:', e);
    } finally {
      setApplyingCategory(null);
    }
  };

  // Handle Batch Apply
  const handleApplyAll = async () => {
    const toApply = stats.filter((s) => {
      const rec = computeRecommendedLimit(s, strategy, customBuffer);
      return rec !== s.currentLimit;
    });

    if (toApply.length === 0) return;

    setIsApplyingAll(true);
    let successCount = 0;

    for (const stat of toApply) {
      const targetLimit = computeRecommendedLimit(stat, strategy, customBuffer);
      try {
        let ok = false;
        if (stat.categoryId > 0) {
          const res = await fetch(`/api/categories/${stat.categoryId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ monthly_limit: targetLimit }),
          });
          ok = res.ok;
        } else {
          const res = await fetch('/api/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: stat.category, monthly_limit: targetLimit }),
          });
          ok = res.ok;
        }
        if (ok) {
          successCount++;
          setAppliedCategories((prev) => new Set(prev).add(stat.category));
        }
      } catch (err) {
        console.error('Batch update failed for:', stat.category, err);
      }
    }

    setIsApplyingAll(false);
    setBatchSuccessMessage(`${successCount} batas kategori berhasil diperbarui.`);
    setTimeout(() => setBatchSuccessMessage(null), 5000);

    // Refresh data from server to maintain consistency
    loadData();
  };

  // Open detail modal
  const openDetail = (stat: CategoryStat) => {
    setSelectedStat(stat);
    const rec = computeRecommendedLimit(stat, strategy, customBuffer);
    setModalCustomLimit(String(rec));
  };

  if (loading) {
    return (
      <div className="glass-card p-6 space-y-4">
        <Skeleton className="h-6 w-48" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <div className="space-y-3 pt-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-6 border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 text-center">
        <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-3" />
        <p className="text-red-700 dark:text-red-300 font-semibold">Gagal memuat rekomendasi anggaran</p>
        <p className="text-sm text-slate-600 dark:text-white/60 mt-1">{error}</p>
        <Button variant="outline" size="sm" onClick={loadData} className="mt-4">
          <RefreshCw className="w-4 h-4 mr-1.5" /> Coba Lagi
        </Button>
      </div>
    );
  }

  if (stats.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <BarChart3 className="w-10 h-10 text-slate-400 dark:text-slate-500 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-slate-800 dark:text-white/80">Belum Ada Data Transaksi</h3>
        <p className="text-sm text-slate-500 dark:text-white/50 mt-1 max-w-md mx-auto">
          Tambahkan transaksi pengeluaran terlebih dahulu agar sistem dapat menghitung pola pengeluaran dan memberikan rekomendasi limit anggaran.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Top Banner: Strategy Selector & Budget Impact ───────────────────── */}
      <div className="glass-card p-5 border border-border dark:border-white/[0.08] bg-card dark:bg-navy-900/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Scale className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Pilih Strategi Rekomendasi
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-white/50">
              Sesuaikan profil batas pengeluaran berdasarkan preferensi keamanan finansial.
            </p>
          </div>

          {/* Strategy Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setStrategy('smart')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
                strategy === 'smart'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-muted/60 dark:bg-white/[0.05] text-slate-700 dark:text-white/70 border-transparent hover:bg-muted'
              }`}
            >
              Cerdas (Default P80)
            </button>
            <button
              onClick={() => setStrategy('conservative')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
                strategy === 'conservative'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-muted/60 dark:bg-white/[0.05] text-slate-700 dark:text-white/70 border-transparent hover:bg-muted'
              }`}
            >
              Aman (+10% Buffer)
            </button>
            <button
              onClick={() => setStrategy('strict')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
                strategy === 'strict'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-muted/60 dark:bg-white/[0.05] text-slate-700 dark:text-white/70 border-transparent hover:bg-muted'
              }`}
            >
              Disiplin (Median)
            </button>
            <button
              onClick={() => setStrategy('custom')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
                strategy === 'custom'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-muted/60 dark:bg-white/[0.05] text-slate-700 dark:text-white/70 border-transparent hover:bg-muted'
              }`}
            >
              Kustom ({customBuffer >= 0 ? `+${customBuffer}%` : `${customBuffer}%`})
            </button>
          </div>
        </div>

        {/* Custom buffer slider if active */}
        {strategy === 'custom' && (
          <div className="mt-4 pt-3 border-t border-border dark:border-white/[0.06] flex items-center gap-4 text-xs">
            <span className="text-slate-600 dark:text-white/60 font-medium shrink-0">
              Buffer Persentase:
            </span>
            <input
              type="range"
              min={-20}
              max={30}
              step={5}
              value={customBuffer}
              onChange={(e) => setCustomBuffer(Number(e.target.value))}
              className="w-48 accent-emerald-600 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
            />
            <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 min-w-[3rem]">
              {customBuffer > 0 ? `+${customBuffer}%` : `${customBuffer}%`}
            </span>
            <span className="text-slate-400 text-[11px]">
              (Mengatur margin toleransi rekomendasi untuk semua kategori)
            </span>
          </div>
        )}

        {/* Impact Bar */}
        <div className="mt-4 pt-4 border-t border-border dark:border-white/[0.06] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-muted/40 dark:bg-white/[0.03] p-3 rounded-lg border border-border dark:border-white/[0.05]">
            <span className="text-slate-500 dark:text-white/50 block">Total Limit Saat Ini</span>
            <span className="text-sm font-bold font-mono text-slate-900 dark:text-white">
              {formatIdr(summary.totalCurrentBudget)}
            </span>
          </div>
          <div className="bg-muted/40 dark:bg-white/[0.03] p-3 rounded-lg border border-border dark:border-white/[0.05]">
            <span className="text-slate-500 dark:text-white/50 block">Total Rekomendasi Baru</span>
            <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {formatIdr(summary.totalRecommendedBudget)}
            </span>
          </div>
          <div className="bg-muted/40 dark:bg-white/[0.03] p-3 rounded-lg border border-border dark:border-white/[0.05] flex items-center justify-between">
            <div>
              <span className="text-slate-500 dark:text-white/50 block">Selisih Anggaran Bulanan</span>
              <span
                className={`text-sm font-bold font-mono ${
                  summary.budgetDelta > 0
                    ? 'text-amber-600 dark:text-amber-400'
                    : summary.budgetDelta < 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-600 dark:text-white/70'
                }`}
              >
                {summary.budgetDelta > 0 ? `+${formatIdr(summary.budgetDelta)}` : formatIdr(summary.budgetDelta)}
              </span>
            </div>
            {summary.needsUpdate > 0 && (
              <Button
                size="sm"
                onClick={handleApplyAll}
                disabled={isApplyingAll}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 h-8 font-semibold shadow-sm"
              >
                {isApplyingAll ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" /> Menerapkan...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Terapkan Semua ({summary.needsUpdate})
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {batchSuccessMessage && (
          <div className="mt-3 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{batchSuccessMessage}</span>
          </div>
        )}
      </div>

      {/* ─── 6 KPI Cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <button
          onClick={() => setActiveFilter('all')}
          className={`glass-card p-4 text-left transition rounded-xl border ${
            activeFilter === 'all'
              ? 'ring-2 ring-emerald-500 border-emerald-500'
              : 'border-border dark:border-white/[0.06] hover:bg-muted/40'
          }`}
        >
          <span className="text-xl font-bold text-slate-900 dark:text-white block">{summary.total}</span>
          <span className="text-xs text-slate-500 dark:text-white/50">Total Kategori</span>
        </button>

        <button
          onClick={() => setActiveFilter('needs_update')}
          className={`glass-card p-4 text-left transition rounded-xl border ${
            activeFilter === 'needs_update'
              ? 'ring-2 ring-emerald-500 border-emerald-500'
              : 'border-border dark:border-white/[0.06] hover:bg-muted/40'
          }`}
        >
          <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 block">{summary.needsUpdate}</span>
          <span className="text-xs text-slate-500 dark:text-white/50">Perlu Update</span>
        </button>

        <button
          onClick={() => setActiveFilter('over_budget')}
          className={`glass-card p-4 text-left transition rounded-xl border ${
            activeFilter === 'over_budget'
              ? 'ring-2 ring-red-500 border-red-500'
              : 'border-border dark:border-white/[0.06] hover:bg-muted/40'
          }`}
        >
          <span className="text-xl font-bold text-red-600 dark:text-red-400 block">{summary.overBudget}</span>
          <span className="text-xs text-slate-500 dark:text-white/50">Over Budget</span>
        </button>

        <button
          onClick={() => setActiveFilter('no_limit')}
          className={`glass-card p-4 text-left transition rounded-xl border ${
            activeFilter === 'no_limit'
              ? 'ring-2 ring-amber-500 border-amber-500'
              : 'border-border dark:border-white/[0.06] hover:bg-muted/40'
          }`}
        >
          <span className="text-xl font-bold text-amber-600 dark:text-amber-400 block">{summary.noLimit}</span>
          <span className="text-xs text-slate-500 dark:text-white/50">Tanpa Limit</span>
        </button>

        <button
          onClick={() => setActiveFilter('rising')}
          className={`glass-card p-4 text-left transition rounded-xl border ${
            activeFilter === 'rising'
              ? 'ring-2 ring-coral-500 border-coral-500'
              : 'border-border dark:border-white/[0.06] hover:bg-muted/40'
          }`}
        >
          <span className="text-xl font-bold text-coral-500 dark:text-coral-400 block">{summary.rising}</span>
          <span className="text-xs text-slate-500 dark:text-white/50 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-coral-500" /> Tren Naik
          </span>
        </button>

        <button
          onClick={() => setActiveFilter('high_vol')}
          className={`glass-card p-4 text-left transition rounded-xl border ${
            activeFilter === 'high_vol'
              ? 'ring-2 ring-amber-500 border-amber-500'
              : 'border-border dark:border-white/[0.06] hover:bg-muted/40'
          }`}
        >
          <span className="text-xl font-bold text-amber-600 dark:text-amber-400 block">{summary.highVol}</span>
          <span className="text-xs text-slate-500 dark:text-white/50">Volatilitas Tinggi</span>
        </button>
      </div>

      {/* ─── Search & Filter Bar ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            type="text"
            placeholder="Cari nama kategori..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-8 h-9 text-xs rounded-xl bg-background border-border"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              aria-label="Bersihkan pencarian"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-2.5 py-1 rounded-lg transition font-medium ${
              activeFilter === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'bg-muted/70 dark:bg-white/[0.06] text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Semua ({stats.length})
          </button>
          <button
            onClick={() => setActiveFilter('needs_update')}
            className={`px-2.5 py-1 rounded-lg transition font-medium ${
              activeFilter === 'needs_update'
                ? 'bg-emerald-600 text-white'
                : 'bg-muted/70 dark:bg-white/[0.06] text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Perlu Update ({summary.needsUpdate})
          </button>
          <button
            onClick={() => setActiveFilter('over_budget')}
            className={`px-2.5 py-1 rounded-lg transition font-medium ${
              activeFilter === 'over_budget'
                ? 'bg-red-600 text-white'
                : 'bg-muted/70 dark:bg-white/[0.06] text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Over Budget ({summary.overBudget})
          </button>
          <button
            onClick={() => setActiveFilter('no_limit')}
            className={`px-2.5 py-1 rounded-lg transition font-medium ${
              activeFilter === 'no_limit'
                ? 'bg-amber-600 text-white'
                : 'bg-muted/70 dark:bg-white/[0.06] text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Tanpa Limit ({summary.noLimit})
          </button>
        </div>
      </div>

      {/* ─── Recommendations Table ─────────────────────────────────────────── */}
      <div className="glass-card overflow-hidden border border-border dark:border-white/[0.08] rounded-xl">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40 dark:bg-white/[0.02]">
              <TableRow className="border-b border-border dark:border-white/[0.06]">
                <TableHead className="text-left font-semibold text-xs">Kategori</TableHead>
                <TableHead className="text-right font-semibold text-xs">Rata-rata/Bulan</TableHead>
                <TableHead className="text-right font-semibold text-xs">P80</TableHead>
                <TableHead className="text-center font-semibold text-xs">Tren</TableHead>
                <TableHead className="text-center font-semibold text-xs">Volatilitas</TableHead>
                <TableHead className="text-right font-semibold text-xs">Limit Saat Ini</TableHead>
                <TableHead className="text-right font-semibold text-xs">Rekomendasi</TableHead>
                <TableHead className="text-center font-semibold text-xs">Kepercayaan</TableHead>
                <TableHead className="text-center font-semibold text-xs">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStats.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-xs text-muted-foreground">
                    Tidak ada kategori yang cocok dengan filter yang dipilih.
                  </TableCell>
                </TableRow>
              ) : (
                filteredStats.map((stat) => {
                  const recLimit = computeRecommendedLimit(stat, strategy, customBuffer);
                  const isChanged = recLimit !== stat.currentLimit;
                  const isNew = stat.currentLimit === 0;
                  const isOver = stat.currentLimit > 0 && stat.avgSpent > stat.currentLimit;
                  const isApplying = applyingCategory === stat.category;
                  const isRecentlyApplied = appliedCategories.has(stat.category);

                  return (
                    <TableRow
                      key={stat.category}
                      className={`border-b border-border/50 dark:border-white/[0.04] transition hover:bg-muted/30 ${
                        isOver
                          ? 'bg-red-50/40 dark:bg-red-950/20'
                          : isNew
                          ? 'bg-amber-50/30 dark:bg-amber-950/15'
                          : ''
                      }`}
                    >
                      {/* Kategori */}
                      <TableCell className="font-medium text-xs">
                        <div className="flex items-center gap-2">
                          {isOver && (
                            <span title="Rata-rata pengeluaran melebihi limit saat ini">
                              <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                            </span>
                          )}
                          <button
                            onClick={() => openDetail(stat)}
                            className="hover:underline text-left text-slate-900 dark:text-white font-medium flex items-center gap-1 group"
                          >
                            <span>{stat.category}</span>
                            <Info className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        </div>
                      </TableCell>

                      {/* Avg / Month */}
                      <TableCell className="text-right font-mono text-xs text-slate-700 dark:text-slate-300">
                        {formatIdr(stat.avgSpent)}
                      </TableCell>

                      {/* P80 */}
                      <TableCell className="text-right font-mono text-xs text-slate-500 dark:text-slate-400">
                        {formatIdr(stat.p80Spent)}
                      </TableCell>

                      {/* Tren */}
                      <TableCell className="text-center text-xs">
                        {stat.trend === 'rising' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-coral-500 dark:text-coral-400">
                            <TrendingUp className="w-3 h-3" />
                            +{stat.trendPct}%
                          </span>
                        ) : stat.trend === 'falling' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                            <TrendingDown className="w-3 h-3" />
                            {stat.trendPct}%
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                            <Minus className="w-3 h-3" /> Stabil
                          </span>
                        )}
                      </TableCell>

                      {/* Volatilitas */}
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0.5 font-normal capitalize ${
                            stat.volatility === 'low'
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                              : stat.volatility === 'high'
                              ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
                              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                          }`}
                        >
                          {stat.volatility}
                        </Badge>
                      </TableCell>

                      {/* Limit Saat Ini */}
                      <TableCell className="text-right font-mono text-xs">
                        {stat.currentLimit > 0 ? (
                          <span className={isOver ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-slate-800 dark:text-slate-200'}>
                            {formatIdr(stat.currentLimit)}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Belum diatur</span>
                        )}
                      </TableCell>

                      {/* Rekomendasi */}
                      <TableCell className="text-right font-mono text-xs">
                        <span
                          className={
                            isChanged
                              ? 'font-bold text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-500 dark:text-slate-400'
                          }
                        >
                          {formatIdr(recLimit)}
                        </span>
                        {isChanged && !isNew && stat.currentLimit > 0 && (
                          <span className="text-[10px] ml-1 text-slate-400">
                            ({recLimit > stat.currentLimit ? '+' : ''}
                            {(((recLimit - stat.currentLimit) / stat.currentLimit) * 100).toFixed(0)}%)
                          </span>
                        )}
                      </TableCell>

                      {/* Kepercayaan */}
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0.5 border ${CONFIDENCE_COLORS[selectedStat?.confidence || stat.confidence]}`}
                        >
                          {stat.periodCount} bln
                        </Badge>
                      </TableCell>

                      {/* Aksi */}
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {isChanged ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleApplySingle(stat)}
                              disabled={isApplying}
                              className="h-7 px-2.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                            >
                              {isApplying ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : isRecentlyApplied ? (
                                <>
                                  <Check className="w-3 h-3 mr-1 text-emerald-600" /> Diterapkan
                                </>
                              ) : (
                                'Terapkan'
                              )}
                            </Button>
                          ) : (
                            <span className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Check className="w-3 h-3 text-emerald-500" /> Sesuai
                            </span>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openDetail(stat)}
                            className="h-7 px-2 text-[11px] text-slate-500 hover:text-slate-900 dark:hover:text-white"
                          >
                            Detail
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
      </div>

      {/* ─── Detail & Analysis Modal ────────────────────────────────────────── */}
      <Dialog open={!!selectedStat} onOpenChange={(open) => !open && setSelectedStat(null)}>
        {selectedStat && (
          <DialogContent className="max-w-md bg-card dark:bg-navy-950 border border-border dark:border-white/10 p-6 rounded-2xl shadow-xl">
            <DialogHeader className="space-y-1">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
                  {selectedStat.category}
                </DialogTitle>
                <Badge
                  variant="outline"
                  className={`text-xs border ${CONFIDENCE_COLORS[selectedStat.confidence]}`}
                >
                  {CONFIDENCE_LABELS[selectedStat.confidence]} ({selectedStat.periodCount} periode)
                </Badge>
              </div>
              <DialogDescription className="text-xs text-slate-500 dark:text-white/50">
                Statistik pengeluaran historis dan penyesuaian limit bulanan.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* 4-Stat Box */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-muted/50 dark:bg-white/[0.04] border border-border/50 dark:border-white/[0.05]">
                  <span className="text-slate-500 dark:text-white/50 block">Rata-rata / Bulan</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {formatIdr(selectedStat.avgSpent)}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/50 dark:bg-white/[0.04] border border-border/50 dark:border-white/[0.05]">
                  <span className="text-slate-500 dark:text-white/50 block">Median (Tengah)</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {formatIdr(selectedStat.medianSpent)}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/50 dark:bg-white/[0.04] border border-border/50 dark:border-white/[0.05]">
                  <span className="text-slate-500 dark:text-white/50 block">Pengeluaran Tertinggi</span>
                  <span className="font-mono font-bold text-red-600 dark:text-red-400">
                    {formatIdr(selectedStat.maxSpent)}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/50 dark:bg-white/[0.04] border border-border/50 dark:border-white/[0.05]">
                  <span className="text-slate-500 dark:text-white/50 block">Persentil 80 (P80)</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {formatIdr(selectedStat.p80Spent)}
                  </span>
                </div>
              </div>

              {/* Behavior Indicators */}
              <div className="p-3 rounded-lg bg-muted/30 dark:bg-white/[0.02] border border-border/50 dark:border-white/[0.05] space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-white/60">Arah Tren:</span>
                  <span className="font-medium">
                    {selectedStat.trend === 'rising'
                      ? `Meningkat (+${selectedStat.trendPct}%)`
                      : selectedStat.trend === 'falling'
                      ? `Menurun (${selectedStat.trendPct}%)`
                      : 'Stabil'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-white/60">Tingkat Volatilitas:</span>
                  <span className="font-medium capitalize">{selectedStat.volatility}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-white/60">Standar Deviasi:</span>
                  <span className="font-mono font-medium">{formatIdr(selectedStat.stdDev)}</span>
                </div>
              </div>

              {/* Edit Limit Form */}
              <div className="space-y-2 pt-2 border-t border-border dark:border-white/[0.06]">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="custom-limit-input" className="font-semibold text-slate-800 dark:text-white/80">
                    Batas Limit yang Diinginkan:
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const rec = computeRecommendedLimit(selectedStat, strategy, customBuffer);
                      setModalCustomLimit(String(rec));
                    }}
                    className="text-emerald-600 dark:text-emerald-400 hover:underline text-[11px]"
                  >
                    Gunakan Nilai Rekomendasi
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    id="custom-limit-input"
                    type="number"
                    step={10000}
                    value={modalCustomLimit}
                    onChange={(e) => setModalCustomLimit(e.target.value)}
                    placeholder="Contoh: 1500000"
                    className="font-mono text-sm h-10"
                  />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-white/50">
                  Limit saat ini: {selectedStat.currentLimit > 0 ? formatIdr(selectedStat.currentLimit) : 'Belum ada'}
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedStat(null)}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={async () => {
                  const val = Number(modalCustomLimit);
                  if (!isNaN(val) && val >= 0) {
                    await handleApplySingle(selectedStat, val);
                    setSelectedStat(null);
                  }
                }}
                disabled={applyingCategory === selectedStat.category}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
              >
                {applyingCategory === selectedStat.category ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Menyimpan...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1.5" /> Simpan Limit Kategori
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
