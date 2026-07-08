import { c as getPeriodByMonth, e as getDailySpending, f as getDayOfWeekSpending, h as getTransactionStats, i as getSpendingVelocity, j as getTitleSpending } from '../../chunks/db_BgiJApmW.mjs';
export { renderers } from '../../renderers.mjs';

const GET = async ({ request }) => {
  const url = new URL(request.url);
  const month = url.searchParams.get("month");
  const periodIdStr = url.searchParams.get("period_id");
  let periodId = null;
  if (periodIdStr) {
    periodId = parseInt(periodIdStr, 10);
  } else if (month) {
    const period = getPeriodByMonth(month);
    periodId = period?.id ?? null;
  }
  if (periodId === null || isNaN(periodId)) {
    return new Response(JSON.stringify({ error: "period_id or month parameter required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  const pid = periodId;
  const daily = getDailySpending(pid);
  const dow = getDayOfWeekSpending();
  const stats = getTransactionStats(pid);
  const velocity = getSpendingVelocity(pid);
  const titleSpending = getTitleSpending(pid);
  return new Response(JSON.stringify({ daily, dow, stats, velocity, titleSpending }), {
    headers: { "Content-Type": "application/json" }
  });
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
