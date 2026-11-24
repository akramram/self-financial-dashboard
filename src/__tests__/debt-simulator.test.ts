import { describe, it, expect } from 'vitest';
import {
  calculateDebtPayoffSchedule,
  calculateCreditHealth,
  generateInstallmentMilestones,
  getOffsetMonthLabel,
  type DebtItem,
} from '../lib/debt-simulator';

describe('debt-simulator', () => {
  describe('getOffsetMonthLabel', () => {
    it('returns month name and year with offset', () => {
      const start = new Date(2026, 9, 1); // October 2026
      expect(getOffsetMonthLabel(start, 0)).toBe('October 2026');
      expect(getOffsetMonthLabel(start, 2)).toBe('December 2026');
      expect(getOffsetMonthLabel(start, 3)).toBe('January 2027');
    });
  });

  describe('calculateDebtPayoffSchedule', () => {
    it('handles empty debt list cleanly', () => {
      const res = calculateDebtPayoffSchedule([], 0, 'avalanche');
      expect(res.totalStartingDebt).toBe(0);
      expect(res.monthsToPayoff).toBe(0);
      expect(res.monthlySchedule).toHaveLength(1);
    });

    it('simulates debt payoff and calculates extra payment acceleration', () => {
      const debts: DebtItem[] = [
        {
          id: 'card1',
          title: 'Kartu Kredit A',
          category: 'Belanja',
          balance: 3000000,
          monthlyPayment: 500000,
          interestRateAnnual: 21,
          type: 'credit_card',
        },
        {
          id: 'inst1',
          title: 'Cicilan Gadget',
          category: 'Elektronik',
          balance: 2000000,
          monthlyPayment: 1000000,
          interestRateAnnual: 0,
          type: 'installment',
        },
      ];

      const start = new Date(2026, 9, 1); // October 2026
      const baseline = calculateDebtPayoffSchedule(debts, 0, 'avalanche', start);
      const accelerated = calculateDebtPayoffSchedule(debts, 500000, 'avalanche', start);

      expect(baseline.totalStartingDebt).toBe(5000000);
      expect(baseline.monthsToPayoff).toBeGreaterThan(0);

      // Accelerated payoff must finish faster and save interest
      expect(accelerated.monthsToPayoff).toBeLessThan(baseline.monthsToPayoff);
      expect(accelerated.monthsSavedVsBaseline).toBeGreaterThan(0);
      expect(accelerated.interestSavedVsBaseline).toBeGreaterThanOrEqual(0);
      expect(accelerated.itemPayoffOrder.length).toBe(2);
    });

    it('orders payoff correctly with snowball strategy (smallest balance first)', () => {
      const debts: DebtItem[] = [
        {
          id: 'large',
          title: 'Utang Besar',
          category: 'Belanja',
          balance: 8000000,
          monthlyPayment: 800000,
          interestRateAnnual: 24,
          type: 'credit_card',
        },
        {
          id: 'small',
          title: 'Utang Kecil',
          category: 'Tagihan',
          balance: 1000000,
          monthlyPayment: 200000,
          interestRateAnnual: 15,
          type: 'credit_card',
        },
      ];

      const start = new Date(2026, 9, 1);
      const res = calculateDebtPayoffSchedule(debts, 1000000, 'snowball', start);
      expect(res.itemPayoffOrder[0].title).toBe('Utang Kecil');
    });
  });

  describe('calculateCreditHealth', () => {
    it('calculates optimal credit utilization and healthy DTI', () => {
      const health = calculateCreditHealth({
        totalCreditLimit: 20000000,
        outstandingBalance: 4000000,
        monthlyIncome: 15000000,
        unpaidExpensesCount: 1,
        unpaidExpensesTotal: 500000,
        activeInstallmentsCount: 1,
        activeInstallmentsTotalMonthly: 1000000,
      });

      expect(health.utilizationRate).toBe(20);
      expect(health.utilizationStatus).toBe('optimal');
      expect(health.dtiRatio).toBe(10); // 1.5M / 15M = 10%
      expect(health.dtiStatus).toBe('healthy');
      expect(health.recommendation).toContain('optimal');
    });

    it('flags high utilization and caution DTI', () => {
      const health = calculateCreditHealth({
        totalCreditLimit: 10000000,
        outstandingBalance: 8000000,
        monthlyIncome: 10000000,
        unpaidExpensesCount: 3,
        unpaidExpensesTotal: 2000000,
        activeInstallmentsCount: 2,
        activeInstallmentsTotalMonthly: 3000000,
      });

      expect(health.utilizationRate).toBe(80);
      expect(health.utilizationStatus).toBe('critical');
      expect(health.dtiRatio).toBe(50); // 5M / 10M = 50%
      expect(health.dtiStatus).toBe('caution');
      expect(health.recommendation).toContain('sangat tinggi');
    });
  });

  describe('generateInstallmentMilestones', () => {
    it('returns empty list if no active installments with endDate', () => {
      const milestones = generateInstallmentMilestones([]);
      expect(milestones).toEqual([]);
    });

    it('groups installments by completion date and computes liberated cash flow', () => {
      const items = [
        {
          title: 'Cicilan Laptop',
          monthlyAmount: 1500000,
          endDate: '2026-11',
          active: true,
        },
        {
          title: 'Cicilan Meja',
          monthlyAmount: 500000,
          endDate: '2026-11',
          active: true,
        },
        {
          title: 'Cicilan HP',
          monthlyAmount: 1200000,
          endDate: '2027-02',
          active: true,
        },
      ];

      const milestones = generateInstallmentMilestones(items);
      expect(milestones).toHaveLength(2);

      // Milestone 1: November 2026 (Laptop + Meja = 2.000.000 liberated)
      expect(milestones[0].dateKey).toBe('2026-11');
      expect(milestones[0].monthYear).toBe('November 2026');
      expect(milestones[0].monthlyAmountLiberated).toBe(2000000);
      expect(milestones[0].cumulativeAmountLiberated).toBe(2000000);
      expect(milestones[0].remainingMonthlyObligation).toBe(1200000);
      expect(milestones[0].completedItems).toHaveLength(2);

      // Milestone 2: February 2027 (HP = 1.200.000 liberated, total 3.200.000)
      expect(milestones[1].dateKey).toBe('2027-02');
      expect(milestones[1].monthYear).toBe('February 2027');
      expect(milestones[1].monthlyAmountLiberated).toBe(1200000);
      expect(milestones[1].cumulativeAmountLiberated).toBe(3200000);
      expect(milestones[1].remainingMonthlyObligation).toBe(0);
    });
  });
});
