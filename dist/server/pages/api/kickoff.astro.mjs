import { d as db, b as getPeriodByMonth, C as ensurePeriod, F as upsertMonthlyIncome, P as getRecurringTransactions, D as insertTransaction } from '../../chunks/db_TxX34wAz.mjs';
export { renderers } from '../../renderers.mjs';

const GET = async () => {
  const latestPeriod = db.prepare(`
    SELECT p.id, p.month 
    FROM periods p
    WHERE p.id IN (SELECT DISTINCT period_id FROM transactions)
       OR p.id IN (SELECT DISTINCT period_id FROM monthly_income)
    ORDER BY p.start_date DESC LIMIT 1
  `).get();
  const latestMonth = latestPeriod?.month || null;
  let nextMonth = null;
  let nextPeriodId = null;
  if (latestMonth) {
    const d = /* @__PURE__ */ new Date(latestMonth + " 1");
    d.setMonth(d.getMonth() + 1);
    nextMonth = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const nextPeriod = getPeriodByMonth(nextMonth);
    nextPeriodId = nextPeriod?.id ?? null;
  }
  const hasNextMonth = nextPeriodId ? true : false;
  return new Response(JSON.stringify({ latestMonth, nextMonth, hasNextMonth }), {
    headers: { "Content-Type": "application/json" }
  });
};
const POST = async ({ request }) => {
  const body = await request.json();
  const month = body.month;
  const salary = Number(body.salary) || 0;
  if (!month || typeof month !== "string") {
    return new Response(JSON.stringify({ error: "Month is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  const period_id = ensurePeriod(month);
  const monthDate = /* @__PURE__ */ new Date(month + " 1");
  const mm = String(monthDate.getMonth() + 1).padStart(2, "0");
  const yyyy = monthDate.getFullYear();
  const dateStr = `${yyyy}-${mm}-21`;
  const existingIncome = db.prepare("SELECT 1 FROM monthly_income WHERE period_id = ?").get(period_id);
  const existingTx = db.prepare("SELECT 1 FROM transactions WHERE period_id = ? LIMIT 1").get(period_id);
  if (existingIncome || existingTx) {
    return new Response(JSON.stringify({ error: "Month already exists" }), {
      status: 409,
      headers: { "Content-Type": "application/json" }
    });
  }
  upsertMonthlyIncome({
    period_id,
    date: dateStr,
    income: salary,
    other_income: 0
  });
  const recurring = getRecurringTransactions().filter((r) => r.active === 1);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  for (const r of recurring) {
    insertTransaction({
      period_id,
      date: dateStr,
      title: r.title,
      category: r.category,
      amount: r.amount,
      currency: "IDR",
      type: r.type,
      payment_method: r.payment_method || "Cash",
      done: r.done ? 1 : 0,
      created_time: now
    });
  }
  return new Response(JSON.stringify({
    success: true,
    month,
    period_id,
    salary,
    preloaded: recurring.length
  }), {
    status: 201,
    headers: { "Content-Type": "application/json" }
  });
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
