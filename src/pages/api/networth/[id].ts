import type { APIRoute } from 'astro';
import { getNetworthByPeriod, upsertNetworth, deleteNetworth, recalcNetworthMoM } from '../../../lib/db';

export const GET: APIRoute = async ({ params }) => {
  const id = parseInt(params.id as string, 10);
  if (isNaN(id)) {
    return new Response(JSON.stringify({ error: 'Invalid period_id' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  const row = getNetworthByPeriod(id);
  if (!row) {
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }
  return new Response(JSON.stringify(row), { headers: { 'Content-Type': 'application/json' } });
};

export const PUT: APIRoute = async ({ params, request }) => {
  const id = parseInt(params.id as string, 10);
  if (isNaN(id)) {
    return new Response(JSON.stringify({ error: 'Invalid period_id' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  const body = await request.json();
  upsertNetworth({ ...body, period_id: id });
  recalcNetworthMoM();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ params }) => {
  const id = parseInt(params.id as string, 10);
  if (isNaN(id)) {
    return new Response(JSON.stringify({ error: 'Invalid period_id' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  deleteNetworth(id);
  recalcNetworthMoM();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
