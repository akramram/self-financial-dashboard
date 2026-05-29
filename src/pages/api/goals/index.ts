import type { APIRoute } from 'astro';
import { getGoals, insertGoal } from '../../../lib/db';

export const GET: APIRoute = async () => {
  const goals = getGoals();
  return new Response(JSON.stringify(goals), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { name, description, target_amount, current_amount, start_date, target_date, color, icon } = body;

    if (!name || !target_amount || !start_date || !target_date) {
      return new Response(
        JSON.stringify({ error: 'name, target_amount, start_date, and target_date are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
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
      icon,
    });

    return new Response(JSON.stringify({ id }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Failed to create goal' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
