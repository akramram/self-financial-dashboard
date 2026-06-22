import { Z as deleteTransaction, _ as getTransactionById, $ as updateTransaction } from '../../../chunks/db_535bmtRB.mjs';
export { renderers } from '../../../renderers.mjs';

const GET = async ({ params }) => {
  const id = Number(params.id);
  const row = getTransactionById(id);
  if (!row) {
    return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
  }
  return new Response(JSON.stringify(row), { headers: { "Content-Type": "application/json" } });
};
const PUT = async ({ params, request }) => {
  const id = Number(params.id);
  const body = await request.json();
  updateTransaction(id, body);
  return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
};
const DELETE = async ({ params }) => {
  const id = Number(params.id);
  deleteTransaction(id);
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
