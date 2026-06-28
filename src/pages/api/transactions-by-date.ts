import type { APIRoute } from 'astro';
import { getTransactionsByDate } from '../../lib/db';

// GET /api/transactions-by-date?day=YYYY-MM-DD
// Returns all transactions whose created_time (or date fallback) falls on that day.
export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const day = url.searchParams.get('day');
  if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    return new Response(JSON.stringify({ error: 'Missing or invalid "day" param (expected YYYY-MM-DD)' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const rows = getTransactionsByDate(day);
  return new Response(JSON.stringify(rows), {
    headers: { 'Content-Type': 'application/json' },
  });
};
