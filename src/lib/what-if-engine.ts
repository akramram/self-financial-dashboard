export interface CategoryBaseline {
  name: string;
  color: string;
  monthly_limit: number;
  avg_spending: number;
}

export interface ScenarioGoal {
  id: number;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  color: string;
}

export interface PeriodData {
  period_id: number;
  month: string;
  income: number;
  outcome: number;
  invest?: number;
  category_totals: Record<string, number>;
  networth: number | null;
}

export interface ScenarioData {
  periods: PeriodData[];
  categories: CategoryBaseline[];
  goals?: ScenarioGoal[];
  avgIncome: number;
  avgSpending: number;
  avgInvest?: number;
  avgSavings: number;
  currentNetworth: number;
  avgNwGrowth: number;
  savingsRate: number;
}

export interface CategoryAdjustment {
  name: string;
  delta: number;
  pct: number;
}

export interface OneTimeEvent {
  id: string;
  label: string;
  amount: number;
  monthOffset: number;
}

export type ProjectionHorizon = 6 | 12 | 24 | 36 | 60;

export interface ScenarioInputs {
  incomeChangePct: number;
  annualReturnPct: number;
  categoryAdjustments: Record<string, CategoryAdjustment>;
  oneTimeEvents: OneTimeEvent[];
  projectionMonths: ProjectionHorizon;
}

export interface MilestoneImpact {
  target: number;
  label: string;
  baselineMonths: number | null;
  scenarioMonths: number | null;
  monthsSaved: number | null;
}

export interface GoalImpact {
  id: number;
  name: string;
  remaining: number;
  color: string;
  baselineMonths: number | null;
  scenarioMonths: number | null;
  monthsSaved: number | null;
}

export interface ScenarioInsight {
  id: string;
  tone: 'positive' | 'warning' | 'neutral';
  title: string;
  detail: string;
}

export interface ScenarioProjection {
  labels: string[];
  baselineMonths: number[];
  scenarioMonths: number[];
  adjustedIncome: number;
  adjustedSpending: number;
  monthlyNet: number;
  scenarioSavingsRate: number;
  finalBaseline: number;
  finalScenario: number;
  networthDifference: number;
  totalSaved: number;
  baselineTotalSaved: number;
  compoundGain: number;
  projectionMonths: ProjectionHorizon;
  milestones: MilestoneImpact[];
  goalImpacts: GoalImpact[];
  insights: ScenarioInsight[];
}

export interface SavedScenarioSnapshot {
  id: string;
  name: string;
  savedAt: string;
  inputs: ScenarioInputs;
  summary: {
    finalScenario: number;
    monthlyNet: number;
    scenarioSavingsRate: number;
  };
}

export interface ScenarioPreset {
  id: 'frugal_sprint' | 'salary_boost' | 'aggressive_invest' | 'big_purchase';
  label: string;
  description: string;
  badge: string;
}

export const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: 'frugal_sprint',
    label: 'Frugal Sprint -20%',
    description: 'Pangkas 20% pada 3 kategori pengeluaran non-Invest terbesar.',
    badge: '-20% Belanja',
  },
  {
    id: 'salary_boost',
    label: 'Kenaikan Gaji +15%',
    description: 'Simulasi promosi atau tambahan penghasilan rutin 15%.',
    badge: '+15% Income',
  },
  {
    id: 'aggressive_invest',
    label: 'Investasi 10% p.a.',
    description: 'Putar surplus bulanan dengan target imbal hasil 10% per tahun.',
    badge: '10% p.a.',
  },
  {
    id: 'big_purchase',
    label: 'Belanja Besar -15 Jt',
    description: 'Uji dampak pengeluaran satu kali Rp15 Jt di bulan ke-3.',
    badge: 'Event -15 Jt',
  },
];

export const HORIZON_OPTIONS: ProjectionHorizon[] = [6, 12, 24, 36, 60];
export const RETURN_PRESETS = [0, 5, 8, 10, 12];

function formatCompactMilestone(value: number): string {
  if (value >= 1_000_000_000) {
    const b = value / 1_000_000_000;
    return `Rp${Number.isInteger(b) ? b : b.toFixed(1)} M`;
  }
  return `Rp${Math.round(value / 1_000_000)} Jt`;
}

function formatCompactIdr(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000_000) {
    return `${sign}Rp${(abs / 1_000_000_000).toFixed(2)} M`;
  }
  if (abs >= 1_000_000) {
    return `${sign}Rp${(abs / 1_000_000).toFixed(1)} Jt`;
  }
  return `${sign}Rp${Math.round(abs).toLocaleString('id-ID')}`;
}

export function applyScenarioPreset(
  presetId: ScenarioPreset['id'],
  categories: CategoryBaseline[],
  horizon: ProjectionHorizon = 24
): ScenarioInputs {
  const base: ScenarioInputs = {
    incomeChangePct: 0,
    annualReturnPct: 0,
    categoryAdjustments: {},
    oneTimeEvents: [],
    projectionMonths: horizon,
  };

  if (presetId === 'frugal_sprint') {
    const topDiscretionary = [...categories]
      .filter((c) => c.avg_spending > 0 && c.name.toLowerCase() !== 'invest')
      .sort((a, b) => b.avg_spending - a.avg_spending)
      .slice(0, 3);

    const adjustments: Record<string, CategoryAdjustment> = {};
    for (const cat of topDiscretionary) {
      adjustments[cat.name] = {
        name: cat.name,
        pct: -20,
        delta: Math.round((cat.avg_spending * -20) / 100),
      };
    }
    return { ...base, categoryAdjustments: adjustments };
  }

  if (presetId === 'salary_boost') {
    return { ...base, incomeChangePct: 15 };
  }

  if (presetId === 'aggressive_invest') {
    return { ...base, annualReturnPct: 10, projectionMonths: Math.max(horizon, 24) as ProjectionHorizon };
  }

  return {
    ...base,
    oneTimeEvents: [
      {
        id: 'preset-big-purchase',
        label: 'Pembelian Gadget / Liburan',
        amount: -15_000_000,
        monthOffset: 2,
      },
    ],
  };
}

export function computeMilestoneImpacts(
  currentNetworth: number,
  avgNwGrowth: number,
  monthlyNet: number,
  annualReturnPct: number,
  oneTimeEvents: OneTimeEvent[]
): MilestoneImpact[] {
  const candidates = [
    50_000_000, 100_000_000, 200_000_000, 300_000_000, 500_000_000,
    750_000_000, 1_000_000_000, 1_500_000_000, 2_000_000_000, 3_000_000_000, 5_000_000_000,
  ];
  const targets = candidates.filter((t) => t > currentNetworth).slice(0, 3);
  const monthlyRate = annualReturnPct / 100 / 12;
  const maxMonths = 120;

  return targets.map((target) => {
    let baselineMonths: number | null = null;
    if (avgNwGrowth > 0) {
      const needed = Math.ceil((target - currentNetworth) / avgNwGrowth);
      if (needed > 0 && needed <= maxMonths) baselineMonths = needed;
    }

    let scenarioMonths: number | null = null;
    let simVal = currentNetworth;
    for (let m = 0; m < maxMonths; m++) {
      let eventDelta = 0;
      for (const evt of oneTimeEvents) {
        if (evt.monthOffset === m) eventDelta += evt.amount;
      }
      simVal = simVal * (1 + monthlyRate) + monthlyNet + eventDelta;
      if (simVal >= target) {
        scenarioMonths = m + 1;
        break;
      }
    }

    const monthsSaved =
      baselineMonths !== null && scenarioMonths !== null ? baselineMonths - scenarioMonths : null;

    return {
      target,
      label: formatCompactMilestone(target),
      baselineMonths,
      scenarioMonths,
      monthsSaved,
    };
  });
}

export function computeGoalImpacts(
  goals: ScenarioGoal[],
  avgSavings: number,
  monthlyNet: number
): GoalImpact[] {
  const active = goals.filter((g) => g.target_amount > g.current_amount).slice(0, 4);
  return active.map((g) => {
    const remaining = Math.max(0, g.target_amount - g.current_amount);
    const baselineAlloc = avgSavings > 0 ? avgSavings * 0.3 : 0;
    const scenarioAlloc = monthlyNet > 0 ? monthlyNet * 0.3 : 0;

    const baselineMonths = baselineAlloc > 0 ? Math.ceil(remaining / baselineAlloc) : null;
    const scenarioMonths = scenarioAlloc > 0 ? Math.ceil(remaining / scenarioAlloc) : null;
    const monthsSaved =
      baselineMonths !== null && scenarioMonths !== null ? baselineMonths - scenarioMonths : null;

    return {
      id: g.id,
      name: g.name,
      remaining,
      color: g.color || '#10b981',
      baselineMonths,
      scenarioMonths,
      monthsSaved,
    };
  });
}

export function buildScenarioInsights(
  data: ScenarioData,
  inputs: ScenarioInputs,
  summary: {
    monthlyNet: number;
    scenarioSavingsRate: number;
    networthDifference: number;
    compoundGain: number;
    adjustedSpending: number;
  }
): ScenarioInsight[] {
  const insights: ScenarioInsight[] = [];

  if (summary.monthlyNet < 0) {
    insights.push({
      id: 'deficit-warning',
      tone: 'warning',
      title: 'Arus Kas Bulanan Defisit',
      detail: `Pengeluaran melebihi pemasukan sebesar ${formatCompactIdr(Math.abs(summary.monthlyNet))} per bulan. Pertimbangkan memangkas kategori fleksibel atau menunda belanja satu kali.`,
    });
  } else {
    const rateDiff = summary.scenarioSavingsRate - data.savingsRate;
    if (Math.abs(rateDiff) >= 1) {
      insights.push({
        id: 'savings-rate-shift',
        tone: rateDiff > 0 ? 'positive' : 'warning',
        title: `Rasio Tabungan ${rateDiff > 0 ? 'Naik' : 'Turun'} ${Math.abs(rateDiff).toFixed(1)} Poin`,
        detail: `Dari baseline ${data.savingsRate.toFixed(1)}% menjadi ${summary.scenarioSavingsRate.toFixed(1)}% (${formatCompactIdr(summary.monthlyNet)}/bulan).`,
      });
    }
  }

  const adjList = Object.values(inputs.categoryAdjustments).filter((a) => a.delta !== 0);
  if (adjList.length > 0) {
    const biggestCut = [...adjList].sort((a, b) => a.delta - b.delta)[0];
    if (biggestCut && biggestCut.delta < 0) {
      const totalHorizonSaved = Math.abs(biggestCut.delta) * inputs.projectionMonths;
      insights.push({
        id: 'top-category-lever',
        tone: 'positive',
        title: `Pengungkit Terbesar: ${biggestCut.name}`,
        detail: `Pemangkasan ${Math.abs(biggestCut.pct)}% pada ${biggestCut.name} menghemat ${formatCompactIdr(totalHorizonSaved)} selama ${inputs.projectionMonths} bulan.`,
      });
    }
  }

  if (inputs.annualReturnPct > 0 && summary.compoundGain > 0) {
    insights.push({
      id: 'compound-effect',
      tone: 'positive',
      title: `Efek Bunga Majemuk (${inputs.annualReturnPct}% p.a.)`,
      detail: `Imbal hasil investasi menyumbang tambahan ${formatCompactIdr(summary.compoundGain)} di luar akumulasi setoran kas murni.`,
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: 'baseline-neutral',
      tone: 'neutral',
      title: 'Mode Baseline Aktif',
      detail: 'Pilih preset cepat atau geser kontrol pendapatan, kategori, dan imbal hasil untuk melihat dampak jangka panjang terhadap kekayaan bersih.',
    });
  }

  return insights;
}

export function simulateScenario(data: ScenarioData, inputs: ScenarioInputs): ScenarioProjection {
  const { avgIncome, avgSpending, currentNetworth, avgNwGrowth, avgSavings } = data;
  const adjustedIncome = Math.max(0, avgIncome * (1 + inputs.incomeChangePct / 100));

  let totalCategoryDelta = 0;
  for (const adj of Object.values(inputs.categoryAdjustments)) {
    totalCategoryDelta += adj.delta;
  }
  const adjustedSpending = Math.max(0, avgSpending + totalCategoryDelta);
  const monthlyNet = adjustedIncome - adjustedSpending;
  const scenarioSavingsRate = adjustedIncome > 0 ? (monthlyNet / adjustedIncome) * 100 : 0;

  const monthlyRate = inputs.annualReturnPct / 100 / 12;
  const baselineMonths: number[] = [];
  const scenarioMonths: number[] = [];
  const labels: string[] = [];

  const now = new Date();
  let pureCashScenario = currentNetworth;

  for (let i = 0; i < inputs.projectionMonths; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
    labels.push(d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }));

    baselineMonths.push(Math.round(currentNetworth + avgNwGrowth * (i + 1)));

    let eventDelta = 0;
    for (const evt of inputs.oneTimeEvents) {
      if (evt.monthOffset === i) eventDelta += evt.amount;
    }

    const prevScenario = i === 0 ? currentNetworth : scenarioMonths[i - 1];
    const nextScenario = prevScenario * (1 + monthlyRate) + monthlyNet + eventDelta;
    scenarioMonths.push(Math.round(nextScenario));

    pureCashScenario += monthlyNet + eventDelta;
  }

  const finalBaseline = baselineMonths[baselineMonths.length - 1] ?? currentNetworth;
  const finalScenario = scenarioMonths[scenarioMonths.length - 1] ?? currentNetworth;
  const networthDifference = finalScenario - finalBaseline;

  const eventsTotal = inputs.oneTimeEvents
    .filter((e) => e.monthOffset >= 0 && e.monthOffset < inputs.projectionMonths)
    .reduce((s, e) => s + e.amount, 0);
  const totalSaved = Math.round(monthlyNet * inputs.projectionMonths + eventsTotal);
  const baselineTotalSaved = Math.round(avgSavings * inputs.projectionMonths);
  const compoundGain = Math.max(0, Math.round(finalScenario - pureCashScenario));

  const milestones = computeMilestoneImpacts(
    currentNetworth,
    avgNwGrowth,
    monthlyNet,
    inputs.annualReturnPct,
    inputs.oneTimeEvents
  );

  const goalImpacts = computeGoalImpacts(data.goals || [], avgSavings, monthlyNet);

  const insights = buildScenarioInsights(data, inputs, {
    monthlyNet,
    scenarioSavingsRate,
    networthDifference,
    compoundGain,
    adjustedSpending,
  });

  return {
    labels,
    baselineMonths,
    scenarioMonths,
    adjustedIncome: Math.round(adjustedIncome),
    adjustedSpending: Math.round(adjustedSpending),
    monthlyNet: Math.round(monthlyNet),
    scenarioSavingsRate,
    finalBaseline,
    finalScenario,
    networthDifference,
    totalSaved,
    baselineTotalSaved,
    compoundGain,
    projectionMonths: inputs.projectionMonths,
    milestones,
    goalImpacts,
    insights,
  };
}
