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
  getPeriodByMonth,
  getMonthlyIncomeByPeriod,
} from '../../../lib/db';
import {
  calculateMultiModelProjections,
  calculateSafeDailyAllowance,
  calculateEomSavingsForecast,
  calculateCategoryBurnTimeline,
} from '../../../lib/forecast-engine';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const month = url.searchParams.get('month');
  const periodIdStr = url.searchParams.get('period_id');

  // Get all months to determine available options
  const allMonths = getAllMonthsWithSpending().map((r: any) => r.month);
  const targetMonth = month || (allMonths.length > 0 ? allMonths[allMonths.length - 1] : '');

  // Resolve period_id
  let periodId: number | null = null;
  if (periodIdStr) {
    periodId = parseInt(periodIdStr, 10);
  } else if (targetMonth) {
    const period = getPeriodByMonth(targetMonth);
    periodId = period?.id ?? null;
  }

  if (periodId === null || isNaN(periodId)) {
    return new Response(JSON.stringify({ allMonths, forecast: null }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const pid: number = periodId;

  // 1. Cumulative daily spending for trajectory chart
  const cumulative = getCumulativeDailySpending(pid);
  const daysWithData = cumulative.length;

  // 2. Current period's transactions
  const transactions = getTransactions({ periodId: pid });
  const allPaid = transactions.filter((t: any) => t.done);
  const totalSpent = allPaid.reduce((s: number, t: any) => s + t.amount, 0);
  const unpaidList = transactions.filter((t: any) => !t.done);
  const totalUnpaid = unpaidList.reduce((s: number, t: any) => s + t.amount, 0);

  // Invest total (saving envelope FIN-235)
  const investTotal = allPaid
    .filter((t: any) => t.category === 'Invest')
    .reduce((s: number, t: any) => s + t.amount, 0);

  // Income for period
  const incRow = getMonthlyIncomeByPeriod(pid);
  const income = incRow ? (incRow.income || 0) + (incRow.other_income || 0) : 0;

  // 3. Estimate period length
  let periodLength = 30;
  if (cumulative.length > 1) {
    const firstDay = new Date(cumulative[0].day);
    const lastDay = new Date(cumulative[cumulative.length - 1].day);
    const daysSpread = Math.ceil((lastDay.getTime() - firstDay.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (daysSpread > 20 && daysSpread <= 45) periodLength = daysSpread;
  }

  const daysElapsed = daysWithData;
  const daysRemaining = Math.max(0, periodLength - daysElapsed);
  const dailyAvg = daysElapsed > 0 ? totalSpent / daysElapsed : 0;

  // 4. Historical comparison
  const recentMonthly = getRecentMonthlyTotals(6);
  const historicalAvg = recentMonthly.length > 0
    ? recentMonthly.reduce((s: number, m: any) => s + m.daily_avg, 0) / recentMonthly.length
    : 0;
  const historicalTotalAvg = recentMonthly.length > 0
    ? recentMonthly.reduce((s: number, m: any) => s + m.total, 0) / recentMonthly.length
    : 0;
  const velocityVsHistory = historicalAvg > 0 ? ((dailyAvg - historicalAvg) / historicalAvg) * 100 : 0;

  // 5. Multi-model projections
  const multiModel = calculateMultiModelProjections({
    cumulative,
    totalSpent,
    daysElapsed,
    periodLength,
    daysRemaining,
    historicalTotalAvg,
    recentMonthlyTotals: recentMonthly,
  });

  const projectedTotal = multiModel.baselineProjected;
  const regressionModel = multiModel.models.find((m) => m.id === 'regression');
  const projectionConfidence = regressionModel?.confidence || (daysElapsed >= 7 ? 'medium' : 'low');

  // 6. Category-level budget burn rate
  const categories = getCategories();
  const catSpending = getMonthlySpendingByCategory(pid);
  const catMap: Record<string, { spent: number; projected: number }> = {};

  for (const row of catSpending) {
    if (!catMap[row.category]) catMap[row.category] = { spent: 0, projected: 0 };
    catMap[row.category].spent += row.spent;
  }
  for (const cat of Object.keys(catMap)) {
    if (totalSpent > 0 && daysElapsed > 0) {
      const catDailyAvg = catMap[cat].spent / daysElapsed;
      catMap[cat].projected = Math.round(catDailyAvg * periodLength);
    } else {
      catMap[cat].projected = catMap[cat].spent;
    }
  }

  const budgetStatus = categories
    .filter((c: any) => c.monthly_limit > 0)
    .map((c: any) => {
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

  const categoryBudgetItems = categories
    .filter((c: any) => c.monthly_limit > 0)
    .map((c: any) => ({
      category: c.name,
      color: c.color,
      spent: catMap[c.name]?.spent || 0,
      limit: c.monthly_limit,
    }));

  const categoryBurnTimeline = calculateCategoryBurnTimeline(categoryBudgetItems, daysElapsed, periodLength);

  // 7. Safe daily burn allowance (target: historical average or sum of category limits, fallback to current projected)
  const totalCategoryBudget = categories.reduce((s: number, c: any) => s + (c.monthly_limit || 0), 0);
  const defaultTargetCeiling = totalCategoryBudget > 0
    ? totalCategoryBudget
    : historicalTotalAvg > 0
    ? Math.round(historicalTotalAvg)
    : Math.round(projectedTotal);

  const safeDailyAllowance = calculateSafeDailyAllowance({
    targetCeiling: defaultTargetCeiling,
    currentSpent: totalSpent,
    daysRemaining,
    currentDailyAvg: dailyAvg,
  });

  // 8. EOM Net Savings Forecast
  const eomSavings = calculateEomSavingsForecast({
    income,
    investTotal,
    projectedTotalSpending: projectedTotal,
  });

  // 9. Credit card status
  const credit = getCreditStatus(pid);
  const creditOutstanding = credit.credit_expenses_paid - credit.credit_payments_paid;
  const creditUtilization = credit.credit_expenses_paid > 0
    ? (creditOutstanding / credit.credit_expenses_paid) * 100
    : 0;

  // 10. Spending velocity
  const velocity = getSpendingVelocity(pid);

  // 11. Projected trajectory points
  const projectedTrajectory: any[] = [];
  if (cumulative.length > 0 && daysRemaining > 0) {
    const lastPoint = cumulative[cumulative.length - 1];
    const lastDay = new Date(lastPoint.day).getTime();
    const step = daysElapsed > 0 ? (projectedTotal - lastPoint.cumulative) / daysRemaining : 0;
    for (let d = 1; d <= daysRemaining; d++) {
      const futureDate = new Date(lastDay + d * 1000 * 60 * 60 * 24);
      projectedTrajectory.push({
        day: futureDate.toISOString().slice(0, 10),
        cumulative: Math.round(lastPoint.cumulative + step * d),
      });
    }
  }

  // 12. Alerts
  const alerts: { type: 'info' | 'warning' | 'danger'; message: string }[] = [];

  for (const bs of budgetStatus) {
    if (bs.status === 'critical') {
      alerts.push({
        type: 'danger',
        message: `${bs.category}: Diproyeksikan overbudget ${formatAlertAmt(bs.projected - bs.limit)} (${Math.round(bs.projectedPct)}% dari batas)`,
      });
    } else if (bs.status === 'danger') {
      alerts.push({
        type: 'danger',
        message: `${bs.category}: Sudah mencapai ${Math.round(bs.spentPct)}% batas anggaran (${formatAlertAmt(bs.remaining)} tersisa)`,
      });
    } else if (bs.status === 'warning') {
      alerts.push({
        type: 'warning',
        message: `${bs.category}: Ritme belanja tinggi (${Math.round(bs.projectedPct)}% dari pagu)`,
      });
    }
  }

  if (velocityVsHistory > 30) {
    alerts.push({
      type: 'danger',
      message: `Kecepatan belanja harian ${Math.round(velocityVsHistory)}% lebih tinggi dari tren historis`,
    });
  } else if (velocityVsHistory < -20 && daysElapsed >= 5) {
    alerts.push({
      type: 'info',
      message: `Pace belanja sangat hemat, ${Math.round(Math.abs(velocityVsHistory))}% di bawah rata-rata historis`,
    });
  }

  if (unpaidList.length > 0) {
    alerts.push({
      type: 'warning',
      message: `${unpaidList.length} transaksi berulang belum diselesaikan (total komitmen ${formatAlertAmt(totalUnpaid)})`,
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      type: 'info',
      message: daysElapsed < 3
        ? 'Data awal periode masih minim. Akurasi proyeksi akan meningkat seiring berjalannya hari.'
        : 'Ritme belanja terpantau stabil dalam batas aman.',
    });
  }

  const forecast = {
    month: targetMonth,
    period_id: pid,
    income,
    investTotal,
    daysElapsed,
    periodLength,
    daysRemaining,
    totalSpent,
    totalUnpaid,
    unpaidCount: unpaidList.length,
    dailyAvg,
    projectedTotal,
    projectionConfidence,
    velocityVsHistory,
    targetCeiling: defaultTargetCeiling,
    budgetStatus,
    categoryBurnTimeline,
    multiModel,
    safeDailyAllowance,
    eomSavings,
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
