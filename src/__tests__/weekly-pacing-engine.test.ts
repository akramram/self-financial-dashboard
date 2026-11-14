import { describe, it, expect } from 'vitest';
import {
  calculateCumulativePacing,
  calculateSafeDailyAllowance,
  evaluateWeeklyDiscipline,
  filterWeeklyTransactions,
} from '../lib/weekly-pacing-engine';
import type { WeeklyBucket, WeeklySpendingResult, WeeklyTransactionItem } from '../lib/db';

describe('weekly-pacing-engine', () => {
  const mockWeeks: WeeklyBucket[] = [
    {
      weekNum: 1,
      label: 'Week 1 (May 21-27)',
      startDate: '2026-05-21',
      endDate: '2026-05-27',
      total: 3000000,
      txCount: 5,
      categoryTotals: { Tagihan: 2000000, Makan: 1000000 },
      avgDaily: 428571,
      weekdaySpend: 2500000,
      weekendSpend: 500000,
      weekdayCount: 4,
      weekendCount: 1,
      transactions: [
        {
          id: 1,
          title: 'Sewa Apartemen',
          category: 'Tagihan',
          amount: 2000000,
          type: 'cash',
          done: 1,
          created_time: '2026-05-21T10:00:00Z',
          date: '2026-05-21',
          isWeekend: false,
        },
        {
          id: 2,
          title: 'Makan Weekend',
          category: 'Makan',
          amount: 500000,
          type: 'credit_expense',
          done: 1,
          created_time: '2026-05-24T12:00:00Z',
          date: '2026-05-21',
          isWeekend: true,
        },
      ],
    },
    {
      weekNum: 2,
      label: 'Week 2 (May 28-Jun 3)',
      startDate: '2026-05-28',
      endDate: '2026-06-03',
      total: 1500000,
      txCount: 4,
      categoryTotals: { Makan: 1500000 },
      avgDaily: 214285,
      weekdaySpend: 1000000,
      weekendSpend: 500000,
      weekdayCount: 3,
      weekendCount: 1,
    },
    {
      weekNum: 3,
      label: 'Week 3 (Jun 4-10)',
      startDate: '2026-06-04',
      endDate: '2026-06-10',
      total: 1000000,
      txCount: 3,
      categoryTotals: { Transport: 1000000 },
      avgDaily: 142857,
      weekdaySpend: 800000,
      weekendSpend: 200000,
      weekdayCount: 2,
      weekendCount: 1,
    },
    {
      weekNum: 4,
      label: 'Week 4 (Jun 11-17)',
      startDate: '2026-06-11',
      endDate: '2026-06-17',
      total: 500000,
      txCount: 2,
      categoryTotals: { Belanja: 500000 },
      avgDaily: 71428,
      weekdaySpend: 500000,
      weekendSpend: 0,
      weekdayCount: 2,
      weekendCount: 0,
    },
  ];

  it('calculates cumulative pacing trajectory correctly', () => {
    const weeklyBudget = 2000000;
    const result = calculateCumulativePacing(mockWeeks, weeklyBudget);

    expect(result).toHaveLength(4);
    expect(result[0].cumulativeActual).toBe(3000000);
    expect(result[0].cumulativeBudget).toBe(2000000);
    expect(result[0].variance).toBe(1000000);
    expect(result[0].burnRatePct).toBe(150);
    expect(result[0].paceStatus).toBe('exceeded');

    expect(result[1].cumulativeActual).toBe(4500000);
    expect(result[1].cumulativeBudget).toBe(4000000);
    expect(result[1].burnRatePct).toBe(112.5);
    expect(result[1].paceStatus).toBe('approaching');

    expect(result[3].cumulativeActual).toBe(6000000);
    expect(result[3].cumulativeBudget).toBe(8000000);
    expect(result[3].burnRatePct).toBe(75);
    expect(result[3].paceStatus).toBe('under_budget');
  });

  it('computes safe daily allowance for active period', () => {
    const allowance = calculateSafeDailyAllowance({
      income: 10000000,
      totalSpend: 4000000,
      periodStart: '2026-05-21',
      periodEnd: '2026-06-20',
      targetSavingsRatePct: 20, // 2M target savings -> 8M max spend
      asOfDate: '2026-06-05', // midway
    });

    expect(allowance.totalDays).toBe(31);
    expect(allowance.targetSavingsAmount).toBe(2000000);
    expect(allowance.maxAllowableSpend).toBe(8000000);
    expect(allowance.remainingSpendingCapacity).toBe(4000000);
    expect(allowance.daysRemaining).toBeGreaterThan(0);
    expect(allowance.safeDailyRemaining).toBeGreaterThan(0);
    expect(allowance.status).toBeDefined();
  });

  it('handles exhausted budget gracefully in safe daily allowance', () => {
    const allowance = calculateSafeDailyAllowance({
      income: 5000000,
      totalSpend: 6000000,
      periodStart: '2026-05-21',
      periodEnd: '2026-06-20',
      targetSavingsRatePct: 10,
    });

    expect(allowance.remainingSpendingCapacity).toBe(0);
    expect(allowance.safeDailyRemaining).toBe(0);
    expect(allowance.status).toBe('exhausted');
  });

  it('evaluates weekly discipline score and provides clean insights without em-dash', () => {
    const mockData: WeeklySpendingResult = {
      periodId: 10,
      month: 'June 2026',
      periodStart: '2026-05-21',
      periodEnd: '2026-06-20',
      weeks: mockWeeks,
      totalSpend: 6000000,
      totalTxCount: 14,
      weeklyBudget: 2000000,
      daysPerWeek: [7, 7, 7, 7],
      income: 10000000,
    };

    const evaluation = evaluateWeeklyDiscipline(mockData);

    expect(evaluation.score).toBeGreaterThan(0);
    expect(evaluation.score).toBeLessThanOrEqual(100);
    expect(evaluation.tier).toBeDefined();
    expect(evaluation.weeksOverBudgetCount).toBe(1); // Week 1 is 3M vs 2M
    expect(evaluation.weeksUnderBudgetCount).toBe(3);
    expect(evaluation.kickoffSpikeRatio).toBe(0.5); // 3M / 6M

    // Check no em-dash in insights (Antislop R-02)
    evaluation.insights.forEach((ins) => {
      expect(ins.title).not.toContain('—');
      expect(ins.detail).not.toContain('—');
    });
  });

  it('filters weekly transactions accurately', () => {
    const txs: WeeklyTransactionItem[] = [
      {
        id: 1,
        title: 'Kopi Kenangan',
        category: 'Makan',
        amount: 25000,
        type: 'credit_expense',
        done: 1,
        created_time: '2026-05-22T08:00:00Z',
        date: '2026-05-21',
        isWeekend: false,
      },
      {
        id: 2,
        title: 'Makan Keluarga',
        category: 'Makan',
        amount: 350000,
        type: 'credit_expense',
        done: 1,
        created_time: '2026-05-24T18:00:00Z',
        date: '2026-05-21',
        isWeekend: true,
      },
      {
        id: 3,
        title: 'Bensin Motor',
        category: 'Transport',
        amount: 50000,
        type: 'cash',
        done: 1,
        created_time: '2026-05-25T07:00:00Z',
        date: '2026-05-21',
        isWeekend: false,
      },
    ];

    expect(filterWeeklyTransactions(txs, {})).toHaveLength(3);
    expect(filterWeeklyTransactions(txs, { search: 'bensin' })).toHaveLength(1);
    expect(filterWeeklyTransactions(txs, { category: 'Makan' })).toHaveLength(2);
    expect(filterWeeklyTransactions(txs, { type: 'weekend' })).toHaveLength(1);
    expect(filterWeeklyTransactions(txs, { type: 'weekday' })).toHaveLength(2);
  });
});
