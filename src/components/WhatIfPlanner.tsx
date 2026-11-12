import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { toast } from 'sonner';
import {
  Sliders,
  TrendingUp,
  Sparkles,
  RotateCcw,
  Bookmark,
  Trash2,
  Plus,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Info,
  RefreshCw,
} from 'lucide-react';
import { formatIdr } from '../lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useConfirm } from '@/components/ConfirmDialog';
import {
  type ScenarioData,
  type ScenarioInputs,
  type ProjectionHorizon,
  type OneTimeEvent,
  type SavedScenarioSnapshot,
  type ScenarioPreset,
  SCENARIO_PRESETS,
  HORIZON_OPTIONS,
  RETURN_PRESETS,
  applyScenarioPreset,
  simulateScenario,
} from '../lib/what-if-engine';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

type TabId = 'projection' | 'levers' | 'compare';

const STORAGE_KEY = 'findash_whatif_scenarios_v1';

function getInitialTab(): TabId {
  if (typeof window === 'undefined') return 'projection';
  const raw = new URLSearchParams(window.location.search).get('tab');
  if (raw === 'levers' || raw === 'compare' || raw === 'projection') return raw;
  return 'projection';
}

function loadSavedScenarios(): SavedScenarioSnapshot[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function WhatIfPlanner() {
  const { confirm: confirmAction } = useConfirm();

  const [data, setData] = useState<ScenarioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<TabId>(getInitialTab);
  const [incomeChangePct, setIncomeChangePct] = useState(0);
  const [annualReturnPct, setAnnualReturnPct] = useState(0);
  const [categoryAdjustments, setCategoryAdjustments] = useState<ScenarioInputs['categoryAdjustments']>({});
  const [oneTimeEvents, setOneTimeEvents] = useState<OneTimeEvent[]>([]);
  const [projectionMonths, setProjectionMonths] = useState<ProjectionHorizon>(24);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [showAllCategories, setShowAllCategories] = useState(false);

  const [savedScenarios, setSavedScenarios] = useState<SavedScenarioSnapshot[]>([]);
  const [pinnedCompareId, setPinnedCompareId] = useState<string | null>(null);
  const [scenarioNameInput, setScenarioNameInput] = useState('');

  const fetchScenarioData = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch('/api/scenario')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: ScenarioData) => setData(d))
      .catch((e: Error) => setError(e.message || 'Gagal memuat data skenario'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchScenarioData();
    setSavedScenarios(loadSavedScenarios());
  }, [fetchScenarioData]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (activeTab !== 'projection') params.set('tab', activeTab);
    else params.delete('tab');
    const nextUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    window.history.replaceState({}, '', nextUrl);
  }, [activeTab]);

  const currentInputs: ScenarioInputs = useMemo(
    () => ({
      incomeChangePct,
      annualReturnPct,
      categoryAdjustments,
      oneTimeEvents,
      projectionMonths,
    }),
    [incomeChangePct, annualReturnPct, categoryAdjustments, oneTimeEvents, projectionMonths]
  );

  const projection = useMemo(() => {
    if (!data) return null;
    return simulateScenario(data, currentInputs);
  }, [data, currentInputs]);

  const pinnedSnapshot = useMemo(
    () => savedScenarios.find((s) => s.id === pinnedCompareId) || null,
    [savedScenarios, pinnedCompareId]
  );

  const pinnedProjection = useMemo(() => {
    if (!data || !pinnedSnapshot) return null;
    return simulateScenario(data, {
      ...pinnedSnapshot.inputs,
      projectionMonths,
    });
  }, [data, pinnedSnapshot, projectionMonths]);

  const sortedCategories = useMemo(() => {
    if (!data) return [];
    return [...data.categories]
      .filter((c) => c.name.toLowerCase() !== 'invest')
      .sort((a, b) => b.avg_spending - a.avg_spending);
  }, [data]);

  const visibleCategories = useMemo(() => {
    return showAllCategories
      ? sortedCategories
      : sortedCategories.filter((c) => c.avg_spending > 0).slice(0, 8);
  }, [sortedCategories, showAllCategories]);

  const updateCategoryAdjustment = useCallback((name: string, pct: number, baseline: number) => {
    setActivePreset(null);
    setCategoryAdjustments((prev) => {
      const next = { ...prev };
      if (pct === 0) {
        delete next[name];
      } else {
        const delta = Math.round((baseline * pct) / 100);
        next[name] = { name, delta, pct };
      }
      return next;
    });
  }, []);

  const handleApplyPreset = useCallback(
    (presetId: ScenarioPreset['id']) => {
      if (!data) return;
      const next = applyScenarioPreset(presetId, data.categories, projectionMonths);
      setIncomeChangePct(next.incomeChangePct);
      setAnnualReturnPct(next.annualReturnPct);
      setCategoryAdjustments(next.categoryAdjustments);
      setOneTimeEvents(next.oneTimeEvents);
      setProjectionMonths(next.projectionMonths);
      setActivePreset(presetId);
      toast.success('Preset skenario diterapkan');
    },
    [data, projectionMonths]
  );

  const resetScenario = useCallback(() => {
    setIncomeChangePct(0);
    setAnnualReturnPct(0);
    setCategoryAdjustments({});
    setOneTimeEvents([]);
    setActivePreset(null);
  }, []);

  const addOneTimeEvent = useCallback(() => {
    setActivePreset(null);
    setOneTimeEvents((prev) => [
      ...prev,
      {
        id: `evt-${Date.now()}`,
        label: 'Pengeluaran Tambahan',
        amount: -2_500_000,
        monthOffset: 1,
      },
    ]);
  }, []);

  const updateOneTimeEvent = useCallback(
    (id: string, field: keyof OneTimeEvent, value: string | number) => {
      setActivePreset(null);
      setOneTimeEvents((prev) =>
        prev.map((e) =>
          e.id === id
            ? {
                ...e,
                [field]:
                  field === 'amount' || field === 'monthOffset' ? Number(value) : value,
              }
            : e
        )
      );
    },
    []
  );

  const removeOneTimeEvent = useCallback((id: string) => {
    setActivePreset(null);
    setOneTimeEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const handleSaveScenario = useCallback(() => {
    if (!projection) return;
    const trimmed = scenarioNameInput.trim() || `Skenario ${savedScenarios.length + 1}`;
    const nextSnap: SavedScenarioSnapshot = {
      id: `sc-${Date.now()}`,
      name: trimmed,
      savedAt: new Date().toISOString(),
      inputs: currentInputs,
      summary: {
        finalScenario: projection.finalScenario,
        monthlyNet: projection.monthlyNet,
        scenarioSavingsRate: projection.scenarioSavingsRate,
      },
    };
    const updated = [nextSnap, ...savedScenarios].slice(0, 8);
    setSavedScenarios(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setScenarioNameInput('');
    toast.success(`Skenario "${trimmed}" tersimpan`);
  }, [projection, scenarioNameInput, savedScenarios, currentInputs]);

  const handleLoadScenario = useCallback((snap: SavedScenarioSnapshot) => {
    setIncomeChangePct(snap.inputs.incomeChangePct);
    setAnnualReturnPct(snap.inputs.annualReturnPct);
    setCategoryAdjustments(snap.inputs.categoryAdjustments);
    setOneTimeEvents(snap.inputs.oneTimeEvents);
    setProjectionMonths(snap.inputs.projectionMonths);
    setActivePreset(null);
    toast.success(`Memuat skenario "${snap.name}"`);
  }, []);

  const handleDeleteScenario = useCallback(
    (id: string) => {
      const updated = savedScenarios.filter((s) => s.id !== id);
      setSavedScenarios(updated);
      if (pinnedCompareId === id) setPinnedCompareId(null);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      toast.success('Skenario dihapus');
    },
    [savedScenarios, pinnedCompareId]
  );

  const handleClearAllScenarios = useCallback(async () => {
    const ok = await confirmAction({
      title: 'Hapus semua skenario tersimpan?',
      description: 'Seluruh snapshot skenario What-If yang tersimpan di browser akan dihapus permanen.',
      confirmLabel: 'Hapus Semua',
      variant: 'destructive',
    });
    if (!ok) return;
    localStorage.removeItem(STORAGE_KEY);
    setSavedScenarios([]);
    setPinnedCompareId(null);
    toast.success('Semua skenario tersimpan dibersihkan');
  }, [confirmAction]);

  const hasChanges =
    incomeChangePct !== 0 ||
    annualReturnPct !== 0 ||
    Object.keys(categoryAdjustments).length > 0 ||
    oneTimeEvents.length > 0;

  if (loading) {
    return (
      <div className="space-y-6" data-testid="whatif-loading">
        <div className="glass-card p-5 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-9 w-36 rounded-lg" />
            <Skeleton className="h-9 w-36 rounded-lg" />
            <Skeleton className="h-9 w-36 rounded-lg" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        </div>
        <Skeleton className="h-80 w-full rounded-2xl" />
      </div>
    );
  }

  if (error || !data || !projection) {
    return (
      <div className="glass-card p-6 border border-red-200 dark:border-red-500/30 space-y-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Gagal memuat data skenario
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {error || 'Terjadi kendala saat mengambil riwayat transaksi dan aset.'}
            </p>
          </div>
        </div>
        <Button onClick={fetchScenarioData} variant="outline" className="min-h-[44px] gap-2">
          <RefreshCw className="w-4 h-4" />
          Coba Lagi
        </Button>
      </div>
    );
  }

  if (data.periods.length === 0) {
    return (
      <div className="glass-card p-8 text-center space-y-3">
        <TrendingUp className="w-10 h-10 text-emerald-600 dark:text-emerald-400 mx-auto" />
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Belum ada data siklus gaji
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
          Tambahkan transaksi dan catatan net worth minimal satu periode untuk mulai menyimulasikan skenario What-If.
        </p>
        <a
          href="/add"
          className="inline-flex items-center justify-center min-h-[44px] px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
        >
          Tambah Transaksi
        </a>
      </div>
    );
  }

  const networthChartData = {
    labels: projection.labels,
    datasets: [
      {
        label: 'Baseline (Tren Saat Ini)',
        data: projection.baselineMonths,
        borderColor: 'rgb(148, 163, 184)',
        backgroundColor: 'rgba(148, 163, 184, 0.08)',
        borderWidth: 2,
        borderDash: [6, 4],
        pointRadius: 0,
        tension: 0.3,
        fill: false,
      },
      {
        label: 'Skenario Aktif',
        data: projection.scenarioMonths,
        borderColor: projection.networthDifference >= 0 ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)',
        backgroundColor:
          projection.networthDifference >= 0
            ? 'rgba(16, 185, 129, 0.14)'
            : 'rgba(239, 68, 68, 0.14)',
        borderWidth: 3,
        pointRadius: 0,
        pointHoverRadius: 6,
        tension: 0.3,
        fill: true,
      },
      ...(pinnedProjection && pinnedSnapshot
        ? [
            {
              label: `Pembanding: ${pinnedSnapshot.name}`,
              data: pinnedProjection.scenarioMonths,
              borderColor: 'rgb(59, 130, 246)',
              backgroundColor: 'rgba(59, 130, 246, 0.06)',
              borderWidth: 2,
              borderDash: [3, 3],
              pointRadius: 0,
              tension: 0.3,
              fill: false,
            },
          ]
        : []),
    ],
  };

  const networthChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false as const,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { font: { size: 11 } },
      },
      tooltip: {
        callbacks: {
          label: (ctx: any) => `${ctx.dataset.label}: ${formatIdr(ctx.parsed.y)}`,
        },
      },
    },
    scales: {
      y: {
        ticks: {
          font: { size: 11 },
          callback: (val: any) => `Rp${(Number(val) / 1_000_000).toFixed(0)} Jt`,
        },
      },
      x: { ticks: { font: { size: 11 } } },
    },
  };

  const cashflowData = {
    labels: ['Pemasukan Bulanan', 'Pengeluaran Hidup', 'Surplus Tabungan'],
    datasets: [
      {
        label: 'Baseline',
        data: [data.avgIncome, data.avgSpending, data.avgSavings],
        backgroundColor: ['rgba(59,130,246,0.65)', 'rgba(239,68,68,0.65)', 'rgba(148,163,184,0.65)'],
        borderColor: ['rgb(59,130,246)', 'rgb(239,68,68)', 'rgb(148,163,184)'],
        borderWidth: 1,
        borderRadius: 6,
      },
      {
        label: 'Skenario Aktif',
        data: [projection.adjustedIncome, projection.adjustedSpending, projection.monthlyNet],
        backgroundColor: ['rgba(16,185,129,0.75)', 'rgba(245,158,11,0.75)', 'rgba(16,185,129,0.85)'],
        borderColor: ['rgb(16,185,129)', 'rgb(245,158,11)', 'rgb(16,185,129)'],
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  };

  const cashflowOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false as const,
    plugins: {
      legend: { position: 'top' as const, labels: { font: { size: 11 } } },
      tooltip: {
        callbacks: {
          label: (ctx: any) => `${ctx.dataset.label}: ${formatIdr(ctx.parsed.y)}`,
        },
      },
    },
    scales: {
      y: {
        ticks: {
          font: { size: 11 },
          callback: (val: any) => `Rp${(Number(val) / 1_000_000).toFixed(0)} Jt`,
        },
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* ─── Hero Command Strip ─────────────────────────────────────────────── */}
      <div className="glass-card p-5 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border-0">
                Horizon {projectionMonths} Bulan
              </Badge>
              {annualReturnPct > 0 && (
                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300 border-0">
                  Return {annualReturnPct}% p.a.
                </Badge>
              )}
              {hasChanges ? (
                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border-0">
                  Simulasi Aktif
                </Badge>
              ) : (
                <Badge variant="outline" className="text-slate-600 dark:text-slate-300">
                  Baseline 3 Siklus Terakhir
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Net worth saat ini: <span className="font-semibold text-slate-900 dark:text-white">{formatIdr(data.currentNetworth)}</span>
              {' '}| Rata-rata tabungan: <span className="font-semibold text-slate-900 dark:text-white">{formatIdr(data.avgSavings)}/bln</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Horizon selector */}
            <div className="inline-flex rounded-xl bg-slate-100 dark:bg-white/[0.06] p-1">
              {HORIZON_OPTIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setProjectionMonths(m)}
                  className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold transition-colors ${
                    projectionMonths === m
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {m}B
                </button>
              ))}
            </div>

            {hasChanges && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resetScenario}
                className="min-h-[44px] gap-1.5 text-slate-700 dark:text-slate-200"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap gap-2">
          {SCENARIO_PRESETS.map((preset) => {
            const isSelected = activePreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleApplyPreset(preset.id)}
                title={preset.description}
                className={`min-h-[44px] px-3.5 py-2 rounded-xl border text-left transition-all flex items-center gap-2 ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-200'
                    : 'border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/[0.03] text-slate-800 dark:text-slate-200 hover:border-emerald-400'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="text-xs font-semibold">{preset.label}</span>
              </button>
            );
          })}
        </div>

        {/* 4 KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/[0.03] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Proyeksi Net Worth ({projectionMonths}B)
            </p>
            <p
              className={`text-xl font-bold mt-1 tabular-nums ${
                projection.networthDifference >= 0
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {formatIdr(projection.finalScenario)}
            </p>
            <p className="text-xs mt-1 text-slate-600 dark:text-slate-400 flex items-center gap-1">
              {projection.networthDifference >= 0 ? (
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
              )}
              {formatIdr(Math.abs(projection.networthDifference))} vs baseline
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/[0.03] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Surplus Bulanan
            </p>
            <p
              className={`text-xl font-bold mt-1 tabular-nums ${
                projection.monthlyNet >= 0
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {formatIdr(projection.monthlyNet)}
            </p>
            <p className="text-xs mt-1 text-slate-600 dark:text-slate-400">
              Baseline: {formatIdr(data.avgSavings)}/bln
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/[0.03] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Rasio Tabungan
            </p>
            <p
              className={`text-xl font-bold mt-1 tabular-nums ${
                projection.scenarioSavingsRate >= 20
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-amber-700 dark:text-amber-400'
              }`}
            >
              {projection.scenarioSavingsRate.toFixed(1)}%
            </p>
            <p className="text-xs mt-1 text-slate-600 dark:text-slate-400">
              Baseline: {data.savingsRate.toFixed(1)}%
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/[0.03] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Tambahan Compounding
            </p>
            <p className="text-xl font-bold mt-1 tabular-nums text-blue-700 dark:text-blue-400">
              {formatIdr(projection.compoundGain)}
            </p>
            <p className="text-xs mt-1 text-slate-600 dark:text-slate-400">
              Total tabungan kas: {formatIdr(projection.totalSaved)}
            </p>
          </div>
        </div>
      </div>

      {/* ─── Tabs Navigation ───────────────────────────────────────────────── */}
      <div
        role="tablist"
        aria-label="Navigasi What-If Scenario Hub"
        className="flex flex-wrap gap-2 bg-slate-100/90 dark:bg-white/[0.04] p-1.5 rounded-2xl border border-slate-200 dark:border-white/10"
      >
        {(
          [
            { id: 'projection', label: 'Proyeksi & Milestone', icon: TrendingUp },
            { id: 'levers', label: 'Kontrol Skenario', icon: Sliders },
            { id: 'compare', label: `Simpan & Bandingkan (${savedScenarios.length})`, icon: Layers },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              className={`min-h-[44px] flex-1 sm:flex-initial px-4 py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                isActive
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ─── Tab 1: Proyeksi & Milestone ───────────────────────────────────── */}
      {activeTab === 'projection' && (
        <div className="space-y-6">
          {/* Deterministic Insights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {projection.insights.map((ins) => {
              const toneStyles =
                ins.tone === 'positive'
                  ? 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/70 dark:bg-emerald-500/10'
                  : ins.tone === 'warning'
                    ? 'border-amber-200 dark:border-amber-500/30 bg-amber-50/70 dark:bg-amber-500/10'
                    : 'border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/[0.03]';
              const Icon =
                ins.tone === 'positive'
                  ? CheckCircle2
                  : ins.tone === 'warning'
                    ? AlertTriangle
                    : Info;
              const iconColor =
                ins.tone === 'positive'
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : ins.tone === 'warning'
                    ? 'text-amber-700 dark:text-amber-400'
                    : 'text-slate-600 dark:text-slate-400';

              return (
                <div key={ins.id} className={`rounded-xl border p-4 flex items-start gap-3 ${toneStyles}`}>
                  <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconColor}`} />
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{ins.title}</h3>
                    <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">{ins.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="glass-card p-5 lg:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                    Trajektori Kekayaan Bersih ({projectionMonths} Bulan)
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Perbandingan tren historis dengan simulasi skenario aktif{pinnedSnapshot ? ` dan ${pinnedSnapshot.name}` : ''}.
                  </p>
                </div>
                {pinnedSnapshot && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setPinnedCompareId(null)}
                    className="text-xs text-blue-700 dark:text-blue-400"
                  >
                    Lepas Pembanding
                  </Button>
                )}
              </div>
              <div className="h-72">
                <Line data={networthChartData} options={networthChartOptions} />
              </div>
            </div>

            <div className="glass-card p-5">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
                Arus Kas Bulanan
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                Baseline vs Skenario Aktif
              </p>
              <div className="h-72">
                <Bar data={cashflowData} options={cashflowOptions} />
              </div>
            </div>
          </div>

          {/* Milestones & Goals Impact */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  Akselerasi Milestone Net Worth
                </h2>
              </div>
              <div className="space-y-3">
                {projection.milestones.map((m) => (
                  <div
                    key={m.target}
                    className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-white/10 p-3 bg-white/60 dark:bg-white/[0.02]"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{m.label}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Baseline: {m.baselineMonths ? `${m.baselineMonths} bln` : 'Belum tercapai'}
                        {' '}• Skenario: {m.scenarioMonths ? `${m.scenarioMonths} bln` : 'Belum tercapai'}
                      </p>
                    </div>
                    {m.monthsSaved !== null && m.monthsSaved !== 0 ? (
                      <Badge
                        className={
                          m.monthsSaved > 0
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border-0'
                            : 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300 border-0'
                        }
                      >
                        {m.monthsSaved > 0 ? `${m.monthsSaved} bln lebih cepat` : `${Math.abs(m.monthsSaved)} bln lebih lambat`}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-slate-600 dark:text-slate-400">
                        Sama
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  Dampak ke Target Finansial (30% Alokasi Surplus)
                </h2>
              </div>
              {projection.goalImpacts.length === 0 ? (
                <p className="text-sm text-slate-600 dark:text-slate-400 py-4">
                  Belum ada target finansial aktif di halaman Planning. Tambahkan goal di menu Planning untuk melihat estimasi percepatannya.
                </p>
              ) : (
                <div className="space-y-3">
                  {projection.goalImpacts.map((g) => (
                    <div
                      key={g.id}
                      className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-white/10 p-3 bg-white/60 dark:bg-white/[0.02]"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{g.name}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          Sisa target: {formatIdr(g.remaining)}
                          {' '}• Skenario: {g.scenarioMonths ? `${g.scenarioMonths} bln` : 'Defisit'}
                        </p>
                      </div>
                      {g.monthsSaved !== null && g.monthsSaved !== 0 ? (
                        <Badge
                          className={
                            g.monthsSaved > 0
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border-0'
                              : 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300 border-0'
                          }
                        >
                          {g.monthsSaved > 0 ? `-${g.monthsSaved} bln` : `+${Math.abs(g.monthsSaved)} bln`}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-600 dark:text-slate-400">
                          Netral
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Tab 2: Kontrol Skenario (Levers) ───────────────────────────────── */}
      {activeTab === 'levers' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Income & Return Controls */}
          <div className="glass-card p-5 space-y-6">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
                Pemasukan & Imbal Hasil Investasi
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Uji kenaikan/penurunan gaji dan asumsi imbal hasil tahunan portofolio.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label htmlFor="income-slider" className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  Perubahan Pemasukan Bulanan
                </label>
                <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                  {incomeChangePct > 0 ? `+${incomeChangePct}%` : `${incomeChangePct}%`} ({formatIdr(projection.adjustedIncome)})
                </span>
              </div>
              <input
                id="income-slider"
                type="range"
                min={-50}
                max={100}
                step={5}
                value={incomeChangePct}
                onChange={(e) => {
                  setActivePreset(null);
                  setIncomeChangePct(Number(e.target.value));
                }}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <div className="flex flex-wrap gap-2">
                {[-20, 0, 10, 20, 50].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      setActivePreset(null);
                      setIncomeChangePct(val);
                    }}
                    className={`min-h-[36px] px-3 rounded-lg text-xs font-medium border transition-colors ${
                      incomeChangePct === val
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                    }`}
                  >
                    {val > 0 ? `+${val}%` : `${val}%`}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-200 dark:border-white/10 pt-5 space-y-3">
              <div className="flex items-center justify-between">
                <label htmlFor="return-slider" className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  Asumsi Imbal Hasil Tahunan (p.a.)
                </label>
                <span className="text-sm font-bold text-blue-700 dark:text-blue-400 tabular-nums">
                  {annualReturnPct}% / tahun
                </span>
              </div>
              <input
                id="return-slider"
                type="range"
                min={0}
                max={18}
                step={1}
                value={annualReturnPct}
                onChange={(e) => {
                  setActivePreset(null);
                  setAnnualReturnPct(Number(e.target.value));
                }}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <div className="flex flex-wrap gap-2">
                {RETURN_PRESETS.map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => {
                      setActivePreset(null);
                      setAnnualReturnPct(rate);
                    }}
                    className={`min-h-[36px] px-3 rounded-lg text-xs font-medium border transition-colors ${
                      annualReturnPct === rate
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                    }`}
                  >
                    {rate}% p.a.
                  </button>
                ))}
              </div>
            </div>

            {/* One-Time Events */}
            <div className="border-t border-slate-200 dark:border-white/10 pt-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Kejadian Satu Kali (Bonus / Belanja Besar)
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Nilai negatif untuk pengeluaran, positif untuk bonus/THR.
                  </p>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={addOneTimeEvent} className="min-h-[44px] gap-1">
                  <Plus className="w-4 h-4" />
                  Tambah
                </Button>
              </div>

              {oneTimeEvents.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 py-2">
                  Belum ada kejadian satu kali ditambahkan.
                </p>
              ) : (
                <div className="space-y-3">
                  {oneTimeEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className="rounded-xl border border-slate-200 dark:border-white/10 p-3 space-y-2 bg-white/60 dark:bg-white/[0.02]"
                    >
                      <div className="flex items-center gap-2">
                        <Input
                          value={evt.label}
                          onChange={(e) => updateOneTimeEvent(evt.id, 'label', e.target.value)}
                          placeholder="Nama event"
                          aria-label="Nama kejadian satu kali"
                          className="h-9 text-xs"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeOneTimeEvent(evt.id)}
                          aria-label="Hapus kejadian"
                          className="text-red-600 dark:text-red-400 min-h-[36px]"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] text-slate-600 dark:text-slate-400">Nominal (Rp)</label>
                          <Input
                            type="number"
                            value={evt.amount}
                            onChange={(e) => updateOneTimeEvent(evt.id, 'amount', e.target.value)}
                            className="h-9 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-600 dark:text-slate-400">Bulan ke-</label>
                          <Input
                            type="number"
                            min={1}
                            max={projectionMonths}
                            value={evt.monthOffset + 1}
                            onChange={(e) =>
                              updateOneTimeEvent(evt.id, 'monthOffset', Math.max(0, Number(e.target.value) - 1))
                            }
                            className="h-9 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Per-Category Adjustments */}
          <div className="glass-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  Penyesuaian Kategori Pengeluaran
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Berdasarkan rata-rata 3 siklus terakhir (kategori Invest dikecualikan dari belanja).
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAllCategories((v) => !v)}
                className="text-xs text-emerald-700 dark:text-emerald-400"
              >
                {showAllCategories ? 'Ringkas' : 'Semua Kategori'}
              </Button>
            </div>

            <div className="space-y-4 max-h-[540px] overflow-y-auto pr-1">
              {visibleCategories.map((cat) => {
                const adj = categoryAdjustments[cat.name];
                const pct = adj ? adj.pct : 0;
                const newVal = Math.max(0, Math.round(cat.avg_spending * (1 + pct / 100)));

                return (
                  <div
                    key={cat.name}
                    className="rounded-xl border border-slate-200 dark:border-white/10 p-3 space-y-2 bg-white/60 dark:bg-white/[0.02]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color || '#64748b' }}
                        />
                        <span className="text-sm font-medium text-slate-900 dark:text-white truncate">
                          {cat.name}
                        </span>
                      </div>
                      <span className="text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-300">
                        {formatIdr(newVal)} {pct !== 0 && `(${pct > 0 ? `+${pct}%` : `${pct}%`})`}
                      </span>
                    </div>

                    <input
                      type="range"
                      min={-100}
                      max={100}
                      step={5}
                      value={pct}
                      aria-label={`Sesuaikan ${cat.name}`}
                      onChange={(e) =>
                        updateCategoryAdjustment(cat.name, Number(e.target.value), cat.avg_spending)
                      }
                      className="w-full accent-emerald-600 cursor-pointer"
                    />

                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span>Baseline: {formatIdr(cat.avg_spending)}</span>
                      <div className="flex gap-1.5">
                        {[-25, -10, 0].map((quick) => (
                          <button
                            key={quick}
                            type="button"
                            onClick={() => updateCategoryAdjustment(cat.name, quick, cat.avg_spending)}
                            className={`px-2 py-0.5 rounded border text-[11px] font-medium ${
                              pct === quick
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5'
                            }`}
                          >
                            {quick === 0 ? 'Reset' : `${quick}%`}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── Tab 3: Simpan & Bandingkan A/B ─────────────────────────────────── */}
      {activeTab === 'compare' && (
        <div className="space-y-6">
          <div className="glass-card p-5 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Simpan Snapshot Skenario Aktif
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Simpan konfigurasi saat ini untuk dimuat ulang atau disematkan sebagai garis pembanding di grafik utama.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={scenarioNameInput}
                onChange={(e) => setScenarioNameInput(e.target.value)}
                placeholder="Contoh: Hemat + Investasi 10% p.a."
                aria-label="Nama snapshot skenario"
                className="min-h-[44px]"
              />
              <Button type="button" onClick={handleSaveScenario} className="min-h-[44px] gap-2 shrink-0">
                <Bookmark className="w-4 h-4" />
                Simpan Skenario
              </Button>
            </div>
          </div>

          <div className="glass-card p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Daftar Skenario Tersimpan ({savedScenarios.length})
              </h2>
              {savedScenarios.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClearAllScenarios}
                  className="min-h-[44px] text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30"
                >
                  Hapus Semua
                </Button>
              )}
            </div>

            {savedScenarios.length === 0 ? (
              <p className="text-sm text-slate-600 dark:text-slate-400 py-4">
                Belum ada skenario tersimpan. Atur slider di tab Kontrol Skenario lalu simpan snapshot untuk membandingkan opsi A vs B.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {savedScenarios.map((snap) => {
                  const isPinned = pinnedCompareId === snap.id;
                  return (
                    <div
                      key={snap.id}
                      className={`rounded-xl border p-4 space-y-3 ${
                        isPinned
                          ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-500/10'
                          : 'border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/[0.02]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{snap.name}</h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Horizon {snap.inputs.projectionMonths}B | Return {snap.inputs.annualReturnPct}% p.a. | Income {snap.inputs.incomeChangePct >= 0 ? `+${snap.inputs.incomeChangePct}%` : `${snap.inputs.incomeChangePct}%`}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteScenario(snap.id)}
                          aria-label={`Hapus ${snap.name}`}
                          className="text-red-600 dark:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-lg bg-slate-100/80 dark:bg-white/[0.04] p-2.5">
                          <span className="text-slate-500 dark:text-slate-400 block">Proyeksi Akhir</span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {formatIdr(snap.summary.finalScenario)}
                          </span>
                        </div>
                        <div className="rounded-lg bg-slate-100/80 dark:bg-white/[0.04] p-2.5">
                          <span className="text-slate-500 dark:text-slate-400 block">Surplus Bulanan</span>
                          <span className="font-bold text-emerald-700 dark:text-emerald-400">
                            {formatIdr(snap.summary.monthlyNet)}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleLoadScenario(snap)}
                          className="min-h-[40px] flex-1"
                        >
                          Muat Skenario
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={isPinned ? 'default' : 'secondary'}
                          onClick={() => setPinnedCompareId(isPinned ? null : snap.id)}
                          className="min-h-[40px] flex-1"
                        >
                          {isPinned ? 'Dipin di Grafik' : 'Pin Pembanding'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
