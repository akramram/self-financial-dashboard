import { r as getAllMonthsWithSpending, b as getPeriodByMonth, s as getCumulativeDailySpending, p as getTransactions, t as getRecentMonthlyTotals, a as getCategories, v as getMonthlySpendingByCategory, w as getCreditStatus, h as getSpendingVelocity } from '../../chunks/db_535bmtRB.mjs';
export { renderers } from '../../renderers.mjs';

const GET = async ({ request }) => {
  const url = new URL(request.url);
  const month = url.searchParams.get("month");
  const periodIdStr = url.searchParams.get("period_id");
  const allMonths = getAllMonthsWithSpending().map((r) => r.month);
  const targetMonth = month || (allMonths.length > 0 ? allMonths[allMonths.length - 1] : "");
  let periodId = null;
  if (periodIdStr) {
    periodId = parseInt(periodIdStr, 10);
  } else if (targetMonth) {
    const period = getPeriodByMonth(targetMonth);
    periodId = period?.id ?? null;
  }
  if (periodId === null || isNaN(periodId)) {
    return new Response(JSON.stringify({ allMonths, forecast: null }), {
      headers: { "Content-Type": "application/json" }
    });
  }
  const pid = periodId;
  const cumulative = getCumulativeDailySpending(pid);
  const daysWithData = cumulative.length;
  const transactions = getTransactions({ periodId: pid });
  const allPaid = transactions.filter((t) => t.done);
  const totalSpent = allPaid.reduce((s, t) => s + t.amount, 0);
  const totalUnpaid = transactions.filter((t) => !t.done).reduce((s, t) => s + t.amount, 0);
  let periodLength = 30;
  if (cumulative.length > 1) {
    const firstDay = new Date(cumulative[0].day);
    const lastDay = new Date(cumulative[cumulative.length - 1].day);
    const daysSpread = Math.ceil((lastDay.getTime() - firstDay.getTime()) / (1e3 * 60 * 60 * 24)) + 1;
    if (daysSpread > 20 && daysSpread <= 45) periodLength = daysSpread;
  }
  const daysElapsed = daysWithData;
  const daysRemaining = Math.max(0, periodLength - daysElapsed);
  let projectedTotal = totalSpent;
  let projectionConfidence = "low";
  const dailyAvg = daysElapsed > 0 ? totalSpent / daysElapsed : 0;
  if (daysElapsed >= 3) {
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
      const meanY = sumY / n;
      let ssRes = 0, ssTot = 0;
      for (let i = 0; i < n; i++) {
        const predicted = intercept + slope * i;
        ssRes += (cumulative[i].cumulative - predicted) ** 2;
        ssTot += (cumulative[i].cumulative - meanY) ** 2;
      }
      const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0;
      if (rSquared > 0.85 && daysElapsed >= 7) projectionConfidence = "high";
      else if (rSquared > 0.6 && daysElapsed >= 5) projectionConfidence = "medium";
    } else {
      projectedTotal = dailyAvg * periodLength;
      projectionConfidence = daysElapsed >= 7 ? "medium" : "low";
    }
  } else if (daysElapsed > 0) {
    projectedTotal = dailyAvg * periodLength;
    projectionConfidence = "low";
  }
  const recentMonthly = getRecentMonthlyTotals(6);
  const historicalAvg = recentMonthly.length > 0 ? recentMonthly.reduce((s, m) => s + m.daily_avg, 0) / recentMonthly.length : 0;
  const velocityVsHistory = historicalAvg > 0 ? (dailyAvg - historicalAvg) / historicalAvg * 100 : 0;
  const categories = getCategories();
  const catSpending = getMonthlySpendingByCategory(pid);
  const catMap = {};
  for (const row of catSpending) {
    if (!catMap[row.category]) catMap[row.category] = { spent: 0, projected: 0 };
    catMap[row.category].spent += row.spent;
  }
  for (const cat of Object.keys(catMap)) {
    if (totalSpent > 0 && daysElapsed > 0) {
      const catDailyAvg = catMap[cat].spent / daysElapsed;
      catMap[cat].projected = catDailyAvg * periodLength;
    } else {
      catMap[cat].projected = catMap[cat].spent;
    }
  }
  const budgetStatus = categories.filter((c) => c.monthly_limit > 0).map((c) => {
    const spent = catMap[c.name]?.spent || 0;
    const projected = catMap[c.name]?.projected || 0;
    const limit = c.monthly_limit;
    const spentPct = Math.min(100, spent / limit * 100);
    const projectedPct = projected / limit * 100;
    let status = "safe";
    if (projectedPct > 100) status = "critical";
    else if (spentPct > 80) status = "danger";
    else if (projectedPct > 80) status = "warning";
    return {
      category: c.name,
      color: c.color,
      spent,
      projected,
      limit,
      spentPct,
      projectedPct,
      status,
      remaining: Math.max(0, limit - spent)
    };
  });
  const credit = getCreditStatus(pid);
  const creditOutstanding = credit.credit_expenses_paid - credit.credit_payments_paid;
  const creditUtilization = credit.credit_expenses_paid > 0 ? creditOutstanding / credit.credit_expenses_paid * 100 : 0;
  const velocity = getSpendingVelocity(pid);
  const projectedTrajectory = [];
  if (cumulative.length > 0 && daysRemaining > 0) {
    const lastPoint = cumulative[cumulative.length - 1];
    const lastDay = new Date(lastPoint.day).getTime();
    const step = daysElapsed > 0 ? (projectedTotal - lastPoint.cumulative) / daysRemaining : 0;
    for (let d = 1; d <= daysRemaining; d++) {
      const futureDate = new Date(lastDay + d * 1e3 * 60 * 60 * 24);
      projectedTrajectory.push({
        day: futureDate.toISOString().slice(0, 10),
        cumulative: lastPoint.cumulative + step * d
      });
    }
  }
  const alerts = [];
  for (const bs of budgetStatus) {
    if (bs.status === "critical") {
      alerts.push({
        type: "danger",
        message: `${bs.category}: Projected to exceed budget by ${formatAlertAmt(bs.projected - bs.limit)} (${Math.round(bs.projectedPct)}% of limit)`
      });
    } else if (bs.status === "danger") {
      alerts.push({
        type: "danger",
        message: `${bs.category}: Already at ${Math.round(bs.spentPct)}% of budget (${formatAlertAmt(bs.remaining)} remaining)`
      });
    } else if (bs.status === "warning") {
      alerts.push({
        type: "warning",
        message: `${bs.category}: On track to reach ${Math.round(bs.projectedPct)}% of budget by month end`
      });
    }
  }
  if (velocityVsHistory > 30) {
    alerts.push({
      type: "warning",
      message: `Spending velocity is ${Math.round(velocityVsHistory)}% higher than your historical average`
    });
  } else if (velocityVsHistory < -20 && daysElapsed >= 5) {
    alerts.push({
      type: "info",
      message: `Spending velocity is ${Math.round(Math.abs(velocityVsHistory))}% lower than usual — on track for savings!`
    });
  }
  if (totalUnpaid > 0) {
    alerts.push({
      type: "info",
      message: `${transactions.filter((t) => !t.done).length} unpaid transactions totaling ${formatAlertAmt(totalUnpaid)} not included in projections`
    });
  }
  if (alerts.length === 0) {
    alerts.push({
      type: "info",
      message: daysElapsed < 3 ? "Need a few more days of data for accurate projections. Check back soon!" : "Looking good! Spending is within expected ranges."
    });
  }
  const forecast = {
    month: targetMonth,
    period_id: pid,
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
      unpaidPayments: credit.credit_payments_total - credit.credit_payments_paid
    },
    cumulative,
    projectedTrajectory,
    recentMonthly,
    velocity,
    alerts
  };
  return new Response(JSON.stringify({ allMonths, forecast }), {
    headers: { "Content-Type": "application/json" }
  });
};
function formatAlertAmt(n) {
  const abs = Math.abs(Math.round(n));
  return "IDR " + abs.toLocaleString("id-ID");
}

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
