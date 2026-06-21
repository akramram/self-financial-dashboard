import { A as getGoals, B as insertGoal } from '../../chunks/db_DFS0dPqt.mjs';
export { renderers } from '../../renderers.mjs';

const GET = async () => {
  const goals = getGoals();
  return new Response(JSON.stringify(goals), {
    headers: { "Content-Type": "application/json" }
  });
};
const POST = async ({ request }) => {
  try {
    const body = await request.json();
    const { name, description, target_amount, current_amount, start_date, target_date, color, icon } = body;
    if (!name || !target_amount || !start_date || !target_date) {
      return new Response(
        JSON.stringify({ error: "name, target_amount, start_date, and target_date are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const id = insertGoal({
      name,
      description,
      target_amount,
      current_amount,
      start_date,
      target_date,
      color,
      icon
    });
    return new Response(JSON.stringify({ id }), {
      status: 201,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Failed to create goal" }),
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
