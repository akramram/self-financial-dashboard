import React, { useState, useMemo, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import type { MonthlySummary } from '../lib/data';
import { formatIdr } from '../lib/utils';
import { fetchSummaries } from '../lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  CalendarDays,
  Target,
  AlertTriangle,
  CheckCircle2,
  Zap,
  ShieldCheck,
  Search,
  Flame,
  Sun,
  Coffee,
  X,
  ListFilter,
} from 'lucide-react';
import type { WeeklySpendingResult, WeeklyBucket, WeeklyTransactionItem } from '../lib/db';
import {
  calculateCumulativePacing,
  calculateSafeDailyAllowance,
  evaluateWeeklyDiscipline,
  filterWeeklyTransactions,
} from '../lib/weekly-pacing-engine';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement
);

async function fetchWeeklySpending(periodId: number): Promise<WeeklySpendingResult> {
  const res = await fetch(`/api/weekly-spending?period_id=${periodId}`);
  if (!res.ok) throw new Error('Gagal mengambil data pengeluaran mingguan');
  return res.json();
}

const WEEK_COLORS = [
  'rgba(16, 185, 129, 0.8)',
  'rgba(248, 113, 113, 0.8)',
  'rgba(234, 179, 8, 0.8)',
  'rgba(59, 130, 246, 0.8)',
  'rgba(168, 85, 247, 0.8)',
];
const WEEK_BORDERS = [
  'rgb(16, 185, 129)',
  'rgb(248, 113, 113)',
  'rgb(234, 179, 8)',
  'rgb(59, 130, 246)',
  'rgb(168, 85, 247)',
];

export default function WeeklyTracker() {
  const [summaries, setSummaries] = useState<MonthlySummary[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('latest');
  const [weeklyData, setWeeklyData] = useState<WeeklySpendingResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pacing' | 'safe_spend' | 'transactions'>('pacing');

  // Interactive Week Selection & Transaction Modal
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [inspectingWeekTxs, setInspectingWeekTxs] = useState<WeeklyBucket | null>(null);
  const [txSearchQuery, setTxSearchQuery] = useState('');
  const [txCategoryFilter, setTxCategoryFilter] = useState('all');
  const [txTypeFilter, setTxTypeFilter] = useState<'all' | 'weekend' | 'weekday'>('all');

  // Safe Daily Allowance Simulator State
  const [targetSavingsRate, setTargetSavingsRate] = useState<number>(20);

  // Derived periods list
  const months = useMemo(() => {
    return [...summaries].reverse().map((s) => s.month);
  }, [summaries]);

  const latestPeriodId = useMemo(() => {
    return summaries.length > 0 ? summaries[summaries.length - 1]?.period_id : null;
  }, [summaries]);

  const activePeriodId = useMemo(() => {
    if (selectedPeriodId === 'latest') return latestPeriodId;
    const s = summaries.find((sum) => sum.period_id === parseInt(selectedPeriodId, 10));
    return s?.period_id ?? latestPeriodId;
  }, [selectedPeriodId, summaries, latestPeriodId]);

  // Load initial summaries and weekly data
  useEffect(() => {
    fetchSummaries()
      .then((s) => {
        setSummaries(s);
        const pid = s.length > 0 ? s[s.length - 1].period_id : null;
        if (pid) return fetchWeeklySpending(pid);
        return null;
      })
      .then((data) => {
        if (data) setWeeklyData(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Fetch when period selection changes
  useEffect(() => {
    if (!activePeriodId) return;
    setLoading(true);
    fetchWeeklySpending(activePeriodId)
      .then((data) => setWeeklyData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
    setSelectedWeek(null);
    setInspectingWeekTxs(null);
  }, [activePeriodId]);

  // Discipline score and pacing analysis
  const disciplineScore = useMemo(() => {
    if (!weeklyData) return null;
    return evaluateWeeklyDiscipline(weeklyData);
  }, [weeklyData]);

  // Cumulative pacing calculation
  const cumulativePacing = useMemo(() => {
    if (!weeklyData) return [];
    return calculateCumulativePacing(weeklyData.weeks, weeklyData.weeklyBudget);
  }, [weeklyData]);

  // Safe daily allowance calculation
  const safeDailyAllowance = useMemo(() => {
    if (!weeklyData) return null;
    return calculateSafeDailyAllowance({
      income: weeklyData.income,
      totalSpend: weeklyData.totalSpend,
      periodStart: weeklyData.periodStart,
      periodEnd: weeklyData.periodEnd,
      targetSavingsRatePct: targetSavingsRate,
    });
  }, [weeklyData, targetSavingsRate]);

  // Filtered transactions for the currently inspected week or all weeks
  const allPeriodTransactions = useMemo(() => {
    if (!weeklyData) return [];
    const txs: WeeklyTransactionItem[] = [];
    weeklyData.weeks.forEach((w) => {
      if (w.transactions) {
        txs.push(...w.transactions);
      }
    });
    return txs;
  }, [weeklyData]);

  const currentInspectorTransactions = useMemo(() => {
    const rawTxs = inspectingWeekTxs?.transactions ?? allPeriodTransactions;
    return filterWeeklyTransactions(rawTxs, {
      search: txSearchQuery,
      category: txCategoryFilter,
      type: txTypeFilter,
    });
  }, [inspectingWeekTxs, allPeriodTransactions, txSearchQuery, txCategoryFilter, txTypeFilter]);

  // Unique categories for filtering
  const availableCategories = useMemo(() => {
    if (!weeklyData) return [];
    const cats = new Set<string>();
    weeklyData.weeks.forEach((w) => {
      Object.keys(w.categoryTotals).forEach((c) => cats.add(c));
    });
    return Array.from(cats).sort();
  }, [weeklyData]);

  // Chart data: Weekly Bar Chart
  const barChartData = useMemo(() => {
    if (!weeklyData) return { labels: [], datasets: [] };
    return {
      labels: weeklyData.weeks.map((w) => `M${w.weekNum}`),
      datasets: [
        {
          label: 'Realisasi Belanja',
          data: weeklyData.weeks.map((w) => w.total),
          backgroundColor: weeklyData.weeks.map((_, i) => WEEK_COLORS[i % WEEK_COLORS.length]),
          borderColor: weeklyData.weeks.map((_, i) => WEEK_BORDERS[i % WEEK_BORDERS.length]),
          borderWidth: 2,
          borderRadius: 8,
          barThickness: 36,
        },
        {
          label: 'Plafon Anggaran Mingguan',
          data: weeklyData.weeks.map(() => weeklyData.weeklyBudget),
          type: 'line' as const,
          borderColor: 'rgb(16, 185, 129)',
          borderDash: [6, 4],
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
          order: 0,
        },
      ],
    };
  }, [weeklyData]);

  // Chart data: Cumulative Burn Rate Curve
  const cumulativeChartData = useMemo(() => {
    if (!cumulativePacing || cumulativePacing.length === 0) return { labels: [], datasets: [] };
    return {
      labels: cumulativePacing.map((c) => `M${c.weekNum}`),
      datasets: [
        {
          label: 'Akumulasi Realisasi Belanja',
          data: cumulativePacing.map((c) => c.cumulativeActual),
          borderColor: 'rgb(244, 63, 94)',
          backgroundColor: 'rgba(244, 63, 94, 0.12)',
          fill: true,
          tension: 0.3,
          borderWidth: 2.5,
          pointRadius: 5,
          pointBackgroundColor: 'rgb(244, 63, 94)',
        },
        {
          label: 'Lintasan Plafon Kumulatif',
          data: cumulativePacing.map((c) => c.cumulativeBudget),
          borderColor: 'rgb(16, 185, 129)',
          borderDash: [6, 4],
          borderWidth: 2,
          pointRadius: 3,
          fill: false,
        },
      ],
    };
  }, [cumulativePacing]);

  // Chart data: Average Daily Spend Trend
  const trendData = useMemo(() => {
    if (!weeklyData) return { labels: [], datasets: [] };
    return {
      labels: weeklyData.weeks.map((w) => `M${w.weekNum}`),
      datasets: [
        {
          label: 'Rata-rata Belanja Harian',
          data: weeklyData.weeks.map((w) => w.avgDaily),
          borderColor: 'rgb(16, 185, 129)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 5,
          pointBackgroundColor: 'rgb(16, 185, 129)',
        },
      ],
    };
  }, [weeklyData]);

  // Chart data: Category Donut
  const categoryDonutData = useMemo(() => {
    if (!weeklyData) return { labels: [], datasets: [] };
    const catTotals: Record<string, number> = {};
    weeklyData.weeks.forEach((w) => {
      Object.entries(w.categoryTotals).forEach(([cat, amount]) => {
        catTotals[cat] = (catTotals[cat] || 0) + amount;
      });
    });

    const sorted = Object.entries(catTotals).sort(([, a], [, b]) => b - a);
    const top = sorted.slice(0, 8);
    const otherTotal = sorted.slice(8).reduce((s, [, v]) => s + v, 0);

    const labels = top.map(([name]) => name);
    const values = top.map(([, val]) => val);
    if (otherTotal > 0) {
      labels.push('Lainnya');
      values.push(otherTotal);
    }

    const palette = [
      'rgb(16, 185, 129)',
      'rgb(248, 113, 113)',
      'rgb(234, 179, 8)',
      'rgb(59, 130, 246)',
      'rgb(168, 85, 247)',
      'rgb(236, 72, 153)',
      'rgb(20, 184, 166)',
      'rgb(249, 115, 22)',
      'rgb(100, 116, 139)',
    ];

    return {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: palette.slice(0, labels.length),
          borderWidth: 0,
        },
      ],
    };
  }, [weeklyData]);

  // Weekend vs Weekday aggregate stats
  const weekendVsWeekdayTotals = useMemo(() => {
    if (!weeklyData) return { weekday: 0, weekend: 0, weekdayTx: 0, weekendTx: 0 };
    let weekday = 0;
    let weekend = 0;
    let weekdayTx = 0;
    let weekendTx = 0;
    weeklyData.weeks.forEach((w) => {
      weekday += w.weekdaySpend ?? 0;
      weekend += w.weekendSpend ?? 0;
      weekdayTx += w.weekdayCount ?? 0;
      weekendTx += w.weekendCount ?? 0;
    });
    return { weekday, weekend, weekdayTx, weekendTx };
  }, [weeklyData]);

  if (loading && !weeklyData) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 rounded-xl bg-slate-200/60 dark:bg-white/[0.08] animate-pulse" />
        ))}
      </div>
    );
  }

  if (!weeklyData || weeklyData.weeks.length === 0) {
    return (
      <div className="text-center py-16 glass-card">
        <CalendarDays className="w-12 h-12 mx-auto mb-4 text-slate-400 dark:text-white/40" />
        <p className="text-slate-700 dark:text-white/70 font-medium">Belum ada data pengeluaran mingguan untuk periode ini.</p>
        <p className="text-sm text-slate-500 dark:text-white/40 mt-1">Tambahkan transaksi pada periode ini untuk melihat kalkulasi mingguan.</p>
      </div>
    );
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false as const,
    plugins: {
      tooltip: {
        callbacks: {
          label: (ctx: any) => `${ctx.dataset.label}: ${formatIdr(ctx.parsed.y)}`,
        },
      },
      legend: {
        display: true,
        position: 'top' as const,
        labels: { font: { size: 12 }, boxWidth: 12, padding: 12 },
      },
    },
    scales: {
      x: { grid: { display: false } },
      y: {
        beginAtZero: true,
        ticks: {
          callback: (val: any) => {
            if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
            if (val >= 1_000) return `${(val / 1_000).toFixed(0)}K`;
            return val;
          },
        },
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* Period Selector & Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 glass-card p-4">
        <div className="flex items-center gap-3">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Siklus Periode:
          </label>
          <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
            <SelectTrigger className="w-52 border-slate-300 dark:border-white/10 bg-white dark:bg-slate-800">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((m, idx) => {
                const s = [...summaries].reverse()[idx];
                return (
                  <SelectItem key={s.period_id} value={String(s.period_id)}>
                    {m}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Tab Navigation Controls */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-white/10">
          <button
            onClick={() => setActiveTab('pacing')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'pacing'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Ritme & Pacing
          </button>
          <button
            onClick={() => setActiveTab('safe_spend')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'safe_spend'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Safe-to-Spend
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'transactions'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Audit Transaksi & Weekend
          </button>
        </div>
      </div>

      {/* KPI Headline Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 dark:text-white/50 font-medium">Total Pemasukan</p>
          <p className="text-lg font-bold text-slate-900 dark:text-white">{formatIdr(weeklyData.income)}</p>
          <p className="text-xs text-slate-500 dark:text-white/40 mt-1">{weeklyData.weeks.length} minggu dalam siklus</p>
        </div>

        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 dark:text-white/50 font-medium">Total Realisasi Belanja</p>
          <p className="text-lg font-bold text-slate-900 dark:text-white">{formatIdr(weeklyData.totalSpend)}</p>
          {weeklyData.income > 0 && (
            <p className={`text-xs mt-1 font-medium ${weeklyData.totalSpend <= weeklyData.income ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {weeklyData.totalSpend <= weeklyData.income
                ? `Surplus ${Math.round(((weeklyData.income - weeklyData.totalSpend) / weeklyData.income) * 100)}%`
                : `Defisit ${Math.round(((weeklyData.totalSpend - weeklyData.income) / weeklyData.income) * 100)}%`}
            </p>
          )}
        </div>

        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 dark:text-white/50 font-medium">Plafon Mingguan Rata-rata</p>
          <p className="text-lg font-bold text-slate-900 dark:text-white">{formatIdr(weeklyData.weeklyBudget)}</p>
          <p className="text-xs text-slate-500 dark:text-white/40 mt-1">Per 7 hari kalender</p>
        </div>

        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 dark:text-white/50 font-medium">Skor Disiplin Pacing</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-lg font-bold text-slate-900 dark:text-white">
              {disciplineScore?.score ?? 0}/100
            </span>
            <Badge
              variant="outline"
              className={`text-xs font-semibold ${
                (disciplineScore?.score ?? 0) >= 80
                  ? 'border-emerald-500 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40'
                  : (disciplineScore?.score ?? 0) >= 60
                  ? 'border-amber-500 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40'
                  : 'border-rose-500 text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40'
              }`}
            >
              {disciplineScore?.tier ?? 'Normal'}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-white/40 mt-1">
            {disciplineScore?.weeksUnderBudgetCount} minggu aman, {disciplineScore?.weeksOverBudgetCount} melebihi
          </p>
        </div>
      </div>

      {/* Actionable Insights Box */}
      {disciplineScore && disciplineScore.insights.length > 0 && (
        <div className="glass-card p-5 border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-950/20">
          <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-900 dark:text-white mb-3">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Temuan Intelijen Ritme Mingguan
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {disciplineScore.insights.map((ins) => (
              <div
                key={ins.id}
                className="p-3 rounded-lg border bg-white dark:bg-slate-800/80 border-slate-200 dark:border-white/10"
              >
                <div className="flex items-center gap-2 mb-1">
                  {ins.severity === 'positive' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                  {ins.severity === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                  {ins.severity === 'critical' && <Flame className="w-4 h-4 text-rose-500" />}
                  {ins.severity === 'info' && <Zap className="w-4 h-4 text-blue-500" />}
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{ins.title}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{ins.detail}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ──────────────── TAB 1: PACING & RHYTHM ──────────────── */}
      {activeTab === 'pacing' && (
        <div className="space-y-6">
          {/* Charts Row: Weekly Actual vs Budget & Cumulative Burn-Rate */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                Realisasi Belanja Mingguan vs Plafon
              </h3>
              <p className="text-xs text-slate-500 dark:text-white/50 mb-4">
                Setiap batang mencerminkan belanja total per minggu. Garis putus-putus hijau adalah plafon rata-rata.
              </p>
              <div style={{ height: 260 }}>
                <Bar data={barChartData as any} options={chartOptions as any} />
              </div>
            </div>

            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                Kurva Burn-Rate Kumulatif vs Lintasan Anggaran
              </h3>
              <p className="text-xs text-slate-500 dark:text-white/50 mb-4">
                Memantau apakah akumulasi pengeluaran Anda mendahului atau tertinggal dari jatah anggaran periodik.
              </p>
              <div style={{ height: 260 }}>
                <Line data={cumulativeChartData as any} options={chartOptions as any} />
              </div>
            </div>
          </div>

          {/* Week Cards with Transaction Quick Inspector Trigger */}
          <div className="glass-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Rincian Kartu Per Minggu
                </h3>
                <p className="text-xs text-slate-500 dark:text-white/50">
                  Klik kartu minggu untuk melihat distribusi kategori, atau buka daftar transaksi lengkap.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setInspectingWeekTxs(null);
                  setActiveTab('transactions');
                }}
                className="text-xs font-medium border-slate-300 dark:border-white/10"
              >
                <ListFilter className="w-3.5 h-3.5 mr-1.5" />
                Semua Transaksi Periode ({weeklyData.totalTxCount})
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {weeklyData.weeks.map((w, idx) => {
                const isOver = w.total > weeklyData.weeklyBudget;
                const pctOfBudget = weeklyData.weeklyBudget > 0
                  ? Math.round((w.total / weeklyData.weeklyBudget) * 100)
                  : 0;
                const budgetBarWidth = Math.min(100, pctOfBudget);
                const weekendRatio = w.total > 0 ? Math.round(((w.weekendSpend ?? 0) / w.total) * 100) : 0;

                return (
                  <div
                    key={w.weekNum}
                    className={`p-4 rounded-xl border transition ${
                      selectedWeek === w.weekNum
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
                        : 'border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full inline-block"
                          style={{ backgroundColor: WEEK_BORDERS[idx % WEEK_BORDERS.length] }}
                        />
                        <span className="text-sm font-bold text-slate-800 dark:text-white">{w.label}</span>
                        <span className="text-xs text-slate-500 dark:text-white/50">({w.txCount} txs)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isOver ? (
                          <Badge variant="destructive" className="text-xs font-semibold">
                            +{pctOfBudget - 100}%
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40">
                            -{100 - pctOfBudget}%
                          </Badge>
                        )}
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{formatIdr(w.total)}</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-700/60 rounded-full my-2">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isOver ? 'bg-rose-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${budgetBarWidth}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-white/60 mb-3">
                      <span>Rata-rata Harian: {formatIdr(w.avgDaily)}</span>
                      <span>Weekend: {weekendRatio}% ({formatIdr(w.weekendSpend ?? 0)})</span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedWeek(selectedWeek === w.weekNum ? null : w.weekNum)}
                        className="text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white h-7 px-2"
                      >
                        {selectedWeek === w.weekNum ? 'Tutup Kategori' : 'Lihat Kategori'}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setInspectingWeekTxs(w);
                          setActiveTab('transactions');
                        }}
                        className="text-xs font-medium h-7 px-2.5 ml-auto text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100"
                      >
                        Audit Transaksi ({w.txCount})
                      </Button>
                    </div>

                    {/* Expanded Category Breakdown */}
                    {selectedWeek === w.weekNum && (
                      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/10 space-y-1.5">
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Distribusi Kategori {w.label}:
                        </p>
                        {Object.entries(w.categoryTotals)
                          .sort(([, a], [, b]) => b - a)
                          .map(([cat, amount]) => {
                            const catPct = w.total > 0 ? (amount / w.total) * 100 : 0;
                            return (
                              <div key={cat} className="flex items-center justify-between text-xs py-0.5">
                                <span className="text-slate-600 dark:text-slate-300">{cat}</span>
                                <div className="flex items-center gap-2">
                                  <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full">
                                    <div
                                      className="h-full rounded-full bg-emerald-500"
                                      style={{ width: `${catPct}%` }}
                                    />
                                  </div>
                                  <span className="font-medium text-slate-800 dark:text-slate-200 w-24 text-right">
                                    {formatIdr(amount)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Average Daily Spend Trend & Category Donut */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="glass-card p-5 lg:col-span-2">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                Tren Laju Belanja Harian Antar Minggu
              </h3>
              <p className="text-xs text-slate-500 dark:text-white/50 mb-3">
                Pergeseran kecepatan pengeluaran harian dari minggu ke minggu.
              </p>
              <div style={{ height: 240 }}>
                <Line data={trendData} options={chartOptions} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-200 dark:border-white/10">
                {weeklyData.weeks.slice(1).map((w, idx) => {
                  const prev = weeklyData.weeks[idx];
                  if (!prev) return null;
                  const diff = w.avgDaily - prev.avgDaily;
                  const diffPct = prev.avgDaily > 0 ? ((diff / prev.avgDaily) * 100).toFixed(0) : '0';
                  return (
                    <div key={w.weekNum} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/5">
                      <p className="text-xs text-slate-500 dark:text-white/40">M{prev.weekNum} ke M{w.weekNum}</p>
                      <div className="flex items-center gap-1.5 mt-1 font-semibold text-xs">
                        {diff >= 0 ? (
                          <span className="text-rose-600 dark:text-rose-400">+{formatIdr(diff)} (+{diffPct}%)</span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400">{formatIdr(diff)} ({diffPct}%)</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                Komposisi Kategori Periode
              </h3>
              <p className="text-xs text-slate-500 dark:text-white/50 mb-4">
                Porsi pengeluaran kategori sepanjang siklus.
              </p>
              <div style={{ height: 240 }}>
                <Doughnut
                  data={categoryDonutData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: false as const,
                    plugins: {
                      legend: {
                        position: 'bottom' as const,
                        labels: { font: { size: 10 }, boxWidth: 10, padding: 8 },
                      },
                      tooltip: {
                        callbacks: {
                          label: (ctx: any) => `${ctx.label}: ${formatIdr(ctx.parsed)}`,
                        },
                      },
                    },
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────── TAB 2: SAFE-TO-SPEND SIMULATOR ──────────────── */}
      {activeTab === 'safe_spend' && safeDailyAllowance && (
        <div className="space-y-6">
          <div className="glass-card p-5">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              Kalkulator Batas Aman Belanja Harian (Safe-to-Spend)
            </h3>
            <p className="text-xs text-slate-500 dark:text-white/60 mb-6">
              Mengukur jatah belanja harian maksimal yang masih aman untuk sisa hari dalam siklus gaji tanpa mengorbankan target tabungan atau investasi Anda.
            </p>

            {/* Slider Controls */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Target Rasio Tabungan / Investasi
                </span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {targetSavingsRate}% ({formatIdr(safeDailyAllowance.targetSavingsAmount)})
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="5"
                value={targetSavingsRate}
                onChange={(e) => setTargetSavingsRate(parseInt(e.target.value, 10))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>0% (Semua Dibelanjakan)</span>
                <span>20% (Rekomendasi Sehat)</span>
                <span>50% (Frugal Maksimal)</span>
              </div>
            </div>

            {/* Output Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800">
                <p className="text-xs text-slate-500 dark:text-white/50">Jatah Harian Aman (Safe Daily)</p>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  {formatIdr(safeDailyAllowance.safeDailyRemaining)}
                  <span className="text-xs text-slate-500 font-normal"> / hari</span>
                </p>
                <p className="text-xs text-slate-500 dark:text-white/40 mt-1">
                  Untuk {safeDailyAllowance.daysRemaining} hari tersisa
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800">
                <p className="text-xs text-slate-500 dark:text-white/50">Sisa Kapasitas Belanja Siklus</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {formatIdr(safeDailyAllowance.remainingSpendingCapacity)}
                </p>
                <p className="text-xs text-slate-500 dark:text-white/40 mt-1">
                  Dari plafon max {formatIdr(safeDailyAllowance.maxAllowableSpend)}
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800">
                <p className="text-xs text-slate-500 dark:text-white/50">Status Kelonggaran Pacing</p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`text-xs font-semibold ${
                      safeDailyAllowance.status === 'abundant'
                        ? 'border-emerald-500 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40'
                        : safeDailyAllowance.status === 'balanced'
                        ? 'border-blue-500 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40'
                        : safeDailyAllowance.status === 'tight'
                        ? 'border-amber-500 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40'
                        : 'border-rose-500 text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40'
                    }`}
                  >
                    {safeDailyAllowance.status === 'abundant' && 'Sangat Longgar'}
                    {safeDailyAllowance.status === 'balanced' && 'Seimbang'}
                    {safeDailyAllowance.status === 'tight' && 'Ketat / Perlu Penghematan'}
                    {safeDailyAllowance.status === 'exhausted' && 'Plafon Habis'}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 dark:text-white/40 mt-1">
                  Rasio: {safeDailyAllowance.paceAdjustmentRatio}x terhadap rata-rata awal
                </p>
              </div>
            </div>

            {/* Projection Scenario Table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Skenario Belanja Harian Sisa</TableHead>
                    <TableHead className="text-right">Biaya / Hari</TableHead>
                    <TableHead className="text-right">Total Belanja Sisa</TableHead>
                    <TableHead className="text-right">Estimasi Belanja Akhir</TableHead>
                    <TableHead className="text-right">Hasil Tabungan Akhir</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { label: 'Sesuai Jatah Aman (Safe Pace)', daily: safeDailyAllowance.safeDailyRemaining },
                    { label: 'Hemat Ketat (-25%)', daily: Math.round(safeDailyAllowance.safeDailyRemaining * 0.75) },
                    { label: 'Ekspansif (+25%)', daily: Math.round(safeDailyAllowance.safeDailyRemaining * 1.25) },
                    { label: 'Tanpa Kontrol (+50%)', daily: Math.round(safeDailyAllowance.safeDailyRemaining * 1.5) },
                  ].map((scen, idx) => {
                    const remSpend = scen.daily * safeDailyAllowance.daysRemaining;
                    const finalSpend = safeDailyAllowance.totalSpend + remSpend;
                    const finalSavings = safeDailyAllowance.income - finalSpend;
                    const savingsRate = safeDailyAllowance.income > 0 ? (finalSavings / safeDailyAllowance.income) * 100 : 0;

                    return (
                      <TableRow key={idx}>
                        <TableCell className="font-medium text-slate-800 dark:text-slate-200">
                          {scen.label}
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatIdr(scen.daily)}</TableCell>
                        <TableCell className="text-right">{formatIdr(remSpend)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatIdr(finalSpend)}</TableCell>
                        <TableCell className="text-right">
                          <span
                            className={`font-bold ${
                              finalSavings >= safeDailyAllowance.targetSavingsAmount
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : finalSavings >= 0
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {formatIdr(finalSavings)} ({savingsRate.toFixed(1)}%)
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────── TAB 3: TRANSACTION & WEEKEND AUDIT ──────────────── */}
      {activeTab === 'transactions' && (
        <div className="space-y-6">
          {/* Weekend vs Weekday Headline Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="glass-card p-4 border-l-4 border-l-blue-500">
              <div className="flex items-center gap-2 mb-1">
                <Coffee className="w-4 h-4 text-blue-500" />
                <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Hari Kerja (Senin - Jumat)
                </h4>
              </div>
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                {formatIdr(weekendVsWeekdayTotals.weekday)}
              </p>
              <p className="text-xs text-slate-500 dark:text-white/50 mt-1">
                {weekendVsWeekdayTotals.weekdayTx} transaksi ({weeklyData.totalSpend > 0 ? Math.round((weekendVsWeekdayTotals.weekday / weeklyData.totalSpend) * 100) : 0}% total belanja)
              </p>
            </div>

            <div className="glass-card p-4 border-l-4 border-l-amber-500">
              <div className="flex items-center gap-2 mb-1">
                <Sun className="w-4 h-4 text-amber-500" />
                <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Akhir Pekan (Sabtu - Minggu)
                </h4>
              </div>
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                {formatIdr(weekendVsWeekdayTotals.weekend)}
              </p>
              <p className="text-xs text-slate-500 dark:text-white/50 mt-1">
                {weekendVsWeekdayTotals.weekendTx} transaksi ({weeklyData.totalSpend > 0 ? Math.round((weekendVsWeekdayTotals.weekend / weeklyData.totalSpend) * 100) : 0}% total belanja)
              </p>
            </div>
          </div>

          {/* Interactive Transactions Table & Filter Bar */}
          <div className="glass-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {inspectingWeekTxs ? `Audit Transaksi: ${inspectingWeekTxs.label}` : 'Audit Seluruh Transaksi Periode'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-white/50">
                  Memverifikasi setiap transaksi pengeluaran berdasarkan waktu dan hari kerja vs akhir pekan.
                </p>
              </div>

              {inspectingWeekTxs && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInspectingWeekTxs(null)}
                  className="text-xs border-slate-300 dark:border-white/10"
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  Lihat Semua Minggu
                </Button>
              )}
            </div>

            {/* Filter Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <Input
                  placeholder="Cari transaksi atau kategori..."
                  value={txSearchQuery}
                  onChange={(e) => setTxSearchQuery(e.target.value)}
                  className="pl-9 text-xs"
                />
              </div>

              <Select value={txCategoryFilter} onValueChange={setTxCategoryFilter}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Semua Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kategori</SelectItem>
                  {availableCategories.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={txTypeFilter}
                onValueChange={(v: 'all' | 'weekend' | 'weekday') => setTxTypeFilter(v)}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Hari Kerja vs Weekend" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Hari</SelectItem>
                  <SelectItem value="weekday">Hanya Hari Kerja (Senin-Jumat)</SelectItem>
                  <SelectItem value="weekend">Hanya Akhir Pekan (Sabtu-Minggu)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Transactions Table */}
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-white/10">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Judul Transaksi</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Tipe Hari</TableHead>
                    <TableHead>Metode</TableHead>
                    <TableHead className="text-right">Nominal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentInspectorTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-xs text-slate-500">
                        Tidak ada transaksi yang sesuai dengan filter pencarian.
                      </TableCell>
                    </TableRow>
                  ) : (
                    currentInspectorTransactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                          {tx.title}
                          {tx.created_time && (
                            <span className="block text-[10px] text-slate-400 font-normal">
                              {new Date(tx.created_time).toLocaleDateString('id-ID', {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[11px] font-medium">
                            {tx.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {tx.isWeekend ? (
                            <Badge className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300/40">
                              Akhir Pekan
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px]">
                              Hari Kerja
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">
                          {tx.type === 'credit_expense' ? 'Kartu Kredit' : 'Tunai / Debit'}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-slate-900 dark:text-white">
                          {formatIdr(tx.amount)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-white/40 mt-2 text-right">
              Menampilkan {currentInspectorTransactions.length} transaksi
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
