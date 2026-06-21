import { g as getMonthlySummary, q as getNetworth, d as db } from '../../chunks/db_TxX34wAz.mjs';
export { renderers } from '../../renderers.mjs';

const GET = async ({ request }) => {
  const url = new URL(request.url);
  const withdrawalRate = parseFloat(url.searchParams.get("wr") || "4") / 100;
  const expectedReturn = parseFloat(url.searchParams.get("er") || "7") / 100;
  const inflation = parseFloat(url.searchParams.get("inf") || "3") / 100;
  const params = {
    withdrawalRate: Math.max(0.02, Math.min(0.1, withdrawalRate)),
    expectedReturn: Math.max(0.01, Math.min(0.15, expectedReturn)),
    inflation: Math.max(0, Math.min(0.08, inflation))
  };
  const summaries = getMonthlySummary();
  const networthRecords = getNetworth();
  if (summaries.length === 0) {
    return new Response(JSON.stringify({
      error: "No financial data available. Add transactions and income first."
    }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  const latestSummary = summaries[summaries.length - 1];
  const latestNetworth = networthRecords.length > 0 ? networthRecords[networthRecords.length - 1] : null;
  const incomeRows = db.prepare(`
    SELECT mi.period_id, mi.income, p.month
    FROM monthly_income mi JOIN periods p ON mi.period_id = p.id
  `).all();
  const incomeMap = new Map(incomeRows.map((r) => [r.period_id, r.income]));
  const monthlyIncome = incomeMap.get(latestSummary.period_id) || 0;
  const monthlyExpenses = latestSummary.outcome.total;
  const annualExpenses = monthlyExpenses * 12;
  const currentNetworth = latestNetworth?.total || 0;
  const monthlySavings = monthlyIncome - monthlyExpenses;
  const savingsRate = monthlyIncome > 0 ? (monthlyIncome - monthlyExpenses) / monthlyIncome * 100 : 0;
  const fireNumber = params.withdrawalRate > 0 ? annualExpenses / params.withdrawalRate : annualExpenses * 25;
  const progressPct = fireNumber > 0 ? Math.min(100, currentNetworth / fireNumber * 100) : 0;
  const realReturn = (1 + params.expectedReturn) / (1 + params.inflation) - 1;
  let yearsToFi = null;
  let projectedFiDate = null;
  const projection = [];
  if (monthlySavings > 0 && fireNumber > currentNetworth && realReturn > 0) {
    const monthlyRate = realReturn / 12;
    const pmt = -monthlySavings;
    const pv = -currentNetworth;
    const fv = fireNumber;
    const numerator = pmt - fv * monthlyRate;
    const denominator = pmt - pv * monthlyRate;
    if (numerator > 0 && denominator > 0 && monthlyRate > 0) {
      const months = Math.log(numerator / denominator) / Math.log(1 + monthlyRate);
      yearsToFi = Math.ceil(months / 12 * 10) / 10;
      const now = /* @__PURE__ */ new Date();
      const fiDate = new Date(now);
      fiDate.setFullYear(fiDate.getFullYear() + Math.ceil(yearsToFi));
      projectedFiDate = fiDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long"
      });
    }
    const maxYears = Math.min(60, Math.ceil(yearsToFi || 30) + 5);
    let currentBalance = currentNetworth;
    let totalContributions = 0;
    for (let year = 0; year <= maxYears; year++) {
      let yearContributions = 0;
      for (let m = 0; m < 12; m++) {
        currentBalance += monthlySavings;
        yearContributions += monthlySavings;
        const monthlyReturn = currentBalance * monthlyRate;
        currentBalance += monthlyReturn;
      }
      totalContributions += yearContributions;
      const projectedDate = /* @__PURE__ */ new Date();
      projectedDate.setFullYear(projectedDate.getFullYear() + year);
      projection.push({
        year,
        date: projectedDate.toLocaleDateString("en-US", { year: "numeric", month: "short" }),
        balance: Math.round(currentBalance),
        contributions: Math.round(totalContributions),
        returns: Math.round(currentBalance - totalContributions - currentNetworth)
      });
      if (currentBalance >= fireNumber && year >= (yearsToFi || 30)) {
        break;
      }
    }
  } else if (currentNetworth >= fireNumber) {
    yearsToFi = 0;
    projectedFiDate = "Now — You are already financially independent! 🎉";
    let currentBalance = currentNetworth;
    let totalContributions = 0;
    const monthlyRate = realReturn / 12;
    for (let year = 0; year <= 5; year++) {
      let yearContributions = 0;
      for (let m = 0; m < 12; m++) {
        currentBalance += Math.max(0, monthlySavings);
        yearContributions += Math.max(0, monthlySavings);
        currentBalance += currentBalance * monthlyRate;
      }
      totalContributions += yearContributions;
      const projectedDate = /* @__PURE__ */ new Date();
      projectedDate.setFullYear(projectedDate.getFullYear() + year);
      projection.push({
        year,
        date: projectedDate.toLocaleDateString("en-US", { year: "numeric", month: "short" }),
        balance: Math.round(currentBalance),
        contributions: Math.round(totalContributions),
        returns: Math.round(currentBalance - totalContributions - currentNetworth)
      });
    }
  }
  const monthlyContributionNeeded = fireNumber > currentNetworth && realReturn > 0 ? Math.max(0, (fireNumber - currentNetworth * Math.pow(1 + realReturn / 12, 12 * 10)) / ((Math.pow(1 + realReturn / 12, 12 * 10) - 1) / (realReturn / 12))) : 0;
  const result = {
    monthlyExpenses,
    annualExpenses,
    monthlyIncome,
    monthlySavings,
    currentNetworth,
    savingsRate: Math.round(savingsRate * 10) / 10,
    fireNumber,
    progressPct: Math.round(progressPct * 10) / 10,
    yearsToFi,
    projectedFiDate,
    monthlyContributionNeeded: Math.round(monthlyContributionNeeded),
    projection,
    params
  };
  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json" }
  });
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
