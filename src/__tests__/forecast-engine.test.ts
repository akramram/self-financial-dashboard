import { describe, it, expect } from 'vitest';
import {
  calculateMultiModelProjections,
  calculateSafeDailyAllowance,
  calculateEomSavingsForecast,
  calculateCategoryBurnTimeline,
  simulateCourseCorrection,
} from '../lib/forecast-engine';

describe('forecast-engine', () => {
  describe('calculateMultiModelProjections', () => {
    it('produces 5 model projections and cone of uncertainty', () => {
      const cumulative = [
        { day: '2026-10-21', cumulative: 200000 },
        { day: '2026-10-22', cumulative: 450000 },
        { day: '2026-10-23', cumulative: 600000 },
        { day: '2026-10-24', cumulative: 850000 },
        { day: '2026-10-25', cumulative: 1000000 },
      ];

      const res = calculateMultiModelProjections({
        cumulative,
        totalSpent: 1000000,
        daysElapsed: 5,
        periodLength: 30,
        daysRemaining: 25,
      });

      expect(res.models).toHaveLength(5);
      expect(res.baselineModelId).toBe('regression');
      expect(res.coneOfUncertainty.lowerBound).toBeLessThanOrEqual(res.coneOfUncertainty.upperBound);
      expect(res.coneOfUncertainty.spread).toBeGreaterThanOrEqual(0);

      const linear = res.models.find((m) => m.id === 'linear_pace');
      expect(linear).toBeDefined();
      expect(linear?.projectedTotal).toBe(6000000); // 1,000,000 / 5 * 30

      const conservative = res.models.find((m) => m.id === 'conservative');
      const austerity = res.models.find((m) => m.id === 'austerity');
      expect(conservative!.projectedTotal).toBeGreaterThan(austerity!.projectedTotal);
    });

    it('handles zero or minimal days elapsed safely', () => {
      const res = calculateMultiModelProjections({
        cumulative: [],
        totalSpent: 0,
        daysElapsed: 0,
        periodLength: 30,
        daysRemaining: 30,
      });

      expect(res.models).toHaveLength(5);
      expect(res.coneOfUncertainty.spread).toBe(0);
      expect(res.baselineProjected).toBe(0);
    });
  });

  describe('calculateSafeDailyAllowance', () => {
    it('calculates daily quota and feasibility correctly when budget is healthy', () => {
      const res = calculateSafeDailyAllowance({
        targetCeiling: 6000000,
        currentSpent: 2000000,
        daysRemaining: 20,
        currentDailyAvg: 200000,
      });

      // Remaining budget: 4,000,000 / 20 days = 200,000/day
      expect(res.dailyAllowance).toBe(200000);
      expect(res.diffVsCurrentDaily).toBe(0);
      expect(res.feasibility).toBe('manageable');
    });

    it('flags critical when target ceiling is already breached', () => {
      const res = calculateSafeDailyAllowance({
        targetCeiling: 5000000,
        currentSpent: 5200000,
        daysRemaining: 10,
        currentDailyAvg: 260000,
      });

      expect(res.dailyAllowance).toBe(0);
      expect(res.feasibility).toBe('critical');
    });

    it('identifies tight feasibility when quota is less than 50% of current pace', () => {
      const res = calculateSafeDailyAllowance({
        targetCeiling: 3000000,
        currentSpent: 2600000,
        daysRemaining: 10,
        currentDailyAvg: 200000,
      });

      // 400,000 / 10 = 40,000/day vs 200,000 current (20%)
      expect(res.dailyAllowance).toBe(40000);
      expect(res.feasibility).toBe('tight');
    });

    it('handles end of period (0 days remaining)', () => {
      const res = calculateSafeDailyAllowance({
        targetCeiling: 5000000,
        currentSpent: 4500000,
        daysRemaining: 0,
        currentDailyAvg: 150000,
      });

      expect(res.dailyAllowance).toBe(0);
      expect(res.feasibility).toBe('very_easy');
      expect(res.feasibilityLabel).toBe('Target Tercapai');
    });
  });

  describe('calculateEomSavingsForecast (FIN-235 invest-as-savings)', () => {
    it('correctly treats Invest as saving and projects savings rate', () => {
      const res = calculateEomSavingsForecast({
        income: 10000000,
        investTotal: 2000000,
        projectedTotalSpending: 6000000, // living = 6,000,000 - 2,000,000 = 4,000,000
      });

      // Living expense = 4,000,000. Savings = 10,000,000 - 4,000,000 = 6,000,000. Rate = 60%.
      expect(res.projectedLivingExpense).toBe(4000000);
      expect(res.projectedSavings).toBe(6000000);
      expect(res.projectedSavingsRatePct).toBe(60);
      expect(res.status).toBe('excellent');
    });

    it('detects deficit when living expense exceeds income', () => {
      const res = calculateEomSavingsForecast({
        income: 5000000,
        investTotal: 0,
        projectedTotalSpending: 6500000,
      });

      expect(res.projectedSavings).toBe(-1500000);
      expect(res.status).toBe('deficit');
    });
  });

  describe('calculateCategoryBurnTimeline', () => {
    it('computes days to exhaustion and status per category', () => {
      const categories = [
        { category: 'Makan', color: '#ef4444', spent: 1500000, limit: 2000000 },
        { category: 'Transport', color: '#3b82f6', spent: 500000, limit: 1500000 },
        { category: 'Hiburan', color: '#8b5cf6', spent: 1100000, limit: 1000000 },
      ];

      const res = calculateCategoryBurnTimeline(categories, 15, 30);

      expect(res).toHaveLength(3);

      // Makan: 1,500,000 spent in 15 days = 100,000/day. Remaining 500,000 -> 5 days to exhaust.
      const makan = res.find((c) => c.category === 'Makan')!;
      expect(makan.dailyAvg).toBe(100000);
      expect(makan.daysToExhaust).toBe(5);
      expect(makan.status).toBe('danger'); // projected to exceed limit: 100,000 * 30 = 3,000,000 vs 2,000,000

      // Hiburan: already exceeded limit
      const hiburan = res.find((c) => c.category === 'Hiburan')!;
      expect(hiburan.isAlreadyExhausted).toBe(true);
      expect(hiburan.status).toBe('critical');
    });
  });

  describe('simulateCourseCorrection', () => {
    it('simulates daily spending cut and one-time shock', () => {
      const res = simulateCourseCorrection({
        currentSpent: 2000000,
        daysRemaining: 10,
        currentDailyAvg: 200000,
        discretionaryAdjustmentPct: -25, // 25% cut on remaining days
        oneTimeShockAmount: 300000, // unexpected shock
        income: 8000000,
        investTotal: 1000000,
      });

      // Original remaining: 200,000 * 10 = 2,000,000. Total = 4,000,000.
      expect(res.originalRemainingProjected).toBe(2000000);
      expect(res.originalProjectedTotal).toBe(4000000);

      // Adjusted remaining: (200,000 * 0.75 = 150,000 * 10) + 300,000 = 1,800,000. Total = 3,800,000.
      expect(res.adjustedRemainingProjected).toBe(1800000);
      expect(res.adjustedProjectedTotal).toBe(3800000);
      expect(res.totalDelta).toBe(-200000);
      expect(res.savingsDelta).toBe(200000);
      expect(res.riskShift).toBe('reduced');
    });
  });
});
