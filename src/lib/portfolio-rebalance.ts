/**
 * Portfolio Rebalancing Analytics & Math Engine
 *
 * Computes portfolio asset drift, target allocation alignment, and
 * optimal capital injection / rebalancing recommendations.
 * Antislop compliant: pure domain functions, no em-dashes in messages.
 */

export interface AssetItem {
  key: string;
  value: number;
}

export type AllocationStatus = 'overweight' | 'underweight' | 'balanced';

export interface RebalanceItem {
  key: string;
  currentValue: number;
  currentPct: number;
  targetPct: number;
  targetValue: number;
  driftPct: number;
  status: AllocationStatus;
  rebalanceAmount: number;
  inflowAllocation: number;
}

export interface RebalanceAction {
  key: string;
  action: 'buy' | 'sell' | 'hold';
  amount: number;
  message: string;
}

export interface RebalanceResult {
  totalCurrentValue: number;
  totalNewValue: number;
  cashInflow: number;
  items: RebalanceItem[];
  maxDrift: number;
  isBalanced: boolean;
  actions: RebalanceAction[];
}

export const REBALANCE_PRESETS: Record<string, { label: string; description: string; targets: Record<string, number> }> = {
  balanced: {
    label: 'Balanced (40/30/20/10)',
    description: '40% Saham, 30% Reksadana, 20% Kas, 10% Crypto',
    targets: { Saham: 40, Reksadana: 30, Kas: 20, Crypto: 10 },
  },
  growth: {
    label: 'Aggressive Growth (60/25/10/5)',
    description: '60% Saham, 25% Reksadana, 10% Kas, 5% Crypto',
    targets: { Saham: 60, Reksadana: 25, Kas: 10, Crypto: 5 },
  },
  conservative: {
    label: 'Defensive Preservation (35/35/25/5)',
    description: '35% Kas, 35% Reksadana, 25% Saham, 5% Crypto',
    targets: { Kas: 35, Reksadana: 35, Saham: 25, Crypto: 5 },
  },
};

/**
 * Distributes new cash inflow specifically to underweight assets
 * to minimize portfolio drift without triggering asset sales.
 */
export function distributeInflow(
  currentAssets: AssetItem[],
  targets: Record<string, number>,
  inflow: number
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const asset of currentAssets) {
    result[asset.key] = 0;
  }

  if (inflow <= 0) return result;

  const totalCurrent = currentAssets.reduce((sum, a) => sum + Math.max(0, a.value), 0);
  const totalNew = totalCurrent + inflow;

  // Identify shortfall per asset relative to target in the expanded portfolio
  const deficits: { key: string; deficit: number }[] = [];
  let totalDeficit = 0;

  for (const asset of currentAssets) {
    const targetPct = targets[asset.key] ?? 0;
    const idealValue = (targetPct / 100) * totalNew;
    const deficit = Math.max(0, idealValue - Math.max(0, asset.value));
    deficits.push({ key: asset.key, deficit });
    totalDeficit += deficit;
  }

  if (totalDeficit > 0) {
    for (const d of deficits) {
      // Allocate proportionally to deficit, capped by inflow
      const allocated = Math.round((d.deficit / totalDeficit) * inflow);
      result[d.key] = allocated;
    }
  } else {
    // If no deficit, distribute by raw target percentages
    for (const asset of currentAssets) {
      const targetPct = targets[asset.key] ?? 0;
      result[asset.key] = Math.round((targetPct / 100) * inflow);
    }
  }

  // Adjust rounding differences
  const sumAllocated = Object.values(result).reduce((s, v) => s + v, 0);
  const remainder = inflow - sumAllocated;
  if (remainder !== 0 && currentAssets.length > 0) {
    // assign remainder to asset with highest target weight
    const topAsset = [...currentAssets].sort(
      (a, b) => (targets[b.key] ?? 0) - (targets[a.key] ?? 0)
    )[0];
    if (topAsset) {
      result[topAsset.key] += remainder;
    }
  }

  return result;
}

/**
 * Computes comprehensive portfolio rebalancing metrics and recommendations.
 */
export function computeRebalance(
  currentAssets: AssetItem[],
  targets: Record<string, number>,
  options: {
    cashInflow?: number;
    driftTolerance?: number;
  } = {}
): RebalanceResult {
  const cashInflow = Math.max(0, options.cashInflow ?? 0);
  const driftTolerance = Math.max(0.1, options.driftTolerance ?? 1.5);

  const validAssets = currentAssets.filter((a) => a.key && a.key.trim().length > 0);
  const totalCurrentValue = validAssets.reduce((sum, a) => sum + Math.max(0, a.value), 0);
  const totalNewValue = totalCurrentValue + cashInflow;

  const inflowDist = distributeInflow(validAssets, targets, cashInflow);

  let maxDrift = 0;
  const items: RebalanceItem[] = [];
  const actions: RebalanceAction[] = [];

  for (const asset of validAssets) {
    const val = Math.max(0, asset.value);
    const currentPct = totalCurrentValue > 0 ? (val / totalCurrentValue) * 100 : 0;
    const targetPct = targets[asset.key] ?? 0;
    const targetValue = (targetPct / 100) * totalCurrentValue;
    const driftPct = currentPct - targetPct;

    if (Math.abs(driftPct) > maxDrift) {
      maxDrift = Math.abs(driftPct);
    }

    let status: AllocationStatus = 'balanced';
    if (driftPct > driftTolerance) {
      status = 'overweight';
    } else if (driftPct < -driftTolerance) {
      status = 'underweight';
    }

    const rebalanceAmount = Math.round(targetValue - val);
    const inflowAllocation = inflowDist[asset.key] ?? 0;

    items.push({
      key: asset.key,
      currentValue: val,
      currentPct: Number(currentPct.toFixed(1)),
      targetPct: Number(targetPct.toFixed(1)),
      targetValue: Math.round(targetValue),
      driftPct: Number(driftPct.toFixed(1)),
      status,
      rebalanceAmount,
      inflowAllocation,
    });

    if (status === 'overweight') {
      actions.push({
        key: asset.key,
        action: 'sell',
        amount: Math.abs(rebalanceAmount),
        message: `Porsi ${asset.key} berlebih ${driftPct.toFixed(1)}%. Pertimbangkan rebalance atau alihkan inflow ke aset lain.`,
      });
    } else if (status === 'underweight') {
      actions.push({
        key: asset.key,
        action: 'buy',
        amount: Math.abs(rebalanceAmount),
        message: `Porsi ${asset.key} kurang ${Math.abs(driftPct).toFixed(1)}%. Tambah alokasi untuk mencapai target ideal.`,
      });
    } else {
      actions.push({
        key: asset.key,
        action: 'hold',
        amount: 0,
        message: `Porsi ${asset.key} sudah seimbang dalam toleransi ${driftTolerance}%.`,
      });
    }
  }

  // Sort items: largest drift or largest allocation first
  items.sort((a, b) => Math.abs(b.driftPct) - Math.abs(a.driftPct));

  return {
    totalCurrentValue,
    totalNewValue,
    cashInflow,
    items,
    maxDrift: Number(maxDrift.toFixed(1)),
    isBalanced: maxDrift <= driftTolerance,
    actions,
  };
}
