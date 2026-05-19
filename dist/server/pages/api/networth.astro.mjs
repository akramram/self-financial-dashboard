import { e as getNetworth, k as upsertNetworth, r as recalcNetworthMoM } from '../../chunks/db_Bpk2-XLV.mjs';
export { renderers } from '../../renderers.mjs';

const GET = async () => {
  const rows = getNetworth();
  return new Response(JSON.stringify(rows), {
    headers: { "Content-Type": "application/json" }
  });
};
const POST = async ({ request }) => {
  const body = await request.json();
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
