import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Skeleton } from './ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatIdr } from '../lib/utils';
import {
  Flame,
  Target,
  Clock,
  TrendingUp,
  PiggyBank,
  Wallet,
  Sliders,
  HelpCircle,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Award,
  Layers,
  Compass,
  Sun,
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

export type FireTierId = 'lean' | 'standard' | 'chubby' | 'fat' | 'barista';

export interface FireTierConfig {
  id: FireTierId;
  name: string;
  badge: string;
  ratio: number;
  description: string;
  icon: string;
  color: string;
}

export const FIRE_TIERS: FireTierConfig[] = [
  {
    id: 'lean',
    name: 'Lean FIRE',
    badge: '75% Biaya Hidup',
    ratio: 0.75,
    description: 'Minimalis & kebutuhan esensial. Pensiun dini dengan gaya hidup hemat.',
    icon: '🌱',
    color: '#06b6d4',
  },
  {
    id: 'standard',
    name: 'Standard FIRE',
    badge: '100% Biaya Hidup',
    ratio: 1.0,
    description: 'Mempertahankan gaya hidup saat ini secara penuh tanpa kompromi.',
    icon: '🔥',
    color: '#10b981',
  },
  {
    id: 'chubby',
    name: 'Chubby FIRE',
    badge: '130% Biaya Hidup',
    ratio: 1.3,
    description: 'Pensiun nyaman dengan anggaran ekstra untuk hobi, travelling, dan rekreasi.',
    icon: '✨',
    color: '#f59e0b',
  },
  {
    id: 'fat',
    name: 'Fat FIRE',
    badge: '175% Biaya Hidup',
    ratio: 1.75,
    description: 'Bebas finansial mewah. Tidak perlu memikirkan batasan anggaran bulanan.',
    icon: '👑',
    color: '#8b5cf6',
  },
  {
    id: 'barista',
    name: 'Barista FIRE',
    badge: '50% Portofolio',
    ratio: 0.5,
    description: 'Portofolio menanggung 50% biaya, sisa 50% dipenuhi kerja paruh waktu atau passion project.',
    icon: '☕',
    color: '#ec4899',
  },
];

export interface FireData {
  monthlyExpenses: number;
  annualExpenses: number;
  monthlyIncome: number;
  monthlySavings: number;
  currentNetworth: number;
  savingsRate: number;
  fireNumber: number;
  progressPct: number;
  yearsToFi: number | null;
  projectedFiDate: string | null;
  monthlyContributionNeeded: number;
  projection: Array<{
    year: number;
    date: string;
    balance: number;
    contributions: number;
    returns: number;
  }>;
  params: {
    withdrawalRate: number;
    expectedReturn: number;
    inflation: number;
  };
}

export default function FireCalculator() {
  const [data, setData] = useState<FireData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Active FIRE tier selection
  const [activeTier, setActiveTier] = useState<FireTierId>('standard');

  // Adjustable parameters
  const [wr, setWr] = useState(4.0); // Safe Withdrawal Rate %
  const [er, setEr] = useState(8.0); // Expected nominal return %
  const [inf, setInf] = useState(3.5); // Inflation %
  const [expenseAdjustPct, setExpenseAdjustPct] = useState(0); // -30% to +30%
  const [extraMonthlySavings, setExtraMonthlySavings] = useState(0); // 0 to 10M IDR

  // Coast FIRE age parameters
  const [currentAge, setCurrentAge] = useState(28);
  const [targetRetirementAge, setTargetRetirementAge] = useState(55);

  // UI state
  const [chartView, setChartView] = useState<'balance' | 'composition'>('balance');
  const [scheduleView, setScheduleView] = useState<'five' | 'all'>('five');
  const [showAssumptionsHelp, setShowAssumptionsHelp] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/fire?wr=${wr}&er=${er}&inf=${inf}`);
      if (!res.ok) {
        const json = await res.json();
        setError(json.error || 'Gagal memuat data kalkulator FIRE');
        return;
      }
      const json = await res.json();
      setData(json);
    } catch {
      setError('Gagal tersambung ke server');
    } finally {
      setLoading(false);
    }
  }, [wr, er, inf]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset assumptions to defaults
  const handleResetDefaults = () => {
    setWr(4.0);
    setEr(8.0);
    setInf(3.5);
    setExpenseAdjustPct(0);
    setExtraMonthlySavings(0);
    setCurrentAge(28);
    setTargetRetirementAge(55);
    setActiveTier('standard');
  };

  // Real-time calculations based on active tier & adjustments
  const calculation = useMemo(() => {
    if (!data) return null;

    const baseMonthlyExpenses = data.monthlyExpenses;
    const adjustedMonthlyExpenses = Math.max(0, baseMonthlyExpenses * (1 + expenseAdjustPct / 100));
    const tierConfig = FIRE_TIERS.find((t) => t.id === activeTier) ?? FIRE_TIERS[1];
    
    // Effective expenses per month & year for active tier
    const tierMonthlyExpenses = adjustedMonthlyExpenses * tierConfig.ratio;
    const tierAnnualExpenses = tierMonthlyExpenses * 12;

    // Active FIRE target number: annual expenses / (wr / 100)
    const withdrawalRateDecimal = Math.max(0.01, wr / 100);
    const activeFireNumber = withdrawalRateDecimal > 0 ? tierAnnualExpenses / withdrawalRateDecimal : 0;

    // Monthly savings under simulation
    const simulatedMonthlySavings = Math.max(
      0,
      data.monthlyIncome - adjustedMonthlyExpenses + extraMonthlySavings
    );
    const simulatedSavingsRate = data.monthlyIncome > 0
      ? (simulatedMonthlySavings / data.monthlyIncome) * 100
      : 0;

    // Networth progress
    const currentNetworth = data.currentNetworth;
    const progressPct = activeFireNumber > 0
      ? Math.min(100, (currentNetworth / activeFireNumber) * 100)
      : 0;
    const isFiReached = currentNetworth >= activeFireNumber;

    // Real return: (1 + expectedReturn) / (1 + inflation) - 1
    const nominalReturnDecimal = er / 100;
    const inflationDecimal = inf / 100;
    const realReturnRate = (1 + nominalReturnDecimal) / (1 + inflationDecimal) - 1;
    const monthlyRate = realReturnRate / 12;

    // Years to FI calculation
    let yearsToFi: number | null = null;
    let projectedDateStr: string | null = null;

    if (isFiReached) {
      yearsToFi = 0;
      projectedDateStr = 'Sekarang: Anda telah mencapai target ini!';
    } else if (simulatedMonthlySavings > 0 && monthlyRate > 0 && activeFireNumber > currentNetworth) {
      const pmt = -simulatedMonthlySavings;
      const pv = -currentNetworth;
      const fv = activeFireNumber;
      const numerator = pmt - fv * monthlyRate;
      const denominator = pmt - pv * monthlyRate;

      if (numerator < 0 && denominator < 0) {
        const months = Math.log(numerator / denominator) / Math.log(1 + monthlyRate);
        yearsToFi = Math.max(0, Math.ceil((months / 12) * 10) / 10);
        
        const targetDate = new Date();
        targetDate.setMonth(targetDate.getMonth() + Math.ceil(months));
        projectedDateStr = targetDate.toLocaleDateString('id-ID', {
          year: 'numeric',
          month: 'long',
        });
      }
    }

    // Coast FIRE calculation
    const yearsToRetire = Math.max(1, targetRetirementAge - currentAge);
    const coastFireNumber = realReturnRate > 0
      ? activeFireNumber / Math.pow(1 + realReturnRate, yearsToRetire)
      : activeFireNumber;
    const coastFireProgressPct = coastFireNumber > 0
      ? Math.min(100, (currentNetworth / coastFireNumber) * 100)
      : 0;
    const isCoastFiReached = currentNetworth >= coastFireNumber;

    // Current safe passive income generated by existing networth
    const annualSafePassiveIncome = currentNetworth * withdrawalRateDecimal;
    const monthlySafePassiveIncome = annualSafePassiveIncome / 12;

    // Milestones definition
    const milestones = [
      {
        id: 'quarter',
        name: 'Quarter FI',
        pct: 25,
        targetAmount: activeFireNumber * 0.25,
        reached: currentNetworth >= activeFireNumber * 0.25,
        description: 'Pondasi awal aman. Mampu menopang 6+ tahun biaya hidup.',
      },
      {
        id: 'halfway',
        name: 'Halfway FI',
        pct: 50,
        targetAmount: activeFireNumber * 0.5,
        reached: currentNetworth >= activeFireNumber * 0.5,
        description: 'Titik akselerasi: keuntungan majemuk mulai menyaingi tabungan tahunan.',
      },
      {
        id: 'three_quarter',
        name: 'Three-Quarter FI',
        pct: 75,
        targetAmount: activeFireNumber * 0.75,
        reached: currentNetworth >= activeFireNumber * 0.75,
        description: 'Home stretch. Bebas memilih pekerjaan (Barista FIRE ready).',
      },
      {
        id: 'full',
        name: 'Full Freedom (100%)',
        pct: 100,
        targetAmount: activeFireNumber,
        reached: currentNetworth >= activeFireNumber,
        description: 'Kebebasan finansial penuh. Mandiri seumur hidup.',
      },
    ];

    // Year-by-year projections simulation
    const maxYears = Math.min(50, Math.max(10, Math.ceil(yearsToFi || 25) + 3));
    let runningBalance = currentNetworth;
    let accumulatedSavings = 0;
    const simulatedProjections: Array<{
      year: number;
      age: number;
      date: string;
      balance: number;
      contributions: number;
      returns: number;
      progressPct: number;
      isFi: boolean;
      milestone: string | null;
    }> = [];

    const now = new Date();

    for (let yr = 0; yr <= maxYears; yr++) {
      let yrSavings = 0;
      let yrReturns = 0;

      if (yr > 0) {
        for (let m = 0; m < 12; m++) {
          runningBalance += simulatedMonthlySavings;
          yrSavings += simulatedMonthlySavings;
          const monthlyReturn = runningBalance * monthlyRate;
          runningBalance += monthlyReturn;
          yrReturns += monthlyReturn;
        }
        accumulatedSavings += yrSavings;
      }

      const projDate = new Date(now);
      projDate.setFullYear(now.getFullYear() + yr);

      const yrProgress = activeFireNumber > 0 ? (runningBalance / activeFireNumber) * 100 : 0;
      let milestoneReached: string | null = null;
      if (yrProgress >= 100) milestoneReached = 'Full FI 🎉';
      else if (yrProgress >= 75) milestoneReached = '75% FI';
      else if (yrProgress >= 50) milestoneReached = '50% FI';
      else if (yrProgress >= 25) milestoneReached = '25% FI';

      simulatedProjections.push({
        year: yr,
        age: currentAge + yr,
        date: yr === 0 ? 'Saat Ini' : projDate.toLocaleDateString('id-ID', { year: 'numeric', month: 'short' }),
        balance: Math.round(runningBalance),
        contributions: Math.round(accumulatedSavings),
        returns: Math.round(Math.max(0, runningBalance - accumulatedSavings - currentNetworth)),
        progressPct: Math.min(100, Math.round(yrProgress * 10) / 10),
        isFi: runningBalance >= activeFireNumber,
        milestone: milestoneReached,
      });

      if (runningBalance >= activeFireNumber && yr >= Math.ceil(yearsToFi || 25)) {
        break;
      }
    }

    return {
      tierConfig,
      adjustedMonthlyExpenses,
      tierMonthlyExpenses,
      tierAnnualExpenses,
      activeFireNumber,
      simulatedMonthlySavings,
      simulatedSavingsRate,
      currentNetworth,
      progressPct,
      isFiReached,
      realReturnRate,
      yearsToFi,
      projectedDateStr,
      coastFireNumber,
      coastFireProgressPct,
      isCoastFiReached,
      annualSafePassiveIncome,
      monthlySafePassiveIncome,
      milestones,
      simulatedProjections,
    };
  }, [
    data,
    activeTier,
    wr,
    er,
    inf,
    expenseAdjustPct,
    extraMonthlySavings,
    currentAge,
    targetRetirementAge,
  ]);

  // Chart data for projections
  const chartData = useMemo(() => {
    if (!calculation) return null;

    const labels = calculation.simulatedProjections.map((p) => p.date);
    const balanceData = calculation.simulatedProjections.map((p) => p.balance);
    const contributionsData = calculation.simulatedProjections.map((p) => p.contributions);
    const returnsData = calculation.simulatedProjections.map((p) => p.returns);
    const fireTargetLine = calculation.simulatedProjections.map(() => Math.round(calculation.activeFireNumber));

    if (chartView === 'balance') {
      return {
        labels,
        datasets: [
          {
            label: 'Proyeksi Saldo Portofolio',
            data: balanceData,
            borderColor: calculation.tierConfig.color,
            backgroundColor: `${calculation.tierConfig.color}22`,
            fill: true,
            tension: 0.35,
            borderWidth: 2.5,
            pointRadius: 3,
            pointHoverRadius: 6,
          },
          {
            label: `Target ${calculation.tierConfig.name}`,
            data: fireTargetLine,
            borderColor: '#ef4444',
            borderDash: [6, 4],
            borderWidth: 2,
            pointRadius: 0,
            fill: false,
          },
        ],
      };
    }

    // Composition stacked bar
    return {
      labels,
      datasets: [
        {
          label: 'Total Tabungan Pokok',
          data: contributionsData,
          backgroundColor: '#3b82f6',
          borderRadius: 4,
        },
        {
          label: 'Keuntungan Bunga Majemuk',
          data: returnsData,
          backgroundColor: '#10b981',
          borderRadius: 4,
        },
      ],
    };
  }, [calculation, chartView]);

  if (loading) {
    return (
      <div className="space-y-6" data-testid="fire-loading-state">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-card p-5 space-y-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-36" />
              <Skeleton className="h-3 w-44" />
            </div>
          ))}
        </div>
        <div className="glass-card p-6 space-y-4">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !data || !calculation) {
    return (
      <div className="glass-card p-6 border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20" data-testid="fire-error-state">
        <h3 className="text-base font-semibold text-red-700 dark:text-red-400 mb-1">
          Gagal Memuat Simulator FIRE
        </h3>
        <p className="text-sm text-red-600 dark:text-red-300 mb-4">{error || 'Data keuangan belum tersedia.'}</p>
        <Button onClick={fetchData} variant="outline" size="sm" className="gap-2">
          <RefreshCw className="w-4 h-4" /> Coba Lagi
        </Button>
      </div>
    );
  }

  const {
    tierConfig,
    adjustedMonthlyExpenses,
    tierMonthlyExpenses,
    activeFireNumber,
    simulatedMonthlySavings,
    simulatedSavingsRate,
    currentNetworth,
    progressPct,
    isFiReached,
    realReturnRate,
    yearsToFi,
    projectedDateStr,
    coastFireNumber,
    coastFireProgressPct,
    isCoastFiReached,
    annualSafePassiveIncome,
    monthlySafePassiveIncome,
    milestones,
    simulatedProjections,
  } = calculation;

  const filteredSchedule = scheduleView === 'five'
    ? simulatedProjections.slice(0, 6)
    : simulatedProjections;

  return (
    <div className="space-y-6" data-testid="fire-intelligence-hub">
      {/* 1. Multi-Tier Strategy Selector */}
      <div className="glass-card p-5" data-testid="fire-tier-selector">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Compass className="w-5 h-5 text-emerald-500" />
              Pilih Strategi & Target FIRE Anda
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pilih skenario kebebasan finansial untuk membandingkan target modal dan proyeksi waktu pencapaian.
            </p>
          </div>
          <Badge variant="outline" className="text-xs font-semibold px-2.5 py-1 shrink-0 self-start sm:self-auto border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
            Aktif: {tierConfig.name}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {FIRE_TIERS.map((tier) => {
            const isSelected = activeTier === tier.id;
            const targetForTier = Math.round(
              (adjustedMonthlyExpenses * tier.ratio * 12) / Math.max(0.01, wr / 100)
            );
            return (
              <button
                key={tier.id}
                type="button"
                data-testid={`fire-tier-card-${tier.id}`}
                onClick={() => setActiveTier(tier.id)}
                className={`text-left p-3.5 rounded-xl border transition-all relative flex flex-col justify-between ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/15 shadow-sm ring-1 ring-emerald-500'
                    : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 bg-background/50 hover:bg-muted/40'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xl">{tier.icon}</span>
                    <Badge
                      variant="secondary"
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                    >
                      {tier.badge}
                    </Badge>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                    {tier.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mb-2 leading-relaxed">
                    {tier.description}
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-200/60 dark:border-white/[0.06]">
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">Target Modal</span>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {formatIdr(targetForTier)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Key Metrics KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="fire-kpi-grid">
        {/* Card 1: FIRE Target */}
        <div className="glass-card p-5 relative overflow-hidden" data-testid="kpi-fire-target">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Target {tierConfig.name}
            </span>
            <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Target className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
            {formatIdr(activeFireNumber)}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Aturan {wr}%: {Math.round(100 / wr)}× pengeluaran tahunan ({formatIdr(tierMonthlyExpenses)}/bln)
          </p>
        </div>

        {/* Card 2: Current Networth & Progress */}
        <div className="glass-card p-5 relative overflow-hidden" data-testid="kpi-networth-progress">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Kekayaan Bersih Saat Ini
            </span>
            <span className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Wallet className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            {formatIdr(currentNetworth)}
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Progres Bebas Finansial</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{progressPct.toFixed(1)}%</span>
            </div>
            <Progress value={progressPct} className="h-2" />
          </div>
        </div>

        {/* Card 3: Time to FI */}
        <div className="glass-card p-5 relative overflow-hidden" data-testid="kpi-time-to-fi">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Estimasi Menuju Bebas
            </span>
            <span className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
            {isFiReached ? (
              <span className="text-emerald-600 dark:text-emerald-400">Tercapai! 🎉</span>
            ) : yearsToFi !== null ? (
              `${yearsToFi} Tahun`
            ) : (
              'Belum Terproyeksi'
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {projectedDateStr || 'Tingkatkan tabungan bulanan untuk menghitung proyeksi'}
          </p>
        </div>

        {/* Card 4: Monthly Savings */}
        <div className="glass-card p-5 relative overflow-hidden" data-testid="kpi-monthly-savings">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Simpanan Bulanan Simpul
            </span>
            <span className="p-2 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <PiggyBank className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
            {formatIdr(simulatedMonthlySavings)}
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 dark:text-slate-400">Tingkat Tabungan:</span>
            <Badge variant="outline" className="text-[11px] font-semibold text-emerald-600 border-emerald-500/30">
              {simulatedSavingsRate.toFixed(1)}%
            </Badge>
          </div>
        </div>

        {/* Card 5: Coast FIRE */}
        <div className="glass-card p-5 relative overflow-hidden" data-testid="kpi-coast-fire">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Target Coast FIRE (Usia {targetRetirementAge})
            </span>
            <span className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Sun className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
            {formatIdr(coastFireNumber)}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span>Status:</span>
            {isCoastFiReached ? (
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Coast FI Tercapai
              </span>
            ) : (
              <span className="font-semibold text-amber-600 dark:text-amber-400">
                Sisa {formatIdr(Math.max(0, coastFireNumber - currentNetworth))}
              </span>
            )}
          </div>
        </div>

        {/* Card 6: Current Passive Capacity */}
        <div className="glass-card p-5 relative overflow-hidden" data-testid="kpi-passive-capacity">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Kapasitas Pasif Aman Saat Ini
            </span>
            <span className="p-2 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <Sparkles className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
            {formatIdr(monthlySafePassiveIncome)}
            <span className="text-xs font-normal text-slate-400 ml-1">/bulan</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Atau {formatIdr(annualSafePassiveIncome)}/tahun jika mulai ditarik hari ini
          </p>
        </div>
      </div>

      {/* 3. Milestone Freedom Pathway */}
      <div className="glass-card p-5" data-testid="fire-milestones-pathway">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              Tangga Menuju Bebas Finansial (Milestone Pathways)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Empat tahapan krusial untuk melacak tonggak pencapaian kemandirian finansial Anda.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {milestones.map((m) => {
            const progress = Math.min(100, Math.round((currentNetworth / m.targetAmount) * 100));
            return (
              <div
                key={m.id}
                data-testid={`milestone-card-${m.id}`}
                className={`p-4 rounded-xl border transition-all ${
                  m.reached
                    ? 'border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-950/20'
                    : 'border-slate-200 dark:border-white/10 bg-background/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {m.name}
                  </span>
                  {m.reached ? (
                    <Badge className="bg-emerald-600 text-white text-[10px] py-0 px-1.5 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Tercapai
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-slate-500 dark:text-slate-400">
                      {progress}%
                    </Badge>
                  )}
                </div>
                <div className="text-base font-bold text-slate-900 dark:text-white mb-1">
                  {formatIdr(m.targetAmount)}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2 leading-relaxed">
                  {m.description}
                </p>
                <Progress value={progress} className="h-1.5" />
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Interactive Simulation & Assumptions Control Center */}
      <div className="glass-card p-5" data-testid="fire-assumptions-panel">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-200/60 dark:border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-slate-700 dark:text-slate-300" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Simulator Asumsi & Percepatan Pensiun
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAssumptionsHelp(!showAssumptionsHelp)}
              className="text-xs h-8 text-slate-600 dark:text-slate-300"
            >
              <HelpCircle className="w-3.5 h-3.5 mr-1" />
              {showAssumptionsHelp ? 'Tutup Bantuan' : 'Panduan Parameter'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetDefaults}
              className="text-xs h-8"
              data-testid="reset-assumptions-btn"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Reset Asumsi
            </Button>
          </div>
        </div>

        {showAssumptionsHelp && (
          <div className="mb-4 p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 text-xs text-slate-600 dark:text-slate-300 space-y-1.5 leading-relaxed">
            <p><strong>Withdrawal Rate (SWR):</strong> Persentase portofolio yang ditarik per tahun saat pensiun. Angka 4% adalah standar baku Trinity Study (25× pengeluaran).</p>
            <p><strong>Ekspektasi Return:</strong> Tingkat keuntungan investasi nominal tahunan (IHSG, reksadana saham/obligasi).</p>
            <p><strong>Ekspektasi Inflasi:</strong> Rata-rata kenaikan harga barang per tahun. Return riil dihitung otomatis sebagai return bersih setelah dikurangi inflasi.</p>
            <p><strong>Coast FIRE:</strong> Kondisi di mana saldo investasi saat ini dibiarkan berkembang dengan bunga majemuk hingga usia pensiun tanpa perlu menambah tabungan lagi.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* SWR */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <Label className="text-slate-700 dark:text-slate-300">Tingkat Penarikan (SWR)</Label>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{wr.toFixed(1)}%</span>
            </div>
            <input
              type="range"
              min={2.5}
              max={6.0}
              step={0.1}
              value={wr}
              onChange={(e) => setWr(parseFloat(e.target.value))}
              className="w-full accent-emerald-600 cursor-pointer"
              data-testid="slider-wr"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>2.5% (Konservatif)</span>
              <span>4.0% (Standar)</span>
              <span>6.0% (Agresif)</span>
            </div>
          </div>

          {/* Expected Return */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <Label className="text-slate-700 dark:text-slate-300">Return Investasi (Nominal)</Label>
              <span className="font-bold text-blue-600 dark:text-blue-400">{er.toFixed(1)}%</span>
            </div>
            <input
              type="range"
              min={4.0}
              max={15.0}
              step={0.5}
              value={er}
              onChange={(e) => setEr(parseFloat(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
              data-testid="slider-er"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>4% (Obligasi/Depo)</span>
              <span>8% (Campuran)</span>
              <span>15% (Saham Agresif)</span>
            </div>
          </div>

          {/* Inflation */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <Label className="text-slate-700 dark:text-slate-300">Asumsi Inflasi Tahunan</Label>
              <span className="font-bold text-amber-600 dark:text-amber-400">{inf.toFixed(1)}%</span>
            </div>
            <input
              type="range"
              min={1.0}
              max={6.0}
              step={0.5}
              value={inf}
              onChange={(e) => setInf(parseFloat(e.target.value))}
              className="w-full accent-amber-600 cursor-pointer"
              data-testid="slider-inf"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>1.0% (Rendah)</span>
              <span>3.5% (Historis BI)</span>
              <span>6.0% (Tinggi)</span>
            </div>
          </div>

          {/* Expense Adjustment */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <Label className="text-slate-700 dark:text-slate-300">Simulasi Pengeluaran Bulanan</Label>
              <span className={`font-bold ${expenseAdjustPct < 0 ? 'text-emerald-600' : expenseAdjustPct > 0 ? 'text-rose-600' : 'text-slate-600 dark:text-slate-300'}`}>
                {expenseAdjustPct > 0 ? `+${expenseAdjustPct}%` : `${expenseAdjustPct}%`} ({formatIdr(adjustedMonthlyExpenses)})
              </span>
            </div>
            <input
              type="range"
              min={-30}
              max={30}
              step={5}
              value={expenseAdjustPct}
              onChange={(e) => setExpenseAdjustPct(parseInt(e.target.value, 10))}
              className="w-full accent-emerald-600 cursor-pointer"
              data-testid="slider-expense-adjust"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>-30% Hemat</span>
              <span>Baseline</span>
              <span>+30% Longgar</span>
            </div>
          </div>

          {/* Extra Monthly Contribution */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <Label className="text-slate-700 dark:text-slate-300">Boost Tabungan Tambahan</Label>
              <span className="font-bold text-teal-600 dark:text-teal-400">+{formatIdr(extraMonthlySavings)}/bln</span>
            </div>
            <input
              type="range"
              min={0}
              max={10000000}
              step={500000}
              value={extraMonthlySavings}
              onChange={(e) => setExtraMonthlySavings(parseInt(e.target.value, 10))}
              className="w-full accent-teal-600 cursor-pointer"
              data-testid="slider-extra-savings"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Rp 0</span>
              <span>+Rp 5 Juta</span>
              <span>+Rp 10 Juta</span>
            </div>
          </div>

          {/* Coast FIRE Age Range */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <Label className="text-slate-700 dark:text-slate-300">Coast FIRE: Usia & Target Pensiun</Label>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">
                {currentAge} thn → {targetRetirementAge} thn ({targetRetirementAge - currentAge} thn lagi)
              </span>
            </div>
            <div className="flex gap-2 items-center">
              <div className="flex-1">
                <input
                  type="range"
                  min={18}
                  max={60}
                  step={1}
                  value={currentAge}
                  onChange={(e) => {
                    const nextAge = parseInt(e.target.value, 10);
                    setCurrentAge(nextAge);
                    if (targetRetirementAge <= nextAge) setTargetRetirementAge(nextAge + 5);
                  }}
                  className="w-full accent-indigo-600 cursor-pointer"
                  data-testid="slider-current-age"
                />
              </div>
              <div className="flex-1">
                <input
                  type="range"
                  min={currentAge + 1}
                  max={70}
                  step={1}
                  value={targetRetirementAge}
                  onChange={(e) => setTargetRetirementAge(parseInt(e.target.value, 10))}
                  className="w-full accent-indigo-600 cursor-pointer"
                  data-testid="slider-target-age"
                />
              </div>
            </div>
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Usia Sekarang</span>
              <span>Usia Target Pensiun</span>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-white/[0.06] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Return Riil (setelah inflasi): <strong>{(realReturnRate * 100).toFixed(2)}%</strong> / tahun</span>
          <span>Pengeluaran Tahunan Efektif: <strong>{formatIdr(adjustedMonthlyExpenses * tierConfig.ratio * 12)}</strong></span>
        </div>
      </div>

      {/* 5. Projection Chart Visualization */}
      <div className="glass-card p-5" data-testid="fire-chart-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              Trajektori Pertumbuhan Portofolio
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Proyeksi saldo dan bunga majemuk dengan laju tabungan simpul saat ini.
            </p>
          </div>
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-white/[0.06] self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setChartView('balance')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                chartView === 'balance'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Saldo vs Target
            </button>
            <button
              type="button"
              onClick={() => setChartView('composition')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                chartView === 'composition'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Tabungan vs Majemuk
            </button>
          </div>
        </div>

        <div className="h-[280px] sm:h-[320px] w-full" data-testid="fire-chart-container">
          {chartData && (
            chartView === 'balance' ? (
              <Line
                data={chartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'top',
                      labels: { boxWidth: 12, font: { size: 11 } },
                    },
                    tooltip: {
                      callbacks: {
                        label: (ctx) => `${ctx.dataset.label}: ${formatIdr(Number(ctx.raw))}`,
                      },
                    },
                  },
                  scales: {
                    x: {
                      grid: { display: false },
                      ticks: { font: { size: 10 } },
                    },
                    y: {
                      grid: { color: fpGrid() },
                      ticks: {
                        callback: (v) => `${(Number(v) / 1000000).toFixed(0)} jt`,
                        font: { size: 10 },
                      },
                    },
                  },
                }}
              />
            ) : (
              <Bar
                data={chartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'top',
                      labels: { boxWidth: 12, font: { size: 11 } },
                    },
                    tooltip: {
                      callbacks: {
                        label: (ctx) => `${ctx.dataset.label}: ${formatIdr(Number(ctx.raw))}`,
                      },
                    },
                  },
                  scales: {
                    x: {
                      stacked: true,
                      grid: { display: false },
                      ticks: { font: { size: 10 } },
                    },
                    y: {
                      stacked: true,
                      grid: { color: fpGrid() },
                      ticks: {
                        callback: (v) => `${(Number(v) / 1000000).toFixed(0)} jt`,
                        font: { size: 10 },
                      },
                    },
                  },
                }}
              />
            )
          )}
        </div>
      </div>

      {/* 6. Detailed Year-by-Year Schedule */}
      <div className="glass-card p-5" data-testid="fire-schedule-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-500" />
              Jadwal Proyeksi Tahunan Menuju Kebebasan
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Rincian akumulasi tabungan pokok dan keuntungan bunga majemuk dari waktu ke waktu.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setScheduleView(scheduleView === 'five' ? 'all' : 'five')}
              className="text-xs h-8"
              data-testid="toggle-schedule-view-btn"
            >
              {scheduleView === 'five' ? 'Tampilkan Semua Tahun' : 'Ringkas 5 Tahun Pertama'}
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40 text-xs">
                <TableHead className="font-bold">Tahun / Periode</TableHead>
                <TableHead className="font-bold">Usia</TableHead>
                <TableHead className="font-bold text-right">Proyeksi Saldo</TableHead>
                <TableHead className="font-bold text-right">Akumulasi Tabungan</TableHead>
                <TableHead className="font-bold text-right">Keuntungan Majemuk</TableHead>
                <TableHead className="font-bold text-right">% Target</TableHead>
                <TableHead className="font-bold text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSchedule.map((row) => (
                <TableRow
                  key={row.year}
                  className={`text-xs ${
                    row.isFi
                      ? 'bg-emerald-500/10 dark:bg-emerald-500/15 font-semibold'
                      : 'hover:bg-muted/30'
                  }`}
                >
                  <TableCell className="font-medium text-slate-900 dark:text-white">
                    {row.year === 0 ? 'Tahun 0 (Sekarang)' : `Tahun ke-${row.year} (${row.date})`}
                  </TableCell>
                  <TableCell className="text-slate-600 dark:text-slate-300">
                    {row.age} thn
                  </TableCell>
                  <TableCell className="text-right font-bold text-slate-900 dark:text-white">
                    {formatIdr(row.balance)}
                  </TableCell>
                  <TableCell className="text-right text-blue-600 dark:text-blue-400">
                    {formatIdr(row.contributions)}
                  </TableCell>
                  <TableCell className="text-right text-emerald-600 dark:text-emerald-400">
                    {formatIdr(row.returns)}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {row.progressPct}%
                  </TableCell>
                  <TableCell className="text-center">
                    {row.milestone ? (
                      <Badge
                        variant="secondary"
                        className={`text-[10px] py-0 px-2 font-bold ${
                          row.isFi
                            ? 'bg-emerald-600 text-white dark:bg-emerald-500'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                        }`}
                      >
                        {row.milestone}
                      </Badge>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* 7. Actionable Strategies */}
      <div className="glass-card p-5 border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/15" data-testid="fire-insights-panel">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
            <Flame className="w-5 h-5" />
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Rekomendasi Strategis Percepatan Mandiri Finansial
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-600 dark:text-slate-300">
              <div className="p-3 rounded-lg bg-background/60 border border-slate-200/60 dark:border-white/10">
                <span className="font-bold text-slate-900 dark:text-white block mb-1">
                  1. Efek Hemat Pengeluaran 10%
                </span>
                Penurunan biaya hidup sebesar 10% ({formatIdr(Math.round(adjustedMonthlyExpenses * 0.1))}/bln) memotong target FIRE Anda hingga {formatIdr(Math.round(activeFireNumber * 0.1))}.
              </div>
              <div className="p-3 rounded-lg bg-background/60 border border-slate-200/60 dark:border-white/10">
                <span className="font-bold text-slate-900 dark:text-white block mb-1">
                  2. Dominasi Bunga Majemuk
                </span>
                Setelah mencapai Halfway FI ({formatIdr(activeFireNumber * 0.5)}), pertumbuhan portofolio dari return investasi akan melampaui setoran tahunan Anda.
              </div>
              <div className="p-3 rounded-lg bg-background/60 border border-slate-200/60 dark:border-white/10">
                <span className="font-bold text-slate-900 dark:text-white block mb-1">
                  3. Coast FIRE Flexibility
                </span>
                Jika Anda menyentuh Coast FI ({formatIdr(coastFireNumber)}), Anda tidak wajib lagi menyisihkan tabungan, cukup bekerja menutup pengeluaran harian.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
