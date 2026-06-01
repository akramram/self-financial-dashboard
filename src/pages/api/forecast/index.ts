import type { APIRoute } from 'astro';
import {
  db,
  getTransactions,
  getCategories,
  getMonthlySpendingByCategory,
  getCreditStatus,
  getRecentMonthlyTotals,
  getCumulativeDailySpending,
  getAllMonthsWithSpending,
  getSpendingVelocity,
} from '../../../lib/db';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const month = url.searchParams.get('month');

  // Get all months to determine available options
  const allMonths = getAllMonthsWithSpending().map((r: any) => r.month);
  const targetMonth = month || (allMonths.length > 0 ? allMonths[allMonths.length - 1] : '');

  if (!targetMonth) {
    return new Response(JSON.stringify({ allMonths, forecast: null }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 1. Cumulative daily spending for trajectory chart
  const cumulative = getCumulativeDailySpending(targetMonth);
  const daysWithData = cumulative.length;

  // 2. Current month's transactions
  const transactions = getTransactions({ month: targetMonth });
  const allPaid = transactions.filter((t) => t.done);
  const totalSpent = allPaid.reduce((s, t) => s + t.amount, 0);
  const totalUnpaid = transactions.filter((t) => !t.done).reduce((s, t) => s + t.amount, 0);

  // 3. Estimate period length (based on salary period convention: ~30 days)
  // Use actual day spread if available, otherwise default to 30
  let periodLength = 30;
  if (cumulative.length > 1) {
    const firstDay = new Date(cumulative[0].day);
    const lastDay = new Date(cumulative[cumulative.length - 1].day);
    const daysSpread = Math.ceil((lastDay.getTime() - firstDay.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (daysSpread > 20 && daysSpread <= 45) periodLength = daysSpread;
  }

  const daysElapsed = daysWithData;
  const daysRemaining = Math.max(0, periodLength - daysElapsed);

  // 4. Compute projection using linear regression on cumulative data
  let projectedTotal = totalSpent;
  let projectionConfidence = 'low';
  const dailyAvg = daysElapsed > 0 ? totalSpent / daysElapsed : 0;

  if (daysElapsed >= 3) {
    // Simple linear regression on cumulative daily data
    const n = cumulative.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += cumulative[i].cumulative;
      sumXY += i * cumulative[i].cumulative;
      sumX2 += i * i;
    }
    const denom = n * sumX2 - sumX * sumX;
    if (denom !== 0) {
      const slope = (n * sumXY - sumX * sumY) / denom;
      const intercept = (sumY - slope * sumX) / n;
      projectedTotal = Math.max(0, intercept + slope * (periodLength - 1));

      // Estimate confidence based on R²
      const meanY = sumY / n;
      let ssRes = 0, ssTot = 0;
      for (let i = 0; i < n; i++) {
        const predicted = intercept + slope * i;
        ssRes += (cumulative[i].cumulative - predicted) ** 2;
        ssTot += (cumulative[i].cumulative - meanY) ** 2;
      }
      const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0;
      if (rSquared > 0.85 && daysElapsed >= 7) projectionConfidence = 'high';
      else if (rSquared > 0.6 && daysElapsed >= 5) projectionConfidence = 'medium';
    } else {
      projectedTotal = dailyAvg * periodLength;
      projectionConfidence = daysElapsed >= 7 ? 'medium' : 'low';
    }
  } else if (daysElapsed > 0) {
    projectedTotal = dailyAvg * periodLength;
    projectionConfidence = 'low';
  }

  // 5. Compare with historical average
  const recentMonthly = getRecentMonthlyTotals(6);
  const historicalAvg = recentMonthly.length > 0
    ? recentMonthly.reduce((s, m) => s + m.daily_avg, 0) / recentMonthly.length
    : 0;
  const velocityVsHistory = historicalAvg > 0 ? ((dailyAvg - historicalAvg) / historicalAvg) * 100 : 0;

  // 6. Category-level budget burn rate
  const categories = getCategories();
  const catSpending = getMonthlySpendingByCategory(targetMonth);
  const catMap: Record<string, { spent: number; projected: number }> = {};

  for (const row of catSpending) {
    if (!catMap[row.category]) catMap[row.category] = { spent: 0, projected: 0 };
    catMap[row.category].spent += row.spent;
  }
  // Project category spending proportionally
  for (const cat of Object.keys(catMap)) {
    if (totalSpent > 0 && daysElapsed > 0) {
      const catDailyAvg = catMap[cat].spent / daysElapsed;
      catMap[cat].projected = catDailyAvg * periodLength;
    } else {
      catMap[cat].projected = catMap[cat].spent;
    }
  }

  const budgetStatus = categories
    .filter((c) => c.monthly_limit > 0)
    .map((c) => {
      const spent = catMap[c.name]?.spent || 0;
      const projected = catMap[c.name]?.projected || 0;
      const limit = c.monthly_limit;
      const spentPct = Math.min(100, (spent / limit) * 100);
      const projectedPct = (projected / limit) * 100;
      let status: 'safe' | 'warning' | 'danger' | 'critical' = 'safe';
      if (projectedPct > 100) status = 'critical';
      else if (spentPct > 80) status = 'danger';
      else if (projectedPct > 80) status = 'warning';
      return {
        category: c.name,
        color: c.color,
        spent,
        projected,
        limit,
        spentPct,
        projectedPct,
        status,
        remaining: Math.max(0, limit - spent),
      };
    });

  // 7. Credit card utilization
  const credit = getCreditStatus(targetMonth);
  const creditOutstanding = credit.credit_expenses_paid - credit.credit_payments_paid;
  const creditUtilization = credit.credit_expenses_paid > 0
    ? (creditOutstanding / credit.credit_expenses_paid) * 100
    : 0;

  // 8. Spending velocity (reuse existing function)
  const velocity = getSpendingVelocity(targetMonth);

  // 9. Generate projected trajectory points for chart
  const projectedTrajectory = [];
  if (cumulative.length > 0 && daysRemaining > 0) {
    const lastPoint = cumulative[cumulative.length - 1];
    const lastDay = new Date(lastPoint.day).getTime();
    const step = daysElapsed > 0 ? (projectedTotal - lastPoint.cumulative) / daysRemaining : 0;
    for (let d = 1; d <= daysRemaining; d++) {
      const futureDate = new Date(lastDay + d * 1000 * 60 * 60 * 24);
      projectedTrajectory.push({
        day: futureDate.toISOString().slice(0, 10),
        cumulative: lastPoint.cumulative + step * d,
      });
    }
  }

  // 10. Alerts
  const alerts: { type: 'info' | 'warning' | 'danger'; message: string }[] = [];

  // Budget alerts
  for (const bs of budgetStatus) {
    if (bs.status === 'critical') {
      alerts.push({
        type: 'danger',
        message: `${bs.category}: Projected to exceed budget by ${formatAlertAmt(bs.projected - bs.limit)} (${Math.round(bs.projectedPct)}% of limit)`,
      });
    } else if (bs.status === 'danger') {
      alerts.push({
        type: 'danger',
        message: `${bs.category}: Already at ${Math.round(bs.spentPct)}% of budget (${formatAlertAmt(bs.remaining)} remaining)`,
      });
    } else if (bs.status === 'warning') {
      alerts.push({
        type: 'warning',
        message: `${bs.category}: On track to reach ${Math.round(bs.projectedPct)}% of budget by month end`,
      });
    }
  }

  // Velocity alerts
  if (velocityVsHistory > 30) {
    alerts.push({
      type: 'warning',
      message: `Spending velocity is ${Math.round(velocityVsHistory)}% higher than your historical average`,
    });
  } else if (velocityVsHistory < -20 && daysElapsed >= 5) {
    alerts.push({
      type: 'info',
      message: `Spending velocity is ${Math.round(Math.abs(velocityVsHistory))}% lower than usual — on track for savings!`,
    });
  }

  // Unpaid alerts
  if (totalUnpaid > 0) {
    alerts.push({
      type: 'info',
      message: `${transactions.filter((t) => !t.done).length} unpaid transactions totaling ${formatAlertAmt(totalUnpaid)} not included in projections`,
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      type: 'info',
      message: daysElapsed < 3
        ? 'Need a few more days of data for accurate projections. Check back soon!'
        : 'Looking good! Spending is within expected ranges.',
    });
  }

  const forecast = {
    month: targetMonth,
    daysElapsed,
    periodLength,
    daysRemaining,
    totalSpent,
    totalUnpaid,
    dailyAvg,
    projectedTotal,
    projectionConfidence,
    velocityVsHistory,
    budgetStatus,
    creditStatus: {
      creditExpenses: credit.credit_expenses_paid,
      creditPayments: credit.credit_payments_paid,
      outstanding: Math.max(0, creditOutstanding),
      utilizationPct: Math.max(0, creditUtilization),
      unpaidCredit: credit.credit_expenses_total - credit.credit_expenses_paid,
      unpaidPayments: credit.credit_payments_total - credit.credit_payments_paid,
    },
    cumulative,
    projectedTrajectory,
    recentMonthly,
    velocity,
    alerts,
  };

  return new Response(JSON.stringify({ allMonths, forecast }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

function formatAlertAmt(n: number): string {
  const abs = Math.abs(Math.round(n));
  return 'IDR ' + abs.toLocaleString('id-ID');
}
