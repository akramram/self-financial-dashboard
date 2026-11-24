import { describe, it, expect } from 'vitest';
import {
  getRunwayStatus,
  calculateEmergencyTiers,
  estimateMonthsToFund,
  simulateScenario,
  categorizeLiquidityLadder,
  type AssetBreakdown,
} from '../lib/runway-simulator';

describe('runway-simulator domain logic', () => {
  it('correctly classifies runway status thresholds', () => {
    expect(getRunwayStatus(0.5)).toBe('critical');
    expect(getRunwayStatus(1.5)).toBe('caution');
    expect(getRunwayStatus(3.2)).toBe('healthy');
    expect(getRunwayStatus(6.0)).toBe('strong');
    expect(getRunwayStatus(12.5)).toBe('strong');
  });

  it('computes emergency fund tiers accurately', () => {
    const liquidAssets = 30000000;
    const monthlyExpense = 10000000;
    const monthlyFixed = 6000000;

    const tiers = calculateEmergencyTiers(liquidAssets, monthlyExpense, monthlyFixed);
    expect(tiers).toHaveLength(3);

    // Survival (3 months fixed = 18M)
    const survival = tiers.find((t) => t.id === 'survival');
    expect(survival).toBeDefined();
    expect(survival?.targetAmount).toBe(18000000);
    expect(survival?.currentAmount).toBe(30000000);
    expect(survival?.fundedPct).toBe(100);
    expect(survival?.shortfall).toBe(0);

    // Standard (6 months expense = 60M)
    const standard = tiers.find((t) => t.id === 'standard');
    expect(standard).toBeDefined();
    expect(standard?.targetAmount).toBe(60000000);
    expect(standard?.fundedPct).toBe(50);
    expect(standard?.shortfall).toBe(30000000);

    // Fortress (12 months expense = 120M)
    const fortress = tiers.find((t) => t.id === 'fortress');
    expect(fortress).toBeDefined();
    expect(fortress?.targetAmount).toBe(120000000);
    expect(fortress?.fundedPct).toBe(25);
    expect(fortress?.shortfall).toBe(90000000);
  });

  it('calculates estimate months to fund target', () => {
    expect(estimateMonthsToFund(0, 5000000)).toBe(0);
    expect(estimateMonthsToFund(15000000, 5000000)).toBe(3);
    expect(estimateMonthsToFund(16000000, 5000000)).toBe(4);
    expect(estimateMonthsToFund(10000000, 0)).toBe(Infinity);
  });

  it('simulates stress scenarios with lump sum shocks and expense variations', () => {
    const liquidAssets = 50000000;
    const baselineExpense = 10000000;
    const monthlyFixed = 6000000;

    // Skenario 1: Lean survival mode (only fixed expenses)
    const lean = simulateScenario(liquidAssets, baselineExpense, monthlyFixed, {
      id: 'lean',
      name: 'Mode Biaya Pokok',
      monthlyExpenseOverride: monthlyFixed,
    });
    expect(lean.monthlyExpense).toBe(6000000);
    expect(lean.effectiveLiquid).toBe(50000000);
    expect(lean.runwayMonths).toBeCloseTo(8.33, 1);
    expect(lean.deltaMonths).toBeGreaterThan(0);
    expect(lean.status).toBe('strong');

    // Skenario 2: Syok pengeluaran darurat mendadak
    const shock = simulateScenario(liquidAssets, baselineExpense, monthlyFixed, {
      id: 'shock',
      name: 'Syok Medis Rp 20 Juta',
      monthlyExpenseOverride: baselineExpense,
      lumpSumShock: 20000000,
    });
    expect(shock.effectiveLiquid).toBe(30000000);
    expect(shock.runwayMonths).toBe(3);
    expect(shock.deltaMonths).toBe(-2);
    expect(shock.status).toBe('healthy');
  });

  it('categorizes assets into 4 liquidity ladder tiers', () => {
    const breakdown: AssetBreakdown[] = [
      { name: 'Bank BCA', value: 10000000, liquidityPct: 1.0, liquidValue: 10000000 },
      { name: 'RDPU Bibit', value: 20000000, liquidityPct: 0.9, liquidValue: 18000000 },
      { name: 'Saham BBRI', value: 30000000, liquidityPct: 0.5, liquidValue: 15000000 },
      { name: 'Saham US', value: 10000000, liquidityPct: 0.3, liquidValue: 3000000 },
    ];

    const ladder = categorizeLiquidityLadder(breakdown);
    expect(ladder).toHaveLength(4);

    expect(ladder[0].tier).toBe(1);
    expect(ladder[0].assets).toHaveLength(1);
    expect(ladder[0].assets[0].name).toBe('Bank BCA');
    expect(ladder[0].totalLiquid).toBe(10000000);

    expect(ladder[1].tier).toBe(2);
    expect(ladder[1].assets).toHaveLength(1);
    expect(ladder[1].assets[0].name).toBe('RDPU Bibit');

    expect(ladder[2].tier).toBe(3);
    expect(ladder[2].assets).toHaveLength(1);
    expect(ladder[2].assets[0].name).toBe('Saham BBRI');

    expect(ladder[3].tier).toBe(4);
    expect(ladder[3].assets).toHaveLength(1);
    expect(ladder[3].assets[0].name).toBe('Saham US');
    expect(ladder[3].liquidityDiscount).toBe(7000000);
  });
});
