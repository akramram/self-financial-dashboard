import { D as ensurePeriod, E as insertTransaction, F as upsertNetworth, G as upsertMonthlyIncome } from '../../chunks/db_BgiJApmW.mjs';
export { renderers } from '../../renderers.mjs';

const POST = async ({ request }) => {
  try {
    const body = await request.json();
    const { type, rows } = body;
    if (!type || !Array.isArray(rows)) {
      return new Response(JSON.stringify({ error: "Missing type or rows" }), { status: 400 });
    }
    let imported = 0;
    let skipped = 0;
    let errors = 0;
    if (type === "transactions") {
      for (const row of rows) {
        try {
          if (!row.month || !row.date || !row.title || !row.category || row.amount == null || !row.type) {
            errors++;
            continue;
          }
          const validTypes = ["cash", "credit_expense", "credit_payment"];
          const txType = String(row.type);
          if (!validTypes.includes(txType)) {
            errors++;
            continue;
          }
          const period_id = ensurePeriod(String(row.month));
          insertTransaction({
            period_id,
            date: String(row.date),
            title: String(row.title),
            category: String(row.category),
            amount: Number(row.amount),
            currency: String(row.currency || "IDR"),
            type: txType,
            payment_method: String(row.payment_method || "unknown"),
            done: row.done === true || row.done === 1 || row.done === "1" ? 1 : 0,
            created_time: row.created_time || (/* @__PURE__ */ new Date()).toISOString()
          });
          imported++;
        } catch {
          errors++;
        }
      }
    } else if (type === "networth") {
      for (const row of rows) {
        try {
          if (!row.month || !row.date || row.total == null) {
            errors++;
            continue;
          }
          const period_id = ensurePeriod(String(row.month));
          upsertNetworth({
            period_id,
            date: String(row.date),
            total: Number(row.total),
            currency: String(row.currency || "IDR"),
            month_over_month_change: row.month_over_month_change != null ? Number(row.month_over_month_change) : null,
            month_over_month_pct: row.month_over_month_pct != null ? Number(row.month_over_month_pct) : null,
            breakdown: row.breakdown || {}
          });
          imported++;
        } catch {
          errors++;
        }
      }
    } else if (type === "monthly_income") {
      for (const row of rows) {
        try {
          if (!row.month || !row.date || row.income == null) {
            errors++;
            continue;
          }
          const period_id = ensurePeriod(String(row.month));
          upsertMonthlyIncome({
            period_id,
            date: String(row.date),
            income: Number(row.income),
            other_income: row.other_income != null ? Number(row.other_income) : 0
          });
          imported++;
        } catch {
          errors++;
        }
      }
    } else {
      return new Response(JSON.stringify({ error: "Invalid import type" }), { status: 400 });
    }
    return new Response(JSON.stringify({ imported, skipped, errors }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || "Import failed" }), { status: 500 });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
