import type { APIRoute } from 'astro';
import { getInvestments, insertInvestment } from '../../../lib/db';

export const GET: APIRoute = async () => {
  const investments = getInvestments();
  return new Response(JSON.stringify(investments), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name) {
      return new Response(
        JSON.stringify({ error: 'name is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const id = insertInvestment(body);
    return new Response(JSON.stringify({ id }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Failed to create investment' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
