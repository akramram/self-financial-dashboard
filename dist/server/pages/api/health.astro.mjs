import { g as getMonthlySummary, a as getCategories, q as getNetworth, d as db } from '../../chunks/db_DFS0dPqt.mjs';
export { renderers } from '../../renderers.mjs';

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}
const GET = async ({ url }) => {
  const monthParam = url.searchParams.get("month");
  const periodIdParam = url.searchParams.get("period_id");
  const summaries = getMonthlySummary();
  const categories = getCategories();
  const networth = getNetworth();
  const incomeRows = db.prepare(`
    SELECT mi.period_id, mi.income, p.month 
    FROM monthly_income mi JOIN periods p ON mi.period_id = p.id
  `).all();
  const incomeByPeriodId = /* @__PURE__ */ new Map();
  const incomeByMonth = /* @__PURE__ */ new Map();
  for (const r of incomeRows) {
    incomeByPeriodId.set(r.period_id, r.income);
    incomeByMonth.set(r.month, r.income);
  }
  for (const s of summaries) {
    const income2 = incomeByPeriodId.get(s.period_id) || incomeByMonth.get(s.month) || 0;
    s.income = income2;
    s.savings = income2 - s.outcome.total;
    s.savings_rate_pct = income2 > 0 ? Number((s.savings / income2 * 100).toFixed(2)) : 0;
  }
  let targetMonth;
  if (periodIdParam) {
    targetMonth = summaries.find((s) => s.period_id === parseInt(periodIdParam, 10));
  } else if (monthParam) {
    targetMonth = summaries.find((s) => s.month === monthParam);
  }
  if (!targetMonth) {
    targetMonth = summaries[summaries.length - 1];
  }
  if (!targetMonth) {
    return new Response(JSON.stringify({ error: "No data available" }), { status: 404 });
  }
  const factors = [];
  const tips = [];
  new Map(categories.map((c) => [c.name, c]));
  const savingsRate = targetMonth.savings_rate_pct;
  let savingsScore;
  if (savingsRate >= 30) savingsScore = 20;
  else if (savingsRate >= 20) savingsScore = Math.round(14 + (savingsRate - 20) * 0.6);
  else if (savingsRate >= 10) savingsScore = Math.round(8 + (savingsRate - 10) * 0.6);
  else if (savingsRate >= 0) savingsScore = Math.round(savingsRate * 0.8);
  else savingsScore = 0;
  savingsScore = clamp(savingsScore, 0, 20);
  factors.push({
    name: "Savings Rate",
    score: savingsScore,
    maxScore: 20,
    label: `${savingsRate.toFixed(1)}%`,
    detail: savingsRate >= 20 ? "Excellent savings rate" : savingsRate >= 10 ? "Good savings, room to improve" : savingsRate >= 0 ? "Low savings rate" : "Spending exceeds income!",
    icon: "piggy-bank"
  });
  if (savingsRate < 10) tips.push("Try to save at least 10-20% of your income each month.");
  if (savingsRate < 0) tips.push("⚠️ You are spending more than you earn. Review expenses urgently.");
  let budgetScore = 10;
  const catTotals = targetMonth.category_totals || {};
  const catsWithBudgets = categories.filter((c) => c.monthly_limit > 0);
  const overspentCats = [];
  const nearLimitCats = [];
  if (catsWithBudgets.length > 0) {
    let withinBudget = 0;
    let total = 0;
    for (const cat of catsWithBudgets) {
      const spent = catTotals[cat.name] || 0;
      total++;
      if (spent <= cat.monthly_limit) {
        withinBudget++;
        if (spent > cat.monthly_limit * 0.8) nearLimitCats.push(cat.name);
      } else {
        overspentCats.push(cat.name);
      }
    }
    budgetScore = Math.round(withinBudget / total * 20);
  } else {
    budgetScore = 12;
  }
  budgetScore = clamp(budgetScore, 0, 20);
  factors.push({
    name: "Budget Adherence",
    score: budgetScore,
    maxScore: 20,
    label: catsWithBudgets.length > 0 ? `${overspentCats.length}/${catsWithBudgets.length} over budget` : "No budgets set",
    detail: overspentCats.length > 0 ? `Over budget: ${overspentCats.join(", ")}` : catsWithBudgets.length > 0 ? "All categories within budget limits" : "Set category budgets for better tracking",
    icon: "target"
  });
  if (overspentCats.length > 0) tips.push(`Review spending in: ${overspentCats.join(", ")}.`);
  if (catsWithBudgets.length === 0) tips.push("Set monthly limits for your categories in Settings.");
  let nwScore = 10;
  const currentNW = networth.find((n) => n.period_id === targetMonth.period_id);
  const nwIdx = networth.findIndex((n) => n.period_id === targetMonth.period_id);
  let nwDetail = "No networth data";
  if (currentNW) {
    if (nwIdx > 0) {
      const prevNW = networth[nwIdx - 1];
      const changePct = prevNW.total > 0 ? (currentNW.total - prevNW.total) / prevNW.total * 100 : 0;
      if (changePct >= 5) nwScore = 20;
      else if (changePct >= 2) nwScore = 16;
      else if (changePct >= 0) nwScore = 12;
      else if (changePct >= -2) nwScore = 8;
      else if (changePct >= -5) nwScore = 4;
      else nwScore = 0;
      nwDetail = changePct >= 0 ? `+${changePct.toFixed(1)}% this month` : `${changePct.toFixed(1)}% this month`;
    } else {
      nwScore = 10;
      nwDetail = "First month — no comparison yet";
    }
  }
  nwScore = clamp(nwScore, 0, 20);
  factors.push({
    name: "Networth Growth",
    score: nwScore,
    maxScore: 20,
    label: currentNW ? `IDR ${Math.round(currentNW.total).toLocaleString("id-ID")}` : "N/A",
    detail: nwDetail,
    icon: "trending-up"
  });
  let spendingScore = 10;
  const income = targetMonth.income;
  const totalSpent = targetMonth.outcome.total;
  if (income > 0) {
    const spendRatio = totalSpent / income;
    if (spendRatio <= 0.5) spendingScore = 20;
    else if (spendRatio <= 0.7) spendingScore = 16;
    else if (spendRatio <= 0.85) spendingScore = 12;
    else if (spendRatio <= 0.95) spendingScore = 8;
    else if (spendRatio <= 1) spendingScore = 4;
    else spendingScore = 0;
  }
  spendingScore = clamp(spendingScore, 0, 20);
  factors.push({
    name: "Spending Control",
    score: spendingScore,
    maxScore: 20,
    label: income > 0 ? `${(totalSpent / income * 100).toFixed(0)}% of income` : "No income set",
    detail: income > 0 ? totalSpent <= income * 0.7 ? "Spending well under control" : totalSpent <= income ? "Spending within income limits" : "Spending exceeds income!" : "Set income to track spending ratio",
    icon: "wallet"
  });
  let consistencyScore = 10;
  const monthIdx = summaries.findIndex((s) => s.period_id === targetMonth.period_id);
  let consistencyDetail = "Need more months of data";
  if (monthIdx >= 2) {
    const last3 = summaries.slice(Math.max(0, monthIdx - 2), monthIdx + 1);
    const rates = last3.map((s) => s.savings_rate_pct);
    const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
    const variance = rates.reduce((sum, r) => sum + Math.pow(r - avg, 2), 0) / rates.length;
    const stdDev = Math.sqrt(variance);
    if (stdDev < 5) consistencyScore = 20;
    else if (stdDev < 10) consistencyScore = 16;
    else if (stdDev < 15) consistencyScore = 12;
    else if (stdDev < 25) consistencyScore = 8;
    else consistencyScore = 4;
    consistencyDetail = `Savings rate σ = ${stdDev.toFixed(1)}% over last 3 months`;
  } else if (monthIdx === 1) {
    consistencyScore = 12;
    consistencyDetail = "Two months tracked — building trend";
  }
  consistencyScore = clamp(consistencyScore, 0, 20);
  factors.push({
    name: "Consistency",
    score: consistencyScore,
    maxScore: 20,
    label: `${consistencyScore}/20`,
    detail: consistencyDetail,
    icon: "activity"
  });
  const overall = factors.reduce((sum, f) => sum + f.score, 0);
  let grade, gradeColor;
  if (overall >= 90) {
    grade = "A+";
    gradeColor = "emerald";
  } else if (overall >= 80) {
    grade = "A";
    gradeColor = "emerald";
  } else if (overall >= 70) {
    grade = "B";
    gradeColor = "green";
  } else if (overall >= 60) {
    grade = "C+";
    gradeColor = "yellow";
  } else if (overall >= 50) {
    grade = "C";
    gradeColor = "amber";
  } else if (overall >= 40) {
    grade = "D";
    gradeColor = "orange";
  } else {
    grade = "F";
    gradeColor = "red";
  }
  let prevScore = null;
  let trend = "new";
  if (monthIdx > 0) {
    const prevMonth = summaries[monthIdx - 1];
    const prevIncome = prevMonth.income;
    const prevSavingsRate = prevMonth.savings_rate_pct;
    let prevSavingsScore;
    if (prevSavingsRate >= 30) prevSavingsScore = 20;
    else if (prevSavingsRate >= 20) prevSavingsScore = Math.round(14 + (prevSavingsRate - 20) * 0.6);
    else if (prevSavingsRate >= 10) prevSavingsScore = Math.round(8 + (prevSavingsRate - 10) * 0.6);
    else if (prevSavingsRate >= 0) prevSavingsScore = Math.round(prevSavingsRate * 0.8);
    else prevSavingsScore = 0;
    let prevNW2 = 10;
    const prevNetworth = networth.find((n) => n.period_id === prevMonth.period_id);
    const prevNWIdx = networth.findIndex((n) => n.period_id === prevMonth.period_id);
    if (prevNetworth && prevNWIdx > 0) {
      const ppNW = networth[prevNWIdx - 1];
      const chg = ppNW.total > 0 ? (prevNetworth.total - ppNW.total) / ppNW.total * 100 : 0;
      if (chg >= 5) prevNW2 = 20;
      else if (chg >= 2) prevNW2 = 16;
      else if (chg >= 0) prevNW2 = 12;
      else if (chg >= -2) prevNW2 = 8;
      else if (chg >= -5) prevNW2 = 4;
      else prevNW2 = 0;
    }
    let prevSpendScore = 10;
    if (prevIncome > 0) {
      const prevRatio = prevMonth.outcome.total / prevIncome;
      if (prevRatio <= 0.5) prevSpendScore = 20;
      else if (prevRatio <= 0.7) prevSpendScore = 16;
      else if (prevRatio <= 0.85) prevSpendScore = 12;
      else if (prevRatio <= 0.95) prevSpendScore = 8;
      else if (prevRatio <= 1) prevSpendScore = 4;
      else prevSpendScore = 0;
    }
    let prevBudgetScore = 10;
    if (catsWithBudgets.length > 0) {
      const prevCatTotals = prevMonth.category_totals || {};
      let prevWithin = 0;
      for (const cat of catsWithBudgets) {
        const spent = prevCatTotals[cat.name] || 0;
        if (spent <= cat.monthly_limit) prevWithin++;
      }
      prevBudgetScore = Math.round(prevWithin / catsWithBudgets.length * 20);
    }
    prevScore = clamp(prevSavingsScore + prevBudgetScore + prevNW2 + prevSpendScore + 10, 0, 100);
    if (overall > prevScore + 3) trend = "up";
    else if (overall < prevScore - 3) trend = "down";
    else trend = "stable";
  }
  const result = {
    overall,
    grade,
    gradeColor,
    factors,
    month: targetMonth.month,
    period_id: targetMonth.period_id,
    prevScore,
    trend,
    tips
  };
  const allMonthScores = [];
  for (let i = 0; i < summaries.length; i++) {
    const s = summaries[i];
    const inc = s.income;
    const sr = s.savings_rate_pct;
    let ss2;
    if (sr >= 30) ss2 = 20;
    else if (sr >= 20) ss2 = Math.round(14 + (sr - 20) * 0.6);
    else if (sr >= 10) ss2 = Math.round(8 + (sr - 10) * 0.6);
    else if (sr >= 0) ss2 = Math.round(sr * 0.8);
    else ss2 = 0;
    let bs2 = 10;
    if (catsWithBudgets.length > 0) {
      const ct = s.category_totals || {};
      let within = 0;
      for (const cat of catsWithBudgets) {
        if ((ct[cat.name] || 0) <= cat.monthly_limit) within++;
      }
      bs2 = Math.round(within / catsWithBudgets.length * 20);
    }
    let ns2 = 10;
    const nwk = networth.find((n) => n.period_id === s.period_id);
    const nIdx = networth.findIndex((n) => n.period_id === s.period_id);
    if (nwk && nIdx > 0) {
      const pnw = networth[nIdx - 1];
      const cp = pnw.total > 0 ? (nwk.total - pnw.total) / pnw.total * 100 : 0;
      if (cp >= 5) ns2 = 20;
      else if (cp >= 2) ns2 = 16;
      else if (cp >= 0) ns2 = 12;
      else if (cp >= -2) ns2 = 8;
      else if (cp >= -5) ns2 = 4;
      else ns2 = 0;
    }
    let sp2 = 10;
    if (inc > 0) {
      const r = s.outcome.total / inc;
      if (r <= 0.5) sp2 = 20;
      else if (r <= 0.7) sp2 = 16;
      else if (r <= 0.85) sp2 = 12;
      else if (r <= 0.95) sp2 = 8;
      else if (r <= 1) sp2 = 4;
      else sp2 = 0;
    }
    let cs2 = 10;
    if (i >= 2) {
      const l3 = summaries.slice(Math.max(0, i - 2), i + 1);
      const rs = l3.map((x) => x.savings_rate_pct);
      const a = rs.reduce((a2, b2) => a2 + b2, 0) / rs.length;
      const v = rs.reduce((sum, r) => sum + Math.pow(r - a, 2), 0) / rs.length;
      const sd = Math.sqrt(v);
      if (sd < 5) cs2 = 20;
      else if (sd < 10) cs2 = 16;
      else if (sd < 15) cs2 = 12;
      else if (sd < 25) cs2 = 8;
      else cs2 = 4;
    } else if (i === 1) cs2 = 12;
    allMonthScores.push({
      month: s.month,
      period_id: s.period_id,
      score: clamp(ss2 + bs2 + ns2 + sp2 + cs2, 0, 100)
    });
  }
  return new Response(JSON.stringify({ ...result, history: allMonthScores }), {
    headers: { "Content-Type": "application/json" }
  });
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
