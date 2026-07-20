import type { APIRoute } from 'astro';
import { db } from '../../lib/db';

/**
 * GET /api/runway
 *
 * Emergency Fund Runway Analysis — computes how many months the user can
 * survive financially if their income stops.
 *
 * Formula:
 *   liquidAssets   = sum of (breakdown.value * liquidityFactor) for latest period
 *   monthlyExpense = average of last 3 periods' spending (cash + credit_expense, done)
 *   runwayMonths   = liquidAssets / max(1, monthlyExpense)
 *   fixedCoverage  = liquidAssets / max(1, recurringMonthlyFixed)
 *
 * Liquidity classification (by investment name, case-insensitive contains):
 *   - "cash" / "jenius" / "tabungan" → 100% liquid
 *   - "reksa" / "mutual" / "rd"      → 90% liquid
 *   - "saham" / "stock" / "equity"   → 50% liquid (needs sale time)
 *   - "luar" / "overseas" / "foreign"→ 30% liquid (international friction)
 *   - fallback                        → 70% liquid
 */

interface AssetBreakdown {
  name: string;
  value: number;
  liquidityPct: number;
  liquidValue: number;
}

interface RunwayHistoryPoint {
  period_id: number;
  month: string;
  liquid_assets: number;
  total_assets: number;
  runway_months: number;
}

interface RunwayResponse {
  liquid_assets: number;
  total_assets: number;
  illiquid_assets: number;
  monthly_expense: number;
  monthly_fixed: number;
  runway_months: number;
  fixed_coverage_months: number;
  status: 'critical' | 'caution' | 'healthy' | 'strong';
  target_months: number;
  asset_breakdown: AssetBreakdown[];
  history: RunwayHistoryPoint[];
  period_id: number | null;
  month: string | null;
  tips: string[];
}

/** Classify an investment's liquidity factor (0-1) based on its name. */
function liquidityFactor(name: string): number {
  const lower = name.toLowerCase();
  // Cash / savings — instantly liquid
  if (lower.includes('cash') || lower.includes('jenius') || lower.includes('tabungan') || lower.includes('deposit')) {
    return 1.0;
  }
  // Mutual funds — liquid within 1-3 days
  if (lower.includes('reksa') || lower.includes('mutual') || lower.includes('rd') || lower.includes('pnb')) {
    return 0.9;
  }
  // Foreign / overseas stocks — additional friction (timezone, currency, tax)
  if (lower.includes('luar') || lower.includes('overseas') || lower.includes('foreign') || lower.includes('international')) {
    return 0.3;
  }
  // Stocks — liquid but volatile, needs sale timing
  if (lower.includes('saham') || lower.includes('stock') || lower.includes('equity') || lower.includes('idx')) {
    return 0.5;
  }
  // Crypto — liquid but volatile
  if (lower.includes('crypto') || lower.includes('btc') || lower.includes('bitcoin') || lower.includes('eth')) {
    return 0.8;
  }
  // Default — moderately liquid
  return 0.7;
}

/** Determine runway status from months of coverage. */
function runwayStatus(months: number): RunwayResponse['status'] {
  if (months >= 6) return 'strong';
  if (months >= 3) return 'healthy';
  if (months >= 1) return 'caution';
  return 'critical';
}

/** Generate actionable tips based on the runway analysis. */
function generateTips(runwayMonths: number, fixedCoverage: number, breakdown: AssetBreakdown[]): string[] {
  const tips: string[] = [];
  if (runwayMonths < 3) {
    tips.push(`⚠️ Runway hanya ${runwayMonths.toFixed(1)} bulan. Target ideal minimal 3-6 bulan pengeluaran di aset likuid.`);
  }
  if (runwayMonths >= 3 && runwayMonths < 6) {
    tips.push(`Runway ${runwayMonths.toFixed(1)} bulan sudah aman, tapi pertimbangkan menambah hingga 6 bulan untuk keamanan ekstra.`);
  }
  if (runwayMonths >= 6) {
    tips.push(`✅ Runway ${runwayMonths.toFixed(1)} bulan sudah sangat sehat. Pertimbangkan mengalokasikan tambahan ke investasi pertumbuhan.`);
  }
  if (fixedCoverage < 2) {
    tips.push(`Pengeluaran tetap bulanan hanya tertutup ${fixedCoverage.toFixed(1)} bulan dari aset likuid. Pastikan ada buffer untuk kewajiban tetap.`);
  }
  const illiquidShare = breakdown.length > 0
    ? breakdown.filter(b => b.liquidityPct < 0.6).reduce((s, b) => s + b.value, 0) /
      Math.max(1, breakdown.reduce((s, b) => s + b.value, 0))
    : 0;
  if (illiquidShare > 0.6) {
    tips.push(`Lebih dari 60% aset berada di instrumen kurang likuid (saham). Pertimbangkan diversifikasi ke reksa dana pasar uang atau kas.`);
  }
  return tips;
}

export const GET: APIRoute = async ({ url }) => {
  const periodIdParam = url.searchParams.get('period_id');
  const historyMonths = parseInt(url.searchParams.get('history') || '6', 10);

  // ── Resolve latest networth period ──────────────────────────────────
  let targetPeriodId: number | undefined;
  if (periodIdParam) {
    targetPeriodId = parseInt(periodIdParam, 10);
  } else {
    const latest = db.prepare('SELECT period_id FROM networth ORDER BY period_id DESC LIMIT 1').get() as any;
    if (!latest) {
      return new Response(
        JSON.stringify({
          liquid_assets: 0,
          total_assets: 0,
          illiquid_assets: 0,
          monthly_expense: 0,
          monthly_fixed: 0,
          runway_months: 0,
          fixed_coverage_months: 0,
          status: 'critical',
          target_months: 6,
          asset_breakdown: [],
          history: [],
          period_id: null,
          month: null,
          tips: ['Belum ada data networth. Tambahkan data networth untuk menghitung runway.'],
        } satisfies RunwayResponse),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    targetPeriodId = latest.period_id;
  }

  // ── Latest period breakdown ─────────────────────────────────────────
  const breakdownRows = db.prepare(
    'SELECT investment, value FROM networth_breakdown WHERE period_id = ? ORDER BY value DESC'
  ).all(targetPeriodId) as { investment: string; value: number }[];

  const periodInfo = db.prepare('SELECT month FROM periods WHERE id = ?').get(targetPeriodId) as { month: string } | undefined;

  const assetBreakdown: AssetBreakdown[] = breakdownRows.map((b) => {
    const factor = liquidityFactor(b.investment);
    return {
      name: b.investment,
      value: b.value,
      liquidityPct: factor,
      liquidValue: b.value * factor,
    };
  });

  const totalAssets = assetBreakdown.reduce((s, a) => s + a.value, 0);
  const liquidAssets = assetBreakdown.reduce((s, a) => s + a.liquidValue, 0);
  const illiquidAssets = totalAssets - liquidAssets;

  // ── Monthly expense baseline (last 3 periods) ───────────────────────
  const expenseRows = db.prepare(`
    SELECT t.period_id, SUM(t.amount) as total_expense
    FROM transactions t
    WHERE t.done = 1 AND t.type IN ('cash', 'credit_expense')
    GROUP BY t.period_id
    ORDER BY t.period_id DESC
    LIMIT 3
  `).all() as { period_id: number; total_expense: number }[];

  const monthlyExpense = expenseRows.length > 0
    ? expenseRows.reduce((s, r) => s + r.total_expense, 0) / expenseRows.length
    : 0;

  // ── Fixed monthly obligations (active recurring) ────────────────────
  const fixedRows = db.prepare(`
    SELECT amount FROM recurring_transactions
    WHERE active = 1 AND type IN ('cash', 'credit_expense', 'credit_payment')
  `).all() as { amount: number }[];

  const monthlyFixed = fixedRows.reduce((s, r) => s + r.amount, 0);

  // ── Compute runway ──────────────────────────────────────────────────
  const runwayMonths = monthlyExpense > 0 ? liquidAssets / monthlyExpense : 0;
  const fixedCoverage = monthlyFixed > 0 ? liquidAssets / monthlyFixed : 0;
  const status = runwayStatus(runwayMonths);
  const tips = generateTips(runwayMonths, fixedCoverage, assetBreakdown);

  // ── Build history (last N periods with networth data) ───────────────
  const periodRows = db.prepare(`
    SELECT DISTINCT nb.period_id, p.month
    FROM networth_breakdown nb JOIN periods p ON nb.period_id = p.id
    ORDER BY nb.period_id DESC
    LIMIT ?
  `).all(historyMonths) as { period_id: number; month: string }[];

  // For each history period, compute liquid assets and matching expense
  const expenseByPeriod = new Map<number, number>();
  const allExpenses = db.prepare(`
    SELECT t.period_id, SUM(t.amount) as total_expense
    FROM transactions t
    WHERE t.done = 1 AND t.type IN ('cash', 'credit_expense')
    GROUP BY t.period_id
  `).all() as { period_id: number; total_expense: number }[];
  for (const e of allExpenses) {
    expenseByPeriod.set(e.period_id, e.total_expense);
  }

  const history: RunwayHistoryPoint[] = [];
  for (const pr of periodRows) {
    const histBreakdown = db.prepare(
      'SELECT investment, value FROM networth_breakdown WHERE period_id = ?'
    ).all(pr.period_id) as { investment: string; value: number }[];
    const histLiquid = histBreakdown.reduce((s, b) => s + b.value * liquidityFactor(b.investment), 0);
    const histTotal = histBreakdown.reduce((s, b) => s + b.value, 0);
    const histExpense = expenseByPeriod.get(pr.period_id) || 0;
    history.push({
      period_id: pr.period_id,
      month: pr.month,
      liquid_assets: Math.round(histLiquid),
      total_assets: Math.round(histTotal),
      runway_months: histExpense > 0 ? Number((histLiquid / histExpense).toFixed(2)) : 0,
    });
  }
  // Sort history oldest → newest for sparkline
  history.reverse();

  const response: RunwayResponse = {
    liquid_assets: Math.round(liquidAssets),
    total_assets: Math.round(totalAssets),
    illiquid_assets: Math.round(illiquidAssets),
    monthly_expense: Math.round(monthlyExpense),
    monthly_fixed: Math.round(monthlyFixed),
    runway_months: Number(runwayMonths.toFixed(2)),
    fixed_coverage_months: Number(fixedCoverage.toFixed(2)),
    status,
    target_months: 6,
    asset_breakdown: assetBreakdown.map((a) => ({
      ...a,
      value: Math.round(a.value),
      liquidValue: Math.round(a.liquidValue),
    })),
    history,
    period_id: targetPeriodId ?? null,
    month: periodInfo?.month ?? null,
    tips,
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
