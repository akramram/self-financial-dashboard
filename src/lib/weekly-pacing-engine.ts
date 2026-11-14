import type { WeeklyBucket, WeeklySpendingResult, WeeklyTransactionItem } from './db';

export interface CumulativeWeekPacing {
  weekNum: number;
  label: string;
  startDate: string;
  endDate: string;
  weeklySpend: number;
  cumulativeActual: number;
  cumulativeBudget: number;
  variance: number;
  burnRatePct: number;
  paceStatus: 'under_budget' | 'on_track' | 'approaching' | 'exceeded';
}

export interface SafeDailyAllowanceParams {
  income: number;
  totalSpend: number;
  periodStart: string;
  periodEnd: string;
  targetSavingsRatePct?: number;
  asOfDate?: string;
}

export interface SafeDailyAllowanceResult {
  totalDays: number;
  daysElapsed: number;
  daysRemaining: number;
  income: number;
  totalSpend: number;
  targetSavingsRatePct: number;
  targetSavingsAmount: number;
  maxAllowableSpend: number;
  remainingSpendingCapacity: number;
  safeDailyRemaining: number;
  baselineDailyAllowance: number;
  paceAdjustmentRatio: number;
  status: 'abundant' | 'balanced' | 'tight' | 'exhausted';
}

export interface WeeklyDisciplineInsight {
  id: string;
  title: string;
  detail: string;
  severity: 'positive' | 'warning' | 'critical' | 'info';
}

export interface WeeklyDisciplineScore {
  score: number;
  tier: 'Disiplin Prima' | 'Terkendali' | 'Waspada' | 'Kritis';
  weeksUnderBudgetCount: number;
  weeksOverBudgetCount: number;
  kickoffSpikeRatio: number;
  weekendSpendRatio: number;
  insights: WeeklyDisciplineInsight[];
}

export interface WeeklyTransactionFilterOptions {
  search?: string;
  category?: string;
  type?: 'all' | 'weekend' | 'weekday';
}

/**
 * Calculates cumulative burn rate trajectory vs weekly budget allowance
 */
export function calculateCumulativePacing(
  weeks: WeeklyBucket[],
  weeklyBudget: number
): CumulativeWeekPacing[] {
  let runningSpend = 0;
  let runningBudget = 0;

  return weeks.map((w) => {
    runningSpend += w.total;
    runningBudget += weeklyBudget;

    const variance = runningSpend - runningBudget;
    const burnRatePct = runningBudget > 0 ? (runningSpend / runningBudget) * 100 : 0;

    let paceStatus: CumulativeWeekPacing['paceStatus'] = 'on_track';
    if (burnRatePct <= 90) {
      paceStatus = 'under_budget';
    } else if (burnRatePct <= 100) {
      paceStatus = 'on_track';
    } else if (burnRatePct <= 115) {
      paceStatus = 'approaching';
    } else {
      paceStatus = 'exceeded';
    }

    return {
      weekNum: w.weekNum,
      label: w.label,
      startDate: w.startDate,
      endDate: w.endDate,
      weeklySpend: w.total,
      cumulativeActual: runningSpend,
      cumulativeBudget: runningBudget,
      variance,
      burnRatePct: Math.round(burnRatePct * 10) / 10,
      paceStatus,
    };
  });
}

/**
 * Computes safe-to-spend allowance for remaining days in the period
 */
export function calculateSafeDailyAllowance({
  income,
  totalSpend,
  periodStart,
  periodEnd,
  targetSavingsRatePct = 20,
  asOfDate,
}: SafeDailyAllowanceParams): SafeDailyAllowanceResult {
  const sParts = periodStart.split('-').map(Number);
  const eParts = periodEnd.split('-').map(Number);
  const startDate = new Date(sParts[0], sParts[1] - 1, sParts[2]);
  const endDate = new Date(eParts[0], eParts[1] - 1, eParts[2], 23, 59, 59);

  const now = asOfDate ? new Date(asOfDate) : new Date();

  const totalDurationMs = Math.max(1, endDate.getTime() - startDate.getTime());
  const totalDays = Math.max(1, Math.floor(totalDurationMs / 86400000) + 1);

  let daysElapsed = 0;
  if (now > startDate) {
    const elapsedMs = Math.min(endDate.getTime(), now.getTime()) - startDate.getTime();
    daysElapsed = Math.min(totalDays, Math.floor(elapsedMs / 86400000) + 1);
  }

  const daysRemaining = Math.max(0, totalDays - daysElapsed);

  const safeSavingsPct = Math.max(0, Math.min(90, targetSavingsRatePct));
  const targetSavingsAmount = income > 0 ? Math.round(income * (safeSavingsPct / 100)) : 0;
  const maxAllowableSpend = Math.max(0, income - targetSavingsAmount);
  const remainingSpendingCapacity = Math.max(0, maxAllowableSpend - totalSpend);

  const safeDailyRemaining = daysRemaining > 0
    ? Math.round(remainingSpendingCapacity / daysRemaining)
    : 0;

  const baselineDailyAllowance = totalDays > 0
    ? Math.round(maxAllowableSpend / totalDays)
    : 0;

  const paceAdjustmentRatio = baselineDailyAllowance > 0
    ? Math.round((safeDailyRemaining / baselineDailyAllowance) * 100) / 100
    : 1;

  let status: SafeDailyAllowanceResult['status'] = 'balanced';
  if (remainingSpendingCapacity <= 0) {
    status = 'exhausted';
  } else if (paceAdjustmentRatio < 0.7) {
    status = 'tight';
  } else if (paceAdjustmentRatio >= 1.15) {
    status = 'abundant';
  } else {
    status = 'balanced';
  }

  return {
    totalDays,
    daysElapsed,
    daysRemaining,
    income,
    totalSpend,
    targetSavingsRatePct: safeSavingsPct,
    targetSavingsAmount,
    maxAllowableSpend,
    remainingSpendingCapacity,
    safeDailyRemaining,
    baselineDailyAllowance,
    paceAdjustmentRatio,
    status,
  };
}

/**
 * Evaluates weekly pacing discipline, weekend load, and returns score + insights
 */
export function evaluateWeeklyDiscipline(
  data: WeeklySpendingResult
): WeeklyDisciplineScore {
  const { weeks, weeklyBudget, totalSpend } = data;
  if (!weeks || weeks.length === 0) {
    return {
      score: 100,
      tier: 'Disiplin Prima',
      weeksUnderBudgetCount: 0,
      weeksOverBudgetCount: 0,
      kickoffSpikeRatio: 0,
      weekendSpendRatio: 0,
      insights: [
        {
          id: 'no-data',
          title: 'Belum Ada Transaksi Mingguan',
          detail: 'Data periode ini belum memiliki riwayat transaksi mingguan aktif.',
          severity: 'info',
        },
      ],
    };
  }

  let underCount = 0;
  let overCount = 0;
  let totalWeekendSpend = 0;

  weeks.forEach((w) => {
    if (w.total > weeklyBudget) {
      overCount++;
    } else {
      underCount++;
    }
    totalWeekendSpend += w.weekendSpend ?? 0;
  });

  const kickoffSpend = weeks[0]?.total ?? 0;
  const kickoffSpikeRatio = totalSpend > 0 ? kickoffSpend / totalSpend : 0;
  const weekendSpendRatio = totalSpend > 0 ? totalWeekendSpend / totalSpend : 0;

  let score = 100;

  // Penalty for weeks exceeding budget
  const overRatio = overCount / weeks.length;
  score -= Math.round(overRatio * 40);

  // Penalty if kickoff dominates disproportionately (> 50% without justification)
  if (kickoffSpikeRatio > 0.5) {
    score -= 10;
  }

  // Penalty if weekend accounts for extreme portion (> 45% of entire spending)
  if (weekendSpendRatio > 0.45) {
    score -= 10;
  }

  score = Math.max(10, Math.min(100, score));

  let tier: WeeklyDisciplineScore['tier'] = 'Disiplin Prima';
  if (score >= 85) tier = 'Disiplin Prima';
  else if (score >= 70) tier = 'Terkendali';
  else if (score >= 50) tier = 'Waspada';
  else tier = 'Kritis';

  const insights: WeeklyDisciplineInsight[] = [];

  // Kickoff assessment
  if (kickoffSpikeRatio >= 0.4) {
    insights.push({
      id: 'kickoff-spike',
      title: 'Pola Kickoff Spike Terdeteksi',
      detail: `Minggu pertama menyerap ${(kickoffSpikeRatio * 100).toFixed(0)}% total anggaran. Pastikan ini pengeluaran rutin terencana bukan impulsive buy.`,
      severity: kickoffSpikeRatio > 0.6 ? 'warning' : 'info',
    });
  }

  // Weekend vs Weekday analysis
  if (weekendSpendRatio >= 0.35) {
    insights.push({
      id: 'weekend-surge',
      title: 'Peningkatan Pengeluaran Akhir Pekan',
      detail: `${(weekendSpendRatio * 100).toFixed(0)}% dana dibelanjakan pada Sabtu dan Minggu. Evaluasi pos kuliner atau hiburan santai.`,
      severity: weekendSpendRatio >= 0.45 ? 'warning' : 'info',
    });
  } else if (totalWeekendSpend > 0) {
    insights.push({
      id: 'weekend-controlled',
      title: 'Belanja Akhir Pekan Terkendali',
      detail: `Porsi akhir pekan hanya ${(weekendSpendRatio * 100).toFixed(0)}% dari total pengeluaran mingguan, menandakan ritme pengeluaran stabil.`,
      severity: 'positive',
    });
  }

  // Over budget weeks check
  if (overCount > 0) {
    insights.push({
      id: 'over-budget-alert',
      title: `${overCount} dari ${weeks.length} Minggu Melampaui Plafon`,
      detail: `Terdapat deviasi di atas plafon mingguan. Kurangi belanja diskresioner di sisa minggu berjalan.`,
      severity: overCount >= 2 ? 'critical' : 'warning',
    });
  } else {
    insights.push({
      id: 'all-weeks-in-budget',
      title: 'Seluruh Minggu Sesuai Plafon',
      detail: 'Setiap minggu berada di bawah plafon mingguan rata-rata. Pertahankan laju penghematan ini.',
      severity: 'positive',
    });
  }

  return {
    score,
    tier,
    weeksUnderBudgetCount: underCount,
    weeksOverBudgetCount: overCount,
    kickoffSpikeRatio: Math.round(kickoffSpikeRatio * 100) / 100,
    weekendSpendRatio: Math.round(weekendSpendRatio * 100) / 100,
    insights,
  };
}

/**
 * Filters a list of weekly transactions
 */
export function filterWeeklyTransactions(
  transactions: WeeklyTransactionItem[] | undefined,
  { search = '', category = 'all', type = 'all' }: WeeklyTransactionFilterOptions
): WeeklyTransactionItem[] {
  if (!transactions) return [];

  const q = search.trim().toLowerCase();

  return transactions.filter((tx) => {
    if (q && !tx.title.toLowerCase().includes(q) && !tx.category.toLowerCase().includes(q)) {
      return false;
    }
    if (category !== 'all' && tx.category !== category) {
      return false;
    }
    if (type === 'weekend' && !tx.isWeekend) {
      return false;
    }
    if (type === 'weekday' && tx.isWeekend) {
      return false;
    }
    return true;
  });
}
