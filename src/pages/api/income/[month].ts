import type { APIRoute } from 'astro';
import { getMonthlyIncomeByMonth, upsertMonthlyIncome, deleteMonthlyIncome } from '../../../lib/db';

export const GET: APIRoute = async ({ params }) => {
  const month = params.month;
  if (!month) {
    return new Response(JSON.stringify({ error: 'Month is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const row = getMonthlyIncomeByMonth(decodeURIComponent(month));
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
  const month = params.month;
  if (!month) {
    return new Response(JSON.stringify({ error: 'Month is required' }), {
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
    month: decodeURIComponent(month),
    date: body.date || new Date().toISOString().slice(0, 10),
    income: Number(body.income),
    other_income: body.other_income != null ? Number(body.other_income) : 0,
  });
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const DELETE: APIRoute = async ({ params }) => {
  const month = params.month;
  if (!month) {
    return new Response(JSON.stringify({ error: 'Month is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  deleteMonthlyIncome(decodeURIComponent(month));
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
