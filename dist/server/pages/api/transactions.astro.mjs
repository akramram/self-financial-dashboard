import { X as deleteTransactionsBulk, n as getTransactions, Y as findDuplicateTransaction, A as insertTransaction, Z as updateTransactionsBulk } from '../../chunks/db_D20tYf13.mjs';
export { renderers } from '../../renderers.mjs';

const GET = async ({ request }) => {
  const url = new URL(request.url);
  const month = url.searchParams.get("month") || void 0;
  const type = url.searchParams.get("type") || void 0;
  const search = url.searchParams.get("search") || void 0;
  const category = url.searchParams.get("category") || void 0;
  const rows = getTransactions({ month, type, search, category });
  return new Response(JSON.stringify(rows), {
    headers: { "Content-Type": "application/json" }
  });
};
const POST = async ({ request }) => {
  const body = await request.json();
  const duplicateId = findDuplicateTransaction({
    title: body.title,
    amount: Number(body.amount),
    category: body.category || body.title.split(" ")[0],
    type: body.type
  });
  if (duplicateId && !body.force) {
    return new Response(JSON.stringify({ duplicate: true, duplicateId, message: "A similar transaction was added recently." }), {
      status: 409,
      headers: { "Content-Type": "application/json" }
    });
  }
  const id = insertTransaction(body);
  return new Response(JSON.stringify({ id, ...body }), {
    status: 201,
    headers: { "Content-Type": "application/json" }
  });
};
const PUT = async ({ request }) => {
  const body = await request.json();
  const ids = body.ids;
  const updates = body.updates;
  if (!Array.isArray(ids) || ids.length === 0) {
    return new Response(JSON.stringify({ error: "ids array required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  if (!updates || Object.keys(updates).length === 0) {
    return new Response(JSON.stringify({ error: "updates object required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  const result = updateTransactionsBulk(ids, updates);
  return new Response(JSON.stringify({ success: true, updated: result.changes }), {
    headers: { "Content-Type": "application/json" }
  });
};
const DELETE = async ({ request }) => {
  const body = await request.json();
  const ids = body.ids;
  if (!Array.isArray(ids) || ids.length === 0) {
    return new Response(JSON.stringify({ error: "ids array required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  deleteTransactionsBulk(ids);
  return new Response(JSON.stringify({ success: true, deleted: ids.length }), {
    headers: { "Content-Type": "application/json" }
  });
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  DELETE,
  GET,
  POST,
  PUT
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
