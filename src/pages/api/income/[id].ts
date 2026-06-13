import type { APIRoute } from 'astro';
import { getMonthlyIncomeByPeriod, upsertMonthlyIncome, deleteMonthlyIncome } from '../../../lib/db';

export const GET: APIRoute = async ({ params }) => {
  const id = parseInt(params.id as string, 10);
  if (isNaN(id)) {
    return new Response(JSON.stringify({ error: 'Invalid period_id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const row = getMonthlyIncomeByPeriod(id);
  if (!row) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return new Response(JSON.stringify(row), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const PUT: APIRoute = async ({ request, params }) => {
  const id = parseInt(params.id as string, 10);
  if (isNaN(id)) {
    return new Response(JSON.stringify({ error: 'Invalid period_id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const body = await request.json();
  if (typeof body.income !== 'number') {
    return new Response(JSON.stringify({ error: 'Income must be a number' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  upsertMonthlyIncome({
    period_id: id,
    date: body.date || new Date().toISOString().slice(0, 10),
    income: Number(body.income),
    other_income: body.other_income != null ? Number(body.other_income) : 0,
  });
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const DELETE: APIRoute = async ({ params }) => {
  const id = parseInt(params.id as string, 10);
  if (isNaN(id)) {
    return new Response(JSON.stringify({ error: 'Invalid period_id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  deleteMonthlyIncome(id);
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
