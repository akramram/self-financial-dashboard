import type { APIRoute } from 'astro';
import {
  listPendingEmailTx,
  getPendingEmailTx,
  approvePendingEmailTx,
  rejectPendingEmailTx,
  suggestCategory,
  getCategories,
} from '../../lib/db';

/**
 * GET  /api/pending-email          → queue for the review modal
 * POST /api/pending-email          → { id, action: 'approve'|'reject', edits? }
 *
 * Session-authed (admin only for writes — viewer is blocked by middleware).
 * The modal walks the queue one card at a time; "approve" is the ONLY path that
 * writes into `transactions`, so a mis-parsed email can never leak into
 * reports without a human seeing it first.
 */
export const GET: APIRoute = async () => {
  const items = listPendingEmailTx().map((row) => ({
    ...row,
    suggested_category: row.merchant ? suggestCategory(row.merchant).category || null : null,
  }));
  const categories = (getCategories() as any[]).map((c) => c.name);
  return new Response(JSON.stringify({ items, categories }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request }) => {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  const id = Number(body?.id);
  const action = String(body?.action || '');
  if (!Number.isInteger(id) || id <= 0) {
    return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400 });
  }
  const row = getPendingEmailTx(id);
  if (!row) {
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
  }

  try {
    if (action === 'approve') {
      const edits = body?.edits || {};
      const amount = edits.amount != null ? Number(edits.amount) : undefined;
      if (amount != null && (!Number.isFinite(amount) || amount <= 0)) {
        return new Response(JSON.stringify({ error: 'Amount must be positive' }), { status: 400 });
      }
      const date = edits.date != null ? String(edits.date) : undefined;
      if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return new Response(JSON.stringify({ error: 'Date must be YYYY-MM-DD' }), { status: 400 });
      }
      const transactionId = approvePendingEmailTx(id, {
        title: edits.title ? String(edits.title).trim() : undefined,
        category: edits.category ? String(edits.category).trim() : undefined,
        amount,
        date,
        payment_method: edits.payment_method ? String(edits.payment_method).trim() : undefined,
      });
      return new Response(JSON.stringify({ ok: true, transactionId, remaining: listPendingEmailTx().length }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (action === 'reject') {
      rejectPendingEmailTx(id, String(body?.reason || ''));
      return new Response(JSON.stringify({ ok: true, remaining: listPendingEmailTx().length }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};