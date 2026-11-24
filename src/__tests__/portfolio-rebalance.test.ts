import { describe, it, expect } from 'vitest';
import {
  computeRebalance,
  distributeInflow,
  REBALANCE_PRESETS,
  type AssetItem,
} from '../lib/portfolio-rebalance';

describe('portfolio-rebalance math engine', () => {
  const sampleAssets: AssetItem[] = [
    { key: 'Saham', value: 50_000_000 },
    { key: 'Reksadana', value: 30_000_000 },
    { key: 'Kas', value: 15_000_000 },
    { key: 'Crypto', value: 5_000_000 },
  ]; // Total = 100_000_000

  it('computes correct current percentages and drifts against balanced targets', () => {
    const targets = { Saham: 40, Reksadana: 30, Kas: 20, Crypto: 10 };
    const res = computeRebalance(sampleAssets, targets);

    expect(res.totalCurrentValue).toBe(100_000_000);
    expect(res.isBalanced).toBe(false);

    const saham = res.items.find((i) => i.key === 'Saham')!;
    expect(saham.currentPct).toBe(50);
    expect(saham.targetPct).toBe(40);
    expect(saham.driftPct).toBe(10);
    expect(saham.status).toBe('overweight');
    expect(saham.rebalanceAmount).toBe(-10_000_000); // 40M target - 50M current

    const kas = res.items.find((i) => i.key === 'Kas')!;
    expect(kas.currentPct).toBe(15);
    expect(kas.targetPct).toBe(20);
    expect(kas.driftPct).toBe(-5);
    expect(kas.status).toBe('underweight');
    expect(kas.rebalanceAmount).toBe(5_000_000);

    const reksadana = res.items.find((i) => i.key === 'Reksadana')!;
    expect(reksadana.currentPct).toBe(30);
    expect(reksadana.status).toBe('balanced');
  });

  it('marks portfolio as balanced when drift is within tolerance', () => {
    const balancedAssets: AssetItem[] = [
      { key: 'Saham', value: 40_500_000 }, // 40.5%
      { key: 'Reksadana', value: 29_800_000 }, // 29.8%
      { key: 'Kas', value: 19_900_000 }, // 19.9%
      { key: 'Crypto', value: 9_800_000 }, // 9.8%
    ];
    const targets = { Saham: 40, Reksadana: 30, Kas: 20, Crypto: 10 };
    const res = computeRebalance(balancedAssets, targets, { driftTolerance: 1.5 });

    expect(res.isBalanced).toBe(true);
    expect(res.maxDrift).toBeLessThanOrEqual(1.5);
  });

  it('allocates fresh cash inflow primarily to underweight assets', () => {
    // Saham is 50%, Kas is 15%, Crypto is 5% (Total 100M)
    // Add 10M cash inflow
    const targets = { Saham: 40, Reksadana: 30, Kas: 20, Crypto: 10 };
    const dist = distributeInflow(sampleAssets, targets, 10_000_000);

    // Kas needs 7M (to reach 20% of 110M = 22M), Crypto needs 6M (to reach 10% of 110M = 11M)
    // Saham is overweight so it should receive 0 of fresh cash
    expect(dist['Saham']).toBe(0);
    expect(dist['Kas']).toBeGreaterThan(0);
    expect(dist['Crypto']).toBeGreaterThan(0);
    const sum = Object.values(dist).reduce((a, b) => a + b, 0);
    expect(sum).toBe(10_000_000);
  });

  it('handles empty or zero portfolio safely', () => {
    const emptyAssets: AssetItem[] = [];
    const targets = { Saham: 50, Kas: 50 };
    const res = computeRebalance(emptyAssets, targets);

    expect(res.totalCurrentValue).toBe(0);
    expect(res.items).toHaveLength(0);
    expect(res.actions).toHaveLength(0);
    expect(res.isBalanced).toBe(true);
  });

  it('includes default presets with valid configurations', () => {
    expect(REBALANCE_PRESETS.balanced).toBeDefined();
    expect(REBALANCE_PRESETS.growth).toBeDefined();
    expect(REBALANCE_PRESETS.conservative).toBeDefined();

    const sumBalanced = Object.values(REBALANCE_PRESETS.balanced.targets).reduce((a, b) => a + b, 0);
    expect(sumBalanced).toBe(100);
  });
});
