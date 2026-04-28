import { c as deleteNetworth, r as recalcNetworthMoM, e as getNetworthByMonth, u as upsertNetworth } from '../../../chunks/db_CdWsZrN7.mjs';
export { renderers } from '../../../renderers.mjs';

const GET = async ({ params }) => {
  const month = decodeURIComponent(params.month);
  const row = getNetworthByMonth(month);
  if (!row) {
    return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
  }
  return new Response(JSON.stringify(row), { headers: { "Content-Type": "application/json" } });
};
const PUT = async ({ params, request }) => {
  const month = decodeURIComponent(params.month);
  const body = await request.json();
  upsertNetworth({ ...body, month });
  recalcNetworthMoM();
  return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
};
const DELETE = async ({ params }) => {
  const month = decodeURIComponent(params.month);
  deleteNetworth(month);
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
