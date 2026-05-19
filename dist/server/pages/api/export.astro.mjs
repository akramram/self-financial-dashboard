import { c as getTransactions, e as getNetworth, f as getMonthlySummary, h as db } from '../../chunks/db_Bpk2-XLV.mjs';
export { renderers } from '../../renderers.mjs';

function toCsv(rows, headers) {
  const escape = (val) => {
    const str = val == null ? "" : String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const lines = [headers.join(","), ...rows.map((row) => headers.map((h) => escape(row[h])).join(","))];
  return lines.join("\n");
}
const GET = async ({ request }) => {
  const url = new URL(request.url);
  const format = url.searchParams.get("format") || "json";
  const type = url.searchParams.get("type") || "all";
  const dateSuffix = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  if (format === "csv") {
    if (type === "transactions" || type === "all") {
      const transactions2 = getTransactions();
      const headers = ["id", "month", "date", "title", "category", "amount", "currency", "type", "payment_method", "done", "created_time"];
      const rows = transactions2.map((t) => ({
        id: t.id,
        month: t.month,
        date: t.date,
        title: t.title,
        category: t.category,
        amount: t.amount,
        currency: t.currency,
        type: t.type,
        payment_method: t.payment_method,
        done: t.done ? 1 : 0,
        created_time: t.created_time
      }));
      const csv = toCsv(rows, headers);
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="transactions-${dateSuffix}.csv"`
        }
      });
    }
    if (type === "networth") {
      const networth2 = getNetworth();
      const headers = ["month", "date", "total", "currency", "month_over_month_change", "month_over_month_pct"];
      const rows = networth2.map((n) => ({
        month: n.month,
        date: n.date,
        total: n.total,
        currency: n.currency,
        month_over_month_change: n.month_over_month_change ?? "",
        month_over_month_pct: n.month_over_month_pct ?? ""
      }));
      const csv = toCsv(rows, headers);
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="networth-${dateSuffix}.csv"`
        }
      });
    }
    if (type === "summary") {
      const monthlySummary2 = getMonthlySummary();
      const incomeRows2 = db.prepare("SELECT month, income FROM monthly_income").all();
      const incomeMap2 = new Map(incomeRows2.map((r) => [r.month, r.income]));
      for (const s of monthlySummary2) {
        const income = incomeMap2.get(s.month) || 0;
        s.income = income;
        s.savings = income - s.outcome.total;
        s.savings_rate_pct = income > 0 ? Number((s.savings / income * 100).toFixed(2)) : 0;
      }
      const headers = ["month", "date", "income", "outcome_cash", "outcome_credit_payment", "outcome_credit_expenses", "outcome_total", "savings", "savings_rate_pct", "networth"];
      const rows = monthlySummary2.map((s) => ({
        month: s.month,
        date: s.date,
        income: s.income,
        outcome_cash: s.outcome.cash,
        outcome_credit_payment: s.outcome.credit_payment,
        outcome_credit_expenses: s.outcome.credit_expenses,
        outcome_total: s.outcome.total,
        savings: s.savings,
        savings_rate_pct: s.savings_rate_pct,
        networth: s.networth
      }));
      const csv = toCsv(rows, headers);
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="monthly-summary-${dateSuffix}.csv"`
        }
      });
    }
    return new Response(JSON.stringify({ error: "Invalid CSV type. Use ?type=transactions|networth|summary" }), { status: 400 });
  }
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
      "Content-Disposition": `attachment; filename="financial-data-${dateSuffix}.json"`
    }
  });
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
