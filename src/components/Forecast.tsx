import React, { useState, useEffect, useMemo } from 'react';
import { Skeleton } from './ui/skeleton';
import { formatIdr, formatNumber } from '../lib/utils';
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
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Wallet,
  CreditCard,
  Gauge,
  Sliders,
  ShieldAlert,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Clock,
  Zap,
  Info,
} from 'lucide-react';
import {
  calculateSafeDailyAllowance,
  simulateCourseCorrection,
  type MultiModelSummary,
  type SafeDailySpendResult,
  type EomSavingsForecastResult,
  type CategoryBurnResult,
  type ProjectionModelType,
} from '../lib/forecast-engine';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ForecastData {
  month: string;
  period_id: number;
  income: number;
  investTotal: number;
  daysElapsed: number;
  periodLength: number;
  daysRemaining: number;
  totalSpent: number;
  totalUnpaid: number;
  unpaidCount: number;
  dailyAvg: number;
  projectedTotal: number;
  projectionConfidence: 'low' | 'medium' | 'high';
  velocityVsHistory: number;
  targetCeiling: number;
  budgetStatus: Array<{
    category: string;
    color: string;
    spent: number;
    projected: number;
    limit: number;
    spentPct: number;
    projectedPct: number;
    status: 'safe' | 'warning' | 'danger' | 'critical';
    remaining: number;
  }>;
  categoryBurnTimeline?: CategoryBurnResult[];
  multiModel?: MultiModelSummary;
  safeDailyAllowance?: SafeDailySpendResult;
  eomSavings?: EomSavingsForecastResult;
  creditStatus: {
    creditExpenses: number;
    creditPayments: number;
    outstanding: number;
    utilizationPct: number;
    unpaidCredit: number;
    unpaidPayments: number;
  };
  cumulative: Array<{ day: string; amount: number; cumulative: number }>;
  projectedTrajectory: Array<{ day: string; cumulative: number }>;
  recentMonthly: Array<{ month: string; total: number; days: number; daily_avg: number }>;
  velocity: {
    current_avg_daily: number;
    historical_avg_daily: number;
    days_with_spending: number;
    days_tracked: number;
    cumulative_spend: number;
    projected_monthly: number;
    velocity_vs_history: number;
  };
  alerts: Array<{ type: 'info' | 'warning' | 'danger'; message: string }>;
}

interface ApiResponse {
  allMonths: string[];
  forecast: ForecastData | null;
}

type TabType = 'trajectory' | 'allowance' | 'whatif' | 'burn' | 'credit-history';

export default function Forecast() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('trajectory');

  // Interactive Target Ceiling in Safe Daily Allowance tab
  const [customCeiling, setCustomCeiling] = useState<number | null>(null);

  // Interactive What-If Course Correction inputs
  const [discretionaryAdjustment, setDiscretionaryAdjustment] = useState<number>(0); // -50% to +30%
  const [shockExpense, setShockExpense] = useState<number>(0);

  // Selected Model for highlight
  const [selectedModelId, setSelectedModelId] = useState<ProjectionModelType>('regression');

  useEffect(() => {
    fetchForecast('');
  }, []);

  const fetchForecast = async (month: string) => {
    setLoading(true);
    try {
      const params = month ? `?month=${encodeURIComponent(month)}` : '';
      const res = await fetch(`/api/forecast${params}`);
      const json = await res.json();
      setData(json);
      if (!month && json.allMonths?.length > 0) {
        setSelectedMonth(json.allMonths[json.allMonths.length - 1]);
      }
      if (json.forecast?.targetCeiling) {
        setCustomCeiling(json.forecast.targetCeiling);
      }
    } catch (err) {
      console.error('Failed to fetch forecast:', err);
    }
    setLoading(false);
  };

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
    setCustomCeiling(null);
    setDiscretionaryAdjustment(0);
    setShockExpense(0);
    fetchForecast(month);
  };

  const f = data?.forecast;

  // Recalculate dynamic safe daily allowance based on customCeiling
  const dynamicAllowance: SafeDailySpendResult | null = useMemo(() => {
    if (!f) return null;
    const ceiling = customCeiling !== null ? customCeiling : f.targetCeiling;
    return calculateSafeDailyAllowance({
      targetCeiling: ceiling,
      currentSpent: f.totalSpent,
      daysRemaining: f.daysRemaining,
      currentDailyAvg: f.dailyAvg,
    });
  }, [f, customCeiling]);

  // Recalculate interactive What-If course correction
  const courseCorrection = useMemo(() => {
    if (!f) return null;
    return simulateCourseCorrection({
      currentSpent: f.totalSpent,
      daysRemaining: f.daysRemaining,
      currentDailyAvg: f.dailyAvg,
      discretionaryAdjustmentPct: discretionaryAdjustment,
      oneTimeShockAmount: shockExpense,
      income: f.income,
      investTotal: f.investTotal,
    });
  }, [f, discretionaryAdjustment, shockExpense]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
        </div>
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    );
  }

  if (!f) {
    return (
      <div className="p-8 text-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <Wallet className="w-10 h-10 mx-auto text-slate-400 mb-3" />
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
          Belum Ada Data Transaksi
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
          Tambahkan transaksi pada periode ini untuk mengaktifkan mesin proyeksi prediktif.
        </p>
      </div>
    );
  }

  // Trajectory Chart Setup
  const trajectoryLabels = [
    ...f.cumulative.map((d) => d.day.slice(5)),
    ...f.projectedTrajectory.map((d) => d.day.slice(5)),
  ];

  const actualData = [
    ...f.cumulative.map((d) => d.cumulative),
    ...f.projectedTrajectory.map(() => null as unknown as number),
  ];

  const projectedData = [
    ...f.cumulative.slice(-1).map((d) => d.cumulative),
    ...f.projectedTrajectory.map((d) => d.cumulative),
  ];
  if (actualData.length > 0 && projectedData.length > 1) {
    actualData[actualData.length - 1] = projectedData[0];
  }

  const trajectoryChart = {
    labels: trajectoryLabels,
    datasets: [
      {
        label: 'Realisasi Kumulatif',
        data: actualData,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.25,
        pointRadius: 2,
        borderWidth: 2.5,
      },
      {
        label: 'Proyeksi Jalur (Baseline)',
        data: projectedData,
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.05)',
        borderDash: [5, 4],
        fill: true,
        tension: 0.25,
        pointRadius: 1,
        borderWidth: 2,
      },
    ],
  };

  const historicalChart = {
    labels: f.recentMonthly.map((m) => m.month),
    datasets: [
      {
        label: 'Total Realisasi',
        data: f.recentMonthly.map((m) => m.total),
        backgroundColor: f.recentMonthly.map((m) =>
          m.month === f.month ? 'rgba(16, 185, 129, 0.85)' : 'rgba(100, 116, 139, 0.4)'
        ),
        borderRadius: 6,
      },
      {
        label: 'Pace Harian × 30',
        data: f.recentMonthly.map((m) => m.daily_avg * 30),
        backgroundColor: 'rgba(244, 63, 94, 0.35)',
        borderRadius: 6,
      },
    ],
  };

  const creditChartData = {
    labels: ['Pembayaran Kartu', 'Saldo Terutang'],
    datasets: [
      {
        data: [f.creditStatus.creditPayments, f.creditStatus.outstanding],
        backgroundColor: ['rgba(16, 185, 129, 0.8)', 'rgba(239, 68, 68, 0.8)'],
        borderWidth: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { font: { size: 12 }, boxWidth: 12 },
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
          callback: (value: any) => {
            if (value >= 1000000) return `${(value / 1000000).toFixed(1)} jt`;
            if (value >= 1000) return `${(value / 1000).toFixed(0)} rb`;
            return value;
          },
        },
      },
    },
  };

  const confidenceBadgeMap: Record<string, { label: string; bg: string; text: string }> = {
    high: { label: 'Akurasi Tinggi', bg: 'bg-emerald-100 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-400' },
    medium: { label: 'Akurasi Sedang', bg: 'bg-amber-100 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-400' },
    low: { label: 'Awal Periode', bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400' },
  };

  return (
    <div className="space-y-6">
      {/* Top Bar: Selector & Period Progress */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Periode Evaluasi</div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <span>{f.month}</span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-normal">
                Hari ke-{f.daysElapsed} dari {f.periodLength} ({f.daysRemaining} hari sisa)
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">Pilih Periode:</span>
          <Select value={selectedMonth} onValueChange={handleMonthChange}>
            <SelectTrigger className="w-[180px] h-9 text-xs font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {data.allMonths?.map((m) => (
                <SelectItem key={m} value={m} className="text-xs">
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Pengeluaran Saat Ini */}
        <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Realisasi Belanja</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400">
              <Wallet className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {formatIdr(f.totalSpent)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
              <span>Pace: {formatIdr(Math.round(f.dailyAvg))}/hari</span>
              {f.totalUnpaid > 0 && (
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  +{formatIdr(f.totalUnpaid)} komitmen
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Card 2: Proyeksi Akhir Bulan */}
        <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Proyeksi Akhir Bulan</span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${confidenceBadgeMap[f.projectionConfidence]?.bg} ${confidenceBadgeMap[f.projectionConfidence]?.text}`}>
              {confidenceBadgeMap[f.projectionConfidence]?.label}
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {formatIdr(f.projectedTotal)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {f.multiModel ? (
                <span>Rentang: {formatIdr(f.multiModel.coneOfUncertainty.lowerBound)} - {formatIdr(f.multiModel.coneOfUncertainty.upperBound)}</span>
              ) : (
                <span>Sisa {f.daysRemaining} hari kalender</span>
              )}
            </div>
          </div>
        </div>

        {/* Card 3: Batas Belanja Harian Aman */}
        <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Kuota Harian Aman</span>
            {dynamicAllowance && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                dynamicAllowance.feasibility === 'very_easy'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                  : dynamicAllowance.feasibility === 'manageable'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
                  : dynamicAllowance.feasibility === 'tight'
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                  : 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
              }`}>
                {dynamicAllowance.feasibilityLabel}
              </span>
            )}
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {dynamicAllowance ? formatIdr(dynamicAllowance.dailyAllowance) : formatIdr(0)}
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1">/hari</span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {dynamicAllowance && (
                <span>Plafon: {formatIdr(dynamicAllowance.targetCeiling)}</span>
              )}
            </div>
          </div>
        </div>

        {/* Card 4: Proyeksi Net Tabungan & Investasi */}
        <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Proyeksi Tabungan EOM</span>
            <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className={`text-2xl font-bold tracking-tight ${
              (f.eomSavings?.projectedSavings || 0) >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}>
              {f.eomSavings ? formatIdr(f.eomSavings.projectedSavings) : formatIdr(0)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
              <span>Savings Rate: {f.eomSavings?.projectedSavingsRatePct ?? 0}%</span>
              <span className="text-slate-400 dark:text-slate-500">Gaji: {formatIdr(f.income)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Early-Warning Alerts */}
      {f.alerts?.length > 0 && (
        <div className="space-y-2">
          {f.alerts.map((alert, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 px-4 py-3 rounded-xl text-sm border transition-all ${
                alert.type === 'danger'
                  ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300'
                  : alert.type === 'warning'
                  ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300'
                  : 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {alert.type === 'danger' ? (
                  <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                ) : alert.type === 'warning' ? (
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                )}
              </div>
              <div className="text-xs sm:text-sm font-medium leading-relaxed">{alert.message}</div>
            </div>
          ))}
        </div>
      )}

      {/* Segmented Tabs Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('trajectory')}
          className={`pb-3 px-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'trajectory'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Multi-Model & Trajektori
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('allowance')}
          className={`pb-3 px-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'allowance'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Gauge className="w-4 h-4" />
          Simulator Kuota Harian
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('whatif')}
          className={`pb-3 px-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'whatif'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Koreksi Arah (What-If)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('burn')}
          className={`pb-3 px-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'burn'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          Burn-Rate & Kejenuhan Pagu
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('credit-history')}
          className={`pb-3 px-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'credit-history'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Historis & Utilisasi Kartu
        </button>
      </div>

      {/* Tab 1: Multi-Model & Trajektori */}
      {activeTab === 'trajectory' && (
        <div className="space-y-6">
          {/* Chart card */}
          <div className="p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  Kurva Trajektori Belanja Kumulatif
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Perbandingan realisasi pengeluaran berjalan terhadap lintasan proyeksi akhir siklus gaji
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-emerald-500 rounded-full inline-block" /> Realisasi
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-amber-500 border-t border-dashed border-amber-500 inline-block" /> Proyeksi Jalur
                </span>
              </div>
            </div>

            <div className="h-[320px] w-full">
              <Line
                data={trajectoryChart}
                options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    tooltip: {
                      ...chartOptions.plugins.tooltip,
                      mode: 'index' as const,
                      intersect: false,
                    },
                  },
                }}
              />
            </div>
          </div>

          {/* Multi-Model Comparison Table / Grid */}
          {f.multiModel && (
            <div className="p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-500" />
                    Ensembel 5 Model Proyeksi Pengeluaran
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Membandingkan berbagai metode estimasi dari regresi momentum hingga batas konservatif
                  </p>
                </div>
                <div className="text-xs px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  Spread Ketidakpastian: <span className="font-semibold">{formatIdr(f.multiModel.coneOfUncertainty.spread)}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {f.multiModel.models.map((m) => {
                  const isBaseline = m.id === f.multiModel?.baselineModelId;
                  const delta = m.projectedTotal - (f.multiModel?.baselineProjected || 0);
                  return (
                    <div
                      key={m.id}
                      onClick={() => setSelectedModelId(m.id)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        selectedModelId === m.id
                          ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-xs ring-1 ring-emerald-500/20'
                          : 'border-slate-200/80 dark:border-slate-800/80 bg-white/40 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          {m.labelId}
                        </span>
                        {isBaseline && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                            Utama
                          </span>
                        )}
                      </div>
                      <div className="text-lg font-bold text-slate-900 dark:text-white mt-2">
                        {formatIdr(m.projectedTotal)}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                        {m.description}
                      </div>
                      <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px]">
                        <span className="text-slate-400">Deviasi:</span>
                        <span className={`font-semibold ${delta > 0 ? 'text-rose-500' : delta < 0 ? 'text-emerald-500' : 'text-slate-400'}`}>
                          {delta > 0 ? '+' : ''}{delta !== 0 ? formatIdr(delta) : '0'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Simulator Kuota Harian Aman */}
      {activeTab === 'allowance' && (
        <div className="space-y-6">
          <div className="p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md shadow-xs space-y-6">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Gauge className="w-5 h-5 text-emerald-500" />
                Kalkulator Alokasi Belanja Harian Aman (Daily Burn Quota)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Tentukan target plafon belanja yang ingin dicapai bulan ini untuk menghitung batas belanja harian yang realistis selama sisa {f.daysRemaining} hari.
              </p>
            </div>

            {/* Target Ceiling Slider & Input */}
            <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Target Plafon Belanja Periode Ini:
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {formatIdr(customCeiling !== null ? customCeiling : f.targetCeiling)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs px-2 text-slate-500"
                    onClick={() => setCustomCeiling(f.targetCeiling)}
                  >
                    Reset Pagu
                  </Button>
                </div>
              </div>

              <input
                type="range"
                min={Math.round(f.totalSpent * 0.9)}
                max={Math.max(Math.round(f.totalSpent * 1.8), Math.round(f.targetCeiling * 1.5))}
                step={100000}
                value={customCeiling !== null ? customCeiling : f.targetCeiling}
                onChange={(e) => setCustomCeiling(parseInt(e.target.value, 10))}
                className="w-full accent-emerald-500 cursor-pointer"
              />

              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Minimal Belanja: {formatIdr(f.totalSpent)}</span>
                <span>Plafon Historis: {formatIdr(f.targetCeiling)}</span>
                <span>Maksimal: {formatIdr(Math.round(f.targetCeiling * 1.5))}</span>
              </div>
            </div>

            {/* Dynamic Result Card */}
            {dynamicAllowance && (
              <div className={`p-5 rounded-xl border transition-all ${
                dynamicAllowance.feasibility === 'very_easy'
                  ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20'
                  : dynamicAllowance.feasibility === 'manageable'
                  ? 'border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20'
                  : dynamicAllowance.feasibility === 'tight'
                  ? 'border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20'
                  : 'border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Status Kelayakan:
                      </span>
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {dynamicAllowance.feasibilityLabel}
                      </span>
                    </div>
                    <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
                      {formatIdr(dynamicAllowance.dailyAllowance)}
                      <span className="text-sm font-normal text-slate-500 dark:text-slate-400 ml-1.5">
                        per hari selama {f.daysRemaining} hari ke depan
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                      {dynamicAllowance.feasibilityDescription}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-slate-200/50 dark:border-slate-800 text-xs space-y-1.5 min-w-[200px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Pace Saat Ini:</span>
                      <span className="font-semibold">{formatIdr(Math.round(f.dailyAvg))}/hari</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Sisa Anggaran:</span>
                      <span className="font-semibold">
                        {formatIdr(Math.max(0, dynamicAllowance.targetCeiling - f.totalSpent))}
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-1.5 border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500">Ruang Gerak:</span>
                      <span className={`font-bold ${dynamicAllowance.diffVsCurrentDaily >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {dynamicAllowance.diffVsCurrentDaily >= 0 ? '+' : ''}{formatIdr(dynamicAllowance.diffVsCurrentDaily)}/hari
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Koreksi Arah (What-If) */}
      {activeTab === 'whatif' && (
        <div className="space-y-6">
          <div className="p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md shadow-xs space-y-6">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-emerald-500" />
                Simulasi Koreksi Arah Tengah Bulan (Mid-Period What-If)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Uji skenario pengetatan atau pelonggaran belanja harian sisa bulan ini, serta dampak adanya pengeluaran darurat mendadak.
              </p>
            </div>

            {/* Presets */}
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-slate-500 self-center mr-1">Preset Cepat:</span>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8"
                onClick={() => {
                  setDiscretionaryAdjustment(-30);
                  setShockExpense(0);
                }}
              >
                Frugal Rush (-30%)
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8"
                onClick={() => {
                  setDiscretionaryAdjustment(-15);
                  setShockExpense(0);
                }}
              >
                Hemat Moderat (-15%)
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8"
                onClick={() => {
                  setDiscretionaryAdjustment(0);
                  setShockExpense(0);
                }}
              >
                Status Quo (0%)
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8"
                onClick={() => {
                  setDiscretionaryAdjustment(0);
                  setShockExpense(500000);
                }}
              >
                Kejutan Tak Terduga (+500rb)
              </Button>
            </div>

            {/* Control Sliders */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    Penyesuaian Belanja Harian Sisa Hari:
                  </span>
                  <span className={`font-bold px-2 py-0.5 rounded ${
                    discretionaryAdjustment < 0
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                      : discretionaryAdjustment > 0
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                      : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                  }`}>
                    {discretionaryAdjustment > 0 ? '+' : ''}{discretionaryAdjustment}%
                  </span>
                </div>
                <input
                  type="range"
                  min={-50}
                  max={30}
                  step={5}
                  value={discretionaryAdjustment}
                  onChange={(e) => setDiscretionaryAdjustment(parseInt(e.target.value, 10))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>-50% (Hemat Ekstrem)</span>
                  <span>0% (Stabil)</span>
                  <span>+30% (Longgar)</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    Beban / Kejutan Tak Terduga (One-Time):
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {formatIdr(shockExpense)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={3000000}
                  step={100000}
                  value={shockExpense}
                  onChange={(e) => setShockExpense(parseInt(e.target.value, 10))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Rp 0</span>
                  <span>Rp 1.500.000</span>
                  <span>Rp 3.000.000</span>
                </div>
              </div>
            </div>

            {/* Simulation Results Card */}
            {courseCorrection && (
              <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-800/60 space-y-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Dampak Simulasi terhadap Keuangan Akhir Bulan
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center sm:text-left">
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                    <div className="text-[11px] text-slate-500">Proyeksi Pengeluaran Baru</div>
                    <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                      {formatIdr(courseCorrection.adjustedProjectedTotal)}
                    </div>
                    <div className={`text-xs mt-1 font-medium ${
                      courseCorrection.totalDelta <= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}>
                      {courseCorrection.totalDelta <= 0 ? 'Hemat ' : 'Naik +'}
                      {formatIdr(Math.abs(courseCorrection.totalDelta))}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                    <div className="text-[11px] text-slate-500">Proyeksi Tabungan & Investasi EOM</div>
                    <div className={`text-xl font-bold mt-1 ${
                      courseCorrection.adjustedSavings >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}>
                      {formatIdr(courseCorrection.adjustedSavings)}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Savings Rate: <span className="font-semibold">{courseCorrection.adjustedSavingsRatePct}%</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                    <div className="text-[11px] text-slate-500">Ritme Belanja Harian Baru</div>
                    <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                      {formatIdr(courseCorrection.newDailyBurnRate)}
                      <span className="text-xs font-normal text-slate-400">/hari</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Sisa {f.daysRemaining} hari kalender
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Burn-Rate & Kejenuhan Pagu */}
      {activeTab === 'burn' && (
        <div className="space-y-6">
          <div className="p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md shadow-xs space-y-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-500" />
                Burn-Rate Anggaran & Timeline Kejenuhan Kategori
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Pantau kecepatan konsumsi anggaran per kategori serta estimasi hari hingga batas anggaran habis terpakai.
              </p>
            </div>

            {f.categoryBurnTimeline && f.categoryBurnTimeline.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {f.categoryBurnTimeline.map((cat) => (
                  <div
                    key={cat.category}
                    className="p-4 rounded-xl border border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-800/50 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                          {cat.category}
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        cat.status === 'critical'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                          : cat.status === 'danger'
                          ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400'
                          : cat.status === 'warning'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                      }`}>
                        {cat.statusLabel}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, cat.spentPct)}%`,
                          backgroundColor:
                            cat.status === 'critical'
                              ? '#ef4444'
                              : cat.status === 'danger'
                              ? '#f97316'
                              : cat.status === 'warning'
                              ? '#f59e0b'
                              : '#10b981',
                        }}
                      />
                    </div>

                    <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                      <span>Terpakai: {formatIdr(cat.spent)} ({cat.spentPct}%)</span>
                      <span>Pagu: {formatIdr(cat.limit)}</span>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-slate-500">Laju Konsumsi:</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {formatIdr(cat.dailyAvg)}/hari
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Estimasi Habis:</span>
                      <span className={`font-semibold ${
                        cat.isAlreadyExhausted
                          ? 'text-rose-600 dark:text-rose-400'
                          : cat.daysToExhaust !== null && cat.daysToExhaust <= f.daysRemaining
                          ? 'text-orange-600 dark:text-orange-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {cat.isAlreadyExhausted
                          ? 'Sudah Melebihi Batas'
                          : cat.daysToExhaust !== null
                          ? `${cat.daysToExhaust} hari lagi (Hari ke-${cat.projectedExhaustionDay})`
                          : 'Aman hingga akhir periode'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                Belum ada pagu bulanan kategori yang diatur. Atur batas di Pengaturan Kategori.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 5: Historis & Utilisasi Kartu */}
      {activeTab === 'credit-history' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card 1: Credit Utilization */}
          <div className="p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md shadow-xs space-y-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-500" />
                Status Utilisasi Kartu Kredit
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Pelunasan vs sisa saldo berjalan pada siklus saat ini
              </p>
            </div>

            <div className="flex items-center justify-center py-2">
              <div className="w-[180px] h-[180px]">
                <Doughnut
                  data={creditChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: true,
                    cutout: '68%',
                    plugins: {
                      legend: { position: 'bottom' as const, labels: { font: { size: 11 } } },
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

            <div className="space-y-2 text-xs border-t border-slate-100 dark:border-slate-800 pt-3">
              <div className="flex justify-between">
                <span className="text-slate-500">Belanja Kartu (Paid):</span>
                <span className="font-semibold">{formatIdr(f.creditStatus.creditExpenses)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Pelunasan Kartu:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatIdr(f.creditStatus.creditPayments)}
                </span>
              </div>
              <div className="flex justify-between font-bold text-sm pt-1 border-t border-slate-100 dark:border-slate-800">
                <span>Saldo Terutang:</span>
                <span className={f.creditStatus.outstanding > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}>
                  {formatIdr(f.creditStatus.outstanding)}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Historical Monthly Spending */}
          <div className="p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md shadow-xs space-y-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-rose-500" />
                Tren Pengeluaran Historis Bulanan
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Perbandingan total belanja 6 bulan terakhir vs proyeksi normalisasi (Pace × 30)
              </p>
            </div>

            <div className="h-[230px] w-full">
              <Bar
                data={historicalChart}
                options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    legend: { position: 'top' as const, labels: { font: { size: 11 } } },
                  },
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                <span className="text-slate-500 block text-[11px]">Rata-rata Historis/Hari:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {formatIdr(Math.round(f.velocity.historical_avg_daily))}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                <span className="text-slate-500 block text-[11px]">Kecepatan vs Historis:</span>
                <span className={`font-bold ${f.velocityVsHistory > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {f.velocityVsHistory > 0 ? '+' : ''}{Math.round(f.velocityVsHistory)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
