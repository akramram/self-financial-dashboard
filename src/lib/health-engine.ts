import type { MonthlySummary, Category, NetworthRecord } from './data';

export interface HealthFactor {
  name: string;
  score: number; // 0-20
  maxScore: number;
  label: string;
  detail: string;
  icon: 'piggy-bank' | 'target' | 'trending-up' | 'wallet' | 'activity';
  targetHint: string;
}

export interface HealthPrescription {
  id: string;
  factor: string;
  potentialGain: number;
  title: string;
  description: string;
  href: string;
  ctaLabel: string;
}

export interface HealthHistoryEntry {
  month: string;
  period_id: number;
  score: number;
  grade: string;
  factors: Record<string, number>;
}

export interface HealthRawContext {
  income: number;
  grossOutcome: number;
  investTotal: number;
  netConsumption: number;
  currentNetworth: number;
  prevNetworth: number | null;
  overBudgetCount: number;
  catsWithBudgetsCount: number;
  savingsRatePct: number;
  stdDev3m: number | null;
  consistencyScore: number;
}

export interface HealthResult {
  overall: number; // 0-100
  grade: string; // A+, A, B, C+, C, D, F
  gradeColor: string;
  factors: HealthFactor[];
  prevFactors: Record<string, number>;
  month: string;
  period_id: number;
  prevScore: number | null;
  trend: 'up' | 'down' | 'stable' | 'new';
  tips: string[];
  prescriptions: HealthPrescription[];
  history: HealthHistoryEntry[];
  allMonthScores: { month: string; period_id: number; score: number }[];
  availableMonths: string[];
  rawContext: HealthRawContext;
  strongestFactor: { name: string; score: number } | null;
  weakestFactor: { name: string; score: number } | null;
  avgLast3Score: number;
}

export interface HealthSimulationInput {
  extraMonthlySavings: number; // IDR extra saved / consumption reduced
  resolvedOverBudgetCount: number; // how many over-budget categories fixed
  targetNwGrowthPct: number | null; // simulated MoM networth growth % (null = baseline)
}

export interface HealthSimulationResult {
  overall: number;
  delta: number;
  grade: string;
  gradeColor: string;
  simulatedSavingsRatePct: number;
  simulatedSpendRatioPct: number;
  factors: Array<{
    name: string;
    baselineScore: number;
    simulatedScore: number;
    delta: number;
  }>;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function gradeForScore(overall: number): { grade: string; gradeColor: string } {
  if (overall >= 90) return { grade: 'A+', gradeColor: 'emerald' };
  if (overall >= 80) return { grade: 'A', gradeColor: 'emerald' };
  if (overall >= 70) return { grade: 'B', gradeColor: 'green' };
  if (overall >= 60) return { grade: 'C+', gradeColor: 'yellow' };
  if (overall >= 50) return { grade: 'C', gradeColor: 'amber' };
  if (overall >= 40) return { grade: 'D', gradeColor: 'orange' };
  return { grade: 'F', gradeColor: 'red' };
}

export function scoreSavingsRate(savingsRate: number): { score: number; detail: string; targetHint: string } {
  let score: number;
  if (savingsRate >= 30) score = 20;
  else if (savingsRate >= 20) score = Math.round(14 + (savingsRate - 20) * 0.6);
  else if (savingsRate >= 10) score = Math.round(8 + (savingsRate - 10) * 0.6);
  else if (savingsRate >= 0) score = Math.round(savingsRate * 0.8);
  else score = 0;

  score = clamp(score, 0, 20);

  const detail =
    savingsRate >= 20
      ? 'Tingkat tabungan sangat sehat'
      : savingsRate >= 10
        ? 'Tabungan cukup baik, masih bisa ditingkatkan'
        : savingsRate >= 0
          ? 'Tingkat tabungan rendah'
          : 'Pengeluaran konsumsi melebihi pemasukan';

  const targetHint =
    savingsRate >= 30
      ? 'Skor maksimal tercapai (>=30% tabungan)'
      : savingsRate >= 20
        ? `Capai 30% untuk +${20 - score} poin maksimal`
        : 'Target minimal 20% tabungan untuk skor 14+';

  return { score, detail, targetHint };
}

export function scoreBudgetAdherence(
  categoryTotals: Record<string, number>,
  catsWithBudgets: Category[]
): {
  score: number;
  overspentCats: string[];
  nearLimitCats: string[];
  label: string;
  detail: string;
  targetHint: string;
} {
  const overspentCats: string[] = [];
  const nearLimitCats: string[] = [];

  if (catsWithBudgets.length === 0) {
    return {
      score: 12,
      overspentCats,
      nearLimitCats,
      label: 'Belum ada batas budget',
      detail: 'Atur batas bulanan kategori untuk pelacakan akurat',
      targetHint: 'Tetapkan target budget kategori di Settings',
    };
  }

  let withinBudget = 0;
  for (const cat of catsWithBudgets) {
    const spent = categoryTotals[cat.name] || 0;
    if (spent <= cat.monthly_limit) {
      withinBudget++;
      if (spent > cat.monthly_limit * 0.8) nearLimitCats.push(cat.name);
    } else {
      overspentCats.push(cat.name);
    }
  }

  const score = clamp(Math.round((withinBudget / catsWithBudgets.length) * 20), 0, 20);
  const label = `${overspentCats.length}/${catsWithBudgets.length} over budget`;
  const detail =
    overspentCats.length > 0
      ? `Melebihi batas: ${overspentCats.join(', ')}`
      : nearLimitCats.length > 0
        ? `Aman, mendekati batas: ${nearLimitCats.join(', ')}`
        : 'Semua kategori sesuai batas anggaran';

  const targetHint =
    overspentCats.length > 0
      ? `Kendalikan ${overspentCats.length} kategori untuk +${20 - score} poin`
      : 'Seluruh budget kategori terjaga maksimal';

  return { score, overspentCats, nearLimitCats, label, detail, targetHint };
}

export function scoreNetworthGrowth(
  currentTotal: number | null,
  prevTotal: number | null
): { score: number; changePct: number | null; detail: string; targetHint: string } {
  if (currentTotal == null) {
    return {
      score: 10,
      changePct: null,
      detail: 'Belum ada catatan networth periode ini',
      targetHint: 'Catat networth bulanan untuk skor akurat',
    };
  }
  if (prevTotal == null) {
    return {
      score: 10,
      changePct: null,
      detail: 'Periode pertama: belum ada pembanding',
      targetHint: 'Catat periode berikutnya untuk tracking pertumbuhan',
    };
  }

  const changePct = prevTotal > 0 ? ((currentTotal - prevTotal) / prevTotal) * 100 : 0;
  let score = 0;
  if (changePct >= 5) score = 20;
  else if (changePct >= 2) score = 16;
  else if (changePct >= 0) score = 12;
  else if (changePct >= -2) score = 8;
  else if (changePct >= -5) score = 4;
  else score = 0;

  score = clamp(score, 0, 20);
  const detail =
    changePct >= 0
      ? `+${changePct.toFixed(1)}% dibanding bulan lalu`
      : `${changePct.toFixed(1)}% dibanding bulan lalu`;

  const targetHint =
    changePct >= 5
      ? 'Pertumbuhan networth >=5% meraih poin penuh'
      : `Pertumbuhan +5% MoM meraih +${20 - score} poin tambahan`;

  return { score, changePct, detail, targetHint };
}

export function scoreSpendingControl(
  income: number,
  netConsumption: number
): { score: number; spendRatioPct: number; label: string; detail: string; targetHint: string } {
  if (income <= 0) {
    return {
      score: 10,
      spendRatioPct: 0,
      label: 'Income belum diatur',
      detail: 'Atur pemasukan bulanan untuk mengukur rasio konsumsi',
      targetHint: 'Tambahkan pemasukan periode di Settings',
    };
  }

  const ratio = netConsumption / income;
  const spendRatioPct = ratio * 100;
  let score: number;
  if (ratio <= 0.5) score = 20;
  else if (ratio <= 0.7) score = 16;
  else if (ratio <= 0.85) score = 12;
  else if (ratio <= 0.95) score = 8;
  else if (ratio <= 1.0) score = 4;
  else score = 0;

  score = clamp(score, 0, 20);
  const label = `${spendRatioPct.toFixed(0)}% dari income`;
  const detail =
    ratio <= 0.7
      ? 'Konsumsi bersih terkendali (investasi dikecualikan)'
      : ratio <= 1.0
        ? 'Konsumsi masih di bawah pemasukan'
        : 'Konsumsi bersih melebihi pemasukan';

  const targetHint =
    ratio <= 0.5
      ? 'Rasio konsumsi <=50% meraih poin penuh'
      : `Turunkan konsumsi <=50% income untuk +${20 - score} poin`;

  return { score, spendRatioPct, label, detail, targetHint };
}

export function scoreConsistency(ratesWindow: number[]): {
  score: number;
  stdDev: number | null;
  detail: string;
  targetHint: string;
} {
  if (ratesWindow.length >= 3) {
    const avg = ratesWindow.reduce((a, b) => a + b, 0) / ratesWindow.length;
    const variance =
      ratesWindow.reduce((sum, r) => sum + Math.pow(r - avg, 2), 0) / ratesWindow.length;
    const stdDev = Math.sqrt(variance);

    let score = 4;
    if (stdDev < 5) score = 20;
    else if (stdDev < 10) score = 16;
    else if (stdDev < 15) score = 12;
    else if (stdDev < 25) score = 8;

    return {
      score: clamp(score, 0, 20),
      stdDev,
      detail: `Volatilitas savings rate ${stdDev.toFixed(1)}% (3 bulan)`,
      targetHint:
        stdDev < 5
          ? 'Stabilitas arus kas sangat konsisten'
          : `Jaga fluktuasi <5% untuk +${20 - score} poin`,
    };
  }

  if (ratesWindow.length === 2) {
    return {
      score: 12,
      stdDev: null,
      detail: '2 bulan tercatat: pola mulai terbentuk',
      targetHint: 'Butuh 3 bulan data untuk kalkulasi variansi penuh',
    };
  }

  return {
    score: 10,
    stdDev: null,
    detail: 'Butuh minimal 3 bulan riwayat',
    targetHint: 'Terus catat transaksi setiap siklus gaji',
  };
}

function computeFactorsForIndex(
  idx: number,
  summaries: MonthlySummary[],
  catsWithBudgets: Category[],
  networth: NetworthRecord[]
): {
  overall: number;
  grade: string;
  gradeColor: string;
  factors: HealthFactor[];
  overspentCats: string[];
  rawContext: HealthRawContext;
} {
  const s = summaries[idx];
  const investTotal = s.invest_total ?? 0;
  const netConsumption = Math.max(0, s.outcome.total - investTotal);
  const savingsRate = s.savings_rate_pct;

  const f1 = scoreSavingsRate(savingsRate);
  const f2 = scoreBudgetAdherence(s.category_totals || {}, catsWithBudgets);

  const nwIdx = networth.findIndex((n) => n.period_id === s.period_id);
  const currentNw = nwIdx >= 0 ? networth[nwIdx] : null;
  const prevNw = nwIdx > 0 ? networth[nwIdx - 1] : null;
  const f3 = scoreNetworthGrowth(currentNw ? currentNw.total : null, prevNw ? prevNw.total : null);

  const f4 = scoreSpendingControl(s.income, netConsumption);

  const windowStart = Math.max(0, idx - 2);
  const ratesWindow = summaries.slice(windowStart, idx + 1).map((x) => x.savings_rate_pct);
  const f5 = scoreConsistency(ratesWindow);

  const factors: HealthFactor[] = [
    {
      name: 'Savings Rate',
      score: f1.score,
      maxScore: 20,
      label: `${savingsRate.toFixed(1)}%`,
      detail: f1.detail,
      icon: 'piggy-bank',
      targetHint: f1.targetHint,
    },
    {
      name: 'Budget Adherence',
      score: f2.score,
      maxScore: 20,
      label: f2.label,
      detail: f2.detail,
      icon: 'target',
      targetHint: f2.targetHint,
    },
    {
      name: 'Networth Growth',
      score: f3.score,
      maxScore: 20,
      label: currentNw ? `IDR ${Math.round(currentNw.total).toLocaleString('id-ID')}` : 'N/A',
      detail: f3.detail,
      icon: 'trending-up',
      targetHint: f3.targetHint,
    },
    {
      name: 'Spending Control',
      score: f4.score,
      maxScore: 20,
      label: f4.label,
      detail: f4.detail,
      icon: 'wallet',
      targetHint: f4.targetHint,
    },
    {
      name: 'Consistency',
      score: f5.score,
      maxScore: 20,
      label: `${f5.score}/20`,
      detail: f5.detail,
      icon: 'activity',
      targetHint: f5.targetHint,
    },
  ];

  const overall = clamp(factors.reduce((sum, f) => sum + f.score, 0), 0, 100);
  const { grade, gradeColor } = gradeForScore(overall);

  const rawContext: HealthRawContext = {
    income: s.income,
    grossOutcome: s.outcome.total,
    investTotal,
    netConsumption,
    currentNetworth: currentNw ? currentNw.total : 0,
    prevNetworth: prevNw ? prevNw.total : null,
    overBudgetCount: f2.overspentCats.length,
    catsWithBudgetsCount: catsWithBudgets.length,
    savingsRatePct: savingsRate,
    stdDev3m: f5.stdDev,
    consistencyScore: f5.score,
  };

  return {
    overall,
    grade,
    gradeColor,
    factors,
    overspentCats: f2.overspentCats,
    rawContext,
  };
}

export function computeHealthSummary(params: {
  summaries: MonthlySummary[];
  categories: Category[];
  networth: NetworthRecord[];
  targetMonth?: string | null;
  targetPeriodId?: number | null;
}): HealthResult | null {
  const { summaries, categories, networth, targetMonth, targetPeriodId } = params;
  if (!summaries || summaries.length === 0) return null;

  const catsWithBudgets = categories.filter((c) => c.monthly_limit > 0);

  let targetIdx = summaries.length - 1;
  if (targetPeriodId != null && !Number.isNaN(targetPeriodId)) {
    const found = summaries.findIndex((s) => s.period_id === targetPeriodId);
    if (found >= 0) targetIdx = found;
  } else if (targetMonth) {
    const found = summaries.findIndex((s) => s.month === targetMonth);
    if (found >= 0) targetIdx = found;
  }

  const allComputed = summaries.map((s, idx) => ({
    month: s.month,
    period_id: s.period_id,
    computed: computeFactorsForIndex(idx, summaries, catsWithBudgets, networth),
  }));

  const target = allComputed[targetIdx];
  const prev = targetIdx > 0 ? allComputed[targetIdx - 1] : null;

  const prevScore = prev ? prev.computed.overall : null;
  let trend: 'up' | 'down' | 'stable' | 'new' = 'new';
  if (prevScore != null) {
    if (target.computed.overall > prevScore + 2) trend = 'up';
    else if (target.computed.overall < prevScore - 2) trend = 'down';
    else trend = 'stable';
  }

  const prevFactors: Record<string, number> = {};
  if (prev) {
    for (const f of prev.computed.factors) {
      prevFactors[f.name] = f.score;
    }
  }

  const tips: string[] = [];
  const prescriptions: HealthPrescription[] = [];
  const { rawContext, overspentCats, factors } = target.computed;

  const savingsFactor = factors.find((f) => f.name === 'Savings Rate')!;
  if (savingsFactor.score < 20) {
    const gain = 20 - savingsFactor.score;
    if (rawContext.savingsRatePct < 0) {
      tips.push('Pengeluaran bersih melebihi pemasukan. Evaluasi pos non-esensial segera.');
    } else if (rawContext.savingsRatePct < 20) {
      tips.push('Tingkatkan rasio tabungan menuju 20-30% dari pemasukan bulanan.');
    }
    prescriptions.push({
      id: 'boost-savings',
      factor: 'Savings Rate',
      potentialGain: gain,
      title: `Naikkan Tabungan Menuju 30% (+${gain} poin)`,
      description:
        rawContext.income > 0
          ? `Saat ini savings rate ${rawContext.savingsRatePct.toFixed(1)}%. Tambah tabungan atau alokasi Invest untuk menutup celah ${gain} poin.`
          : 'Atur nominal pemasukan periode ini agar perhitungan tabungan akurat.',
      href: '/savings-rate',
      ctaLabel: 'Buka Savings Rate',
    });
  }

  const budgetFactor = factors.find((f) => f.name === 'Budget Adherence')!;
  if (catsWithBudgets.length === 0) {
    tips.push('Tetapkan batas bulanan kategori di Settings agar kepatuhan anggaran terukur.');
    prescriptions.push({
      id: 'set-budgets',
      factor: 'Budget Adherence',
      potentialGain: 20 - budgetFactor.score,
      title: `Aktifkan Batas Budget Kategori (+${20 - budgetFactor.score} poin)`,
      description: 'Belum ada kategori dengan monthly limit > 0. Atur target agar skor budget bisa mencapai 20/20.',
      href: '/settings',
      ctaLabel: 'Atur Budget',
    });
  } else if (overspentCats.length > 0) {
    const gain = 20 - budgetFactor.score;
    tips.push(`Tinjau kategori over budget: ${overspentCats.join(', ')}.`);
    prescriptions.push({
      id: 'fix-overbudget',
      factor: 'Budget Adherence',
      potentialGain: gain,
      title: `Kendalikan ${overspentCats.length} Kategori Over Budget (+${gain} poin)`,
      description: `Kategori melewati batas: ${overspentCats.slice(0, 3).join(', ')}. Pantau pace belanja harian di Budget Report.`,
      href: '/budget',
      ctaLabel: 'Cek Budget',
    });
  }

  const spendFactor = factors.find((f) => f.name === 'Spending Control')!;
  if (spendFactor.score < 20 && rawContext.income > 0) {
    const gain = 20 - spendFactor.score;
    prescriptions.push({
      id: 'trim-consumption',
      factor: 'Spending Control',
      potentialGain: gain,
      title: `Tekan Rasio Konsumsi Bersih (+${gain} poin)`,
      description: `Konsumsi bersih (di luar Invest) saat ini ${((rawContext.netConsumption / rawContext.income) * 100).toFixed(0)}% dari income. Target ideal <= 50%.`,
      href: '/transactions',
      ctaLabel: 'Audit Transaksi',
    });
  }

  const nwFactor = factors.find((f) => f.name === 'Networth Growth')!;
  if (nwFactor.score < 20) {
    const gain = 20 - nwFactor.score;
    prescriptions.push({
      id: 'grow-networth',
      factor: 'Networth Growth',
      potentialGain: gain,
      title: `Dorong Pertumbuhan Networth (+${gain} poin)`,
      description: 'Perbarui valuasi aset atau tambah alokasi investasi produktif untuk mendorong kenaikan MoM >= 5%.',
      href: '/networth',
      ctaLabel: 'Update Networth',
    });
  }

  const consistencyFactor = factors.find((f) => f.name === 'Consistency')!;
  if (consistencyFactor.score < 20) {
    const gain = 20 - consistencyFactor.score;
    prescriptions.push({
      id: 'stabilize-cashflow',
      factor: 'Consistency',
      potentialGain: gain,
      title: `Stabilkan Variansi Tabungan (+${gain} poin)`,
      description: 'Hindari lonjakan belanja dadakan dengan menyisihkan pos dana berkala di Sinking Funds.',
      href: '/sinking-funds',
      ctaLabel: 'Kelola Sinking Funds',
    });
  }

  prescriptions.sort((a, b) => b.potentialGain - a.potentialGain);

  const sortedByScore = [...factors].sort((a, b) => b.score - a.score);
  const strongestFactor = sortedByScore[0] ? { name: sortedByScore[0].name, score: sortedByScore[0].score } : null;
  const weakest = sortedByScore[sortedByScore.length - 1];
  const weakestFactor = weakest ? { name: weakest.name, score: weakest.score } : null;

  const history: HealthHistoryEntry[] = allComputed.map((item) => {
    const factorMap: Record<string, number> = {};
    for (const f of item.computed.factors) {
      factorMap[f.name] = f.score;
    }
    return {
      month: item.month,
      period_id: item.period_id,
      score: item.computed.overall,
      grade: item.computed.grade,
      factors: factorMap,
    };
  });

  const last3Slice = history.slice(Math.max(0, targetIdx - 2), targetIdx + 1);
  const avgLast3Score =
    last3Slice.length > 0
      ? Math.round(last3Slice.reduce((sum, h) => sum + h.score, 0) / last3Slice.length)
      : target.computed.overall;

  return {
    overall: target.computed.overall,
    grade: target.computed.grade,
    gradeColor: target.computed.gradeColor,
    factors,
    prevFactors,
    month: target.month,
    period_id: target.period_id,
    prevScore,
    trend,
    tips,
    prescriptions,
    history,
    allMonthScores: history.map((h) => ({ month: h.month, period_id: h.period_id, score: h.score })),
    availableMonths: [...summaries].reverse().map((s) => s.month),
    rawContext,
    strongestFactor,
    weakestFactor,
    avgLast3Score,
  };
}

export function simulateHealthScore(
  ctx: HealthRawContext,
  baselineFactors: HealthFactor[],
  input: HealthSimulationInput
): HealthSimulationResult {
  const simNetConsumption = Math.max(0, ctx.netConsumption - input.extraMonthlySavings);
  const simSavings = ctx.income - simNetConsumption;
  const simSavingsRatePct = ctx.income > 0 ? (simSavings / ctx.income) * 100 : ctx.savingsRatePct;
  const f1 = scoreSavingsRate(simSavingsRatePct).score;

  let f2 = baselineFactors.find((f) => f.name === 'Budget Adherence')?.score ?? 12;
  if (ctx.catsWithBudgetsCount > 0) {
    const remainingOver = Math.max(0, ctx.overBudgetCount - input.resolvedOverBudgetCount);
    const withinCount = ctx.catsWithBudgetsCount - remainingOver;
    f2 = clamp(Math.round((withinCount / ctx.catsWithBudgetsCount) * 20), 0, 20);
  }

  let f3 = baselineFactors.find((f) => f.name === 'Networth Growth')?.score ?? 10;
  if (input.targetNwGrowthPct !== null) {
    const pct = input.targetNwGrowthPct;
    if (pct >= 5) f3 = 20;
    else if (pct >= 2) f3 = 16;
    else if (pct >= 0) f3 = 12;
    else if (pct >= -2) f3 = 8;
    else if (pct >= -5) f3 = 4;
    else f3 = 0;
  }

  const f4Res = scoreSpendingControl(ctx.income, simNetConsumption);
  const f4 = f4Res.score;
  const f5 = ctx.consistencyScore;

  const simMap: Record<string, number> = {
    'Savings Rate': f1,
    'Budget Adherence': f2,
    'Networth Growth': f3,
    'Spending Control': f4,
    Consistency: f5,
  };

  const baselineOverall = baselineFactors.reduce((sum, f) => sum + f.score, 0);
  const factors = baselineFactors.map((f) => {
    const simScore = simMap[f.name] ?? f.score;
    return {
      name: f.name,
      baselineScore: f.score,
      simulatedScore: simScore,
      delta: simScore - f.score,
    };
  });

  const overall = clamp(factors.reduce((sum, f) => sum + f.simulatedScore, 0), 0, 100);
  const { grade, gradeColor } = gradeForScore(overall);

  return {
    overall,
    delta: overall - baselineOverall,
    grade,
    gradeColor,
    simulatedSavingsRatePct: simSavingsRatePct,
    simulatedSpendRatioPct: f4Res.spendRatioPct,
    factors,
  };
}
