import { describe, it, expect } from 'vitest';
import {
  buildRawRows,
  buildRealValueReport,
  gradeRealValue,
  inflationFactor,
  REAL_VALUE_REF_AMOUNT,
  type RealValueRow,
} from '../lib/real-value-engine';

const PERIODS = [
  { id: 1, month: 'January 2024', start_date: '2024-01-21' },
  { id: 2, month: 'February 2024', start_date: '2024-02-21' },
  { id: 3, month: 'March 2024', start_date: '2024-03-21' },
];

const TXS = [
  { amount: 3_000_000, type: 'cash', done: 1, period_id: 1 },
  { amount: 1_000_000, type: 'credit_expense', done: 1, period_id: 1 }, // excluded: debt, not cash
  { amount: 500_000, type: 'cash', done: 0, period_id: 1 }, // excluded: unpaid
  { amount: 2_500_000, type: 'credit_payment', done: 1, period_id: 3 },
  { amount: -100, type: 'cash', done: 1, period_id: 2 }, // excluded: non-positive
];

const INCOMES = [
  { period_id: 1, income: 10_000_000 },
  { period_id: 2, income: 10_000_000, other_income: 250_000 },
  { period_id: 3, income: 11_000_000 },
];

const NETWORTH = [
  { period_id: 1, total: 50_000_000 },
  { period_id: 3, total: 61_000_000 },
];

describe('buildRawRows', () => {
  it('aggregates income and outcome per period with flow semantics', () => {
    const rows = buildRawRows(PERIODS, TXS, INCOMES, NETWORTH);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ period_id: 1, income: 10_000_000, outcome: 3_000_000, networth: 50_000_000 });
    expect(rows[1]).toMatchObject({ period_id: 2, income: 10_250_000, outcome: 0, networth: null });
    expect(rows[2]).toMatchObject({ period_id: 3, income: 11_000_000, outcome: 2_500_000, networth: 61_000_000 });
    // sorted by start_date regardless of input order
    expect(rows.map((r) => r.period_id)).toEqual([1, 2, 3]);
  });

  it('returns empty array for empty periods', () => {
    expect(buildRawRows([], TXS, INCOMES, NETWORTH)).toEqual([]);
  });
});

describe('inflationFactor', () => {
  it('grows exponentially with years elapsed', () => {
    const f1 = inflationFactor('2025-11-19', '2026-11-19', 10);
    const f2 = inflationFactor('2024-11-19', '2026-11-19', 10);
    expect(f1).toBeCloseTo(1.1, 2);
    expect(f2).toBeCloseTo(f1 * f1, 3);
  });

  it('is 1 for future or same-day dates and invalid input', () => {
    expect(inflationFactor('2027-01-01', '2026-11-19', 5)).toBe(1);
    expect(inflationFactor('2026-11-19', '2026-11-19', 5)).toBe(1);
    expect(inflationFactor('bogus', '2026-11-19', 5)).toBe(1);
  });

  it('clamps negative rate to zero', () => {
    expect(inflationFactor('2024-01-21', '2026-11-19', -5)).toBe(1);
  });
});

describe('buildRealValueReport', () => {
  const anchor = '2026-11-19';
  const rows: RealValueRow[] = buildRawRows(PERIODS, TXS, INCOMES, NETWORTH);

  it('restates old nominal values in today rupiah (real < nominal)', () => {
    const rep = buildRealValueReport(rows, 10, anchor);
    const first = rep.points[0];
    expect(first.realIncome).toBeLessThan(first.income);
    expect(first.realOutcome).toBeLessThan(first.outcome);
    expect(first.factor).toBeGreaterThan(1);
    // all periods are in the past here: factors ascend toward the anchor,
    // later periods are less discounted than earlier ones
    const last = rep.points[rep.points.length - 1];
    expect(last.factor).toBeGreaterThan(1);
    expect(last.factor).toBeLessThan(first.factor);
    // older money gets a bigger restatement multiplier: factors descend
    expect(rep.points.every((p, i) => i === 0 || p.factor <= rep.points[i - 1].factor)).toBe(true);
  });

  it('computes cumulative inflation from earliest point and endpoint changes', () => {
    const rep = buildRealValueReport(rows, 10, anchor);
    expect(rep.cumulativeInflationPct).toBeCloseTo((rep.points[0].factor - 1) * 100, 6);
    expect(rep.incomeRealChangePct).not.toBeNull();
    expect(rep.outcomeRealChangePct).not.toBeNull();
    expect(rep.verdict).not.toBeNull();
  });

  it('erosion reference grows the ref amount by earliest factor', () => {
    const rep = buildRealValueReport(rows, 10, anchor);
    expect(rep.refErosion!.worthNow).toBeCloseTo(REAL_VALUE_REF_AMOUNT * rep.points[0].factor, 4);
  });

  it('at zero inflation real equals nominal', () => {
    const rep = buildRealValueReport(rows, 0, anchor);
    expect(rep.points[0].realIncome).toBe(rows[0].income);
    expect(rep.points[0].realSurplus).toBe(rows[0].income - rows[0].outcome);
    expect(rep.cumulativeInflationPct).toBe(0);
  });

  it('handles empty and single-period data', () => {
    const empty = buildRealValueReport([], 3.5, anchor);
    expect(empty.points).toHaveLength(0);
    expect(empty.verdict).toBeNull();
    expect(empty.refErosion).toBeNull();
    const single = buildRealValueReport([rows[0]], 3.5, anchor);
    expect(single.verdict).toBeNull();
    expect(single.incomeRealChangePct).toBeNull();
  });
});

describe('gradeRealValue', () => {
  it('flags real deficit as bad regardless of income growth', () => {
    expect(gradeRealValue(10, 5, -100_000).label).toBe('Defisit Riil');
  });

  it('flags shrinking real income as bad', () => {
    expect(gradeRealValue(-5, -1, 100_000).label).toBe('Gaji Tertinggal Inflasi');
  });

  it('flags income growing faster than spending as good', () => {
    const v = gradeRealValue(8, 2, 100_000);
    expect(v.label).toBe('Gaji Melaju');
    expect(v.tone).toBe('good');
  });

  it('flags lifestyle inflation as warn', () => {
    const v = gradeRealValue(1, 6, 100_000);
    expect(v.label).toBe('Standar Hidup Menguntit');
    expect(v.tone).toBe('warn');
  });

  it('treats small balanced moves as flat', () => {
    expect(gradeRealValue(1, 1, 100_000).label).toBe('Seimbang dengan Inflasi');
    expect(gradeRealValue(null, null, 100_000).label).toBe('Seimbang dengan Inflasi');
  });
});
