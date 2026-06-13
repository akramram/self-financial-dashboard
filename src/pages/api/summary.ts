import type { APIRoute } from 'astro';
import { db, getMonthlySummary } from '../../lib/db';

export const GET: APIRoute = async () => {
  const summaries = getMonthlySummary();
  // Enrich with income from monthly_income table (now uses period_id)
  const incomeRows = db.prepare(`
    SELECT mi.period_id, mi.income
    FROM monthly_income mi
  `).all() as any[];
  const incomeMap = new Map(incomeRows.map((r) => [r.period_id, r.income]));

  for (const s of summaries) {
    const income = incomeMap.get(s.period_id) || 0;
    s.income = income;
    s.savings = income - s.outcome.total;
    s.savings_rate_pct = income > 0 ? Number(((s.savings / income) * 100).toFixed(2)) : 0;
  }

  return new Response(JSON.stringify(summaries), {
    headers: { 'Content-Type': 'application/json' },
  });
};
