import type { APIRoute } from 'astro';
import { getNetworth, upsertNetworth, recalcNetworthMoM } from '../../../lib/db';

export const GET: APIRoute = async () => {
  const rows = getNetworth();
  return new Response(JSON.stringify(rows), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  upsertNetworth(body);
  recalcNetworthMoM();
  return new Response(JSON.stringify({ success: true }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
