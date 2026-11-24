import { describe, it, expect } from 'vitest';
import {
  classifyMerchantArchetype,
  calculateParetoConcentration,
  classifyMerchants,
  detectMerchantSurges,
  ARCHETYPE_META,
  type MerchantInput,
} from '../lib/merchant-intelligence-engine';

function makeMerchant(partial: Partial<MerchantInput>): MerchantInput {
  return {
    title: 'Test Merchant',
    category: 'Belanja',
    totalPaid: 100000,
    txCount: 1,
    avgAmount: 100000,
    maxAmount: 100000,
    periods: 1,
    monthlyData: [{ month: 'November 2026', amount: 100000, count: 1 }],
    ...partial,
  };
}

describe('merchant-intelligence-engine', () => {
  describe('classifyMerchantArchetype', () => {
    it('classifies high_ticket for rare large spends', () => {
      const m = makeMerchant({ avgAmount: 2_000_000, txCount: 2, totalPaid: 4_000_000 });
      expect(classifyMerchantArchetype(m)).toBe('high_ticket');
    });

    it('classifies recurring for stable multi-period merchants', () => {
      const m = makeMerchant({
        periods: 4,
        txCount: 4,
        avgAmount: 250_000,
        totalPaid: 1_000_000,
      });
      expect(classifyMerchantArchetype(m)).toBe('recurring');
    });

    it('classifies staple for frequent small spends', () => {
      const m = makeMerchant({
        txCount: 8,
        avgAmount: 50_000,
        totalPaid: 400_000,
        periods: 2,
      });
      expect(classifyMerchantArchetype(m)).toBe('staple');
    });

    it('classifies occasional for everything else', () => {
      const m = makeMerchant({ txCount: 2, avgAmount: 400_000, periods: 1 });
      expect(classifyMerchantArchetype(m)).toBe('occasional');
    });

    it('has a label and badge for every archetype', () => {
      for (const key of Object.keys(ARCHETYPE_META) as Array<keyof typeof ARCHETYPE_META>) {
        expect(ARCHETYPE_META[key].label.length).toBeGreaterThan(0);
        expect(ARCHETYPE_META[key].badge).toContain('bg-');
      }
    });
  });

  describe('calculateParetoConcentration', () => {
    it('flags highly concentrated when top 20% covers >= 80% of spend', () => {
      const merchants = [
        makeMerchant({ title: 'A', totalPaid: 8_000_000 }),
        makeMerchant({ title: 'B', totalPaid: 500_000 }),
        makeMerchant({ title: 'C', totalPaid: 500_000 }),
        makeMerchant({ title: 'D', totalPaid: 500_000 }),
        makeMerchant({ title: 'E', totalPaid: 500_000 }),
      ];
      const p = calculateParetoConcentration(merchants);
      expect(p.status).toBe('highly_concentrated');
      expect(p.top20SharePct).toBeGreaterThanOrEqual(80);
    });

    it('flags diversified when spend is spread evenly', () => {
      const merchants = Array.from({ length: 10 }, (_, i) =>
        makeMerchant({ title: `M${i}`, totalPaid: 1_000_000 }),
      );
      const p = calculateParetoConcentration(merchants);
      expect(p.status).toBe('diversified');
      expect(p.top20SharePct).toBeLessThan(50);
    });

    it('splits pareto set vs long tail at 80% cumulative', () => {
      const merchants = [
        makeMerchant({ title: 'A', totalPaid: 5_000_000 }),
        makeMerchant({ title: 'B', totalPaid: 3_000_000 }),
        makeMerchant({ title: 'C', totalPaid: 2_000_000 }),
      ];
      const p = calculateParetoConcentration(merchants);
      // A+B = 80% exactly
      expect(p.paretoCount).toBe(2);
      expect(p.paretoSharePct).toBe(80);
      expect(p.tailCount).toBe(1);
      expect(p.tailSpend).toBe(2_000_000);
    });

    it('handles empty input safely', () => {
      const p = calculateParetoConcentration([]);
      expect(p.totalSpend).toBe(0);
      expect(p.status).toBe('diversified');
    });
  });

  describe('classifyMerchants', () => {
    it('sorts desc by totalPaid and computes share + cumulative', () => {
      const merchants = [
        makeMerchant({ title: 'A', totalPaid: 3_000_000 }),
        makeMerchant({ title: 'B', totalPaid: 1_000_000 }),
      ];
      const classified = classifyMerchants(merchants);
      expect(classified[0].title).toBe('A');
      expect(classified[0].sharePct).toBe(75);
      expect(classified[0].cumulativePct).toBe(75);
      expect(classified[1].sharePct).toBe(25);
      expect(classified[1].cumulativePct).toBe(100);
    });

    it('marks pareto members up to 82% cumulative', () => {
      const merchants = [
        makeMerchant({ title: 'A', totalPaid: 8_000_000 }),
        makeMerchant({ title: 'B', totalPaid: 2_000_000 }),
      ];
      const classified = classifyMerchants(merchants);
      expect(classified[0].inPareto).toBe(true);
      expect(classified[1].inPareto).toBe(false);
    });
  });

  describe('detectMerchantSurges', () => {
    it('reports surge up when current spend jumps >= 40% vs baseline', () => {
      const merchants = [
        makeMerchant({
          title: 'Tokopedia',
          monthlyData: [
            { month: 'September 2026', amount: 1_000_000, count: 2 },
            { month: 'October 2026', amount: 1_000_000, count: 2 },
            { month: 'November 2026', amount: 2_000_000, count: 4 },
          ],
        }),
      ];
      const surges = detectMerchantSurges('November 2026', merchants);
      expect(surges).toHaveLength(1);
      expect(surges[0].direction).toBe('up');
      expect(surges[0].deltaPct).toBe(100);
      expect(surges[0].deltaAmount).toBe(1_000_000);
    });

    it('reports surge down when current spend drops >= 40% vs baseline', () => {
      const merchants = [
        makeMerchant({
          title: 'GoFood',
          monthlyData: [
            { month: 'September 2026', amount: 2_000_000, count: 10 },
            { month: 'October 2026', amount: 2_000_000, count: 10 },
            { month: 'November 2026', amount: 800_000, count: 4 },
          ],
        }),
      ];
      const surges = detectMerchantSurges('November 2026', merchants);
      expect(surges).toHaveLength(1);
      expect(surges[0].direction).toBe('down');
      expect(surges[0].deltaPct).toBe(-60);
    });

    it('labels new merchants without history', () => {
      const merchants = [
        makeMerchant({
          title: 'New Shop',
          monthlyData: [{ month: 'November 2026', amount: 500_000, count: 1 }],
        }),
      ];
      const surges = detectMerchantSurges('November 2026', merchants);
      expect(surges).toHaveLength(1);
      expect(surges[0].direction).toBe('new');
    });

    it('skips stable merchants within threshold', () => {
      const merchants = [
        makeMerchant({
          title: 'Stable',
          monthlyData: [
            { month: 'October 2026', amount: 1_000_000, count: 2 },
            { month: 'November 2026', amount: 1_100_000, count: 2 },
          ],
        }),
      ];
      const surges = detectMerchantSurges('November 2026', merchants);
      expect(surges).toHaveLength(0);
    });

    it('sorts surges by absolute delta descending', () => {
      const merchants = [
        makeMerchant({
          title: 'Small',
          monthlyData: [
            { month: 'October 2026', amount: 100_000, count: 1 },
            { month: 'November 2026', amount: 200_000, count: 2 },
          ],
        }),
        makeMerchant({
          title: 'Big',
          monthlyData: [
            { month: 'October 2026', amount: 1_000_000, count: 2 },
            { month: 'November 2026', amount: 3_000_000, count: 4 },
          ],
        }),
      ];
      const surges = detectMerchantSurges('November 2026', merchants);
      expect(surges[0].title).toBe('Big');
      expect(surges[1].title).toBe('Small');
    });
  });
});
