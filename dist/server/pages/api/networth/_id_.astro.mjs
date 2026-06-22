import { Q as deleteNetworth, R as recalcNetworthMoM, S as getNetworthByPeriod, E as upsertNetworth } from '../../../chunks/db_535bmtRB.mjs';
export { renderers } from '../../../renderers.mjs';

const GET = async ({ params }) => {
  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return new Response(JSON.stringify({ error: "Invalid period_id" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  const row = getNetworthByPeriod(id);
  if (!row) {
    return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
  }
  return new Response(JSON.stringify(row), { headers: { "Content-Type": "application/json" } });
};
const PUT = async ({ params, request }) => {
  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return new Response(JSON.stringify({ error: "Invalid period_id" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  const body = await request.json();
  upsertNetworth({ ...body, period_id: id });
  recalcNetworthMoM();
  return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
};
const DELETE = async ({ params }) => {
  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return new Response(JSON.stringify({ error: "Invalid period_id" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  deleteNetworth(id);
  recalcNetworthMoM();
  return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  DELETE,
  GET,
  PUT
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
