import { g as getMonthlySummary, d as db } from '../../chunks/db_TxX34wAz.mjs';
export { renderers } from '../../renderers.mjs';

const GET = async () => {
  const summaries = getMonthlySummary();
  const incomeRows = db.prepare(`
    SELECT mi.period_id, mi.income
    FROM monthly_income mi
  `).all();
  const incomeMap = new Map(incomeRows.map((r) => [r.period_id, r.income]));
  for (const s of summaries) {
    const income = incomeMap.get(s.period_id) || 0;
    s.income = income;
    s.savings = income - s.outcome.total;
    s.savings_rate_pct = income > 0 ? Number((s.savings / income * 100).toFixed(2)) : 0;
  }
  return new Response(JSON.stringify(summaries), {
    headers: { "Content-Type": "application/json" }
  });
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
