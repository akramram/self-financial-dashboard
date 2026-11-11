import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { formatIdr } from '../lib/utils';
import { Skeleton } from './ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import SortableHeader from './SortableHeader';
import { useSortState } from '../hooks/useSortState';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Trophy,
  AlertTriangle,
  Target,
  Award,
  PiggyBank,
  Flame,
  Info,
  RefreshCw,
  Sliders,
  History,
  BarChart3,
  RotateCcw,
  CheckCircle2,
  Search,
  Coins,
} from 'lucide-react';
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
import { fpGrid } from '../lib/chartConfig';
import {
  SAVINGS_TIERS,
  classifySavingsTier,
  computeMilestoneProgress,
  computeSavingsDecomposition,
  simulateSavingsTarget,
  generateSavingsInsights,
  extractAvailableYears,
  filterSavingsPeriods,
  type SavingsRatePeriod,
  type SavingsRateResult,
  type SavingsTierKey,
} from '../lib/savings-rate-engine';

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

type ActiveTab = 'overview' | 'simulator' | 'history';

const TARGET_PRESETS = [
  { rate: 10, label: '10% Awal' },
  { rate: 20, label: '20% Ideal' },
  { rate: 30, label: '30% Agresif' },
  { rate: 50, label: '50% FIRE' },
];

const RETURN_OPTIONS = [0, 5, 8];

function readUrlParams(): { periodId: number | null; tab: ActiveTab } {
  if (typeof window === 'undefined') return { periodId: null, tab: 'overview' };
  const params = new URLSearchParams(window.location.search);
  const rawPeriod = Number(params.get('period'));
  const rawTab = params.get('tab');
  const tab: ActiveTab =
    rawTab === 'simulator' || rawTab === 'history' ? rawTab : 'overview';
  return {
    periodId: Number.isFinite(rawPeriod) && rawPeriod > 0 ? rawPeriod : null,
    tab,
  };
}

function formatIdrShort(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}Rp ${(abs / 1_000_000_000).toFixed(1)} M`;
  if (abs >= 1_000_000) return `${sign}Rp ${(abs / 1_000_000).toFixed(1)} jt`;
  if (abs >= 1_000) return `${sign}Rp ${(abs / 1_000).toFixed(0)} rb`;
  return `${sign}Rp ${Math.round(abs)}`;
}

export default function SavingsRateTracker() {
  const initial = useMemo(() => readUrlParams(), []);

  const [data, setData] = useState<SavingsRateResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<ActiveTab>(initial.tab);
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(initial.periodId);
  const [chartView, setChartView] = useState<'rate' | 'amount'>('rate');
  const [chartBenchmarkPct, setChartBenchmarkPct] = useState<number>(20);

  // Simulator state
  const [targetRatePct, setTargetRatePct] = useState<number>(30);
  const [incomeAdjustPct, setIncomeAdjustPct] = useState<number>(0);
  const [expenseCutPct, setExpenseCutPct] = useState<number>(0);
  const [extraInvestMonthly, setExtraInvestMonthly] = useState<number>(0);
  const [annualReturnPct, setAnnualReturnPct] = useState<number>(5);

  // History filters & sorting
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [tierFilter, setTierFilter] = useState<SavingsTierKey | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const { toggleSort, sortData, isSorted } = useSortState('period', 'desc');

  const fetchData = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch('/api/savings-rate')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: SavingsRateResult) => {
        setData(d);
        if (d.periods.length > 0) {
          setSelectedPeriodId((prev) =>
            prev && d.periods.some((p) => p.period_id === prev)
              ? prev
              : d.current?.period_id ?? d.periods[d.periods.length - 1].period_id
          );
        }
        setLoading(false);
      })
      .catch((e: Error) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Sync URL query string without reload
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (activeTab !== 'overview') params.set('tab', activeTab);
    else params.delete('tab');
    if (selectedPeriodId) params.set('period', String(selectedPeriodId));
    else params.delete('period');
    const qs = params.toString();
    const nextUrl = `${window.location.pathname}${qs ? `?${qs}` : ''}`;
    window.history.replaceState({}, '', nextUrl);
  }, [activeTab, selectedPeriodId]);

  const periods = data?.periods ?? [];

  const focusedPeriod: SavingsRatePeriod | null = useMemo(() => {
    if (periods.length === 0) return null;
    if (selectedPeriodId) {
      const match = periods.find((p) => p.period_id === selectedPeriodId);
      if (match) return match;
    }
    return data?.current ?? periods[periods.length - 1];
  }, [periods, selectedPeriodId, data]);

  const availableYears = useMemo(() => extractAvailableYears(periods), [periods]);

  const chartPeriods = useMemo(() => {
    if (yearFilter === 'all') return periods;
    return filterSavingsPeriods(periods, { year: yearFilter });
  }, [periods, yearFilter]);

  const decomposition = useMemo(() => {
    if (!focusedPeriod) return null;
    return computeSavingsDecomposition(focusedPeriod);
  }, [focusedPeriod]);

  const milestoneProgress = useMemo(() => {
    if (!data || !focusedPeriod) return null;
    return computeMilestoneProgress(data.best_rate, focusedPeriod.savings_rate);
  }, [data, focusedPeriod]);

  const insights = useMemo(() => {
    if (!data) return [];
    return generateSavingsInsights(data);
  }, [data]);

  const benchmarkBuckets = useMemo(() => {
    if (periods.length === 0) return [];
    return SAVINGS_TIERS.map((tier) => {
      const count = periods.filter(
        (p) => classifySavingsTier(p.savings_rate).key === tier.key
      ).length;
      return {
        ...tier,
        count,
        pct: (count / periods.length) * 100,
      };
    }).filter((b) => b.count > 0);
  }, [periods]);

  const simulation = useMemo(() => {
    if (!focusedPeriod) return null;
    return simulateSavingsTarget({
      baseIncome: focusedPeriod.income,
      baseLivingExpense: focusedPeriod.living_expense,
      baseInvest: focusedPeriod.invest,
      targetRatePct,
      incomeAdjustPct,
      expenseCutPct,
      extraInvestMonthly,
      annualReturnPct,
    });
  }, [
    focusedPeriod,
    targetRatePct,
    incomeAdjustPct,
    expenseCutPct,
    extraInvestMonthly,
    annualReturnPct,
  ]);

  const rateChartData = useMemo(() => {
    if (chartPeriods.length === 0) return null;
    const labels = chartPeriods.map((p) => p.month);
    const rates = chartPeriods.map((p) => p.savings_rate);
    const targetLine = chartPeriods.map(() => chartBenchmarkPct);
    return {
      labels,
      datasets: [
        {
          label: 'Savings Rate (%)',
          data: rates,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.14)',
          fill: true,
          tension: 0.3,
          pointRadius: chartPeriods.length > 20 ? 2 : 4,
          pointHoverRadius: 6,
          pointBackgroundColor: rates.map((r) => (r >= 0 ? '#10b981' : '#ef4444')),
          pointBorderColor: rates.map((r) => (r >= 0 ? '#059669' : '#dc2626')),
          borderWidth: 2,
        },
        {
          label: `Target (${chartBenchmarkPct}%)`,
          data: targetLine,
          borderColor: '#f59e0b',
          borderDash: [6, 4],
          borderWidth: 1.5,
          pointRadius: 0,
          fill: false,
        },
      ],
    };
  }, [chartPeriods, chartBenchmarkPct]);

  const amountChartData = useMemo(() => {
    if (chartPeriods.length === 0) return null;
    const labels = chartPeriods.map((p) => p.month);
    return {
      labels,
      datasets: [
        {
          label: 'Pemasukan',
          data: chartPeriods.map((p) => p.income),
          backgroundColor: 'rgba(14, 165, 233, 0.72)',
          borderColor: '#0284c7',
          borderWidth: 1,
          borderRadius: 4,
        },
        {
          label: 'Biaya Hidup',
          data: chartPeriods.map((p) => p.living_expense),
          backgroundColor: 'rgba(251, 113, 133, 0.75)',
          borderColor: '#e11d48',
          borderWidth: 1,
          borderRadius: 4,
        },
        {
          label: 'Investasi',
          data: chartPeriods.map((p) => p.invest),
          backgroundColor: 'rgba(45, 212, 191, 0.8)',
          borderColor: '#0d9488',
          borderWidth: 1,
          borderRadius: 4,
        },
        {
          label: 'Surplus Kas',
          data: chartPeriods.map((p) => p.cash_surplus),
          backgroundColor: chartPeriods.map((p) =>
            p.cash_surplus >= 0 ? 'rgba(16, 185, 129, 0.72)' : 'rgba(245, 158, 11, 0.75)'
          ),
          borderColor: chartPeriods.map((p) =>
            p.cash_surplus >= 0 ? '#059669' : '#d97706'
          ),
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    };
  }, [chartPeriods]);

  const simProjectionChartData = useMemo(() => {
    if (!simulation) return null;
    return {
      labels: ['Proyeksi 1 Tahun (12 Siklus)', 'Proyeksi 3 Tahun (36 Siklus)'],
      datasets: [
        {
          label: 'Baseline Saat Ini',
          data: [simulation.projected12MonthsBaseline, simulation.projected36MonthsBaseline],
          backgroundColor: 'rgba(148, 163, 184, 0.65)',
          borderColor: '#64748b',
          borderWidth: 1,
          borderRadius: 6,
        },
        {
          label: 'Skenario Simulasi',
          data: [simulation.projected12MonthsSim, simulation.projected36MonthsSim],
          backgroundColor: 'rgba(16, 185, 129, 0.78)',
          borderColor: '#059669',
          borderWidth: 1,
          borderRadius: 6,
        },
      ],
    };
  }, [simulation]);

  const filteredHistory = useMemo(() => {
    const filtered = filterSavingsPeriods(periods, {
      year: yearFilter,
      tier: tierFilter,
      search: searchQuery,
    });
    return sortData(
      filtered,
      (item, key) => {
        switch (key) {
          case 'period':
            return item.start_date;
          case 'income':
            return item.income;
          case 'living':
            return item.living_expense;
          case 'invest':
            return item.invest;
          case 'cash':
            return item.cash_surplus;
          case 'savings':
            return item.savings;
          case 'rate':
            return item.savings_rate;
          default:
            return item.start_date;
        }
      },
      (arr) => [...arr].reverse()
    );
  }, [periods, yearFilter, tierFilter, searchQuery, sortData]);

  const resetSimulator = () => {
    setTargetRatePct(30);
    setIncomeAdjustPct(0);
    setExpenseCutPct(0);
    setExtraInvestMonthly(0);
    setAnnualReturnPct(5);
  };

  if (loading) {
    return (
      <div className="space-y-6" data-testid="savings-rate-loading">
        <div className="glass-card p-6 space-y-4">
          <div className="flex justify-between items-center">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-8 w-28" />
          </div>
          <Skeleton className="h-14 w-40" />
          <Skeleton className="h-4 w-full" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        </div>
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-8 text-center space-y-4" data-testid="savings-rate-error">
        <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Gagal Memuat Data Savings Rate
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Terjadi kesalahan saat mengambil data dari server ({error}).
          </p>
        </div>
        <Button onClick={fetchData} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Coba Lagi
        </Button>
      </div>
    );
  }

  if (!data || periods.length === 0 || !focusedPeriod || !decomposition || !milestoneProgress) {
    return (
      <div className="glass-card p-10 text-center space-y-4" data-testid="savings-rate-empty">
        <PiggyBank className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto" />
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Belum Ada Data Savings Rate
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            Tambahkan catatan pemasukan bulanan dan transaksi untuk mulai menghitung tingkat tabungan per siklus gaji.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <a
            href="/settings"
            className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-emerald-700 text-white hover:bg-emerald-800 transition-colors"
          >
            Atur Pemasukan
          </a>
          <a
            href="/add"
            className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Catat Transaksi
          </a>
        </div>
      </div>
    );
  }

  const focusedTier = classifySavingsTier(focusedPeriod.savings_rate);

  const rateChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false as const,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { boxWidth: 12, font: { size: 11 } },
      },
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            if (ctx.datasetIndex === 1) {
              return `Target: ${chartBenchmarkPct}%`;
            }
            const p = chartPeriods[ctx.dataIndex];
            if (!p) return '';
            return [
              `Rate: ${p.savings_rate.toFixed(1)}%`,
              `Total Tabungan: ${formatIdr(p.savings)}`,
              `Investasi: ${formatIdr(p.invest)}`,
              `Surplus Kas: ${formatIdr(p.cash_surplus)}`,
            ];
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        ticks: { callback: (v: any) => `${v}%` },
        grid: { color: fpGrid() },
      },
      x: { ticks: { maxRotation: 45, minRotation: 0 }, grid: { display: false } },
    },
  };

  const amountChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false as const,
    plugins: {
      legend: { position: 'top' as const, labels: { boxWidth: 12, font: { size: 11 } } },
      tooltip: {
        callbacks: {
          label: (ctx: any) => `${ctx.dataset.label}: ${formatIdr(ctx.parsed.y)}`,
        },
      },
    },
    scales: {
      y: {
        ticks: { callback: (v: any) => formatIdrShort(v) },
        grid: { color: fpGrid() },
      },
      x: { ticks: { maxRotation: 45, minRotation: 0 }, grid: { display: false } },
    },
  };

  return (
    <div className="space-y-6">
      {/* === Toolbar: Period & Year Filters === */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Fokus Siklus:
            </span>
            <Select
              value={String(focusedPeriod.period_id)}
              onValueChange={(v) => setSelectedPeriodId(Number(v))}
            >
              <SelectTrigger className="w-[175px] h-9 text-sm" aria-label="Pilih Siklus Gaji">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[...periods].reverse().map((p) => (
                  <SelectItem key={p.period_id} value={String(p.period_id)}>
                    {p.month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {availableYears.length > 1 && (
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-[125px] h-9 text-sm" aria-label="Filter Tahun">
                <SelectValue placeholder="Semua Tahun" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tahun</SelectItem>
                {availableYears.map((y) => (
                  <SelectItem key={y} value={y}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchData}
          className="gap-1.5 self-start sm:self-auto min-h-[36px]"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Muat Ulang
        </Button>
      </div>

      {/* === Hero Command Strip (WCAG AA compliant in light & dark) === */}
      <section
        className={`glass-card p-5 sm:p-6 border ${focusedTier.surfaceClass}`}
        aria-label="Ringkasan Savings Rate Siklus Terpilih"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Siklus {focusedPeriod.month}
              </span>
              <Badge variant="outline" className={`border ${focusedTier.badgeClass}`}>
                {focusedTier.label}
              </Badge>
              {focusedPeriod.period_id === data.current?.period_id && (
                <Badge
                  variant="outline"
                  className="bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
                >
                  Siklus Terbaru
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap items-baseline gap-3">
              <span className={`text-4xl sm:text-5xl font-bold tabular-nums ${focusedTier.textClass}`}>
                {focusedPeriod.savings_rate.toFixed(1)}%
              </span>
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                tingkat tabungan bersih ({formatIdr(focusedPeriod.savings)})
              </span>
            </div>

            <p className="text-sm text-slate-700 dark:text-slate-300">
              {focusedTier.desc}
            </p>

            {/* Composition Bar: Living Expense vs Invest vs Cash Surplus */}
            <div className="pt-1 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                <span>Komposisi Alokasi Pemasukan ({formatIdr(focusedPeriod.income)})</span>
                <span className="tabular-nums font-medium">
                  Investasi {focusedPeriod.invest_rate.toFixed(1)}%
                </span>
              </div>
              <div className="h-3 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex">
                <div
                  className="h-full bg-rose-500 transition-all"
                  style={{ width: `${decomposition.livingSharePct}%` }}
                  title={`Biaya Hidup: ${formatIdr(focusedPeriod.living_expense)}`}
                />
                <div
                  className="h-full bg-teal-500 transition-all"
                  style={{ width: `${decomposition.investSharePct}%` }}
                  title={`Investasi: ${formatIdr(focusedPeriod.invest)}`}
                />
                <div
                  className="h-full bg-emerald-500 transition-all"
                  style={{ width: `${decomposition.cashSurplusSharePct}%` }}
                  title={`Surplus Kas: ${formatIdr(focusedPeriod.cash_surplus)}`}
                />
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-700 dark:text-slate-300">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  Biaya Hidup: <strong className="tabular-nums">{formatIdr(focusedPeriod.living_expense)}</strong>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                  Investasi: <strong className="tabular-nums">{formatIdr(focusedPeriod.invest)}</strong>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  {focusedPeriod.cash_surplus >= 0 ? 'Surplus Kas:' : 'Defisit Kas:'}{' '}
                  <strong className="tabular-nums">{formatIdr(focusedPeriod.cash_surplus)}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* 4 Executive KPI Sub-cards */}
          <div className="grid grid-cols-2 gap-3 lg:w-[390px] shrink-0">
            <KpiMiniCard
              icon={<Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
              label="Rata-rata Historis"
              value={`${data.avg_rate.toFixed(1)}%`}
              sub={`Median ${data.median_rate.toFixed(1)}%`}
            />
            <KpiMiniCard
              icon={<PiggyBank className="w-4 h-4 text-teal-600 dark:text-teal-400" />}
              label="Total Tersimpan"
              value={formatIdrShort(data.total_saved)}
              sub={`${data.total_periods} siklus tercatat`}
            />
            <KpiMiniCard
              icon={<Coins className="w-4 h-4 text-sky-600 dark:text-sky-400" />}
              label="Akumulasi Investasi"
              value={formatIdrShort(data.total_invested)}
              sub={`Rata-rata ${data.avg_invest_rate.toFixed(1)}% / bln`}
            />
            <KpiMiniCard
              icon={<Flame className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
              label="Runtunan Positif"
              value={`${data.consecutive_positive} bln`}
              sub={`Rekor ${data.longest_positive_streak} bln`}
            />
          </div>
        </div>
      </section>

      {/* === 3-Tab Navigation === */}
      <div
        role="tablist"
        aria-label="Navigasi Bagian Savings Rate"
        className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-3"
      >
        <TabButton
          active={activeTab === 'overview'}
          onClick={() => setActiveTab('overview')}
          icon={<BarChart3 className="w-4 h-4" />}
          label="Ringkasan & Tren"
        />
        <TabButton
          active={activeTab === 'simulator'}
          onClick={() => setActiveTab('simulator')}
          icon={<Sliders className="w-4 h-4" />}
          label="Simulator Target"
        />
        <TabButton
          active={activeTab === 'history'}
          onClick={() => setActiveTab('history')}
          icon={<History className="w-4 h-4" />}
          label={`Riwayat & Rincian (${periods.length})`}
        />
      </div>

      {/* === TAB 1: RINGKASAN & TREN === */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Trend Banner */}
          {data.total_periods >= 3 && (
            <div
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border ${
                data.trend === 'improving'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50'
                  : data.trend === 'declining'
                  ? 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/50'
                  : 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800/70 dark:text-slate-200 dark:border-slate-700'
              }`}
            >
              {data.trend === 'improving' && <TrendingUp className="w-5 h-5 shrink-0" />}
              {data.trend === 'declining' && <TrendingDown className="w-5 h-5 shrink-0" />}
              {data.trend === 'stable' && <Minus className="w-5 h-5 shrink-0" />}
              <span>
                Tren 3 siklus terakhir berada di{' '}
                <strong className="tabular-nums">{data.trailing3_avg.toFixed(1)}%</strong>{' '}
                dibanding rata-rata 6 siklus{' '}
                <strong className="tabular-nums">{data.trailing6_avg.toFixed(1)}%</strong>.
              </span>
            </div>
          )}

          {/* Executive Insights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.map((ins) => (
              <div
                key={ins.id}
                className="glass-card p-4 border border-slate-200/80 dark:border-slate-800 space-y-1.5"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      ins.tone === 'positive'
                        ? 'bg-emerald-500'
                        : ins.tone === 'warning'
                        ? 'bg-amber-500'
                        : 'bg-sky-500'
                    }`}
                  />
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    {ins.title}
                  </h3>
                </div>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  {ins.detail}
                </p>
              </div>
            ))}
          </div>

          {/* Interactive Chart Panel */}
          <div className="glass-card p-5 border border-slate-200/80 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  {chartView === 'rate'
                    ? 'Pergerakan Savings Rate vs Target'
                    : 'Komposisi Arus Kas per Siklus'}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {chartPeriods.length} siklus gaji ditampilkan
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {chartView === 'rate' && (
                  <div className="flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
                    {[20, 30, 50].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setChartBenchmarkPct(pct)}
                        className={`px-2 py-1 text-xs rounded-md font-medium transition-colors ${
                          chartBenchmarkPct === pct
                            ? 'bg-amber-500 text-slate-950'
                            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        Garis {pct}%
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setChartView('rate')}
                    className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                      chartView === 'rate'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Rate (%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartView('amount')}
                    className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                      chartView === 'amount'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Nominal (Rp)
                  </button>
                </div>
              </div>
            </div>
            <div className="h-80">
              {chartView === 'rate' && rateChartData && (
                <Line data={rateChartData} options={rateChartOptions} />
              )}
              {chartView === 'amount' && amountChartData && (
                <Bar data={amountChartData} options={amountChartOptions} />
              )}
            </div>
          </div>

          {/* Two-column: Tier Distribution + Next Milestone & Badges */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Rate Distribution */}
            <div className="glass-card p-5 border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-2 mb-1">
                <Award className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  Distribusi Tier Historis
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
                Frekuensi capaian tingkat tabungan di seluruh siklus ({periods.length} periode)
              </p>
              <div className="space-y-3">
                {benchmarkBuckets.map((b) => (
                  <div key={b.key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className={`font-semibold ${b.textClass}`}>{b.label}</span>
                      <span className="tabular-nums font-medium text-slate-700 dark:text-slate-300">
                        {b.count}x ({b.pct.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${b.pct}%`, backgroundColor: b.barColor }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                <span>
                  Terbaik: <strong className="text-emerald-700 dark:text-emerald-300">{data.best_rate.toFixed(1)}%</strong> ({data.best_month})
                </span>
                <span>
                  Terendah: <strong className="text-rose-700 dark:text-rose-300">{data.worst_rate.toFixed(1)}%</strong> ({data.worst_month})
                </span>
              </div>
            </div>

            {/* Milestones */}
            <div className="glass-card p-5 border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    Milestone Tingkat Tabungan
                  </h3>
                </div>
                <span className="text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                  {milestoneProgress.achievedCount}/{milestoneProgress.milestones.length} Tercapai
                </span>
              </div>

              {milestoneProgress.nextMilestone ? (
                <div className="mb-4 p-3 rounded-xl bg-slate-100 dark:bg-slate-800/70 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-slate-200">
                      Target Berikutnya: <strong>{milestoneProgress.nextMilestone.label}</strong>
                    </span>
                    <span className="tabular-nums text-emerald-700 dark:text-emerald-300 font-semibold">
                      Kurang {milestoneProgress.gapFromCurrentPct.toFixed(1)} poin
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${milestoneProgress.progressToNextPct}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-xs font-medium text-emerald-800 dark:text-emerald-300">
                  Seluruh milestone utama hingga 70% sudah pernah tercapai.
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {milestoneProgress.milestones.map((m) => (
                  <div
                    key={m.rate}
                    className={`p-3 rounded-xl border transition-colors ${
                      m.achieved
                        ? 'bg-emerald-50/70 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800/60'
                        : 'bg-slate-50 border-slate-200/80 dark:bg-slate-900/40 dark:border-slate-800 opacity-75'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-sm font-bold ${
                          m.achieved
                            ? 'text-emerald-800 dark:text-emerald-300'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {m.label}
                      </span>
                      {m.achieved && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      {m.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === TAB 2: SIMULATOR TARGET === */}
      {activeTab === 'simulator' && simulation && (
        <div className="space-y-6" data-testid="savings-simulator-panel">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Controls Column */}
            <div className="lg:col-span-5 glass-card p-5 border border-slate-200/80 dark:border-slate-800 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    Parameter Simulasi Target
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Basis data dari siklus {focusedPeriod.month}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={resetSimulator}
                  className="gap-1.5 text-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset
                </Button>
              </div>

              {/* Target Presets */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    Target Savings Rate
                  </span>
                  <span className="font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                    {targetRatePct}%
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {TARGET_PRESETS.map((preset) => (
                    <button
                      key={preset.rate}
                      type="button"
                      onClick={() => setTargetRatePct(preset.rate)}
                      className={`px-2.5 py-2 rounded-lg text-xs font-semibold border transition-colors min-h-[40px] ${
                        targetRatePct === preset.rate
                          ? 'bg-emerald-700 text-white border-emerald-700'
                          : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <input
                  type="range"
                  aria-label="Target Savings Rate (%)"
                  min={5}
                  max={75}
                  step={1}
                  value={targetRatePct}
                  onChange={(e) => setTargetRatePct(Number(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>

              {/* Expense Cut */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="sim-expense-cut" className="font-medium text-slate-700 dark:text-slate-300">
                    Efisiensi Biaya Hidup
                  </label>
                  <span className="font-bold tabular-nums text-slate-900 dark:text-white">
                    -{expenseCutPct}% ({formatIdr(focusedPeriod.living_expense - simulation.simLivingExpense)})
                  </span>
                </div>
                <input
                  id="sim-expense-cut"
                  type="range"
                  aria-label="Efisiensi Biaya Hidup (%)"
                  min={0}
                  max={40}
                  step={1}
                  value={expenseCutPct}
                  onChange={(e) => setExpenseCutPct(Number(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>

              {/* Income Adjust */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="sim-income-adj" className="font-medium text-slate-700 dark:text-slate-300">
                    Penyesuaian Pemasukan
                  </label>
                  <span className="font-bold tabular-nums text-slate-900 dark:text-white">
                    {incomeAdjustPct >= 0 ? `+${incomeAdjustPct}%` : `${incomeAdjustPct}%`} ({formatIdr(simulation.simIncome)})
                  </span>
                </div>
                <input
                  id="sim-income-adj"
                  type="range"
                  aria-label="Penyesuaian Pemasukan (%)"
                  min={-20}
                  max={50}
                  step={1}
                  value={incomeAdjustPct}
                  onChange={(e) => setIncomeAdjustPct(Number(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>

              {/* Extra Invest Allocation */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="sim-extra-invest" className="font-medium text-slate-700 dark:text-slate-300">
                    Tambahan Porsi Investasi
                  </label>
                  <span className="font-bold tabular-nums text-teal-700 dark:text-teal-300">
                    +{formatIdr(extraInvestMonthly)} / bln
                  </span>
                </div>
                <input
                  id="sim-extra-invest"
                  type="range"
                  aria-label="Tambahan Porsi Investasi (Rp)"
                  min={0}
                  max={5_000_000}
                  step={250_000}
                  value={extraInvestMonthly}
                  onChange={(e) => setExtraInvestMonthly(Number(e.target.value))}
                  className="w-full accent-teal-600 cursor-pointer"
                />
              </div>

              {/* Return Assumption */}
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300 block">
                  Asumsi Imbal Hasil Tahunan (Proyeksi 1-3 Tahun)
                </span>
                <div className="flex gap-2">
                  {RETURN_OPTIONS.map((ret) => (
                    <button
                      key={ret}
                      type="button"
                      onClick={() => setAnnualReturnPct(ret)}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors min-h-[38px] ${
                        annualReturnPct === ret
                          ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white'
                          : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {ret}% p.a.
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Results Column */}
            <div className="lg:col-span-7 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="glass-card p-4 border border-slate-200/80 dark:border-slate-800">
                  <p className="text-xs text-slate-600 dark:text-slate-400">Proyeksi Rate Baru</p>
                  <p className="text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300 mt-1">
                    {simulation.simRatePct.toFixed(1)}%
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 tabular-nums">
                    {simulation.rateDeltaPct >= 0 ? '+' : ''}
                    {simulation.rateDeltaPct.toFixed(1)} poin vs baseline
                  </p>
                </div>

                <div className="glass-card p-4 border border-slate-200/80 dark:border-slate-800">
                  <p className="text-xs text-slate-600 dark:text-slate-400">Tabungan / Siklus</p>
                  <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white mt-1">
                    {formatIdrShort(simulation.simTotalSavings)}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 tabular-nums">
                    {simulation.monthlySavingsDelta >= 0 ? '+' : ''}
                    {formatIdrShort(simulation.monthlySavingsDelta)} / siklus
                  </p>
                </div>

                <div
                  className={`glass-card p-4 border ${
                    simulation.isTargetMet
                      ? 'border-emerald-300 bg-emerald-50/70 dark:border-emerald-700/50 dark:bg-emerald-950/30'
                      : 'border-amber-300 bg-amber-50/70 dark:border-amber-700/50 dark:bg-amber-950/30'
                  }`}
                >
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Status Target {targetRatePct}%
                  </p>
                  <p
                    className={`text-lg font-bold mt-1 tabular-nums ${
                      simulation.isTargetMet
                        ? 'text-emerald-800 dark:text-emerald-300'
                        : 'text-amber-800 dark:text-amber-300'
                    }`}
                  >
                    {simulation.isTargetMet
                      ? `Tercapai (+${formatIdrShort(simulation.gapToTargetMonthly)})`
                      : `Kurang ${formatIdrShort(Math.abs(simulation.gapToTargetMonthly))}`}
                  </p>
                  <p className="text-xs text-slate-700 dark:text-slate-300 mt-1">
                    {simulation.isTargetMet
                      ? 'Skenario memenuhi target tabungan.'
                      : `Butuh efisiensi biaya ${simulation.requiredExpenseCutPct.toFixed(1)}% lagi.`}
                  </p>
                </div>
              </div>

              <div className="glass-card p-5 border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Komparasi Akumulasi Kekayaan (Baseline vs Simulasi)
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Proyeksi 12 & 36 siklus dengan asumsi imbal hasil {annualReturnPct}% per tahun
                    </p>
                  </div>
                </div>
                <div className="h-60">
                  {simProjectionChartData && (
                    <Bar data={simProjectionChartData} options={amountChartOptions} />
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-600 dark:text-slate-400 block">
                      Selisih Akumulasi 1 Tahun
                    </span>
                    <strong className="text-sm tabular-nums text-emerald-700 dark:text-emerald-300">
                      +{formatIdr(simulation.projected12MonthsSim - simulation.projected12MonthsBaseline)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-600 dark:text-slate-400 block">
                      Selisih Akumulasi 3 Tahun
                    </span>
                    <strong className="text-sm tabular-nums text-emerald-700 dark:text-emerald-300">
                      +{formatIdr(simulation.projected36MonthsSim - simulation.projected36MonthsBaseline)}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === TAB 3: RIWAYAT & RINCIAN === */}
      {activeTab === 'history' && (
        <div className="space-y-4" data-testid="savings-history-panel">
          {/* Filter Controls */}
          <div className="glass-card p-4 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari bulan / periode..."
                aria-label="Cari periode"
                className="pl-9 h-9"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setTierFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors min-h-[34px] ${
                  tierFilter === 'all'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                Semua
              </button>
              {SAVINGS_TIERS.map((tier) => (
                <button
                  key={tier.key}
                  type="button"
                  onClick={() => setTierFilter(tier.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors min-h-[34px] ${
                    tierFilter === tier.key
                      ? 'bg-emerald-700 text-white'
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {tier.label}
                </button>
              ))}
            </div>
          </div>

          {filteredHistory.length === 0 ? (
            <div className="glass-card p-8 text-center text-sm text-slate-600 dark:text-slate-400">
              Tidak ada periode yang cocok dengan filter pencarian saat ini.
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block glass-card border border-slate-200/80 dark:border-slate-800 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableHeader
                        sortKey="period"
                        currentDirection={isSorted('period')}
                        onSort={toggleSort}
                      >
                        Periode
                      </SortableHeader>
                      <SortableHeader
                        sortKey="income"
                        currentDirection={isSorted('income')}
                        onSort={toggleSort}
                        className="text-right"
                      >
                        Pemasukan
                      </SortableHeader>
                      <SortableHeader
                        sortKey="living"
                        currentDirection={isSorted('living')}
                        onSort={toggleSort}
                        className="text-right"
                      >
                        Biaya Hidup
                      </SortableHeader>
                      <SortableHeader
                        sortKey="invest"
                        currentDirection={isSorted('invest')}
                        onSort={toggleSort}
                        className="text-right"
                      >
                        Investasi
                      </SortableHeader>
                      <SortableHeader
                        sortKey="cash"
                        currentDirection={isSorted('cash')}
                        onSort={toggleSort}
                        className="text-right"
                      >
                        Surplus Kas
                      </SortableHeader>
                      <SortableHeader
                        sortKey="savings"
                        currentDirection={isSorted('savings')}
                        onSort={toggleSort}
                        className="text-right"
                      >
                        Total Tabungan
                      </SortableHeader>
                      <SortableHeader
                        sortKey="rate"
                        currentDirection={isSorted('rate')}
                        onSort={toggleSort}
                        className="text-right"
                      >
                        Rate (%)
                      </SortableHeader>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400">
                        Tier
                      </th>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredHistory.map((p) => {
                      const tier = classifySavingsTier(p.savings_rate);
                      const isFocused = p.period_id === focusedPeriod.period_id;
                      return (
                        <TableRow
                          key={p.period_id}
                          onClick={() => setSelectedPeriodId(p.period_id)}
                          className={`cursor-pointer ${
                            isFocused ? 'bg-emerald-50/60 dark:bg-emerald-950/20' : ''
                          }`}
                        >
                          <TableCell className="font-medium text-slate-900 dark:text-white">
                            {p.month}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatIdr(p.income)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-slate-600 dark:text-slate-300">
                            {formatIdr(p.living_expense)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-teal-700 dark:text-teal-300">
                            {formatIdr(p.invest)}
                          </TableCell>
                          <TableCell
                            className={`text-right tabular-nums ${
                              p.cash_surplus >= 0
                                ? 'text-slate-700 dark:text-slate-200'
                                : 'text-rose-700 dark:text-rose-300'
                            }`}
                          >
                            {formatIdr(p.cash_surplus)}
                          </TableCell>
                          <TableCell
                            className={`text-right font-semibold tabular-nums ${
                              p.savings >= 0
                                ? 'text-emerald-700 dark:text-emerald-300'
                                : 'text-rose-700 dark:text-rose-300'
                            }`}
                          >
                            {formatIdr(p.savings)}
                          </TableCell>
                          <TableCell
                            className={`text-right font-bold tabular-nums ${tier.textClass}`}
                          >
                            {p.savings_rate.toFixed(1)}%
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`border ${tier.badgeClass}`}>
                              {tier.label}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card List (zero horizontal overflow) */}
              <div className="md:hidden space-y-3">
                {filteredHistory.map((p) => {
                  const tier = classifySavingsTier(p.savings_rate);
                  const isFocused = p.period_id === focusedPeriod.period_id;
                  return (
                    <button
                      key={p.period_id}
                      type="button"
                      onClick={() => setSelectedPeriodId(p.period_id)}
                      className={`w-full text-left glass-card p-4 border space-y-2.5 ${
                        isFocused
                          ? 'border-emerald-400 dark:border-emerald-600'
                          : 'border-slate-200/80 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {p.month}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={`text-base font-bold tabular-nums ${tier.textClass}`}>
                            {p.savings_rate.toFixed(1)}%
                          </span>
                          <Badge variant="outline" className={`border ${tier.badgeClass}`}>
                            {tier.label}
                          </Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-slate-500 dark:text-slate-400 block">Pemasukan</span>
                          <span className="font-medium tabular-nums text-slate-800 dark:text-slate-200">
                            {formatIdr(p.income)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-slate-400 block">Biaya Hidup</span>
                          <span className="font-medium tabular-nums text-slate-800 dark:text-slate-200">
                            {formatIdr(p.living_expense)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-slate-400 block">Investasi</span>
                          <span className="font-medium tabular-nums text-teal-700 dark:text-teal-300">
                            {formatIdr(p.invest)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-slate-400 block">Total Tabungan</span>
                          <span
                            className={`font-semibold tabular-nums ${
                              p.savings >= 0
                                ? 'text-emerald-700 dark:text-emerald-300'
                                : 'text-rose-700 dark:text-rose-300'
                            }`}
                          >
                            {formatIdr(p.savings)}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* === Formula Note === */}
      <div className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400 px-1">
        <Info className="w-4 h-4 mt-0.5 shrink-0" />
        <span>
          Formula: Savings Rate = (Pemasukan - (Pengeluaran - Investasi)) / Pemasukan x 100.
          Transaksi berstatus lunas (done = 1) pada kategori Invest dihitung sebagai bagian tabungan produktif, bukan konsumsi.
        </span>
      </div>
    </div>
  );
}

function KpiMiniCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-xl p-3.5 bg-white/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-lg font-bold tabular-nums text-slate-900 dark:text-white mt-1">
        {value}
      </div>
      <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">{sub}</div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors min-h-[40px] ${
        active
          ? 'bg-emerald-700 text-white shadow-sm'
          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-700'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
