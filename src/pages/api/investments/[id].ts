import type { APIRoute } from 'astro';
import { getInvestmentById, updateInvestment, deleteInvestment } from '../../../lib/db';

export const GET: APIRoute = async ({ params }) => {
  const id = Number(params.id);
  const investment = getInvestmentById(id);
  if (!investment) {
    return new Response(JSON.stringify({ error: 'Investment not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return new Response(JSON.stringify(investment), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const PUT: APIRoute = async ({ params, request }) => {
  try {
    const id = Number(params.id);
    const existing = getInvestmentById(id);
    if (!existing) {
      return new Response(JSON.stringify({ error: 'Investment not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    updateInvestment(id, body);

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Failed to update investment' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const DELETE: APIRoute = async ({ params }) => {
  const id = Number(params.id);
  const existing = getInvestmentById(id);
  if (!existing) {
    return new Response(JSON.stringify({ error: 'Investment not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  deleteInvestment(id);
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
