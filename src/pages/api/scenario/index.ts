import type { APIRoute } from 'astro';
import { db } from '../../../lib/db';

export const GET: APIRoute = async () => {
  // Fetch last N months of summaries for trend analysis
  const periodRows = db.prepare(`
    SELECT p.id, p.month, p.start_date, p.end_date
    FROM periods p
    INNER JOIN transactions t ON t.period_id = p.id
    GROUP BY p.id
    ORDER BY p.start_date ASC
  `).all() as any[];

  const periods = periodRows.map((p) => {
    const tx = db.prepare('SELECT * FROM transactions WHERE period_id = ? AND done = 1').all(p.id) as any[];
    const cash = tx.filter((t) => t.type === 'cash').reduce((s, t) => s + t.amount, 0);
    const creditPayment = tx.filter((t) => t.type === 'credit_payment').reduce((s, t) => s + t.amount, 0);

    const incomeRow = db.prepare('SELECT income, other_income FROM monthly_income WHERE period_id = ?').get(p.id) as any;
    const income = (incomeRow?.income || 0) + (incomeRow?.other_income || 0);

    const nw = db.prepare('SELECT total FROM networth WHERE period_id = ?').get(p.id) as any;

    // Category breakdown for this period
    const categoryTotals: Record<string, number> = {};
    tx.filter((t) => t.type === 'cash' || t.type === 'credit_expense' || t.type === 'credit_payment')
      .forEach((t) => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
      });

    return {
      period_id: p.id,
      month: p.month,
      start_date: p.start_date,
      end_date: p.end_date,
      income,
      outcome: cash + creditPayment,
      category_totals: categoryTotals,
      networth: nw?.total || null,
    };
  });

  // Get category list with colors and recent averages
  const categories = db.prepare('SELECT name, color, monthly_limit FROM categories ORDER BY name').all() as any[];

  // Compute 3-month average spending per category
  const recentPeriods = periods.slice(-3);
  const categoryAverages: Record<string, number> = {};
  for (const cat of categories) {
    const total = recentPeriods.reduce((sum, p) => sum + (p.category_totals[cat.name] || 0), 0);
    categoryAverages[cat.name] = recentPeriods.length > 0 ? total / recentPeriods.length : 0;
  }

  // Average income over last 3 months
  const avgIncome = recentPeriods.length > 0
    ? recentPeriods.reduce((s, p) => s + p.income, 0) / recentPeriods.length
    : 0;

  // Average total spending over last 3 months
  const avgSpending = recentPeriods.length > 0
    ? recentPeriods.reduce((s, p) => s + p.outcome, 0) / recentPeriods.length
    : 0;

  // Current networth (most recent)
  const currentNetworth = [...periods].reverse().find((p) => p.networth !== null)?.networth || 0;

  // Average monthly networth growth
  const nwPoints = periods.filter((p) => p.networth !== null).map((p) => p.networth as number);
  let avgNwGrowth = 0;
  if (nwPoints.length >= 2) {
    const growths: number[] = [];
    for (let i = 1; i < nwPoints.length; i++) {
      growths.push(nwPoints[i] - nwPoints[i - 1]);
    }
    avgNwGrowth = growths.reduce((s, g) => s + g, 0) / growths.length;
  }

  return new Response(JSON.stringify({
    periods,
    categories: categories.map((c) => ({
      name: c.name,
      color: c.color,
      monthly_limit: c.monthly_limit,
      avg_spending: Math.round(categoryAverages[c.name] || 0),
    })),
    avgIncome: Math.round(avgIncome),
    avgSpending: Math.round(avgSpending),
    avgSavings: Math.round(avgIncome - avgSpending),
    currentNetworth,
    avgNwGrowth: Math.round(avgNwGrowth),
    savingsRate: avgIncome > 0 ? Math.round(((avgIncome - avgSpending) / avgIncome) * 1000) / 10 : 0,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
