// Real Value engine: restates historical income and outcome in today's rupiah
// using a constant annual inflation assumption. Outcome semantics match /flow
// and /rewind: done transactions of type 'cash' or 'credit_payment'
// (credit_expense is excluded, it is incurred debt, not cash out).

export const REAL_VALUE_REF_AMOUNT = 1_000_000;

export interface RealValueTx {
  amount: number;
  type: string;
  done?: number | boolean;
  period_id: number;
}

export interface RealValuePeriod {
  id: number;
  month: string;
  start_date: string;
}

export interface RealValueIncomeRow {
  period_id: number;
  income: number;
  other_income?: number;
}

export interface RealValueNetworthRow {
  period_id: number;
  total: number;
}

export interface RealValueRow {
  period_id: number;
  month: string;
  start_date: string;
  income: number;
  outcome: number;
  networth: number | null;
}

export interface RealValuePoint extends RealValueRow {
  yearsAgo: number;
  factor: number;
  realIncome: number;
  realOutcome: number;
  realSurplus: number;
}

export type RealValueTone = 'good' | 'warn' | 'bad' | 'flat';

export interface RealValueVerdict {
  label: string;
  blurb: string;
  tone: RealValueTone;
}

export interface RealValueReport {
  ratePct: number;
  anchorDate: string;
  points: RealValuePoint[];
  cumulativeInflationPct: number;
  incomeRealChangePct: number | null;
  outcomeRealChangePct: number | null;
  latestRealSurplus: number;
  avgRealSurplus: number;
  refErosion: { label: string; worthNow: number } | null;
  verdict: RealValueVerdict | null;
}

const YEAR_MS = 365.25 * 24 * 3600 * 1000;
const OUTCOME_TYPES = new Set(['cash', 'credit_payment']);

function isDone(done?: number | boolean): boolean {
  return done === 1 || done === true;
}

export function inflationFactor(start_date: string, anchorDate: string, ratePct: number): number {
  const r = Math.max(0, Number(ratePct) || 0) / 100;
  const startMs = Date.parse(start_date);
  const anchorMs = Date.parse(anchorDate);
  if (!Number.isFinite(startMs) || !Number.isFinite(anchorMs)) return 1;
  const years = Math.max(0, (anchorMs - startMs) / YEAR_MS);
  return Math.pow(1 + r, years);
}

// Raw per-period rows, inflation-independent, safe to ship to the client once.
// The client re-runs buildRealValueReport locally whenever the rate slider moves.
export function buildRawRows(
  periods: RealValuePeriod[],
  txs: RealValueTx[],
  incomes: RealValueIncomeRow[],
  networthRows: RealValueNetworthRow[]
): RealValueRow[] {
  const sorted = [...periods].sort((a, b) => (a.start_date || '').localeCompare(b.start_date || ''));
  const incomeByPeriod = new Map<number, number>();
  for (const r of incomes) {
    incomeByPeriod.set(
      r.period_id,
      (incomeByPeriod.get(r.period_id) || 0) + (Number(r.income) || 0) + (Number(r.other_income) || 0)
    );
  }
  const outcomeByPeriod = new Map<number, number>();
  for (const t of txs) {
    if (!isDone(t.done) || !OUTCOME_TYPES.has(t.type)) continue;
    const amount = Math.max(0, Number(t.amount) || 0);
    if (amount <= 0) continue;
    outcomeByPeriod.set(t.period_id, (outcomeByPeriod.get(t.period_id) || 0) + amount);
  }
  const networthByPeriod = new Map<number, number>();
  for (const n of networthRows) {
    const total = Number(n.total);
    if (Number.isFinite(total)) networthByPeriod.set(n.period_id, total);
  }
  return sorted.map((p) => ({
    period_id: p.id,
    month: p.month,
    start_date: p.start_date,
    income: incomeByPeriod.get(p.id) || 0,
    outcome: outcomeByPeriod.get(p.id) || 0,
    networth: networthByPeriod.has(p.id) ? networthByPeriod.get(p.id)! : null,
  }));
}

function endpointChangePct(points: RealValuePoint[], pick: 'realIncome' | 'realOutcome'): number | null {
  if (points.length < 2) return null;
  const first = points[0][pick];
  const last = points[points.length - 1][pick];
  if (!(first > 0)) return null;
  return ((last - first) / first) * 100;
}

export function gradeRealValue(
  incomeRealChangePct: number | null,
  outcomeRealChangePct: number | null,
  latestRealSurplus: number
): RealValueVerdict {
  if (latestRealSurplus < 0) {
    return {
      label: 'Defisit Riil',
      blurb: 'Setelah dikoreksi inflasi, pengeluaran hari ini melebihi pemasukan. Waktu menahan laju belanja.',
      tone: 'bad',
    };
  }
  if (incomeRealChangePct !== null && incomeRealChangePct <= -3) {
    return {
      label: 'Gaji Tertinggal Inflasi',
      blurb: 'Pemasukan riil menyusut dibanding awal periode. Naiknya gaji nominal belum mengalahkan harga.',
      tone: 'bad',
    };
  }
  if (
    incomeRealChangePct !== null &&
    incomeRealChangePct >= 3 &&
    (outcomeRealChangePct === null || outcomeRealChangePct <= incomeRealChangePct)
  ) {
    return {
      label: 'Gaji Melaju',
      blurb: 'Pemasukan riil tumbuh lebih cepat daripada belanja riil. Daya beli menguat.',
      tone: 'good',
    };
  }
  if (
    outcomeRealChangePct !== null &&
    outcomeRealChangePct >= 3 &&
    (incomeRealChangePct === null || outcomeRealChangePct > incomeRealChangePct)
  ) {
    return {
      label: 'Standar Hidup Menguntit',
      blurb: 'Belanja riil naik lebih cepat daripada pemasukan riil. Ada inflasi gaya hidup yang perlu dicek.',
      tone: 'warn',
    };
  }
  return {
    label: 'Seimbang dengan Inflasi',
    blurb: 'Pemasukan dan belanja riil bergerak stabil. Daya beli terjaga pada asumsi inflasi ini.',
    tone: 'flat',
  };
}

export function buildRealValueReport(rows: RealValueRow[], ratePct: number, anchorDate: string): RealValueReport {
  const points: RealValuePoint[] = rows.map((r) => {
    const factor = inflationFactor(r.start_date, anchorDate, ratePct);
    return {
      ...r,
      yearsAgo: Math.max(0, (Date.parse(anchorDate) - Date.parse(r.start_date)) / YEAR_MS),
      factor,
      realIncome: r.income / factor,
      realOutcome: r.outcome / factor,
      realSurplus: r.income / factor - r.outcome / factor,
    };
  });
  const incomeRealChangePct = endpointChangePct(points, 'realIncome');
  const outcomeRealChangePct = endpointChangePct(points, 'realOutcome');
  const latest = points.length > 0 ? points[points.length - 1] : null;
  const avgRealSurplus =
    points.length > 0 ? points.reduce((s, p) => s + p.realSurplus, 0) / points.length : 0;
  const earliest = points[0] || null;
  return {
    ratePct,
    anchorDate,
    points,
    cumulativeInflationPct: earliest ? (earliest.factor - 1) * 100 : 0,
    incomeRealChangePct,
    outcomeRealChangePct,
    latestRealSurplus: latest ? latest.realSurplus : 0,
    avgRealSurplus,
    refErosion: earliest
      ? { label: earliest.month, worthNow: REAL_VALUE_REF_AMOUNT * earliest.factor }
      : null,
    verdict:
      points.length >= 2
        ? gradeRealValue(incomeRealChangePct, outcomeRealChangePct, latest ? latest.realSurplus : 0)
        : null,
  };
}
