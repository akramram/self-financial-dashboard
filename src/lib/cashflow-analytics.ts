import type { MonthlySummary } from './data';

export type AllocationBucket = 'needs' | 'wants' | 'savings';

export interface Allocation503020Result {
  needsAmount: number;
  wantsAmount: number;
  savingsAmount: number;
  totalIncome: number;
  totalSpent: number;
  needsPct: number;
  wantsPct: number;
  savingsPct: number;
  status: {
    needs: 'good' | 'warning' | 'critical';
    wants: 'good' | 'warning' | 'critical';
    savings: 'good' | 'warning' | 'critical';
  };
  recommendation: string;
}

export interface CashflowPeriodData {
  period_id: number;
  month: string;
  date: string;
  inflow: number;
  outflow: number;
  netFlow: number;
  savingsRatePct: number;
  isSurplus: boolean;
}

export interface CashflowMetrics {
  totalInflow: number;
  totalOutflow: number;
  totalNetAccumulated: number;
  avgMonthlyInflow: number;
  avgMonthlyOutflow: number;
  avgMonthlyNetFlow: number;
  inflowOutflowRatio: number;
  surplusStreak: number;
  periodsCount: number;
  surplusPeriodsCount: number;
  deficitPeriodsCount: number;
}

export function classifyCategory503020(category: string): AllocationBucket {
  const lower = (category || '').toLowerCase().trim();
  if (
    lower.includes('invest') ||
    lower.includes('tabung') ||
    lower.includes('saham') ||
    lower.includes('reksadana') ||
    lower.includes('crypto') ||
    lower.includes('emas') ||
    lower.includes('goal')
  ) {
    return 'savings';
  }

  if (
    lower.includes('belanja') ||
    lower.includes('hiburan') ||
    lower.includes('shopping') ||
    lower.includes('game') ||
    lower.includes('hobi') ||
    lower.includes('cafe') ||
    lower.includes('nonton') ||
    lower.includes('vacation') ||
    lower.includes('liburan')
  ) {
    return 'wants';
  }

  // Default to needs: Tagihan, Rumah, Makanan, Groceries, Transportasi, Istri, Family, Zakat, Peliharaan, Biaya, dll
  return 'needs';
}

export function compute503020Allocation(summary: MonthlySummary | null | undefined): Allocation503020Result {
  if (!summary) {
    return {
      needsAmount: 0,
      wantsAmount: 0,
      savingsAmount: 0,
      totalIncome: 0,
      totalSpent: 0,
      needsPct: 0,
      wantsPct: 0,
      savingsPct: 0,
      status: { needs: 'good', wants: 'good', savings: 'good' },
      recommendation: 'Belum ada data transaksi untuk dianalisis.',
    };
  }

  const income = summary.income || 0;
  const cats = summary.category_totals || {};
  let needsAmount = 0;
  let wantsAmount = 0;
  let investFromSpend = 0;

  for (const [catName, amount] of Object.entries(cats)) {
    const bucket = classifyCategory503020(catName);
    if (bucket === 'savings') {
      investFromSpend += amount;
    } else if (bucket === 'wants') {
      wantsAmount += amount;
    } else {
      needsAmount += amount;
    }
  }

  const totalSpent = summary.outcome?.total ?? (needsAmount + wantsAmount + investFromSpend);
  const remainingSavings = summary.savings ?? (income - (totalSpent - investFromSpend));
  const savingsAmount = investFromSpend + Math.max(0, remainingSavings);

  const needsPct = income > 0 ? Number(((needsAmount / income) * 100).toFixed(1)) : 0;
  const wantsPct = income > 0 ? Number(((wantsAmount / income) * 100).toFixed(1)) : 0;
  const savingsPct = income > 0 ? Number(((savingsAmount / income) * 100).toFixed(1)) : 0;

  const status: Allocation503020Result['status'] = {
    needs: needsPct <= 50 ? 'good' : needsPct <= 65 ? 'warning' : 'critical',
    wants: wantsPct <= 30 ? 'good' : wantsPct <= 40 ? 'warning' : 'critical',
    savings: savingsPct >= 20 ? 'good' : savingsPct >= 10 ? 'warning' : 'critical',
  };

  let recommendation = 'Alokasi cash flow sehat dan seimbang sesuai kaidah 50/30/20.';
  if (wantsPct > 35) {
    recommendation = 'Pengeluaran pos keinginan (wants) cukup tinggi. Pertimbangkan kontrol belanja pribadi dan hiburan.';
  } else if (needsPct > 60) {
    recommendation = 'Kebutuhan esensial (needs) menyerap sebagian besar pemasukan. Jaga komitmen cicilan dan tagihan rutin.';
  } else if (savingsPct < 15) {
    recommendation = 'Rasio tabungan dan investasi di bawah target 20%. Optimalkan penyisihan kas di awal gajian.';
  }

  return {
    needsAmount,
    wantsAmount,
    savingsAmount,
    totalIncome: income,
    totalSpent,
    needsPct,
    wantsPct,
    savingsPct,
    status,
    recommendation,
  };
}

export function computeMultiPeriodCashflow(summaries: MonthlySummary[]): CashflowPeriodData[] {
  if (!summaries || summaries.length === 0) return [];

  // Sort chronological by date
  const sorted = [...summaries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return sorted.map((s) => {
    const inflow = s.income || 0;
    const outflow = s.outcome?.total || 0;
    const netFlow = inflow - outflow;
    const savingsRatePct = inflow > 0 ? Number(((netFlow / inflow) * 100).toFixed(1)) : 0;

    return {
      period_id: s.period_id,
      month: s.month,
      date: s.date,
      inflow,
      outflow,
      netFlow,
      savingsRatePct,
      isSurplus: netFlow >= 0,
    };
  });
}

export function computeCashflowMetrics(summaries: MonthlySummary[]): CashflowMetrics {
  const periods = computeMultiPeriodCashflow(summaries);
  if (periods.length === 0) {
    return {
      totalInflow: 0,
      totalOutflow: 0,
      totalNetAccumulated: 0,
      avgMonthlyInflow: 0,
      avgMonthlyOutflow: 0,
      avgMonthlyNetFlow: 0,
      inflowOutflowRatio: 0,
      surplusStreak: 0,
      periodsCount: 0,
      surplusPeriodsCount: 0,
      deficitPeriodsCount: 0,
    };
  }

  const totalInflow = periods.reduce((sum, p) => sum + p.inflow, 0);
  const totalOutflow = periods.reduce((sum, p) => sum + p.outflow, 0);
  const totalNetAccumulated = totalInflow - totalOutflow;

  const count = periods.length;
  const avgMonthlyInflow = Math.round(totalInflow / count);
  const avgMonthlyOutflow = Math.round(totalOutflow / count);
  const avgMonthlyNetFlow = Math.round(totalNetAccumulated / count);

  const inflowOutflowRatio = totalOutflow > 0 ? Number((totalInflow / totalOutflow).toFixed(2)) : 0;

  // Streak: count consecutive surplus from latest backwards
  let streak = 0;
  for (let i = periods.length - 1; i >= 0; i--) {
    if (periods[i].netFlow >= 0) {
      streak++;
    } else {
      break;
    }
  }

  const surplusPeriodsCount = periods.filter((p) => p.isSurplus).length;
  const deficitPeriodsCount = count - surplusPeriodsCount;

  return {
    totalInflow,
    totalOutflow,
    totalNetAccumulated,
    avgMonthlyInflow,
    avgMonthlyOutflow,
    avgMonthlyNetFlow,
    inflowOutflowRatio,
    surplusStreak: streak,
    periodsCount: count,
    surplusPeriodsCount,
    deficitPeriodsCount,
  };
}
