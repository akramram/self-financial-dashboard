import { x as getGoalById, y as deleteGoal, z as updateGoal } from '../../../chunks/db_TxX34wAz.mjs';
export { renderers } from '../../../renderers.mjs';

const GET = async ({ params }) => {
  const id = Number(params.id);
  const goal = getGoalById(id);
  if (!goal) {
    return new Response(JSON.stringify({ error: "Goal not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  }
  return new Response(JSON.stringify(goal), {
    headers: { "Content-Type": "application/json" }
  });
};
const PUT = async ({ params, request }) => {
  try {
    const id = Number(params.id);
    const existing = getGoalById(id);
    if (!existing) {
      return new Response(JSON.stringify({ error: "Goal not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }
    const body = await request.json();
    updateGoal(id, body);
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Failed to update goal" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
const DELETE = async ({ params }) => {
  const id = Number(params.id);
  const existing = getGoalById(id);
  if (!existing) {
    return new Response(JSON.stringify({ error: "Goal not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  }
  deleteGoal(id);
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
