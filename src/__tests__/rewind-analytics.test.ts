import { describe, it, expect } from 'vitest';
import {
  availableRewindYears,
  buildRewindReport,
  gradeRewind,
} from '../lib/rewind-analytics';

const PERIODS = [
  { id: 1, month: 'December 2025', start_date: '2025-12-21' },
  { id: 2, month: 'January 2026', start_date: '2026-01-21' },
  { id: 3, month: 'February 2026', start_date: '2026-02-21' },
];

const INCOMES = [
  { period_id: 2, income: 10_000_000, other_income: 0 },
  { period_id: 3, income: 10_000_000, other_income: 1_000_000 },
];

const NW = [
  { period_id: 2, total: 100_000_000 },
  { period_id: 3, total: 110_000_000 },
];

function tx(partial: { title?: string; category?: string | null; amount: number; type: string; done?: number; period_id: number }) {
  return { title: partial.title ?? 'Tx', category: partial.category ?? null, amount: partial.amount, type: partial.type, done: partial.done ?? 1, period_id: partial.period_id };
}

describe('rewind-analytics', () => {
  it('lists available years desc, skips malformed start_date', () => {
    const years = availableRewindYears([...PERIODS, { id: 4, month: 'X', start_date: '' }]);
    expect(years).toEqual([2026, 2025]);
  });

  it('aggregates year: income, outcome, invest share, tx count', () => {
    const txs = [
      tx({ category: 'Belanja', amount: 4_000_000, type: 'cash', period_id: 2 }),
      tx({ category: 'Invest', amount: 2_000_000, type: 'cash', period_id: 2 }),
      tx({ category: 'Kartu Kredit', amount: 1_000_000, type: 'credit_payment', period_id: 3 }),
      tx({ category: 'Tagihan', amount: 500_000, type: 'credit_expense', period_id: 3, done: 1 }),
      tx({ category: 'Belanja', amount: 999_000, type: 'cash', period_id: 3, done: 0 }),
      tx({ category: 'Belanja', amount: 100_000, type: 'cash', period_id: 1 }),
    ];
    const r = buildRewindReport(2026, PERIODS, txs, INCOMES, NW);
    expect(r.monthsActive).toBe(2);
    expect(r.totalIncome).toBe(21_000_000);
    expect(r.totalOutcome).toBe(7_000_000);
    expect(r.investTotal).toBe(2_000_000);
    expect(r.investSharePct).toBeCloseTo((2 / 7) * 100, 5);
    expect(r.txCount).toBe(3);
    expect(r.avgMonthlyOutcome).toBeCloseTo(3_500_000, 5);
    expect(r.topCategories[0]).toMatchObject({ name: 'Belanja', total: 4_000_000 });
  });

  it('identifies heaviest and lightest months by outcome', () => {
    const txs = [
      tx({ category: 'A', amount: 1_000_000, type: 'cash', period_id: 2 }),
      tx({ category: 'A', amount: 3_000_000, type: 'cash', period_id: 3 }),
      tx({ category: 'B', amount: 500_000, type: 'cash', period_id: 3 }),
    ];
    const r = buildRewindReport(2026, PERIODS, txs, INCOMES, []);
    expect(r.heaviest?.period_id).toBe(3);
    expect(r.lightest?.period_id).toBe(2);
    expect(r.monthly[0].month).toBe('Jan');
    expect(r.monthly[1].month).toBe('Feb');
  });

  it('tracks biggest transaction and networth growth', () => {
    const txs = [
      tx({ title: 'Kecil', category: 'A', amount: 100_000, type: 'cash', period_id: 2 }),
      tx({ title: 'Besar', category: 'Mobil', amount: 50_000_000, type: 'cash', period_id: 3 }),
    ];
    const r = buildRewindReport(2026, PERIODS, txs, INCOMES, NW);
    expect(r.biggestTx).toMatchObject({ title: 'Besar', amount: 50_000_000, month: 'Feb' });
    expect(r.networthStart).toBe(100_000_000);
    expect(r.networthEnd).toBe(110_000_000);
    expect(r.networthGrowthPct).toBeCloseTo(10, 5);
  });

  it('excludes out-of-year periods, zero amounts, and grades personality tiers', () => {
    const txs = [
      tx({ category: 'Belanja', amount: 8_000_000, type: 'cash', period_id: 2 }),
    ];
    const r = buildRewindReport(2026, PERIODS, txs, INCOMES, [{ period_id: 2, total: 50_000_000 }]);
    expect(r.totalOutcome).toBe(8_000_000);
    expect(r.savingsRatePct).toBeCloseTo((13 / 21) * 100, 1);
    expect(r.personality?.label).toBe('Penabung Disiplin');

    const zero = buildRewindReport(2026, PERIODS, [
      tx({ category: 'A', amount: 0, type: 'cash', period_id: 2 }),
    ], INCOMES, []);
    expect(zero.txCount).toBe(0);
    expect(zero.biggestTx).toBeNull();
    expect(zero.lightest).toBeNull();

    expect(gradeRewind(35, 30)?.label).toBe('Arsitek Kekayaan');
    expect(gradeRewind(20, 5)?.label).toBe('Pengelola Seimbang');
    expect(gradeRewind(8, 0)?.label).toBe('Mulai Menabung');
    expect(gradeRewind(2, 0)?.label).toBe('Butuh Rem Keuangan');
    expect(gradeRewind(Number.NaN, 0)).toBeNull();
  });
});
