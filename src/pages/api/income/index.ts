import type { APIRoute } from 'astro';
import { getMonthlyIncome, upsertMonthlyIncome, ensurePeriod, getPeriodByMonth } from '../../../lib/db';

export const GET: APIRoute = async () => {
  const rows = getMonthlyIncome();
  return new Response(JSON.stringify(rows), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();

  // Resolve period_id: accept period_id directly, or convert from month
  let period_id = body.period_id;
  if (!period_id && body.month) {
    period_id = ensurePeriod(body.month);
  }

  if (!period_id) {
    return new Response(JSON.stringify({ error: 'period_id or month is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (typeof body.income !== 'number') {
    return new Response(JSON.stringify({ error: 'Income must be a number' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  upsertMonthlyIncome({
    period_id,
    date: body.date || new Date().toISOString().slice(0, 10),
    income: Number(body.income),
    other_income: body.other_income != null ? Number(body.other_income) : 0,
  });
  return new Response(JSON.stringify({ success: true }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
