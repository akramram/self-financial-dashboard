import type { APIRoute } from 'astro';
import { getRecurringTransactions, insertRecurringTransaction } from '../../../lib/db';

export const GET: APIRoute = async () => {
  const rows = getRecurringTransactions();
  return new Response(JSON.stringify(rows), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  if (!body.title || typeof body.title !== 'string') {
    return new Response(JSON.stringify({ error: 'Title is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (!body.category || typeof body.category !== 'string') {
    return new Response(JSON.stringify({ error: 'Category is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (typeof body.amount !== 'number') {
    return new Response(JSON.stringify({ error: 'Amount must be a number' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const id = insertRecurringTransaction(body);
  return new Response(JSON.stringify({ id, ...body }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
