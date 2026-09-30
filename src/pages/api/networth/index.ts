import type { APIRoute } from 'astro';
import { parseJsonBody, jsonError } from '../../../lib/http';
import { getNetworth, upsertNetworth, recalcNetworthMoM, ensurePeriod, getNetworthMilestoneCrossing } from '../../../lib/db';

export const GET: APIRoute = async () => {
  const rows = getNetworth();
  return new Response(JSON.stringify(rows), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request }) => {
  const body = await parseJsonBody(request);
  if (!body) return jsonError('Invalid JSON body');
  if (!body.period_id && body.month) {
    body.period_id = ensurePeriod(body.month);
  }
  if (!body.period_id) {
    return new Response(JSON.stringify({ error: 'period_id or month is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  // Milestone check BEFORE the write — needs the pre-existing peak
  const crossing = getNetworthMilestoneCrossing(body.period_id, Number(body.total) || 0);
  upsertNetworth(body);
  recalcNetworthMoM();
  return new Response(JSON.stringify({
    success: true,
    milestones: crossing.crossed,
    nextMilestone: crossing.next,
  }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
