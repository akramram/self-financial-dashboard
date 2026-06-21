import { P as getRecurringTransactions, X as insertRecurringTransaction } from '../../chunks/db_TxX34wAz.mjs';
export { renderers } from '../../renderers.mjs';

const GET = async () => {
  const rows = getRecurringTransactions();
  return new Response(JSON.stringify(rows), {
    headers: { "Content-Type": "application/json" }
  });
};
const POST = async ({ request }) => {
  const body = await request.json();
  if (!body.title || typeof body.title !== "string") {
    return new Response(JSON.stringify({ error: "Title is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  if (!body.category || typeof body.category !== "string") {
    return new Response(JSON.stringify({ error: "Category is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  if (typeof body.amount !== "number") {
    return new Response(JSON.stringify({ error: "Amount must be a number" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  const id = insertRecurringTransaction(body);
  return new Response(JSON.stringify({ id, ...body }), {
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
