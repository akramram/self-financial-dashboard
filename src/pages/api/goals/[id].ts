import type { APIRoute } from 'astro';
import { getGoalById, updateGoal, deleteGoal } from '../../../lib/db';

export const GET: APIRoute = async ({ params }) => {
  const id = Number(params.id);
  const goal = getGoalById(id);
  if (!goal) {
    return new Response(JSON.stringify({ error: 'Goal not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return new Response(JSON.stringify(goal), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const PUT: APIRoute = async ({ params, request }) => {
  try {
    const id = Number(params.id);
    const existing = getGoalById(id);
    if (!existing) {
      return new Response(JSON.stringify({ error: 'Goal not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    updateGoal(id, body);

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Failed to update goal' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const DELETE: APIRoute = async ({ params }) => {
  const id = Number(params.id);
  const existing = getGoalById(id);
  if (!existing) {
    return new Response(JSON.stringify({ error: 'Goal not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  deleteGoal(id);
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
