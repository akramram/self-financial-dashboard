import type { APIRoute } from 'astro';
import { getNetworthByMonth, upsertNetworth, deleteNetworth, recalcNetworthMoM } from '../../../lib/db';

export const GET: APIRoute = async ({ params }) => {
  const month = decodeURIComponent(params.month as string);
  const row = getNetworthByMonth(month);
  if (!row) {
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }
  return new Response(JSON.stringify(row), { headers: { 'Content-Type': 'application/json' } });
};

export const PUT: APIRoute = async ({ params, request }) => {
  const month = decodeURIComponent(params.month as string);
  const body = await request.json();
  upsertNetworth({ ...body, month });
  recalcNetworthMoM();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ params }) => {
  const month = decodeURIComponent(params.month as string);
  deleteNetworth(month);
  recalcNetworthMoM();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
