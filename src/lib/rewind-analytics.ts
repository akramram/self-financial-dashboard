// Annual Money Rewind engine: aggregates one calendar year of salary periods
// (periods whose start_date falls in the year) into narrative highlights.
// Outcome semantics match /flow: done transactions of type 'cash' or
// 'credit_payment'. credit_expense is excluded (incurred debt, not cash out).

export const REWIND_INVEST_CATEGORY = 'Invest';

export interface RewindTx {
  title?: string;
  category?: string | null;
  amount: number;
  type: string;
  done?: number | boolean;
  period_id: number;
}

export interface RewindPeriod {
  id: number;
  month: string;
  start_date: string;
}

export interface RewindIncomeRow {
  period_id: number;
  income: number;
  other_income?: number;
}

export interface RewindNetworthRow {
  period_id: number;
  total: number;
}

export interface RewindMonthly {
  period_id: number;
  month: string;
  income: number;
  outcome: number;
}

export interface RewindCategory {
  name: string;
  total: number;
  pct: number;
}

export interface RewindPersonality {
  label: string;
  blurb: string;
}

export interface RewindReport {
  year: number;
  monthsActive: number;
  totalIncome: number;
  totalOutcome: number;
  avgMonthlyOutcome: number;
  savingsRatePct: number;
  investTotal: number;
  investSharePct: number;
  monthly: RewindMonthly[];
  heaviest: RewindMonthly | null;
  lightest: RewindMonthly | null;
  topCategories: RewindCategory[];
  biggestTx: { title: string; category: string | null; amount: number; month: string } | null;
  txCount: number;
  networthStart: number | null;
  networthEnd: number | null;
  networthGrowthPct: number | null;
  personality: RewindPersonality | null;
}

const OUTCOME_TYPES = new Set(['cash', 'credit_payment']);

function isDone(done?: number | boolean): boolean {
  return done === 1 || done === true;
}

export function gradeRewind(savingsRatePct: number, investSharePct: number): RewindPersonality | null {
  if (!Number.isFinite(savingsRatePct)) return null;
  if (savingsRatePct >= 30 && investSharePct >= 25) {
    return { label: 'Arsitek Kekayaan', blurb: 'Pemasukan tidak hanya diselamatkan, tapi dikerjakan lewat investasi. Fondasi masa depan sedang dibangun.' };
  }
  if (savingsRatePct >= 30) return { label: 'Penabung Disiplin', blurb: 'Savings rate konsisten tinggi. Pertimbangkan mengalirkan lebih banyak ke instrumen investasi.' };
  if (savingsRatePct >= 15) return { label: 'Pengelola Seimbang', blurb: 'Alokasi pemasukan sehat: belanja terkendali dan masih ada sisa tiap bulan.' };
  if (savingsRatePct >= 5) return { label: 'Mulai Menabung', blurb: 'Sudah ke arah yang benar, tapi ruang perbaikan masih lebar. Pangkas satu kategori terbesar.' };
  return { label: 'Butuh Rem Keuangan', blurb: 'Pengeluaran nyaris menghabiskan pemasukan. Review komitmen tetap dan langganan dulu tahun depan.' };
}

export function buildRewindReport(
  year: number,
  periods: RewindPeriod[],
  txs: RewindTx[],
  incomes: RewindIncomeRow[],
  networthRows: RewindNetworthRow[]
): RewindReport {
  const yearPeriods = periods
    .filter((p) => (p.start_date || '').slice(0, 4) === String(year))
    .sort((a, b) => a.start_date.localeCompare(b.start_date));
  const periodIds = new Set(yearPeriods.map((p) => p.id));
  const periodById = new Map(yearPeriods.map((p) => [p.id, p]));
  const monthShort = (start: string) => {
    const m = Number(start.slice(5, 7));
    return ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][m - 1] || start.slice(5, 7);
  };

  const incomeByPeriod = new Map<number, number>();
  for (const r of incomes) {
    if (!periodIds.has(r.period_id)) continue;
    incomeByPeriod.set(r.period_id, (incomeByPeriod.get(r.period_id) || 0) + (Number(r.income) || 0) + (Number(r.other_income) || 0));
  }

  const outcomeByPeriod = new Map<number, number>();
  const catTotals = new Map<string, number>();
  let investTotal = 0;
  let txCount = 0;
  let biggest: RewindReport['biggestTx'] = null;
  for (const t of txs) {
    if (!periodIds.has(t.period_id) || !isDone(t.done)) continue;
    if (!OUTCOME_TYPES.has(t.type)) continue;
    const amount = Math.max(0, Number(t.amount) || 0);
    if (amount <= 0) continue;
    txCount += 1;
    outcomeByPeriod.set(t.period_id, (outcomeByPeriod.get(t.period_id) || 0) + amount);
    const name = (t.category || '').trim() || 'Tanpa Kategori';
    catTotals.set(name, (catTotals.get(name) || 0) + amount);
    if (name === REWIND_INVEST_CATEGORY) investTotal += amount;
    if (!biggest || amount > biggest.amount) {
      biggest = {
        title: (t.title || 'Tanpa judul').trim(),
        category: t.category || null,
        amount,
        month: periodById.get(t.period_id) ? monthShort(periodById.get(t.period_id)!.start_date) : '',
      };
    }
  }

  const monthly: RewindMonthly[] = yearPeriods.map((p) => ({
    period_id: p.id,
    month: monthShort(p.start_date),
    income: incomeByPeriod.get(p.id) || 0,
    outcome: outcomeByPeriod.get(p.id) || 0,
  }));

  const totalIncome = monthly.reduce((s, m) => s + m.income, 0);
  const totalOutcome = monthly.reduce((s, m) => s + m.outcome, 0);
  const monthsActive = monthly.length;
  const savingsRatePct = totalIncome > 0 ? ((totalIncome - totalOutcome) / totalIncome) * 100 : Number.NaN;
  const investSharePct = totalOutcome > 0 ? (investTotal / totalOutcome) * 100 : 0;

  const withOutcome = monthly.filter((m) => m.outcome > 0);
  const heaviest = withOutcome.reduce<RewindMonthly | null>((best, m) => (!best || m.outcome > best.outcome ? m : best), null);
  const lightest = withOutcome.reduce<RewindMonthly | null>((best, m) => (!best || m.outcome < best.outcome ? m : best), null);

  const topCategories: RewindCategory[] = [...catTotals.entries()]
    .map(([name, total]) => ({ name, total, pct: totalOutcome > 0 ? (total / totalOutcome) * 100 : 0 }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const nwInOrder = yearPeriods
    .map((p) => networthRows.find((n) => n.period_id === p.id))
    .filter((n): n is RewindNetworthRow => Boolean(n) && Number.isFinite(Number(n!.total)));
  const networthStart = nwInOrder.length > 0 ? Number(nwInOrder[0].total) : null;
  const networthEnd = nwInOrder.length > 1 ? Number(nwInOrder[nwInOrder.length - 1].total) : nwInOrder.length === 1 ? networthStart : null;
  const networthGrowthPct =
    networthStart !== null && networthEnd !== null && networthStart > 0
      ? ((networthEnd - networthStart) / networthStart) * 100
      : null;

  return {
    year,
    monthsActive,
    totalIncome,
    totalOutcome,
    avgMonthlyOutcome: monthsActive > 0 ? totalOutcome / monthsActive : 0,
    savingsRatePct,
    investTotal,
    investSharePct,
    monthly,
    heaviest,
    lightest,
    topCategories,
    biggestTx: biggest,
    txCount,
    networthStart,
    networthEnd,
    networthGrowthPct,
    personality: gradeRewind(savingsRatePct, investSharePct),
  };
}

// ponytail: available years derived from periods table only; if a year has no
// period rows (fresh install) the selector stays empty — acceptable ceiling.
export function availableRewindYears(periods: RewindPeriod[]): number[] {
  const years = new Set<number>();
  for (const p of periods) {
    const y = Number((p.start_date || '').slice(0, 4));
    if (y > 2000 && y < 2200) years.add(y);
  }
  return [...years].sort((a, b) => b - a);
}
