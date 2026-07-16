import type { APIRoute } from 'astro';
import { db } from '../../lib/db';

/**
 * GET /api/safe-to-spend?period_id=36
 *
 * Computes the daily "safe-to-spend" allowance for the active (or specified) salary period.
 *
 * Formula:
 *   remainingBudget = income − totalSpent
 *   daysRemaining   = period end date − today (minimum 0)
 *   dailySafeToSpend = remainingBudget / max(1, daysRemaining)
 *
 * Also returns:
 *   spentToday       — sum of done spending transactions created today
 *   leftToday        — dailySafeToSpend − spentToday
 *   avg7d            — average daily spending over the last 7 days
 *   status           — 'healthy' | 'tight' | 'over' based on remainingBudget and leftToday
 */

interface SafeToSpendResponse {
  period_id: number;
  period_label: string;
  start_date: string;
  end_date: string;
  income: number;
  total_spent: number;
  remaining_budget: number;
  days_elapsed: number;
  days_total: number;
  days_remaining: number;
  daily_safe_to_spend: number;
  spent_today: number;
  left_today: number;
  avg_7d: number;
  status: 'healthy' | 'tight' | 'over';
  time_elapsed_pct: number;
}

export const GET: APIRoute = async ({ url }) => {
  const periodIdParam = url.searchParams.get('period_id');
  const requestedPeriodId = periodIdParam ? parseInt(periodIdParam, 10) : undefined;

  // Resolve period: explicit param → active period
  let period: any;
  if (requestedPeriodId) {
    period = db.prepare('SELECT * FROM periods WHERE id = ?').get(requestedPeriodId);
  } else {
    // Active period: today falls within [start_date, end_date]
    const today = new Date().toISOString().slice(0, 10);
    period = db
      .prepare('SELECT * FROM periods WHERE start_date <= ? AND end_date >= ? ORDER BY start_date DESC LIMIT 1')
      .get(today, today);
  }

  if (!period) {
    return new Response(
      JSON.stringify({ error: 'No active period found' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // --- Income ---
  const incomeRow = db
    .prepare('SELECT income FROM monthly_income WHERE period_id = ?')
    .get(period.id) as { income: number } | undefined;
  const income = incomeRow?.income ?? 0;

  // --- Total spent (done spending transactions) ---
  const spentRow = db
    .prepare(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM transactions
       WHERE period_id = ? AND done = 1 AND type IN ('cash', 'credit_expense')`
    )
    .get(period.id) as { total: number };
  const totalSpent = spentRow.total;

  // --- Period days computation ---
  const startDate = new Date(period.start_date + 'T00:00:00');
  const endDate = new Date(period.end_date + 'T23:59:59');
  const now = new Date();

  const msPerDay = 1000 * 60 * 60 * 24;
  const daysTotal = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / msPerDay) + 1);
  const daysElapsed = Math.min(
    daysTotal,
    Math.max(1, Math.round((now.getTime() - startDate.getTime()) / msPerDay) + 1)
  );
  const daysRemaining = Math.max(0, daysTotal - daysElapsed);

  // --- Core computation ---
  const remainingBudget = income - totalSpent;
  const dailySafeToSpend = daysRemaining > 0 ? remainingBudget / daysRemaining : remainingBudget;

  // --- Spent today ---
  const todayStr = now.toISOString().slice(0, 10);
  const todayRow = db
    .prepare(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM transactions
       WHERE period_id = ? AND done = 1 AND type IN ('cash', 'credit_expense')
         AND DATE(created_time) = ?`
    )
    .get(period.id, todayStr) as { total: number };
  const spentToday = todayRow.total;

  const leftToday = dailySafeToSpend - spentToday;

  // --- 7-day average ---
  const sevenDaysAgo = new Date(now.getTime() - 7 * msPerDay);
  const sevenDaysStr = sevenDaysAgo.toISOString().slice(0, 10);
  const avg7dRow = db
    .prepare(
      `SELECT COALESCE(SUM(amount), 0) as total, COUNT(DISTINCT DATE(created_time)) as active_days
       FROM transactions
       WHERE period_id = ? AND done = 1 AND type IN ('cash', 'credit_expense')
         AND DATE(created_time) >= ?`
    )
    .get(period.id, sevenDaysStr) as { total: number; active_days: number };
  const avg7d = avg7dRow.total / 7; // average over 7 calendar days

  // --- Status ---
  let status: SafeToSpendResponse['status'] = 'healthy';
  if (remainingBudget < 0) {
    status = 'over';
  } else if (leftToday < 0 || (daysRemaining > 0 && remainingBudget / daysRemaining < avg7d * 0.5)) {
    status = 'tight';
  }

  const timeElapsedPct = (daysElapsed / daysTotal) * 100;

  const result: SafeToSpendResponse = {
    period_id: period.id,
    period_label: period.month,
    start_date: period.start_date,
    end_date: period.end_date,
    income,
    total_spent: totalSpent,
    remaining_budget: remainingBudget,
    days_elapsed: daysElapsed,
    days_total: daysTotal,
    days_remaining: daysRemaining,
    daily_safe_to_spend: Math.round(dailySafeToSpend),
    spent_today: spentToday,
    left_today: Math.round(leftToday),
    avg_7d: Math.round(avg7d),
    status,
    time_elapsed_pct: Math.round(timeElapsedPct * 10) / 10,
  };

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
