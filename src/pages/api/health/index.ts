import type { APIRoute } from 'astro';
import { getMonthlySummary, getCategories, getNetworth, db } from '../../../lib/db';
import { computeHealthSummary } from '../../../lib/health-engine';

export const GET: APIRoute = async ({ url }) => {
  const monthParam = url.searchParams.get('month');
  const periodIdParam = url.searchParams.get('period_id');
  const summaries = getMonthlySummary();
  const categories = getCategories();
  const networth = getNetworth();

  // Enrich summaries with income from monthly_income (keyed by period_id)
  const incomeRows = db
    .prepare(
      `SELECT mi.period_id, mi.income, p.month
       FROM monthly_income mi JOIN periods p ON mi.period_id = p.id`
    )
    .all() as Array<{ period_id: number; income: number; month: string }>;

  const incomeByPeriodId = new Map<number, number>();
  const incomeByMonth = new Map<string, number>();
  for (const r of incomeRows) {
    incomeByPeriodId.set(r.period_id, r.income);
    incomeByMonth.set(r.month, r.income);
  }

  for (const s of summaries) {
    const income = incomeByPeriodId.get(s.period_id) || incomeByMonth.get(s.month) || 0;
    s.income = income;
    const invest = s.invest_total ?? 0;
    s.savings = income - (s.outcome.total - invest);
    s.savings_rate_pct = income > 0 ? Number(((s.savings / income) * 100).toFixed(2)) : 0;
  }

  const parsedPeriodId = periodIdParam ? parseInt(periodIdParam, 10) : null;
  const result = computeHealthSummary({
    summaries,
    categories,
    networth,
    targetMonth: monthParam,
    targetPeriodId: parsedPeriodId,
  });

  if (!result) {
    return new Response(JSON.stringify({ error: 'No data available' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' },
  });
};
