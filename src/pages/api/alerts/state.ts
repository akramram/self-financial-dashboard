import type { APIRoute } from 'astro';
import {
  getDismissedAlertKeys,
  dismissAlertKeys,
  restoreAlertKeys,
} from '../../../lib/db';
import { parseJsonBody, jsonError, jsonPreflight } from '../../../lib/http';

export const prerender = false;

/**
 * FIN-022 (KUR-127 AC-2): persistent alert dismissal state.
 *
 * GET    → { dismissed: string[] }
 * POST   → { keys: string[], dismissedAt? }  dismiss (idempotent, single tx)
 * DELETE → { keys: string[] }                restore (un-dismiss)
 *
 * Key formats (stable across renders/months):
 *   anomaly → `a:{transaction_id}`
 *   budget  → `{period_id}:{category}`
 *
 * Bulk mark-all and "Pulihkan semua" reuse the same POST/DELETE with a list of
 * keys (KUR-129 checklist #6: one request, one SQLite transaction — never N
 * POSTs per alert). Preferences live client-side in localStorage (AC-4) and
 * intentionally do NOT pass through this endpoint.
 */

const MAX_KEYS = 500;

function normalizeKeys(body: any): string[] | null {
  const keys = body?.keys;
  if (!Array.isArray(keys)) return null;
  const clean = [...new Set(keys.filter((k) => typeof k === 'string' && k.length > 0 && k.length <= 256))];
  if (clean.length === 0 || clean.length > MAX_KEYS) return null;
  return clean;
}

export const GET: APIRoute = async () => {
  return new Response(JSON.stringify({ dismissed: getDismissedAlertKeys() }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request }) => {
  const body = await parseJsonBody(request);
  if (!body) return jsonError('Invalid JSON body');
  const keys = normalizeKeys(body);
  if (!keys) return jsonError('keys must be a non-empty array of strings (max 500)');
  dismissAlertKeys(keys, typeof body.dismissedAt === 'string' ? body.dismissedAt : undefined);
  return new Response(JSON.stringify({ ok: true, dismissed: keys }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const DELETE: APIRoute = async ({ request }) => {
  const body = await parseJsonBody(request);
  if (!body) return jsonError('Invalid JSON body');
  const keys = normalizeKeys(body);
  if (!keys) return jsonError('keys must be a non-empty array of strings (max 500)');
  const removed = restoreAlertKeys(keys);
  return new Response(JSON.stringify({ ok: true, removed }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const OPTIONS: APIRoute = () => jsonPreflight();
