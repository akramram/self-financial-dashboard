import type { APIRoute } from 'astro';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { timingSafeEqual } from 'node:crypto';
import { parseJeniusEmail, JENIUS_SENDER } from '../../../lib/emailIngest';
import { insertPendingEmailTx } from '../../../lib/db';

/**
 * POST /api/ingest/email  (also GET — 200 = ready, no writes)
 *
 * Local-only bridge used by scripts/jenius-email-ingest.py. It is NOT covered
 * by the session-cookie middleware (see PUBLIC_PREFIXES in src/middleware.ts),
 * so the shared token is the only gate: header `x-ingest-token` must equal
 * data/ingest.token. Absent file = endpoint refuses to work (503) rather than
 * silently accepting unauthenticated writes.
 */
const TOKEN_FILE = resolve(process.cwd(), 'data/ingest.token');

function readToken(): string | null {
  try {
    return readFileSync(TOKEN_FILE, 'utf8').trim() || null;
  } catch {
    return null;
  }
}

function authorized(request: Request): boolean {
  const expected = process.env.INGEST_TOKEN || readToken();
  if (!expected) return false;
  const got = request.headers.get('x-ingest-token') || '';
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const GET: APIRoute = async () =>
  new Response(JSON.stringify({ ready: Boolean(process.env.INGEST_TOKEN || readToken()) }), {
    headers: { 'Content-Type': 'application/json' },
  });

export const POST: APIRoute = async ({ request }) => {
  if (!authorized(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  const messages = Array.isArray(payload?.messages) ? payload.messages : [payload];
  const accepted: number[] = [];
  const skipped: string[] = [];

  for (const msg of messages) {
    const messageId = String(msg?.messageId || '').trim();
    const body = String(msg?.body || '');
    if (!messageId || !body) {
      skipped.push('missing messageId/body');
      continue;
    }
    if (msg?.from && !String(msg.from).toLowerCase().includes(JENIUS_SENDER)) {
      skipped.push(`${messageId}: unexpected sender`);
      continue;
    }
    const parsed = parseJeniusEmail({ subject: msg?.subject, body });
    if (!parsed) {
      skipped.push(`${messageId}: unparseable`);
      continue;
    }
    const id = insertPendingEmailTx({
      message_id: messageId,
      subject: parsed.subject || String(msg?.subject || ''),
      tx_date: parsed.tx_date,
      tx_time: parsed.tx_time,
      merchant: parsed.merchant,
      amount: parsed.amount,
      card_last4: parsed.card_last4,
      raw_excerpt: parsed.raw_excerpt,
    });
    if (id === null) skipped.push(`${messageId}: duplicate`);
    else accepted.push(id);
  }

  return new Response(JSON.stringify({ accepted, skipped }), {
    headers: { 'Content-Type': 'application/json' },
  });
};