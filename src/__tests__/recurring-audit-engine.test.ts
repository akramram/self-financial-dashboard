import { describe, it, expect } from 'vitest';
import {
  calculateRecurringBurden,
  calculateCompoundedFutureValue,
  calculateCutBackSimulation,
  classifyRecurringCommitments,
  getTemporaryCommitmentRoadmap,
  generateAuditRecommendations,
} from '../lib/recurring-audit-engine';
import type { RecurringCostItem } from '../lib/db';

describe('recurring-audit-engine', () => {
  describe('calculateRecurringBurden', () => {
    it('returns healthy status when ratio is <= 15%', () => {
      const burden = calculateRecurringBurden(2000000, 20000000);
      expect(burden.ratioPct).toBe(10);
      expect(burden.status).toBe('healthy');
      expect(burden.statusLabel).toContain('Sangat Sehat');
    });

    it('returns moderate status when ratio is between 15% and 25%', () => {
      const burden = calculateRecurringBurden(4000000, 20000000);
      expect(burden.ratioPct).toBe(20);
      expect(burden.status).toBe('moderate');
      expect(burden.statusLabel).toContain('Moderat');
    });

    it('returns heavy status when ratio is between 25% and 40%', () => {
      const burden = calculateRecurringBurden(6000000, 20000000);
      expect(burden.ratioPct).toBe(30);
      expect(burden.status).toBe('heavy');
      expect(burden.statusLabel).toContain('Beban Tinggi');
    });

    it('returns critical status when ratio exceeds 40%', () => {
      const burden = calculateRecurringBurden(10000000, 20000000);
      expect(burden.ratioPct).toBe(50);
      expect(burden.status).toBe('critical');
      expect(burden.statusLabel).toContain('Beban Kritis');
    });

    it('handles zero or negative income safely', () => {
      const burden = calculateRecurringBurden(3000000, 0);
      expect(burden.ratioPct).toBe(0);
      expect(burden.status).toBe('healthy');
    });
  });

  describe('calculateCompoundedFutureValue', () => {
    it('calculates monthly compounding future value correctly', () => {
      const monthlyP = 1000000;
      const res1 = calculateCompoundedFutureValue(monthlyP, 1, 7);
      expect(res1.principal).toBe(12000000);
      expect(res1.growth).toBeGreaterThan(0);
      expect(res1.total).toBe(res1.principal + res1.growth);

      const res5 = calculateCompoundedFutureValue(monthlyP, 5, 7);
      expect(res5.principal).toBe(60000000);
      expect(res5.growth).toBeGreaterThan(res1.growth);
      expect(res5.total).toBeGreaterThan(70000000);
    });

    it('handles 0 contribution safely', () => {
      const res = calculateCompoundedFutureValue(0, 3, 7);
      expect(res.principal).toBe(0);
      expect(res.growth).toBe(0);
      expect(res.total).toBe(0);
    });
  });

  describe('calculateCutBackSimulation', () => {
    const mockItems: RecurringCostItem[] = [
      { id: 1, title: 'Netflix', category: 'Tagihan', amount: 186000, type: 'credit_expense', active: true, end_date: null, isTemporary: false },
      { id: 2, title: 'Spotify', category: 'Tagihan', amount: 55000, type: 'credit_expense', active: true, end_date: null, isTemporary: false },
      { id: 3, title: 'Kontrakan', category: 'Tagihan', amount: 1150000, type: 'cash', active: true, end_date: null, isTemporary: false },
      { id: 4, title: 'Gym', category: 'Kesehatan', amount: 350000, type: 'cash', active: false, end_date: null, isTemporary: false }, // paused
    ];

    it('simulates cutting selected items and computes savings and wealth projection', () => {
      const sim = calculateCutBackSimulation(mockItems.filter((i) => i.active), [1, 2]);
      expect(sim.originalMonthly).toBe(186000 + 55000 + 1150000); // 1391000
      expect(sim.cutMonthly).toBe(186000 + 55000); // 241000
      expect(sim.cutAnnual).toBe(241000 * 12);
      expect(sim.newMonthly).toBe(1150000);
      expect(sim.cutCount).toBe(2);
      expect(sim.wealthGrowth).toHaveLength(3); // 1, 3, 5 years
      expect(sim.wealthGrowth[0].years).toBe(1);
      expect(sim.wealthGrowth[2].years).toBe(5);
    });

    it('handles no items cut (empty selection)', () => {
      const sim = calculateCutBackSimulation(mockItems.filter((i) => i.active), []);
      expect(sim.cutMonthly).toBe(0);
      expect(sim.newMonthly).toBe(sim.originalMonthly);
      expect(sim.savingsPct).toBe(0);
      expect(sim.cutCount).toBe(0);
    });
  });

  describe('classifyRecurringCommitments', () => {
    const mockItems: RecurringCostItem[] = [
      { id: 1, title: 'Kontrakan Bulanan', category: 'Tagihan', amount: 1150000, type: 'cash', active: true, end_date: null, isTemporary: false },
      { id: 2, title: 'Uang Istri', category: 'Istri', amount: 3000000, type: 'cash', active: true, end_date: null, isTemporary: false },
      { id: 3, title: 'Cicilan Tyranno', category: 'Tagihan', amount: 1293194, type: 'credit_expense', active: true, end_date: null, isTemporary: true },
      { id: 4, title: 'Wifi Indihome', category: 'Tagihan', amount: 350000, type: 'cash', active: true, end_date: null, isTemporary: false },
      { id: 5, title: 'Zakat Penghasilan', category: 'Zakat', amount: 250000, type: 'cash', active: true, end_date: null, isTemporary: false },
    ];

    it('classifies items into functional pillars', () => {
      const pillars = classifyRecurringCommitments(mockItems);
      expect(pillars.length).toBeGreaterThanOrEqual(3);

      const living = pillars.find((p) => p.key === 'living');
      expect(living).toBeDefined();
      expect(living?.items.some((i) => i.title.includes('Istri'))).toBe(true);

      const installments = pillars.find((p) => p.key === 'installments');
      expect(installments).toBeDefined();
      expect(installments?.items.some((i) => i.title.includes('Cicilan'))).toBe(true);

      const digital = pillars.find((p) => p.key === 'digital_utility');
      expect(digital).toBeDefined();
      expect(digital?.items.some((i) => i.title.includes('Wifi'))).toBe(true);

      const wealth = pillars.find((p) => p.key === 'wealth_invest');
      expect(wealth).toBeDefined();
      expect(wealth?.items.some((i) => i.title.includes('Zakat'))).toBe(true);
    });
  });

  describe('getTemporaryCommitmentRoadmap', () => {
    const mockItems: RecurringCostItem[] = [
      { id: 1, title: 'Cicilan A', category: 'Tagihan', amount: 500000, type: 'credit_expense', active: true, end_date: '2026-12', isTemporary: true },
      { id: 2, title: 'Cicilan B', category: 'Tagihan', amount: 300000, type: 'credit_expense', active: true, end_date: '2026-09', isTemporary: true },
      { id: 3, title: 'Kontrakan', category: 'Tagihan', amount: 1000000, type: 'cash', active: true, end_date: null, isTemporary: false },
      { id: 4, title: 'Cicilan C (Paused)', category: 'Tagihan', amount: 400000, type: 'credit_expense', active: false, end_date: '2027-01', isTemporary: true },
    ];

    it('returns chronological roadmap of temporary commitments with cumulative savings', () => {
      const roadmap = getTemporaryCommitmentRoadmap(mockItems);
      expect(roadmap).toHaveLength(2); // only active temporary items
      expect(roadmap[0].title).toBe('Cicilan B');
      expect(roadmap[0].endDate).toBe('2026-09');
      expect(roadmap[0].cumulativeFreed).toBe(300000);

      expect(roadmap[1].title).toBe('Cicilan A');
      expect(roadmap[1].endDate).toBe('2026-12');
      expect(roadmap[1].cumulativeFreed).toBe(800000); // 300k + 500k
    });
  });

  describe('generateAuditRecommendations', () => {
    it('produces insightful recommendations without em-dashes', () => {
      const items: RecurringCostItem[] = [
        { id: 1, title: 'Cicilan Motor', category: 'Kredit', amount: 1200000, type: 'credit_expense', active: true, end_date: '2026-11', isTemporary: true },
        { id: 2, title: 'Internet', category: 'Tagihan', amount: 400000, type: 'cash', active: true, end_date: null, isTemporary: false },
      ];

      const recs = generateAuditRecommendations({
        monthlyTotal: 1600000,
        income: 20000000,
        items,
        cutBackMonthly: 400000,
      });

      expect(recs.length).toBeGreaterThanOrEqual(2);
      recs.forEach((rec) => {
        expect(rec.title).not.toContain('—');
        expect(rec.description).not.toContain('—');
      });
    });
  });
});
