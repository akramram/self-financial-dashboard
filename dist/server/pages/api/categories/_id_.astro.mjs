import { k as deleteCategory, l as getCategoryById, m as getCategoryByName, u as updateCategory } from '../../../chunks/db_TxX34wAz.mjs';
export { renderers } from '../../../renderers.mjs';

const GET = async ({ params }) => {
  const id = Number(params.id);
  const row = getCategoryById(id);
  if (!row) {
    return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
  }
  return new Response(JSON.stringify(row), { headers: { "Content-Type": "application/json" } });
};
const PUT = async ({ params, request }) => {
  const id = Number(params.id);
  const body = await request.json();
  if (body.name) {
    const existing = getCategoryByName(body.name);
    if (existing && existing.id !== id) {
      return new Response(JSON.stringify({ error: "Category name already exists" }), {
        status: 409,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
  const update = {};
  if (body.name !== void 0) update.name = body.name.trim();
  if (body.color !== void 0) update.color = body.color;
  if (body.monthly_limit !== void 0) update.monthly_limit = Number(body.monthly_limit);
  updateCategory(id, update);
  return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
};
const DELETE = async ({ params }) => {
  const id = Number(params.id);
  deleteCategory(id);
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
