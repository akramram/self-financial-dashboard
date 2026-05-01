import type { APIRoute } from 'astro';
import { db, getTransactions, insertTransaction, updateTransaction, deleteTransaction, deleteTransactionsBulk, getTransactionById, findDuplicateTransaction } from '../../../lib/db';

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
  const duplicateId = findDuplicateTransaction({
    title: body.title,
    amount: Number(body.amount),
    category: body.category || body.title.split(' ')[0],
    type: body.type,
  });
  if (duplicateId && !body.force) {
    return new Response(JSON.stringify({ duplicate: true, duplicateId, message: 'A similar transaction was added recently.' }), {
      status: 409,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const id = insertTransaction(body);
  return new Response(JSON.stringify({ id, ...body }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const DELETE: APIRoute = async ({ request }) => {
  const body = await request.json();
  const ids = body.ids as number[];
  if (!Array.isArray(ids) || ids.length === 0) {
    return new Response(JSON.stringify({ error: 'ids array required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  deleteTransactionsBulk(ids);
  return new Response(JSON.stringify({ success: true, deleted: ids.length }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
