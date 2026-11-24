/**
 * Domain engine for Forecast & Predictive Financial Intelligence Hub (/forecast).
 * Pure mathematical functions for multi-model spending projections,
 * safe daily burn allowances, EOM net savings predictions, category exhaustion timelines,
 * and mid-period course-correction simulations.
 */

export type ProjectionModelType = 'regression' | 'linear_pace' | 'cycle_weighted' | 'conservative' | 'austerity';

export interface ModelProjectionResult {
  id: ProjectionModelType;
  name: string;
  labelId: string;
  description: string;
  projectedTotal: number;
  projectedEomDate: string;
  deltaVsBase: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface CumulativePoint {
  day: string;
  cumulative: number;
}

export interface MultiModelInputs {
  cumulative: CumulativePoint[];
  totalSpent: number;
  daysElapsed: number;
  periodLength: number;
  daysRemaining: number;
  historicalTotalAvg?: number;
  recentMonthlyTotals?: { month: string; total: number; daily_avg: number }[];
}

export interface MultiModelSummary {
  models: ModelProjectionResult[];
  baselineModelId: ProjectionModelType;
  baselineProjected: number;
  coneOfUncertainty: {
    lowerBound: number; // austerity / optimistic
    upperBound: number; // conservative / worst-case
    spread: number;
  };
}

export interface SafeDailySpendOptions {
  targetCeiling: number; // Target total spending for the period
  currentSpent: number;
  daysRemaining: number;
  currentDailyAvg: number;
}

export interface SafeDailySpendResult {
  targetCeiling: number;
  currentSpent: number;
  daysRemaining: number;
  dailyAllowance: number;
  currentDailyAvg: number;
  diffVsCurrentDaily: number;
  pctOfCurrentDaily: number;
  feasibility: 'very_easy' | 'manageable' | 'tight' | 'critical';
  feasibilityLabel: string;
  feasibilityDescription: string;
}

export interface EomSavingsForecastOptions {
  income: number;
  investTotal: number;
  projectedTotalSpending: number;
}

export interface EomSavingsForecastResult {
  income: number;
  investTotal: number;
  projectedOutflow: number;
  projectedLivingExpense: number;
  projectedSavings: number;
  projectedSavingsRatePct: number;
  status: 'excellent' | 'healthy' | 'caution' | 'deficit';
  statusLabel: string;
  statusAdvice: string;
}

export interface CategoryBudgetItem {
  category: string;
  color: string;
  spent: number;
  limit: number;
}

export interface CategoryBurnResult {
  category: string;
  color: string;
  spent: number;
  limit: number;
  remaining: number;
  spentPct: number;
  dailyAvg: number;
  daysToExhaust: number | null; // null if no limit or zero daily spend
  isAlreadyExhausted: boolean;
  projectedExhaustionDay: number | null;
  status: 'safe' | 'warning' | 'danger' | 'critical';
  statusLabel: string;
}

export interface CourseCorrectionOptions {
  currentSpent: number;
  daysRemaining: number;
  currentDailyAvg: number;
  discretionaryAdjustmentPct: number; // e.g. -20 for 20% cut, +15 for 15% increase
  oneTimeShockAmount: number; // e.g. 500,000 for unexpected emergency spend
  income: number;
  investTotal: number;
}

export interface CourseCorrectionResult {
  originalRemainingProjected: number;
  adjustedRemainingProjected: number;
  originalProjectedTotal: number;
  adjustedProjectedTotal: number;
  totalDelta: number;
  newDailyBurnRate: number;
  originalSavings: number;
  adjustedSavings: number;
  adjustedSavingsRatePct: number;
  savingsDelta: number;
  riskShift: 'reduced' | 'neutral' | 'increased';
}

/**
 * 1. Multi-Model Spending Projections
 */
export function calculateMultiModelProjections(inputs: MultiModelInputs): MultiModelSummary {
  const {
    cumulative,
    totalSpent,
    daysElapsed,
    periodLength,
    daysRemaining,
    historicalTotalAvg,
  } = inputs;

  const effPeriodLength = Math.max(1, periodLength);
  const effDaysElapsed = Math.max(0, daysElapsed);
  const effDaysRemaining = Math.max(0, daysRemaining);
  const dailyAvg = effDaysElapsed > 0 ? totalSpent / effDaysElapsed : 0;

  // Model A: Linear Pace (Current Run-Rate)
  const linearProjected = Math.round(dailyAvg * effPeriodLength);

  // Model B: OLS Linear Regression on cumulative spending
  let regressionProjected = linearProjected;
  let regressionConfidence: 'high' | 'medium' | 'low' = 'low';

  if (cumulative && cumulative.length >= 3 && effDaysElapsed >= 3) {
    const n = cumulative.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += cumulative[i].cumulative;
      sumXY += i * cumulative[i].cumulative;
      sumX2 += i * i;
    }

    const denom = n * sumX2 - sumX * sumX;
    if (denom !== 0) {
      const slope = (n * sumXY - sumX * sumY) / denom;
      const intercept = (sumY - slope * sumX) / n;
      const calcVal = intercept + slope * (effPeriodLength - 1);
      regressionProjected = Math.round(Math.max(totalSpent, calcVal));

      const meanY = sumY / n;
      let ssRes = 0;
      let ssTot = 0;
      for (let i = 0; i < n; i++) {
        const pred = intercept + slope * i;
        ssRes += (cumulative[i].cumulative - pred) ** 2;
        ssTot += (cumulative[i].cumulative - meanY) ** 2;
      }
      const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
      if (r2 > 0.85 && effDaysElapsed >= 7) regressionConfidence = 'high';
      else if (r2 > 0.6 && effDaysElapsed >= 5) regressionConfidence = 'medium';
    }
  }

  // Model C: Salary-Cycle Weighted Projection (front-heavy spending decay)
  // In Indonesian salary cycle (21st to 20th), day 1-7 (gajian) typically accounts for ~40% of spend,
  // day 8-20 accounts for ~38%, day 21-30 accounts for ~22%.
  // We model typical cumulative progress fraction:
  let cycleProgressFraction = effDaysElapsed / effPeriodLength;
  if (effDaysElapsed > 0 && effPeriodLength > 0) {
    const rawFrac = effDaysElapsed / effPeriodLength;
    // Front-loaded curve: spending grows faster early in cycle
    cycleProgressFraction = Math.pow(rawFrac, 0.78);
  }
  let cycleWeightedProjected = linearProjected;
  if (cycleProgressFraction > 0.05 && effDaysElapsed >= 3) {
    cycleWeightedProjected = Math.round(totalSpent / cycleProgressFraction);
  }

  // Model D: Conservative / Upper Bound (Pace + 15% volatility cushion or +1.2x daily rate for remaining days)
  const conservativeRemaining = effDaysRemaining * (dailyAvg * 1.25);
  const conservativeProjected = Math.round(totalSpent + conservativeRemaining);

  // Model E: Austerity / Lower Bound (Tight control: 25% spending cut on remaining days)
  const austerityRemaining = effDaysRemaining * (dailyAvg * 0.75);
  const austerityProjected = Math.round(totalSpent + austerityRemaining);

  const models: ModelProjectionResult[] = [
    {
      id: 'regression',
      name: 'Momentum Regresi OLS',
      labelId: 'Regresi Trend',
      description: 'Menangkap akselerasi dan perlambatan belanja berdasarkan kurva historis harian',
      projectedTotal: regressionProjected,
      projectedEomDate: 'Akhir Periode',
      deltaVsBase: 0,
      confidence: regressionConfidence,
    },
    {
      id: 'linear_pace',
      name: 'Pace Harian Konstan',
      labelId: 'Run-Rate Harian',
      description: 'Asumsi laju belanja per hari konstan sama dengan rata-rata yang telah berjalan',
      projectedTotal: linearProjected,
      projectedEomDate: 'Akhir Periode',
      deltaVsBase: linearProjected - regressionProjected,
      confidence: effDaysElapsed >= 5 ? 'medium' : 'low',
    },
    {
      id: 'cycle_weighted',
      name: 'Kurva Siklus Gaji',
      labelId: 'Tertimbang Siklus',
      description: 'Menyesuaikan pola tipikal gajian di awal periode dan penurunan tempo di akhir',
      projectedTotal: cycleWeightedProjected,
      projectedEomDate: 'Akhir Periode',
      deltaVsBase: cycleWeightedProjected - regressionProjected,
      confidence: effDaysElapsed >= 4 ? 'medium' : 'low',
    },
    {
      id: 'conservative',
      name: 'Batas Atas Konservatif',
      labelId: 'Skenario Waspada',
      description: 'Antisipasi lonjakan tak terduga (+25% burn-rate) pada sisa hari aktif',
      projectedTotal: conservativeProjected,
      projectedEomDate: 'Akhir Periode',
      deltaVsBase: conservativeProjected - regressionProjected,
      confidence: 'medium',
    },
    {
      id: 'austerity',
      name: 'Batas Bawah Penghematan',
      labelId: 'Skenario Frugal',
      description: 'Jika laju belanja sisa periode ditekan hemat 25% dari rata-rata harian',
      projectedTotal: austerityProjected,
      projectedEomDate: 'Akhir Periode',
      deltaVsBase: austerityProjected - regressionProjected,
      confidence: 'medium',
    },
  ];

  const lowerBound = Math.min(...models.map((m) => m.projectedTotal));
  const upperBound = Math.max(...models.map((m) => m.projectedTotal));

  return {
    models,
    baselineModelId: 'regression',
    baselineProjected: regressionProjected,
    coneOfUncertainty: {
      lowerBound,
      upperBound,
      spread: Math.max(0, upperBound - lowerBound),
    },
  };
}

/**
 * 2. Safe Daily Burn Allowance
 */
export function calculateSafeDailyAllowance(options: SafeDailySpendOptions): SafeDailySpendResult {
  const { targetCeiling, currentSpent, daysRemaining, currentDailyAvg } = options;

  if (daysRemaining <= 0) {
    return {
      targetCeiling,
      currentSpent,
      daysRemaining: 0,
      dailyAllowance: 0,
      currentDailyAvg,
      diffVsCurrentDaily: 0,
      pctOfCurrentDaily: 100,
      feasibility: currentSpent <= targetCeiling ? 'very_easy' : 'critical',
      feasibilityLabel: currentSpent <= targetCeiling ? 'Target Tercapai' : 'Melebihi Target',
      feasibilityDescription: currentSpent <= targetCeiling
        ? 'Periode telah berakhir dalam batas anggaran.'
        : 'Periode telah berakhir dan belanja melebihi batas target.',
    };
  }

  const remainingBudget = Math.max(0, targetCeiling - currentSpent);
  const dailyAllowance = Math.round(remainingBudget / daysRemaining);
  const diffVsCurrentDaily = dailyAllowance - currentDailyAvg;
  const pctOfCurrentDaily = currentDailyAvg > 0 ? (dailyAllowance / currentDailyAvg) * 100 : 100;

  let feasibility: SafeDailySpendResult['feasibility'] = 'manageable';
  let feasibilityLabel = 'Seimbang';
  let feasibilityDescription = 'Kuota belanja harian sebanding dengan ritme pengeluaran saat ini.';

  if (currentSpent >= targetCeiling) {
    feasibility = 'critical';
    feasibilityLabel = 'Batas Terlampaui';
    feasibilityDescription = 'Total belanja sudah melampaui plafon target. Diperlukan nol belanja tambahan.';
  } else if (dailyAllowance < currentDailyAvg * 0.5) {
    feasibility = 'tight';
    feasibilityLabel = 'Ketat / Hemat Ekstrem';
    feasibilityDescription = 'Harus memangkas pengeluaran lebih dari 50% per hari untuk tetap dalam plafon.';
  } else if (dailyAllowance >= currentDailyAvg * 1.25) {
    feasibility = 'very_easy';
    feasibilityLabel = 'Sangat Longgar';
    feasibilityDescription = 'Sisa anggaran lapang, belanja harian aman dengan ruang gerak leluasa.';
  } else {
    feasibility = 'manageable';
    feasibilityLabel = 'Terkendali';
    feasibilityDescription = 'Jaga pengeluaran pada rata-rata saat ini untuk mencapai target tepat sasaran.';
  }

  return {
    targetCeiling,
    currentSpent,
    daysRemaining,
    dailyAllowance,
    currentDailyAvg,
    diffVsCurrentDaily,
    pctOfCurrentDaily: Math.round(pctOfCurrentDaily),
    feasibility,
    feasibilityLabel,
    feasibilityDescription,
  };
}

/**
 * 3. End-of-Month (EOM) Net Savings & Health Projection
 * Sesuai aturan domain FIN-235: Invest dihitung sebagai saving, bukan expense.
 */
export function calculateEomSavingsForecast(options: EomSavingsForecastOptions): EomSavingsForecastResult {
  const { income, investTotal, projectedTotalSpending } = options;

  const projectedLivingExpense = Math.max(0, projectedTotalSpending - investTotal);
  const projectedSavings = income - projectedLivingExpense;
  const projectedSavingsRatePct = income > 0 ? (projectedSavings / income) * 100 : 0;

  let status: EomSavingsForecastResult['status'] = 'healthy';
  let statusLabel = 'Sehat';
  let statusAdvice = 'Proyeksi arus kas surplus dan tingkat tabungan terjaga dengan baik.';

  if (projectedSavings < 0) {
    status = 'deficit';
    statusLabel = 'Defisit Proyeksi';
    statusAdvice = 'Pengeluaran hidup diproyeksikan melebihi pendapatan. Waspada penarikan kas tabungan.';
  } else if (projectedSavingsRatePct < 15) {
    status = 'caution';
    statusLabel = 'Peringatan Margin Tipis';
    statusAdvice = 'Tingkat tabungan di bawah 15%. Kurangi belanja diskresioner untuk memperkuat bantalan kas.';
  } else if (projectedSavingsRatePct >= 35) {
    status = 'excellent';
    statusLabel = 'Sangat Optimal';
    statusAdvice = 'Laju tabungan dan investasi di atas 35%, akselerasi menuju kebebasan finansial sangat kuat.';
  }

  return {
    income,
    investTotal,
    projectedOutflow: projectedTotalSpending,
    projectedLivingExpense,
    projectedSavings,
    projectedSavingsRatePct: Math.round(projectedSavingsRatePct * 10) / 10,
    status,
    statusLabel,
    statusAdvice,
  };
}

/**
 * 4. Category Budget Burn-Rate & Exhaustion Timeline
 */
export function calculateCategoryBurnTimeline(
  categories: CategoryBudgetItem[],
  daysElapsed: number,
  periodLength: number
): CategoryBurnResult[] {
  const effDays = Math.max(1, daysElapsed);

  return categories.map((cat) => {
    const dailyAvg = cat.spent / effDays;
    const remaining = Math.max(0, cat.limit - cat.spent);
    const spentPct = cat.limit > 0 ? Math.min(200, (cat.spent / cat.limit) * 100) : 0;
    const isAlreadyExhausted = cat.limit > 0 && cat.spent >= cat.limit;

    let daysToExhaust: number | null = null;
    let projectedExhaustionDay: number | null = null;

    if (cat.limit > 0 && !isAlreadyExhausted) {
      if (dailyAvg > 0) {
        daysToExhaust = Math.round((cat.limit - cat.spent) / dailyAvg);
        projectedExhaustionDay = Math.min(periodLength, effDays + daysToExhaust);
      }
    }

    const projectedTotalCat = dailyAvg * periodLength;
    const projectedPct = cat.limit > 0 ? (projectedTotalCat / cat.limit) * 100 : 0;

    let status: CategoryBurnResult['status'] = 'safe';
    let statusLabel = 'Aman';

    if (isAlreadyExhausted) {
      status = 'critical';
      statusLabel = 'Overbudget';
    } else if (projectedPct > 100) {
      status = 'danger';
      statusLabel = 'Akan Jebol';
    } else if (projectedPct > 80 || spentPct > 75) {
      status = 'warning';
      statusLabel = 'Waspada';
    }

    return {
      category: cat.category,
      color: cat.color,
      spent: cat.spent,
      limit: cat.limit,
      remaining,
      spentPct: Math.round(spentPct),
      dailyAvg: Math.round(dailyAvg),
      daysToExhaust,
      isAlreadyExhausted,
      projectedExhaustionDay,
      status,
      statusLabel,
    };
  });
}

/**
 * 5. Mid-Period Course Correction Simulation
 */
export function simulateCourseCorrection(options: CourseCorrectionOptions): CourseCorrectionResult {
  const {
    currentSpent,
    daysRemaining,
    currentDailyAvg,
    discretionaryAdjustmentPct,
    oneTimeShockAmount,
    income,
    investTotal,
  } = options;

  const effDays = Math.max(0, daysRemaining);
  const originalRemainingProjected = Math.round(currentDailyAvg * effDays);
  const originalProjectedTotal = currentSpent + originalRemainingProjected;

  // Apply percentage adjustment to remaining days
  const multiplier = 1 + discretionaryAdjustmentPct / 100;
  const adjustedDailyBurn = Math.max(0, currentDailyAvg * multiplier);
  const adjustedRemainingProjected = Math.round(adjustedDailyBurn * effDays) + Math.max(0, oneTimeShockAmount);
  const adjustedProjectedTotal = currentSpent + adjustedRemainingProjected;
  const totalDelta = adjustedProjectedTotal - originalProjectedTotal;

  // Savings impact
  const origEom = calculateEomSavingsForecast({
    income,
    investTotal,
    projectedTotalSpending: originalProjectedTotal,
  });

  const adjEom = calculateEomSavingsForecast({
    income,
    investTotal,
    projectedTotalSpending: adjustedProjectedTotal,
  });

  let riskShift: CourseCorrectionResult['riskShift'] = 'neutral';
  if (totalDelta < -50000) riskShift = 'reduced';
  else if (totalDelta > 50000) riskShift = 'increased';

  return {
    originalRemainingProjected,
    adjustedRemainingProjected,
    originalProjectedTotal,
    adjustedProjectedTotal,
    totalDelta,
    newDailyBurnRate: Math.round(adjustedDailyBurn),
    originalSavings: origEom.projectedSavings,
    adjustedSavings: adjEom.projectedSavings,
    adjustedSavingsRatePct: adjEom.projectedSavingsRatePct,
    savingsDelta: adjEom.projectedSavings - origEom.projectedSavings,
    riskShift,
  };
}
