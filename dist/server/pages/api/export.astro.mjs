import { g as getTransactions, a as getNetworth, b as getMonthlySummary, d as db } from '../../chunks/db_BnTmBRTu.mjs';
export { renderers } from '../../renderers.mjs';

const GET = async () => {
  const transactions = getTransactions();
  const networth = getNetworth();
  const monthlySummary = getMonthlySummary();
  const incomeRows = db.prepare("SELECT month, income FROM monthly_income").all();
  const incomeMap = new Map(incomeRows.map((r) => [r.month, r.income]));
  for (const s of monthlySummary) {
    const income = incomeMap.get(s.month) || 0;
    s.income = income;
    s.savings = income - s.outcome.total;
    s.savings_rate_pct = income > 0 ? Number((s.savings / income * 100).toFixed(2)) : 0;
  }
  const data = {
    transactions,
    networth,
    monthlySummary,
    exportedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="financial-data-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json"`
    }
  });
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
