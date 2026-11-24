import { describe, it, expect } from 'vitest';
import {
  calculateAgilityScore,
  detectCostCreep,
  simulateDiscretionaryCut,
  categorizeDiscretionaryElasticity,
} from '../lib/spending-mix-engine';

describe('Spending Mix & Agility Engine', () => {
  describe('calculateAgilityScore', () => {
    it('returns high agility tier when recurring percentage is low', () => {
      const res = calculateAgilityScore(25);
      expect(res.score).toBe(75);
      expect(res.tier).toBe('high');
      expect(res.title).toBe('Fleksibilitas Tinggi');
    });

    it('returns moderate agility tier when recurring percentage is between 41 and 60', () => {
      const res = calculateAgilityScore(50);
      expect(res.score).toBe(50);
      expect(res.tier).toBe('moderate');
      expect(res.title).toBe('Fleksibilitas Moderat');
    });

    it('returns low agility tier when recurring percentage is high', () => {
      const res = calculateAgilityScore(75);
      expect(res.score).toBe(25);
      expect(res.tier).toBe('low');
      expect(res.title).toBe('Beban Tetap Tinggi');
    });

    it('handles boundary and non-finite edge cases gracefully', () => {
      const res0 = calculateAgilityScore(0);
      expect(res0.score).toBe(100);
      expect(res0.tier).toBe('high');

      const res100 = calculateAgilityScore(100);
      expect(res100.score).toBe(0);
      expect(res100.tier).toBe('low');

      const resNaN = calculateAgilityScore(NaN);
      expect(resNaN.score).toBe(100);
    });
  });

  describe('detectCostCreep', () => {
    it('handles insufficient history gracefully', () => {
      const res = detectCostCreep([{ month: 'Oct 2026', recurring_pct: 35 }]);
      expect(res.direction).toBe('stable');
      expect(res.deltaPct).toBe(0);
    });

    it('detects creeping fixed costs when delta exceeds threshold', () => {
      const periods = [
        { month: 'Jul 2026', recurring_pct: 30 },
        { month: 'Aug 2026', recurring_pct: 32 },
        { month: 'Sep 2026', recurring_pct: 42 },
        { month: 'Oct 2026', recurring_pct: 45 },
      ];
      const res = detectCostCreep(periods);
      expect(res.direction).toBe('creeping');
      expect(res.deltaPct).toBeGreaterThan(4);
      expect(res.label).toContain('Creep');
    });

    it('detects improving efficiency when recurring share decreases', () => {
      const periods = [
        { month: 'Jul 2026', recurring_pct: 50 },
        { month: 'Aug 2026', recurring_pct: 48 },
        { month: 'Sep 2026', recurring_pct: 38 },
        { month: 'Oct 2026', recurring_pct: 35 },
      ];
      const res = detectCostCreep(periods);
      expect(res.direction).toBe('improving');
      expect(res.deltaPct).toBeLessThan(-4);
      expect(res.label).toContain('Membaik');
    });

    it('identifies stable ratio within normal fluctuation', () => {
      const periods = [
        { month: 'Jul 2026', recurring_pct: 40 },
        { month: 'Aug 2026', recurring_pct: 41 },
        { month: 'Sep 2026', recurring_pct: 39 },
        { month: 'Oct 2026', recurring_pct: 42 },
      ];
      const res = detectCostCreep(periods);
      expect(res.direction).toBe('stable');
      expect(res.label).toContain('Stabil');
    });
  });

  describe('simulateDiscretionaryCut', () => {
    it('simulates 50% discretionary cut accurately', () => {
      const res = simulateDiscretionaryCut(10_000_000, 5_000_000, 50);
      expect(res.monthlyFreed).toBe(5_000_000);
      expect(res.annualizedFreed).toBe(60_000_000);
      expect(res.newDiscretionary).toBe(5_000_000);
      expect(res.newTotalSpending).toBe(10_000_000);
      expect(res.newRecurringPct).toBe(50);
      expect(res.newDiscretionaryPct).toBe(50);
    });

    it('handles 100% full freeze lockdown simulation', () => {
      const res = simulateDiscretionaryCut(8_000_000, 4_000_000, 100);
      expect(res.monthlyFreed).toBe(8_000_000);
      expect(res.newDiscretionary).toBe(0);
      expect(res.newTotalSpending).toBe(4_000_000);
      expect(res.newRecurringPct).toBe(100);
      expect(res.newDiscretionaryPct).toBe(0);
    });

    it('handles 0% cut with zero cash freed', () => {
      const res = simulateDiscretionaryCut(6_000_000, 3_000_000, 0);
      expect(res.monthlyFreed).toBe(0);
      expect(res.annualizedFreed).toBe(0);
      expect(res.newTotalSpending).toBe(9_000_000);
    });
  });

  describe('categorizeDiscretionaryElasticity', () => {
    it('categorizes categories into elastic, semi-elastic, and essential tiers', () => {
      const input = [
        { category: 'Belanja Online', amount: 3_000_000 },
        { category: 'Groceries Supermarket', amount: 4_000_000 },
        { category: 'Transportasi Umum', amount: 1_000_000 },
      ];

      const res = categorizeDiscretionaryElasticity(input);
      expect(res.items.length).toBe(3);

      const elasticItem = res.items.find((i) => i.category === 'Belanja Online');
      expect(elasticItem?.tier).toBe('elastic');

      const essentialItem = res.items.find((i) => i.category === 'Groceries Supermarket');
      expect(essentialItem?.tier).toBe('essential_variable');

      const semiItem = res.items.find((i) => i.category === 'Transportasi Umum');
      expect(semiItem?.tier).toBe('semi_elastic');

      expect(res.elasticTotal).toBe(3_000_000);
      expect(res.essentialTotal).toBe(4_000_000);
      expect(res.semiElasticTotal).toBe(1_000_000);
    });

    it('handles empty input gracefully', () => {
      const res = categorizeDiscretionaryElasticity([]);
      expect(res.items).toEqual([]);
      expect(res.elasticTotal).toBe(0);
    });
  });
});
