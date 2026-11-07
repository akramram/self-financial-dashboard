// ─── Merchant Intelligence Engine ───────────────────────────────────────────
// Deterministic analytics for the Merchant Intelligence Hub:
// vendor archetype classification, Pareto concentration risk,
// and period-over-period spend surge detection.

export interface MerchantMonthlyPoint {
  month: string;
  amount: number;
  count: number;
}

export interface MerchantInput {
  title: string;
  category: string;
  totalPaid: number;
  txCount: number;
  avgAmount: number;
  maxAmount: number;
  periods: number;
  monthlyData: MerchantMonthlyPoint[];
}

export type MerchantArchetype = 'staple' | 'recurring' | 'high_ticket' | 'occasional';

export interface ClassifiedMerchant extends MerchantInput {
  archetype: MerchantArchetype;
  archetypeLabel: string;
  archetypeBadge: string;
  sharePct: number;
  cumulativePct: number;
  inPareto: boolean;
}

export type ConcentrationStatus = 'diversified' | 'moderate' | 'concentrated' | 'highly_concentrated';

export interface ParetoConcentration {
  totalSpend: number;
  top20Count: number;
  top20Spend: number;
  top20SharePct: number;
  paretoCount: number;
  paretoSpend: number;
  paretoSharePct: number;
  tailCount: number;
  tailSpend: number;
  status: ConcentrationStatus;
  statusLabel: string;
  badgeBg: string;
}

export type SurgeDirection = 'up' | 'down' | 'stable' | 'new';

export interface MerchantSurge {
  title: string;
  category: string;
  currentAmount: number;
  baselineAvg: number;
  deltaPct: number;
  deltaAmount: number;
  direction: SurgeDirection;
  label: string;
  badgeBg: string;
}

// ─── 1. Archetype classification ────────────────────────────────────────────

/**
 * Klasifikasi merchant ke dalam arketipe perilaku belanja:
 * - staple     : sering transaksi (>= 4x), nominal kecil (avg <= 300k)
 * - recurring  : muncul di >= 3 periode, frekuensi stabil
 * - high_ticket: jarang tapi besar (avg > 1jt)
 * - occasional : sisanya
 */
export function classifyMerchantArchetype(m: MerchantInput): MerchantArchetype {
  if (m.avgAmount > 1_000_000 && m.txCount <= 4) return 'high_ticket';
  if (m.periods >= 3 && m.txCount >= 2) return 'recurring';
  if (m.txCount >= 4 && m.avgAmount <= 300_000) return 'staple';
  return 'occasional';
}

export const ARCHETYPE_META: Record<MerchantArchetype, { label: string; badge: string }> = {
  staple: {
    label: 'Staple (Sering & Kecil)',
    badge: 'bg-mint-500/10 text-mint-700 dark:text-mint-400 border-mint-500/20',
  },
  recurring: {
    label: 'Recurring (Langganan)',
    badge: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
  },
  high_ticket: {
    label: 'High-Ticket (Jarang & Besar)',
    badge: 'bg-gold-500/10 text-gold-700 dark:text-gold-400 border-gold-500/20',
  },
  occasional: {
    label: 'Occasional (Sesekali)',
    badge: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20',
  },
};

// ─── 2. Pareto concentration ────────────────────────────────────────────────

export function calculateParetoConcentration(merchants: MerchantInput[]): ParetoConcentration {
  const sorted = [...merchants].sort((a, b) => b.totalPaid - a.totalPaid);
  const totalSpend = sorted.reduce((s, m) => s + m.totalPaid, 0);

  if (sorted.length === 0 || totalSpend <= 0) {
    return {
      totalSpend: 0,
      top20Count: 0,
      top20Spend: 0,
      top20SharePct: 0,
      paretoCount: 0,
      paretoSpend: 0,
      paretoSharePct: 0,
      tailCount: 0,
      tailSpend: 0,
      status: 'diversified',
      statusLabel: 'Data Belum Cukup',
      badgeBg: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20',
    };
  }

  const top20Count = Math.max(1, Math.ceil(sorted.length * 0.2));
  const top20Spend = sorted.slice(0, top20Count).reduce((s, m) => s + m.totalPaid, 0);

  // Pareto set: vendor terkecil yang mencakup >= 80% total belanja
  let cumulative = 0;
  let paretoCount = 0;
  for (const m of sorted) {
    cumulative += m.totalPaid;
    paretoCount += 1;
    if (cumulative / totalSpend >= 0.8) break;
  }
  const paretoSpend = sorted.slice(0, paretoCount).reduce((s, m) => s + m.totalPaid, 0);
  const top20SharePct = (top20Spend / totalSpend) * 100;

  let status: ConcentrationStatus;
  let statusLabel: string;
  let badgeBg: string;
  if (top20SharePct >= 80) {
    status = 'highly_concentrated';
    statusLabel = 'Sangat Terkonsentrasi (>= 80% di Top 20%)';
    badgeBg = 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20';
  } else if (top20SharePct >= 65) {
    status = 'concentrated';
    statusLabel = 'Terkonsentrasi (65-80% di Top 20%)';
    badgeBg = 'bg-gold-500/10 text-gold-700 dark:text-gold-400 border-gold-500/20';
  } else if (top20SharePct >= 50) {
    status = 'moderate';
    statusLabel = 'Moderat (50-65% di Top 20%)';
    badgeBg = 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20';
  } else {
    status = 'diversified';
    statusLabel = 'Terdiversifikasi (< 50% di Top 20%)';
    badgeBg = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
  }

  return {
    totalSpend,
    top20Count,
    top20Spend,
    top20SharePct: Number(top20SharePct.toFixed(1)),
    paretoCount,
    paretoSpend,
    paretoSharePct: Number(((paretoSpend / totalSpend) * 100).toFixed(1)),
    tailCount: sorted.length - paretoCount,
    tailSpend: totalSpend - paretoSpend,
    status,
    statusLabel,
    badgeBg,
  };
}

/**
 * Tandai tiap merchant dengan share, kumulatif Pareto, dan arketipe.
 * Input diasumsikan sudah terfilter (satu view), output terurut desc by totalPaid.
 */
export function classifyMerchants(merchants: MerchantInput[]): ClassifiedMerchant[] {
  const sorted = [...merchants].sort((a, b) => b.totalPaid - a.totalPaid);
  const totalSpend = sorted.reduce((s, m) => s + m.totalPaid, 0);
  let cumulative = 0;

  return sorted.map((m) => {
    cumulative += m.totalPaid;
    const archetype = classifyMerchantArchetype(m);
    const meta = ARCHETYPE_META[archetype];
    return {
      ...m,
      archetype,
      archetypeLabel: meta.label,
      archetypeBadge: meta.badge,
      sharePct: totalSpend > 0 ? Number(((m.totalPaid / totalSpend) * 100).toFixed(1)) : 0,
      cumulativePct: totalSpend > 0 ? Number(((cumulative / totalSpend) * 100).toFixed(1)) : 0,
      inPareto: totalSpend > 0 && cumulative / totalSpend <= 0.82,
    };
  });
}

// ─── 3. Surge detection ─────────────────────────────────────────────────────

const SURGE_UP_THRESHOLD = 40; // % kenaikan vs baseline
const SURGE_DOWN_THRESHOLD = -40; // % penurunan vs baseline

/**
 * Deteksi lonjakan belanja per merchant periode ini vs rata-rata periode
 * sebelumnya (baseline). Merchant baru (tanpa histori) dilaporkan terpisah.
 */
export function detectMerchantSurges(
  currentPeriodMonth: string,
  merchants: MerchantInput[],
): MerchantSurge[] {
  const surges: MerchantSurge[] = [];

  for (const m of merchants) {
    const current = m.monthlyData.find((p) => p.month === currentPeriodMonth);
    const history = m.monthlyData.filter((p) => p.month !== currentPeriodMonth && p.amount > 0);

    if (!current || current.amount <= 0) continue;

    if (history.length === 0) {
      surges.push({
        title: m.title,
        category: m.category,
        currentAmount: current.amount,
        baselineAvg: 0,
        deltaPct: 100,
        deltaAmount: current.amount,
        direction: 'new',
        label: 'Merchant baru periode ini',
        badgeBg: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
      });
      continue;
    }

    const baselineAvg = history.reduce((s, p) => s + p.amount, 0) / history.length;
    if (baselineAvg <= 0) continue;

    const deltaPct = ((current.amount - baselineAvg) / baselineAvg) * 100;

    if (deltaPct >= SURGE_UP_THRESHOLD) {
      surges.push({
        title: m.title,
        category: m.category,
        currentAmount: current.amount,
        baselineAvg,
        deltaPct: Number(deltaPct.toFixed(1)),
        deltaAmount: current.amount - baselineAvg,
        direction: 'up',
        label: 'Lonjakan belanja',
        badgeBg: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
      });
    } else if (deltaPct <= SURGE_DOWN_THRESHOLD) {
      surges.push({
        title: m.title,
        category: m.category,
        currentAmount: current.amount,
        baselineAvg,
        deltaPct: Number(deltaPct.toFixed(1)),
        deltaAmount: current.amount - baselineAvg,
        direction: 'down',
        label: 'Penurunan signifikan',
        badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      });
    }
    // deltaPct di antara threshold dianggap stabil, tidak dilaporkan
  }

  return surges.sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct));
}
