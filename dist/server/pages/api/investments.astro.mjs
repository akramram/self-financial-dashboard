import { N as getInvestments, O as insertInvestment } from '../../chunks/db_B4_3wji-.mjs';
export { renderers } from '../../renderers.mjs';

const GET = async () => {
  const investments = getInvestments();
  return new Response(JSON.stringify(investments), {
    headers: { "Content-Type": "application/json" }
  });
};
const POST = async ({ request }) => {
  try {
    const body = await request.json();
    const { name } = body;
    if (!name) {
      return new Response(
        JSON.stringify({ error: "name is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const id = insertInvestment(body);
    return new Response(JSON.stringify({ id }), {
      status: 201,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Failed to create investment" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
