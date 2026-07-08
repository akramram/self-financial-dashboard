import { r as getNetworth, D as ensurePeriod, F as upsertNetworth, T as recalcNetworthMoM } from '../../chunks/db_BgiJApmW.mjs';
export { renderers } from '../../renderers.mjs';

const GET = async () => {
  const rows = getNetworth();
  return new Response(JSON.stringify(rows), {
    headers: { "Content-Type": "application/json" }
  });
};
const POST = async ({ request }) => {
  const body = await request.json();
  if (!body.period_id && body.month) {
    body.period_id = ensurePeriod(body.month);
  }
  if (!body.period_id) {
    return new Response(JSON.stringify({ error: "period_id or month is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  upsertNetworth(body);
  recalcNetworthMoM();
  return new Response(JSON.stringify({ success: true }), {
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
