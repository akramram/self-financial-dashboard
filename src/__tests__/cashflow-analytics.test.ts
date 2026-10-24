import { describe, it, expect } from 'vitest';
import {
  classifyCategory503020,
  compute503020Allocation,
  computeMultiPeriodCashflow,
  computeCashflowMetrics,
} from '../lib/cashflow-analytics';
import type { MonthlySummary } from '../lib/data';

describe('cashflow-analytics helper module', () => {
  describe('classifyCategory503020', () => {
    it('correctly classifies savings and investment categories', () => {
      expect(classifyCategory503020('Invest')).toBe('savings');
      expect(classifyCategory503020('Investasi Saham')).toBe('savings');
      expect(classifyCategory503020('Tabungan Dana Darurat')).toBe('savings');
      expect(classifyCategory503020('Goal Tabungan')).toBe('savings');
      expect(classifyCategory503020('Crypto Asset')).toBe('savings');
    });

    it('correctly classifies wants / discretionary categories', () => {
      expect(classifyCategory503020('Belanja')).toBe('wants');
      expect(classifyCategory503020('Belanja Pribadi')).toBe('wants');
      expect(classifyCategory503020('Hiburan')).toBe('wants');
      expect(classifyCategory503020('Shopping Online')).toBe('wants');
      expect(classifyCategory503020('Cafe & Hangout')).toBe('wants');
      expect(classifyCategory503020('Liburan')).toBe('wants');
    });

    it('defaults essential categories to needs', () => {
      expect(classifyCategory503020('Tagihan')).toBe('needs');
      expect(classifyCategory503020('Makanan')).toBe('needs');
      expect(classifyCategory503020('Cash Rumah Bulanan')).toBe('needs');
      expect(classifyCategory503020('Family')).toBe('needs');
      expect(classifyCategory503020('Istri')).toBe('needs');
      expect(classifyCategory503020('Transportasi')).toBe('needs');
      expect(classifyCategory503020('Zakat')).toBe('needs');
      expect(classifyCategory503020('Peliharaan')).toBe('needs');
    });
  });

  describe('compute503020Allocation', () => {
    it('handles empty or null summary gracefully', () => {
      const res = compute503020Allocation(null);
      expect(res.totalIncome).toBe(0);
      expect(res.needsPct).toBe(0);
      expect(res.wantsPct).toBe(0);
      expect(res.savingsPct).toBe(0);
    });

    it('accurately computes 50/30/20 breakdown and statuses', () => {
      const summary: MonthlySummary = {
        period_id: 1,
        month: 'October 2026',
        date: '2026-10-21',
        income: 20000000,
        outcome: {
          cash: 5000000,
          credit_payment: 5000000,
          credit_expenses: 4000000,
          total: 10000000,
        },
        savings: 10000000,
        savings_rate_pct: 50,
        networth: 50000000,
        category_totals: {
          Tagihan: 5000000, // needs
          Makanan: 3000000, // needs
          'Belanja Pribadi': 2000000, // wants
          Invest: 1000000, // savings
        },
      };

      const res = compute503020Allocation(summary);
      expect(res.totalIncome).toBe(20000000);
      expect(res.needsAmount).toBe(8000000); // 40%
      expect(res.wantsAmount).toBe(2000000); // 10%
      expect(res.needsPct).toBe(40);
      expect(res.wantsPct).toBe(10);
      expect(res.status.needs).toBe('good');
      expect(res.status.wants).toBe('good');
      expect(res.status.savings).toBe('good');
    });

    it('warns when wants exceed 35%', () => {
      const summary: MonthlySummary = {
        period_id: 2,
        month: 'November 2026',
        date: '2026-11-21',
        income: 10000000,
        outcome: { cash: 8000000, credit_payment: 0, credit_expenses: 0, total: 8000000 },
        savings: 2000000,
        savings_rate_pct: 20,
        networth: 50000000,
        category_totals: {
          'Belanja Pribadi': 4500000, // 45% wants
          Tagihan: 3500000, // 35% needs
        },
      };

      const res = compute503020Allocation(summary);
      expect(res.wantsPct).toBe(45);
      expect(res.status.wants).toBe('critical');
      expect(res.recommendation).toContain('Pengeluaran pos keinginan (wants)');
    });
  });

  describe('computeMultiPeriodCashflow and computeCashflowMetrics', () => {
    const mockSummaries: MonthlySummary[] = [
      {
        period_id: 1,
        month: 'August 2026',
        date: '2026-07-21',
        income: 18000000,
        outcome: { cash: 6000000, credit_payment: 9000000, credit_expenses: 8000000, total: 15000000 },
        savings: 3000000,
        savings_rate_pct: 16.7,
        networth: 30000000,
        category_totals: {},
      },
      {
        period_id: 2,
        month: 'September 2026',
        date: '2026-08-21',
        income: 20000000,
        outcome: { cash: 10000000, credit_payment: 11000000, credit_expenses: 9000000, total: 21000000 },
        savings: -1000000,
        savings_rate_pct: -5,
        networth: 29000000,
        category_totals: {},
      },
      {
        period_id: 3,
        month: 'October 2026',
        date: '2026-09-21',
        income: 23000000,
        outcome: { cash: 7000000, credit_payment: 12000000, credit_expenses: 10000000, total: 19000000 },
        savings: 4000000,
        savings_rate_pct: 17.4,
        networth: 35000000,
        category_totals: {},
      },
      {
        period_id: 4,
        month: 'November 2026',
        date: '2026-10-21',
        income: 23000000,
        outcome: { cash: 5000000, credit_payment: 6000000, credit_expenses: 4000000, total: 11000000 },
        savings: 12000000,
        savings_rate_pct: 52.2,
        networth: 47000000,
        category_totals: {},
      },
    ];

    it('correctly maps multi-period cashflow chronological', () => {
      const periods = computeMultiPeriodCashflow(mockSummaries);
      expect(periods).toHaveLength(4);
      expect(periods[0].month).toBe('August 2026');
      expect(periods[0].netFlow).toBe(3000000);
      expect(periods[1].isSurplus).toBe(false);
      expect(periods[2].isSurplus).toBe(true);
      expect(periods[3].isSurplus).toBe(true);
    });

    it('correctly calculates metrics and surplus streak', () => {
      const metrics = computeCashflowMetrics(mockSummaries);
      expect(metrics.periodsCount).toBe(4);
      expect(metrics.surplusPeriodsCount).toBe(3);
      expect(metrics.deficitPeriodsCount).toBe(1);
      // October & November are surplus, September is deficit -> streak = 2
      expect(metrics.surplusStreak).toBe(2);
      expect(metrics.totalInflow).toBe(18000000 + 20000000 + 23000000 + 23000000); // 84000000
      expect(metrics.totalOutflow).toBe(15000000 + 21000000 + 19000000 + 11000000); // 66000000
      expect(metrics.totalNetAccumulated).toBe(18000000);
      expect(metrics.inflowOutflowRatio).toBe(1.27); // 84000000 / 66000000 = 1.27
    });

    it('handles empty summaries for metrics safely', () => {
      const metrics = computeCashflowMetrics([]);
      expect(metrics.periodsCount).toBe(0);
      expect(metrics.surplusStreak).toBe(0);
      expect(metrics.inflowOutflowRatio).toBe(0);
    });
  });
});
