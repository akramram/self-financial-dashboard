import type { APIRoute } from 'astro';
import { getTransactions, getNetworth, getMonthlySummary, db } from '../../lib/db';

export const GET: APIRoute = async () => {
  const transactions = getTransactions();
  const networth = getNetworth();
  const monthlySummary = getMonthlySummary();
  const incomeRows = db.prepare('SELECT month, income FROM monthly_income').all() as any[];
  const incomeMap = new Map(incomeRows.map((r) => [r.month, r.income]));
  for (const s of monthlySummary) {
    const income = incomeMap.get(s.month) || 0;
    s.income = income;
    s.savings = income - s.outcome.total;
    s.savings_rate_pct = income > 0 ? Number(((s.savings / income) * 100).toFixed(2)) : 0;
  }

  const data = {
    transactions,
    networth,
    monthlySummary,
    exportedAt: new Date().toISOString(),
  };

  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="financial-data-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
};
