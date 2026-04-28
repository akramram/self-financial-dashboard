import { g as getTransactions, j as insertTransaction } from '../../chunks/db_CdWsZrN7.mjs';
export { renderers } from '../../renderers.mjs';

const GET = async ({ request }) => {
  const url = new URL(request.url);
  const month = url.searchParams.get("month") || void 0;
  const type = url.searchParams.get("type") || void 0;
  const search = url.searchParams.get("search") || void 0;
  const rows = getTransactions({ month, type, search });
  return new Response(JSON.stringify(rows), {
    headers: { "Content-Type": "application/json" }
  });
};
const POST = async ({ request }) => {
  const body = await request.json();
  const id = insertTransaction(body);
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
