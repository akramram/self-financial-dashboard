import { describe, it, expect } from 'vitest';
import {
  calculateCyclesRemaining,
  calculateMonthlyRequired,
  evaluateFundPacing,
  calculateSinkingFundsSummary,
  simulateWaterfallAllocation,
  DEFAULT_SINKING_FUNDS,
  type SinkingFund,
} from '../lib/sinking-funds-engine';

describe('sinking-funds-engine domain logic', () => {
  const refDate = new Date('2026-11-09T10:00:00Z'); // Inside Nov 2026 period (ends Nov 20)

  describe('calculateCyclesRemaining', () => {
    it('calculates remaining salary cycles correctly within the same cycle and upcoming months', () => {
      // Same cycle (ends Nov 20, 2026) -> 1 cycle
      expect(calculateCyclesRemaining('2026-11-20', refDate)).toBe(1);

      // Dec 20, 2026 -> 2 cycles (Nov, Dec)
      expect(calculateCyclesRemaining('2026-12-20', refDate)).toBe(2);

      // May 20, 2027 -> 7 cycles (Nov 26 to May 27)
      expect(calculateCyclesRemaining('2027-05-20', refDate)).toBe(7);
    });

    it('returns 0 for targets in the past', () => {
      expect(calculateCyclesRemaining('2026-10-20', refDate)).toBe(0);
      expect(calculateCyclesRemaining('2025-05-20', refDate)).toBe(0);
    });

    it('handles invalid or empty date strings gracefully', () => {
      expect(calculateCyclesRemaining('', refDate)).toBe(1);
      expect(calculateCyclesRemaining('invalid-date', refDate)).toBe(1);
    });

    it('adjusts cycle when reference date is past the 20th', () => {
      const lateRefDate = new Date('2026-11-22T10:00:00Z'); // Past 20th -> active cycle ends Dec 20
      // Target Dec 20 -> 1 cycle
      expect(calculateCyclesRemaining('2026-12-20', lateRefDate)).toBe(1);
    });
  });

  describe('calculateMonthlyRequired', () => {
    it('returns 0 when fund is already fully funded', () => {
      const fund: SinkingFund = {
        id: 'f1',
        name: 'Fund 1',
        category: 'obligation',
        priority: 'high',
        targetAmount: 5000000,
        currentAmount: 5000000,
        targetDate: '2027-05-20',
      };
      expect(calculateMonthlyRequired(fund, refDate)).toBe(0);
    });

    it('divides remaining deficit by remaining cycles', () => {
      // Remaining deficit: 3,000,000. Cycles: 3 (Nov, Dec, Jan)
      const fund: SinkingFund = {
        id: 'f2',
        name: 'Fund 2',
        category: 'obligation',
        priority: 'high',
        targetAmount: 5000000,
        currentAmount: 2000000,
        targetDate: '2027-01-20',
      };
      // 3 cycles: Nov, Dec, Jan -> 3,000,000 / 3 = 1,000,000
      expect(calculateMonthlyRequired(fund, refDate)).toBe(1000000);
    });

    it('returns full remaining amount if overdue', () => {
      const fund: SinkingFund = {
        id: 'f3',
        name: 'Overdue Fund',
        category: 'obligation',
        priority: 'high',
        targetAmount: 2000000,
        currentAmount: 500000,
        targetDate: '2026-09-20',
      };
      expect(calculateMonthlyRequired(fund, refDate)).toBe(1500000);
    });
  });

  describe('evaluateFundPacing', () => {
    it('classifies funded items accurately', () => {
      const fund: SinkingFund = {
        id: 'f-done',
        name: 'Done Fund',
        category: 'safety',
        priority: 'medium',
        targetAmount: 1000000,
        currentAmount: 1200000,
        targetDate: '2027-01-20',
      };
      const pacing = evaluateFundPacing(fund, refDate);
      expect(pacing.status).toBe('funded');
      expect(pacing.progressPct).toBe(100);
      expect(pacing.remainingAmount).toBe(0);
      expect(pacing.monthlyRequired).toBe(0);
      expect(pacing.isOverdue).toBe(false);
    });

    it('classifies overdue items accurately', () => {
      const fund: SinkingFund = {
        id: 'f-late',
        name: 'Late Fund',
        category: 'obligation',
        priority: 'high',
        targetAmount: 3000000,
        currentAmount: 1000000,
        targetDate: '2026-08-20',
      };
      const pacing = evaluateFundPacing(fund, refDate);
      expect(pacing.status).toBe('overdue');
      expect(pacing.isOverdue).toBe(true);
    });

    it('flags items needing attention when progress is low and deadline is near', () => {
      const fund: SinkingFund = {
        id: 'f-urgent',
        name: 'Urgent Fund',
        category: 'obligation',
        priority: 'high',
        targetAmount: 10000000,
        currentAmount: 2000000, // 20%
        targetDate: '2026-12-20', // 2 cycles left
      };
      const pacing = evaluateFundPacing(fund, refDate);
      expect(pacing.status).toBe('needs_attention');
      expect(pacing.progressPct).toBe(20);
    });

    it('identifies on-track funds', () => {
      const fund: SinkingFund = {
        id: 'f-track',
        name: 'Track Fund',
        category: 'lifestyle',
        priority: 'low',
        targetAmount: 6000000,
        currentAmount: 4000000, // 66.7%
        targetDate: '2027-06-20', // 8 cycles left
      };
      const pacing = evaluateFundPacing(fund, refDate);
      expect(pacing.status).toBe('on_track');
    });
  });

  describe('calculateSinkingFundsSummary', () => {
    it('aggregates portfolio metrics across all funds', () => {
      const sampleFunds: SinkingFund[] = [
        {
          id: '1',
          name: 'Pajak STNK',
          category: 'obligation',
          priority: 'high',
          targetAmount: 2000000,
          currentAmount: 1000000,
          targetDate: '2026-12-20', // 2 cycles -> 500,000 / mo
        },
        {
          id: '2',
          name: 'Dana Liburan',
          category: 'lifestyle',
          priority: 'low',
          targetAmount: 4000000,
          currentAmount: 4000000, // funded
          targetDate: '2027-01-20',
        },
      ];

      const summary = calculateSinkingFundsSummary(sampleFunds, 1000000, refDate);
      expect(summary.totalTarget).toBe(6000000);
      expect(summary.totalSaved).toBe(5000000);
      expect(summary.overallProgressPct).toBeCloseTo(83.3, 1);
      expect(summary.totalMonthlyRequired).toBe(500000);
      expect(summary.highPriorityMonthlyRequired).toBe(500000);
      expect(summary.fundedCount).toBe(1);
      expect(summary.activeCount).toBe(1);
      // Capacity: 1,000,000 / 500,000 = 200%
      expect(summary.capacityCoveragePct).toBe(200);
    });
  });

  describe('simulateWaterfallAllocation', () => {
    it('allocates strictly according to priority hierarchy', () => {
      const testFunds: SinkingFund[] = [
        {
          id: 'tier1',
          name: 'Pajak Kendaraan',
          category: 'obligation',
          priority: 'high',
          targetAmount: 2000000,
          currentAmount: 1000000,
          targetDate: '2026-12-20', // remaining 1,000,000, cycles 2 -> monthlyRequired 500,000
        },
        {
          id: 'tier2',
          name: 'Buffer Medis',
          category: 'safety',
          priority: 'medium',
          targetAmount: 3000000,
          currentAmount: 1000000,
          targetDate: '2027-01-20', // remaining 2,000,000, cycles 3 -> monthlyRequired ~666,667
        },
        {
          id: 'tier3',
          name: 'Gadget Upgrade',
          category: 'lifestyle',
          priority: 'low',
          targetAmount: 5000000,
          currentAmount: 1000000,
          targetDate: '2027-03-20', // monthlyRequired ~800,000
        },
      ];

      // Skenario 1: Surplus terbatas (Rp 500.000) -> hanya Tier 1 yang terisi
      const simLimited = simulateWaterfallAllocation(testFunds, 500000, refDate);
      expect(simLimited.totalAllocated).toBe(500000);
      expect(simLimited.unallocatedSurplus).toBe(0);

      const allocTier1 = simLimited.allocations.find((a) => a.fundId === 'tier1');
      const allocTier2 = simLimited.allocations.find((a) => a.fundId === 'tier2');
      const allocTier3 = simLimited.allocations.find((a) => a.fundId === 'tier3');

      expect(allocTier1?.allocatedAmount).toBe(500000);
      expect(allocTier2?.allocatedAmount).toBe(0);
      expect(allocTier3?.allocatedAmount).toBe(0);

      // Skenario 2: Surplus berlebih (Rp 5.000.000) -> mengisi kebutuhan bulanan semua pos lalu bonus ke defisit
      const simGenerous = simulateWaterfallAllocation(testFunds, 5000000, refDate);
      expect(simGenerous.totalAllocated).toBe(5000000);
      expect(simGenerous.unallocatedSurplus).toBe(0);

      const genTier1 = simGenerous.allocations.find((a) => a.fundId === 'tier1');
      // Defisit awal tier1 cuma 1,000,000, jadi tidak akan dialokasikan lebih dari 1,000,000
      expect(genTier1?.newBalance).toBe(2000000);
      expect(genTier1?.isFullyFunded).toBe(true);
    });

    it('returns empty allocation if surplus is 0 or negative', () => {
      const res = simulateWaterfallAllocation(DEFAULT_SINKING_FUNDS, 0, refDate);
      expect(res.totalAllocated).toBe(0);
      expect(res.unallocatedSurplus).toBe(0);
      expect(res.allocations.every((a) => a.allocatedAmount === 0)).toBe(true);
    });
  });
});
