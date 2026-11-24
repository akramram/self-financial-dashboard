// ─── Spending Mix & Agility Intelligence Engine ─────────────────────────────
// Deterministic analytics for Spending Mix Hub:
// Operating leverage, financial agility score, fixed-cost creep detection,
// emergency discretionary cut simulation, and category elasticity profiling.

export interface AgilityScore {
  score: number; // 0-100 (100 = 100% discretionary/agile, 0 = 100% fixed)
  tier: 'high' | 'moderate' | 'low';
  title: string;
  description: string;
  badgeClass: string;
}

export interface CostCreepResult {
  direction: 'creeping' | 'improving' | 'stable';
  deltaPct: number;
  label: string;
  badgeClass: string;
  detail: string;
}

export interface SimulationResult {
  cutPercentage: number;
  monthlyFreed: number;
  annualizedFreed: number;
  newDiscretionary: number;
  newTotalSpending: number;
  newRecurringPct: number;
  newDiscretionaryPct: number;
}

export type ElasticityTier = 'elastic' | 'semi_elastic' | 'essential_variable';

export interface CategoryElasticityItem {
  category: string;
  amount: number;
  sharePct: number;
  tier: ElasticityTier;
  tierLabel: string;
  tierBadgeClass: string;
}

export interface ElasticityBreakdown {
  items: CategoryElasticityItem[];
  elasticTotal: number;
  elasticSharePct: number;
  semiElasticTotal: number;
  semiElasticSharePct: number;
  essentialTotal: number;
  essentialSharePct: number;
}

// Known category patterns for elasticity classification
const ELASTIC_CATEGORIES = new Set([
  'belanja', 'shopping', 'entertainment', 'hiburan', 'hobi', 'hobby',
  'vacation', 'liburan', 'leisure', 'gadget', 'snack', 'cafe', 'coffee',
  'games', 'hadiah', 'gift', 'lifestyle'
]);

const ESSENTIAL_CATEGORIES = new Set([
  'kesehatan', 'health', 'medical', 'groceries', 'sembako', 'supermarket',
  'obat', 'pharmacy', 'pendidikan', 'education', 'utilities', 'listrik',
  'air', 'maintenance', 'perawatan rumah'
]);

/**
 * Hitung skor ketangkasan finansial (Financial Agility Score)
 * Berdasarkan porsi biaya variabel (discretionary) terhadap total belanja.
 * Semakin tinggi ruang discretionary, semakin mudah memotong pengeluaran saat darurat.
 */
export function calculateAgilityScore(recurringPct: number): AgilityScore {
  const safeRecurring = Number.isFinite(recurringPct) ? Math.max(0, Math.min(100, recurringPct)) : 0;
  const score = Math.round(100 - safeRecurring);

  if (score >= 60) {
    return {
      score,
      tier: 'high',
      title: 'Fleksibilitas Tinggi',
      description: 'Struktur biaya sangat lincah. Mayoritas pengeluaran bersifat variabel dan mudah dipangkas saat kondisi darurat.',
      badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
    };
  }

  if (score >= 40) {
    return {
      score,
      tier: 'moderate',
      title: 'Fleksibilitas Moderat',
      description: 'Keseimbangan sehat antara komitmen tetap dan belanja fleksibel. Beban operasional masih dalam batas kendali.',
      badgeClass: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
    };
  }

  return {
    score,
    tier: 'low',
    title: 'Beban Tetap Tinggi',
    description: 'Porsi biaya tetap dominan. Ruang manuver penghematan terbatas jika terjadi penurunan pemasukan mendadak.',
    badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
  };
}

/**
 * Deteksi Fixed-Cost Creep (kenaikan bertahap porsi pengeluaran tetap antar periode).
 */
export function detectCostCreep(
  periods: Array<{ recurring_pct: number; month: string }>
): CostCreepResult {
  if (!periods || periods.length < 2) {
    return {
      direction: 'stable',
      deltaPct: 0,
      label: 'Data Historis Cukup',
      badgeClass: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30',
      detail: 'Dibutuhkan minimal 2 periode data untuk menganalisis tren pergeseran biaya tetap.',
    };
  }

  const firstHalf = periods.slice(0, Math.floor(periods.length / 2));
  const secondHalf = periods.slice(-Math.floor(periods.length / 2));

  const firstAvg = firstHalf.reduce((sum, p) => sum + p.recurring_pct, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, p) => sum + p.recurring_pct, 0) / secondHalf.length;

  const rawDelta = secondAvg - firstAvg;
  const deltaPct = Math.round(rawDelta * 10) / 10;

  if (deltaPct > 4) {
    return {
      direction: 'creeping',
      deltaPct,
      label: 'Fixed Cost Creep Terdeteksi',
      badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
      detail: `Porsi komitmen biaya tetap naik rata-rata +${deltaPct}% antar periode. Evaluasi tagihan berkala untuk mencegah inflasi gaya hidup.`,
    };
  }

  if (deltaPct < -4) {
    return {
      direction: 'improving',
      deltaPct,
      label: 'Efisiensi Biaya Membaik',
      badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
      detail: `Porsi pengeluaran tetap berkurang ${Math.abs(deltaPct)}%. Ruang napas dan fleksibilitas tabungan meningkat.`,
    };
  }

  return {
    direction: 'stable',
    deltaPct,
    label: 'Proporsi Biaya Stabil',
    badgeClass: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30',
    detail: 'Rasio antara komitmen tetap dan belanja fleksibel konsisten terkontrol.',
  };
}

/**
 * Simulasi pemangkasan belanja variabel (Discretionary Emergency Cut)
 */
export function simulateDiscretionaryCut(
  discretionaryTotal: number,
  recurringTotal: number,
  cutPercentage: number
): SimulationResult {
  const safeDisc = Math.max(0, discretionaryTotal || 0);
  const safeRec = Math.max(0, recurringTotal || 0);
  const safeCut = Math.max(0, Math.min(100, cutPercentage || 0));

  const monthlyFreed = Math.round((safeDisc * safeCut) / 100);
  const annualizedFreed = monthlyFreed * 12;

  const newDiscretionary = safeDisc - monthlyFreed;
  const newTotalSpending = safeRec + newDiscretionary;

  const newRecurringPct = newTotalSpending > 0
    ? Math.round((safeRec / newTotalSpending) * 1000) / 10
    : 0;

  const newDiscretionaryPct = newTotalSpending > 0
    ? Math.round((newDiscretionary / newTotalSpending) * 1000) / 10
    : 0;

  return {
    cutPercentage: safeCut,
    monthlyFreed,
    annualizedFreed,
    newDiscretionary,
    newTotalSpending,
    newRecurringPct,
    newDiscretionaryPct,
  };
}

/**
 * Klasifikasi elastisitas kategori pengeluaran variabel
 */
export function categorizeDiscretionaryElasticity(
  categories: Array<{ category: string; amount: number }>
): ElasticityBreakdown {
  if (!categories || categories.length === 0) {
    return {
      items: [],
      elasticTotal: 0,
      elasticSharePct: 0,
      semiElasticTotal: 0,
      semiElasticSharePct: 0,
      essentialTotal: 0,
      essentialSharePct: 0,
    };
  }

  const total = categories.reduce((s, c) => s + (c.amount || 0), 0);

  let elasticTotal = 0;
  let semiElasticTotal = 0;
  let essentialTotal = 0;

  const items: CategoryElasticityItem[] = categories.map((cat) => {
    const nameLower = (cat.category || '').toLowerCase().trim();
    const amount = Math.max(0, cat.amount || 0);
    const sharePct = total > 0 ? Math.round((amount / total) * 1000) / 10 : 0;

    let tier: ElasticityTier = 'semi_elastic';
    let tierLabel = 'Semi-Elastis (Sedang)';
    let tierBadgeClass = 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30';

    if (ELASTIC_CATEGORIES.has(nameLower) || [...ELASTIC_CATEGORIES].some((k) => nameLower.includes(k))) {
      tier = 'elastic';
      tierLabel = 'Sangat Elastis (Mudah Dipangkas)';
      tierBadgeClass = 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30';
      elasticTotal += amount;
    } else if (ESSENTIAL_CATEGORIES.has(nameLower) || [...ESSENTIAL_CATEGORIES].some((k) => nameLower.includes(k))) {
      tier = 'essential_variable';
      tierLabel = 'Variabel Esensial';
      tierBadgeClass = 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30';
      essentialTotal += amount;
    } else {
      semiElasticTotal += amount;
    }

    return {
      category: cat.category,
      amount,
      sharePct,
      tier,
      tierLabel,
      tierBadgeClass,
    };
  });

  // Sort by amount descending
  items.sort((a, b) => b.amount - a.amount);

  return {
    items,
    elasticTotal,
    elasticSharePct: total > 0 ? Math.round((elasticTotal / total) * 1000) / 10 : 0,
    semiElasticTotal,
    semiElasticSharePct: total > 0 ? Math.round((semiElasticTotal / total) * 1000) / 10 : 0,
    essentialTotal,
    essentialSharePct: total > 0 ? Math.round((essentialTotal / total) * 1000) / 10 : 0,
  };
}
