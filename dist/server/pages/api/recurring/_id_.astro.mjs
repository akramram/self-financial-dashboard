import { U as deleteRecurringTransaction, V as getRecurringTransactionById, W as updateRecurringTransaction } from '../../../chunks/db_TxX34wAz.mjs';
export { renderers } from '../../../renderers.mjs';

const GET = async ({ params }) => {
  const id = Number(params.id);
  const row = getRecurringTransactionById(id);
  if (!row) {
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  }
  return new Response(JSON.stringify(row), {
    headers: { "Content-Type": "application/json" }
  });
};
const PUT = async ({ request, params }) => {
  const id = Number(params.id);
  const body = await request.json();
  updateRecurringTransaction(id, body);
  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" }
  });
};
const DELETE = async ({ params }) => {
  const id = Number(params.id);
  deleteRecurringTransaction(id);
  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" }
  });
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  DELETE,
  GET,
  PUT
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
