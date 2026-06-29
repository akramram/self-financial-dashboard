import type { APIRoute } from 'astro';
import { getMonthlySummary, getCategories, db } from '../../../lib/db';

export const GET: APIRoute = async () => {
  const summaries = getMonthlySummary();
  const categories = getCategories();

  // Enrich summaries with income from DB
  const incomeRows = db.prepare('SELECT mi.period_id, mi.income, p.month FROM monthly_income mi JOIN periods p ON mi.period_id = p.id').all() as any[];
  const incomeMap = new Map(incomeRows.map((r) => [r.month, r.income]));
  for (const s of summaries) {
    const income = incomeMap.get(s.month) || 0;
    s.income = income;
    s.savings = income - s.outcome.total;
    s.savings_rate_pct = income > 0 ? Number(((s.savings / income) * 100).toFixed(2)) : 0;
  }

  return new Response(JSON.stringify({ summaries, categories }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
