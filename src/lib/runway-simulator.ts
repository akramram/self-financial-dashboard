export interface AssetBreakdown {
  name: string;
  value: number;
  liquidityPct: number;
  liquidValue: number;
}

export interface EmergencyTier {
  id: 'survival' | 'standard' | 'fortress';
  name: string;
  targetMonths: number;
  targetAmount: number;
  currentAmount: number;
  fundedPct: number;
  shortfall: number;
  description: string;
}

export interface ScenarioResult {
  id: string;
  name: string;
  monthlyExpense: number;
  lumpSumShock: number;
  effectiveLiquid: number;
  runwayMonths: number;
  deltaMonths: number;
  status: 'critical' | 'caution' | 'healthy' | 'strong';
}

export interface LiquidityTierGroup {
  tier: 1 | 2 | 3 | 4;
  title: string;
  timeframe: string;
  badgeColor: string;
  assets: AssetBreakdown[];
  totalGross: number;
  totalLiquid: number;
  liquidityDiscount: number;
}

/**
 * Evaluasi status kesehatan runway berdasarkan durasi bulan
 */
export function getRunwayStatus(months: number): 'critical' | 'caution' | 'healthy' | 'strong' {
  if (months >= 6) return 'strong';
  if (months >= 3) return 'healthy';
  if (months >= 1) return 'caution';
  return 'critical';
}

/**
 * Hitung target Emergency Fund Tier (3, 6, 12 bulan)
 */
export function calculateEmergencyTiers(
  liquidAssets: number,
  monthlyExpense: number,
  monthlyFixed: number
): EmergencyTier[] {
  const expenseBase = monthlyExpense > 0 ? monthlyExpense : monthlyFixed;
  const tiersConfig = [
    {
      id: 'survival' as const,
      name: 'Survival Buffer',
      targetMonths: 3,
      description: 'Menutup biaya pokok darurat minimal 3 bulan.',
      calcBase: monthlyFixed > 0 ? monthlyFixed * 3 : expenseBase * 3,
    },
    {
      id: 'standard' as const,
      name: 'Standar Keamanan',
      targetMonths: 6,
      description: 'Cakupan 6 bulan gaya hidup standar sesuai pengeluaran reguler.',
      calcBase: expenseBase * 6,
    },
    {
      id: 'fortress' as const,
      name: 'Benteng Finansial',
      targetMonths: 12,
      description: 'Perlindungan maksimal 12 bulan untuk kemandirian finansial total.',
      calcBase: expenseBase * 12,
    },
  ];

  return tiersConfig.map((c) => {
    const targetAmount = Math.round(c.calcBase);
    const fundedPct = targetAmount > 0 ? Math.min(100, Math.round((liquidAssets / targetAmount) * 100)) : 100;
    const shortfall = Math.max(0, targetAmount - liquidAssets);

    return {
      id: c.id,
      name: c.name,
      targetMonths: c.targetMonths,
      targetAmount,
      currentAmount: Math.round(liquidAssets),
      fundedPct,
      shortfall,
      description: c.description,
    };
  });
}

/**
 * Hitung waktu (dalam bulan) yang dibutuhkan untuk menutup shortfall target dana darurat
 */
export function estimateMonthsToFund(shortfall: number, monthlySaving: number): number {
  if (shortfall <= 0) return 0;
  if (monthlySaving <= 0) return Infinity;
  return Math.ceil(shortfall / monthlySaving);
}

/**
 * Simulasikan berbagai skenario pengeluaran dan syok finansial
 */
export function simulateScenario(
  liquidAssets: number,
  baselineExpense: number,
  monthlyFixed: number,
  scenario: {
    id: string;
    name: string;
    monthlyExpenseOverride?: number;
    lumpSumShock?: number;
  }
): ScenarioResult {
  const lumpSumShock = Math.max(0, scenario.lumpSumShock ?? 0);
  const effectiveLiquid = Math.max(0, liquidAssets - lumpSumShock);
  const monthlyExpense = Math.max(
    1,
    scenario.monthlyExpenseOverride !== undefined ? scenario.monthlyExpenseOverride : baselineExpense
  );

  const runwayMonths = Number((effectiveLiquid / monthlyExpense).toFixed(2));
  const baselineRunway = baselineExpense > 0 ? Number((liquidAssets / baselineExpense).toFixed(2)) : 0;
  const deltaMonths = Number((runwayMonths - baselineRunway).toFixed(2));

  return {
    id: scenario.id,
    name: scenario.name,
    monthlyExpense: Math.round(monthlyExpense),
    lumpSumShock: Math.round(lumpSumShock),
    effectiveLiquid: Math.round(effectiveLiquid),
    runwayMonths,
    deltaMonths,
    status: getRunwayStatus(runwayMonths),
  };
}

/**
 * Klasifikasi aset ke dalam 4 Tier Tangga Likuiditas (Liquidity Ladder)
 */
export function categorizeLiquidityLadder(breakdown: AssetBreakdown[]): LiquidityTierGroup[] {
  const tier1Assets: AssetBreakdown[] = [];
  const tier2Assets: AssetBreakdown[] = [];
  const tier3Assets: AssetBreakdown[] = [];
  const tier4Assets: AssetBreakdown[] = [];

  for (const asset of breakdown) {
    if (asset.liquidityPct >= 0.95) {
      tier1Assets.push(asset);
    } else if (asset.liquidityPct >= 0.8) {
      tier2Assets.push(asset);
    } else if (asset.liquidityPct >= 0.5) {
      tier3Assets.push(asset);
    } else {
      tier4Assets.push(asset);
    }
  }

  const buildGroup = (
    tier: 1 | 2 | 3 | 4,
    title: string,
    timeframe: string,
    badgeColor: string,
    assets: AssetBreakdown[]
  ): LiquidityTierGroup => {
    const totalGross = assets.reduce((s, a) => s + a.value, 0);
    const totalLiquid = assets.reduce((s, a) => s + a.liquidValue, 0);
    const liquidityDiscount = totalGross - totalLiquid;

    return {
      tier,
      title,
      timeframe,
      badgeColor,
      assets,
      totalGross: Math.round(totalGross),
      totalLiquid: Math.round(totalLiquid),
      liquidityDiscount: Math.round(liquidityDiscount),
    };
  };

  return [
    buildGroup(1, 'Tier 1: Likuid Instan (T+0)', 'Dapat ditarik seketika (Cash, Tabungan, Bank)', 'text-emerald-500 bg-emerald-500/10', tier1Assets),
    buildGroup(2, 'Tier 2: Likuid Cepat (T+1 s/d T+2)', 'Pencairan 1-2 hari kerja (Pasar Uang / Deposito)', 'text-mint-500 bg-mint-500/10', tier2Assets),
    buildGroup(3, 'Tier 3: Likuid Bertahap (T+2 s/d T+3)', 'Pencairan butuh eksekusi pasar (Saham IDX, Obligasi)', 'text-gold-500 bg-gold-500/10', tier3Assets),
    buildGroup(4, 'Tier 4: Butuh Waktu (T+3+)', 'Likuiditas rendah atau volatilitas tinggi (Saham Luar, dsb)', 'text-slate-400 bg-slate-500/10', tier4Assets),
  ];
}
