import type { APIRoute } from 'astro';
import { db, getTransactions, insertTransaction, updateTransaction, deleteTransaction, getTransactionById } from '../../../lib/db';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const month = url.searchParams.get('month') || undefined;
  const type = url.searchParams.get('type') || undefined;
  const search = url.searchParams.get('search') || undefined;
  const rows = getTransactions({ month, type, search });
  return new Response(JSON.stringify(rows), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const id = insertTransaction(body);
  return new Response(JSON.stringify({ id, ...body }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
