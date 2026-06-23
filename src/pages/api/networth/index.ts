import type { APIRoute } from 'astro';
import { getNetworth, upsertNetworth, recalcNetworthMoM, ensurePeriod } from '../../../lib/db';

export const GET: APIRoute = async () => {
  const rows = getNetworth();
  return new Response(JSON.stringify(rows), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  if (!body.period_id && body.month) {
    body.period_id = ensurePeriod(body.month);
  }
  if (!body.period_id) {
    return new Response(JSON.stringify({ error: 'period_id or month is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  upsertNetworth(body);
  recalcNetworthMoM();
  return new Response(JSON.stringify({ success: true }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
