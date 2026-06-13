import type { APIRoute } from 'astro';
import { db, getTransactions, insertTransaction, updateTransaction, deleteTransaction, deleteTransactionsBulk, updateTransactionsBulk, getTransactionById, findDuplicateTransaction, ensurePeriod, getPeriodByMonth } from '../../../lib/db';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const month = url.searchParams.get('month') || undefined;
  const periodIdStr = url.searchParams.get('period_id') || undefined;
  const type = url.searchParams.get('type') || undefined;
  const search = url.searchParams.get('search') || undefined;
  const category = url.searchParams.get('category') || undefined;

  let periodId: number | undefined;
  if (periodIdStr) {
    periodId = parseInt(periodIdStr, 10);
  } else if (month) {
    const period = getPeriodByMonth(month);
    periodId = period?.id;
  }

  const rows = getTransactions({ periodId, type, search, category });
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

  // Resolve period_id: if body has month, ensure period exists and get its id
  let period_id = body.period_id;
  if (!period_id && body.month) {
    period_id = ensurePeriod(body.month);
  }
  const txData = { ...body, period_id };
  delete txData.month; // remove legacy month field

  const id = insertTransaction(txData);
  return new Response(JSON.stringify({ id, ...body }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const PUT: APIRoute = async ({ request }) => {
  const body = await request.json();
  const ids = body.ids as number[];
  const updates = body.updates;
  if (!Array.isArray(ids) || ids.length === 0) {
    return new Response(JSON.stringify({ error: 'ids array required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (!updates || Object.keys(updates).length === 0) {
    return new Response(JSON.stringify({ error: 'updates object required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const result = updateTransactionsBulk(ids, updates);
  return new Response(JSON.stringify({ success: true, updated: result.changes }), {
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
