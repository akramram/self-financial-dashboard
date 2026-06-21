import { b as getPeriodByMonth, j as getAnomalies } from '../../chunks/db_DFS0dPqt.mjs';
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
  const anomalies = getAnomalies(pid);
  return new Response(JSON.stringify(anomalies), {
    headers: { "Content-Type": "application/json" }
  });
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
