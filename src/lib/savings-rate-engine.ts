/**
 * Savings Rate Intelligence Engine
 *
 * Pure domain calculation module for /savings-rate:
 * - Tier classification with dual-theme WCAG AA styling
 * - Invest vs Cash Surplus decomposition
 * - What-If Savings Target & Compound Accumulation Simulator
 * - Milestone progression & deterministic insights (Bahasa Indonesia)
 */

export interface SavingsRatePeriod {
  period_id: number;
  month: string;
  start_date: string;
  end_date: string;
  income: number;
  outcome: number;
  invest: number;
  living_expense: number;
  cash_surplus: number;
  savings: number;
  savings_rate: number;
  invest_rate: number;
  is_positive: boolean;
}

export interface SavingsRateResult {
  periods: SavingsRatePeriod[];
  current: SavingsRatePeriod | null;
  avg_rate: number;
  median_rate: number;
  best_rate: number;
  worst_rate: number;
  best_month: string | null;
  worst_month: string | null;
  positive_count: number;
  negative_count: number;
  total_periods: number;
  consecutive_positive: number;
  longest_positive_streak: number;
  total_saved: number;
  total_invested: number;
  total_cash_surplus: number;
  avg_invest_rate: number;
  trailing3_avg: number;
  trailing6_avg: number;
  trend: 'improving' | 'declining' | 'stable';
}

export type SavingsTierKey =
  | 'critical'
  | 'building'
  | 'fair'
  | 'good'
  | 'excellent'
  | 'fire';

export interface SavingsTier {
  key: SavingsTierKey;
  label: string;
  min: number;
  max: number;
  desc: string;
  barColor: string;
  badgeClass: string;
  textClass: string;
  surfaceClass: string;
}

export const SAVINGS_TIERS: SavingsTier[] = [
  {
    key: 'critical',
    label: 'Defisit',
    min: -Infinity,
    max: 0,
    desc: 'Pengeluaran hidup melampaui pemasukan pada siklus ini.',
    barColor: '#ef4444',
    badgeClass: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/60 dark:text-red-200 dark:border-red-700/50',
    textClass: 'text-red-700 dark:text-red-300',
    surfaceClass: 'border-red-300/70 bg-red-50/70 dark:border-red-500/30 dark:bg-red-950/25',
  },
  {
    key: 'building',
    label: 'Merintis',
    min: 0,
    max: 10,
    desc: 'Mulai menyisihkan surplus, ruang efisiensi masih sangat besar.',
    barColor: '#f97316',
    badgeClass: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/60 dark:text-orange-200 dark:border-orange-700/50',
    textClass: 'text-orange-700 dark:text-orange-300',
    surfaceClass: 'border-orange-300/70 bg-orange-50/70 dark:border-orange-500/30 dark:bg-orange-950/25',
  },
  {
    key: 'fair',
    label: 'Cukup',
    min: 10,
    max: 20,
    desc: 'Di jalur yang benar menuju standar tabungan sehat 20%.',
    barColor: '#f59e0b',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-900/60 dark:text-amber-200 dark:border-amber-700/50',
    textClass: 'text-amber-700 dark:text-amber-300',
    surfaceClass: 'border-amber-300/70 bg-amber-50/70 dark:border-amber-500/30 dark:bg-amber-950/25',
  },
  {
    key: 'good',
    label: 'Sehat',
    min: 20,
    max: 30,
    desc: 'Memenuhi tolok ukur 50/30/20 untuk pertumbuhan aset stabil.',
    barColor: '#22c55e',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/60 dark:text-emerald-200 dark:border-emerald-700/50',
    textClass: 'text-emerald-700 dark:text-emerald-300',
    surfaceClass: 'border-emerald-300/70 bg-emerald-50/70 dark:border-emerald-500/30 dark:bg-emerald-950/25',
  },
  {
    key: 'excellent',
    label: 'Prima',
    min: 30,
    max: 50,
    desc: 'Disiplin tabungan tinggi, mempercepat kemandirian finansial.',
    barColor: '#10b981',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-900/70 dark:text-emerald-200 dark:border-emerald-600/50',
    textClass: 'text-emerald-700 dark:text-emerald-300',
    surfaceClass: 'border-emerald-300/80 bg-emerald-50/80 dark:border-emerald-500/35 dark:bg-emerald-950/30',
  },
  {
    key: 'fire',
    label: 'Siap FIRE',
    min: 50,
    max: Infinity,
    desc: 'Akumulasi kekayaan agresif di zona kebebasan finansial.',
    barColor: '#14b8a6',
    badgeClass: 'bg-teal-100 text-teal-900 border-teal-300 dark:bg-teal-900/70 dark:text-teal-200 dark:border-teal-600/50',
    textClass: 'text-teal-700 dark:text-teal-300',
    surfaceClass: 'border-teal-300/80 bg-teal-50/80 dark:border-teal-500/35 dark:bg-teal-950/30',
  },
];

export function classifySavingsTier(rate: number): SavingsTier {
  if (!Number.isFinite(rate)) return SAVINGS_TIERS[0];
  return (
    SAVINGS_TIERS.find((tier) => rate >= tier.min && rate < tier.max) ??
    SAVINGS_TIERS[0]
  );
}

export interface SavingsMilestone {
  rate: number;
  label: string;
  desc: string;
  achieved: boolean;
}

const MILESTONE_DEFS = [
  { rate: 10, label: '10% Awal', desc: 'Fondasi tabungan rutin mulai terbentuk' },
  { rate: 20, label: 'Klub 20%', desc: 'Tolok ukur standar kesehatan finansial' },
  { rate: 30, label: '30% Tangguh', desc: 'Disiplin efisiensi di atas rata-rata' },
  { rate: 50, label: '50% FIRE', desc: 'Separuh penghasilan menjadi aset produktif' },
  { rate: 70, label: '70% Ultra', desc: 'Akselerasi kebebasan finansial maksimal' },
];

export interface MilestoneProgress {
  milestones: SavingsMilestone[];
  achievedCount: number;
  nextMilestone: SavingsMilestone | null;
  gapFromCurrentPct: number;
  progressToNextPct: number;
}

export function computeMilestoneProgress(
  bestRate: number,
  currentRate: number
): MilestoneProgress {
  const milestones = MILESTONE_DEFS.map((m) => ({
    ...m,
    achieved: bestRate >= m.rate,
  }));
  const achievedCount = milestones.filter((m) => m.achieved).length;
  const nextMilestone =
    milestones.find((m) => currentRate < m.rate) ?? null;

  const gapFromCurrentPct = nextMilestone
    ? Math.max(0, Math.round((nextMilestone.rate - currentRate) * 10) / 10)
    : 0;

  let progressToNextPct = 100;
  if (nextMilestone) {
    progressToNextPct = Math.max(
      0,
      Math.min(100, (currentRate / nextMilestone.rate) * 100)
    );
  }

  return {
    milestones,
    achievedCount,
    nextMilestone,
    gapFromCurrentPct,
    progressToNextPct: Math.round(progressToNextPct * 10) / 10,
  };
}

export interface SavingsDecomposition {
  livingSharePct: number;
  investSharePct: number;
  cashSurplusSharePct: number;
  investOfSavingsPct: number;
  isDeficit: boolean;
}

export function computeSavingsDecomposition(
  period: Pick<SavingsRatePeriod, 'income' | 'living_expense' | 'invest' | 'cash_surplus' | 'savings'>
): SavingsDecomposition {
  if (period.income <= 0) {
    return {
      livingSharePct: 0,
      investSharePct: 0,
      cashSurplusSharePct: 0,
      investOfSavingsPct: 0,
      isDeficit: false,
    };
  }

  const livingSharePct = Math.max(
    0,
    Math.min(100, (period.living_expense / period.income) * 100)
  );
  const investSharePct = Math.max(
    0,
    Math.min(100, (period.invest / period.income) * 100)
  );
  const cashSurplusSharePct = Math.max(
    0,
    Math.min(100, (period.cash_surplus / period.income) * 100)
  );

  const positiveSavings = Math.max(0, period.savings);
  const investOfSavingsPct =
    positiveSavings > 0
      ? Math.min(100, Math.round((period.invest / positiveSavings) * 1000) / 10)
      : 0;

  return {
    livingSharePct: Math.round(livingSharePct * 10) / 10,
    investSharePct: Math.round(investSharePct * 10) / 10,
    cashSurplusSharePct: Math.round(cashSurplusSharePct * 10) / 10,
    investOfSavingsPct,
    isDeficit: period.savings < 0,
  };
}

export interface SavingsSimulationInput {
  baseIncome: number;
  baseLivingExpense: number;
  baseInvest: number;
  targetRatePct: number;
  incomeAdjustPct: number;      // e.g. -20 to +50
  expenseCutPct: number;        // e.g. 0 to 40 (reduces living expense)
  extraInvestMonthly: number;   // additional monthly invest allocation (Rp)
  annualReturnPct: number;      // e.g. 0, 5, 8
}

export interface SavingsSimulationResult {
  baselineRatePct: number;
  baselineMonthlySavings: number;
  simIncome: number;
  simLivingExpense: number;
  simInvest: number;
  simCashSurplus: number;
  simTotalSavings: number;
  simRatePct: number;
  rateDeltaPct: number;
  monthlySavingsDelta: number;
  targetMonthlyAmount: number;
  gapToTargetMonthly: number;   // positive = surplus above target, negative = shortfall
  isTargetMet: boolean;
  requiredExpenseCutPct: number;
  projected12MonthsBaseline: number;
  projected12MonthsSim: number;
  projected36MonthsBaseline: number;
  projected36MonthsSim: number;
}

function projectCompound(monthlyContribution: number, months: number, annualReturnPct: number): number {
  if (months <= 0) return 0;
  const r = annualReturnPct / 100 / 12;
  if (r <= 0) {
    return Math.round(monthlyContribution * months);
  }
  let balance = 0;
  for (let i = 0; i < months; i++) {
    balance = (balance + monthlyContribution) * (1 + r);
  }
  return Math.round(balance);
}

export function simulateSavingsTarget(
  input: SavingsSimulationInput
): SavingsSimulationResult {
  const baseIncome = Math.max(0, input.baseIncome);
  const baseLiving = Math.max(0, input.baseLivingExpense);
  const baseInvest = Math.max(0, input.baseInvest);

  const baselineMonthlySavings = baseIncome - baseLiving;
  const baselineRatePct =
    baseIncome > 0 ? (baselineMonthlySavings / baseIncome) * 100 : 0;

  const simIncome = Math.max(0, Math.round(baseIncome * (1 + input.incomeAdjustPct / 100)));
  const simLivingExpense = Math.max(
    0,
    Math.round(baseLiving * (1 - Math.max(0, Math.min(90, input.expenseCutPct)) / 100))
  );

  // Total savings = simIncome - simLivingExpense (includes both Invest & remaining Cash Surplus)
  const simTotalSavings = simIncome - simLivingExpense;
  const simInvest = baseInvest + Math.max(0, input.extraInvestMonthly);
  const simCashSurplus = simTotalSavings - simInvest;
  const simRatePct =
    simIncome > 0 ? (simTotalSavings / simIncome) * 100 : 0;

  const targetMonthlyAmount = Math.round((simIncome * input.targetRatePct) / 100);
  const gapToTargetMonthly = simTotalSavings - targetMonthlyAmount;
  const isTargetMet = gapToTargetMonthly >= 0;

  let requiredExpenseCutPct = 0;
  if (!isTargetMet && simLivingExpense > 0) {
    const shortfall = Math.abs(gapToTargetMonthly);
    requiredExpenseCutPct = Math.min(
      100,
      Math.round((shortfall / simLivingExpense) * 1000) / 10
    );
  }

  return {
    baselineRatePct: Math.round(baselineRatePct * 100) / 100,
    baselineMonthlySavings: Math.round(baselineMonthlySavings),
    simIncome,
    simLivingExpense,
    simInvest: Math.round(simInvest),
    simCashSurplus: Math.round(simCashSurplus),
    simTotalSavings: Math.round(simTotalSavings),
    simRatePct: Math.round(simRatePct * 100) / 100,
    rateDeltaPct: Math.round((simRatePct - baselineRatePct) * 100) / 100,
    monthlySavingsDelta: Math.round(simTotalSavings - baselineMonthlySavings),
    targetMonthlyAmount,
    gapToTargetMonthly: Math.round(gapToTargetMonthly),
    isTargetMet,
    requiredExpenseCutPct,
    projected12MonthsBaseline: projectCompound(
      baselineMonthlySavings,
      12,
      input.annualReturnPct
    ),
    projected12MonthsSim: projectCompound(
      simTotalSavings,
      12,
      input.annualReturnPct
    ),
    projected36MonthsBaseline: projectCompound(
      baselineMonthlySavings,
      36,
      input.annualReturnPct
    ),
    projected36MonthsSim: projectCompound(
      simTotalSavings,
      36,
      input.annualReturnPct
    ),
  };
}

export interface SavingsInsight {
  id: string;
  tone: 'positive' | 'warning' | 'neutral';
  title: string;
  detail: string;
}

export function generateSavingsInsights(result: SavingsRateResult): SavingsInsight[] {
  const insights: SavingsInsight[] = [];
  if (!result.current || result.total_periods === 0) return insights;

  const current = result.current;
  const decomp = computeSavingsDecomposition(current);

  // 1. Momentum / Trend
  if (result.total_periods >= 3) {
    const diff = Math.round((result.trailing3_avg - result.trailing6_avg) * 10) / 10;
    if (result.trend === 'improving') {
      insights.push({
        id: 'momentum',
        tone: 'positive',
        title: 'Momentum Tabungan Meningkat',
        detail: `Rata-rata 3 siklus terakhir (${result.trailing3_avg.toFixed(1)}%) lebih tinggi +${Math.abs(diff).toFixed(1)} poin dibanding 6 siklus terakhir (${result.trailing6_avg.toFixed(1)}%).`,
      });
    } else if (result.trend === 'declining') {
      insights.push({
        id: 'momentum',
        tone: 'warning',
        title: 'Momentum Perlu Perhatian',
        detail: `Rata-rata 3 siklus terakhir (${result.trailing3_avg.toFixed(1)}%) turun ${Math.abs(diff).toFixed(1)} poin dibanding 6 siklus terakhir (${result.trailing6_avg.toFixed(1)}%).`,
      });
    } else {
      insights.push({
        id: 'momentum',
        tone: 'neutral',
        title: 'Ritme Tabungan Stabil',
        detail: `Rata-rata 3 siklus terakhir (${result.trailing3_avg.toFixed(1)}%) bergerak sejajar dengan tren 6 siklus (${result.trailing6_avg.toFixed(1)}%).`,
      });
    }
  }

  // 2. Invest vs Cash Surplus quality
  if (current.invest > 0) {
    insights.push({
      id: 'invest-share',
      tone: 'positive',
      title: 'Kontribusi Investasi Aktif',
      detail: `Sebesar ${decomp.investOfSavingsPct.toFixed(0)}% dari total tabungan siklus ${current.month} berasal dari alokasi Invest (${current.invest_rate.toFixed(1)}% dari pemasukan).`,
    });
  } else if (current.savings > 0) {
    insights.push({
      id: 'invest-share',
      tone: 'neutral',
      title: 'Surplus Masih Mengendap di Kas',
      detail: `Siklus ${current.month} belum mencatat transaksi kategori Invest. Pertimbangkan memindahkan sebagian surplus kas ke instrumen produktif.`,
    });
  } else {
    insights.push({
      id: 'invest-share',
      tone: 'warning',
      title: 'Siklus Defisit Kas',
      detail: `Pengeluaran hidup pada ${current.month} melampaui pemasukan sehingga tingkat tabungan berada di ${current.savings_rate.toFixed(1)}%.`,
    });
  }

  // 3. Consistency
  const positivePct = Math.round((result.positive_count / result.total_periods) * 100);
  insights.push({
    id: 'consistency',
    tone: positivePct >= 75 ? 'positive' : positivePct >= 50 ? 'neutral' : 'warning',
    title: `Konsistensi Surplus ${positivePct}%`,
    detail: `${result.positive_count} dari ${result.total_periods} siklus tercatat positif. Runtunan saat ini: ${result.consecutive_positive} siklus (rekor terpanjang ${result.longest_positive_streak} siklus).`,
  });

  // 4. Range / Spread
  const spread = Math.round((result.best_rate - result.worst_rate) * 10) / 10;
  insights.push({
    id: 'spread',
    tone: spread > 45 ? 'warning' : 'neutral',
    title: 'Rentang Variasi Siklus',
    detail: `Puncak tertinggi ${result.best_rate.toFixed(1)}% (${result.best_month ?? '-'}) dan terendah ${result.worst_rate.toFixed(1)}% (${result.worst_month ?? '-'}), selisih ${spread.toFixed(1)} poin.`,
  });

  return insights;
}

export function extractPeriodYear(period: Pick<SavingsRatePeriod, 'start_date' | 'month'>): string {
  if (period.start_date && /^\d{4}/.test(period.start_date)) {
    return period.start_date.slice(0, 4);
  }
  const match = period.month.match(/\b(20\d{2})\b/);
  return match ? match[1] : '';
}

export function extractAvailableYears(periods: SavingsRatePeriod[]): string[] {
  const set = new Set<string>();
  for (const p of periods) {
    const y = extractPeriodYear(p);
    if (y) set.add(y);
  }
  return Array.from(set).sort((a, b) => Number(b) - Number(a));
}

export function filterSavingsPeriods(
  periods: SavingsRatePeriod[],
  opts: {
    year?: string;
    tier?: SavingsTierKey | 'all';
    search?: string;
  }
): SavingsRatePeriod[] {
  const q = (opts.search ?? '').trim().toLowerCase();
  return periods.filter((p) => {
    if (opts.year && opts.year !== 'all' && extractPeriodYear(p) !== opts.year) {
      return false;
    }
    if (opts.tier && opts.tier !== 'all') {
      if (classifySavingsTier(p.savings_rate).key !== opts.tier) {
        return false;
      }
    }
    if (q && !p.month.toLowerCase().includes(q)) {
      return false;
    }
    return true;
  });
}
