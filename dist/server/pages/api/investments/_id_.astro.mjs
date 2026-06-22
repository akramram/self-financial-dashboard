import { K as getInvestmentById, L as deleteInvestment, M as updateInvestment } from '../../../chunks/db_535bmtRB.mjs';
export { renderers } from '../../../renderers.mjs';

const GET = async ({ params }) => {
  const id = Number(params.id);
  const investment = getInvestmentById(id);
  if (!investment) {
    return new Response(JSON.stringify({ error: "Investment not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  }
  return new Response(JSON.stringify(investment), {
    headers: { "Content-Type": "application/json" }
  });
};
const PUT = async ({ params, request }) => {
  try {
    const id = Number(params.id);
    const existing = getInvestmentById(id);
    if (!existing) {
      return new Response(JSON.stringify({ error: "Investment not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }
    const body = await request.json();
    updateInvestment(id, body);
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Failed to update investment" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
const DELETE = async ({ params }) => {
  const id = Number(params.id);
  const existing = getInvestmentById(id);
  if (!existing) {
    return new Response(JSON.stringify({ error: "Investment not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  }
  deleteInvestment(id);
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
