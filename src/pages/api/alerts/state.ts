import type { APIRoute } from 'astro';
import {
  getDismissedAlertKeys,
  dismissAlertKeys,
  restoreAlertKeys,
  getAlertPrefs,
  setAlertPref,
} from '../../../lib/db';
import { ALERT_PREF_KEYS, type AlertPrefKey } from '../../../lib/alertRules';
import { parseJsonBody, jsonError, jsonPreflight } from '../../../lib/http';

export const prerender = false;

/**
 * FIN-022 (KUR-127 AC-2) + lanjutan (KUR-132 ruling §2): persistent alert
 * dismissal state AND alert preferences in SQLite, behind this one endpoint.
 *
 * GET    → { dismissed: string[], prefs: Record<prefKey, boolean> }
 * POST   → { keys: string[], dismissedAt? }  dismiss (idempotent, single tx)
 * DELETE → { keys: string[] }                restore (un-dismiss)
 * PATCH  → { pref: prefKey, enabled: bool }  set exactly one preference
 *
 * Key formats (stable across renders/months):
 *   anomaly → `a:{transaction_id}`
 *   budget  → `{period_id}:{category}`
 *
 * Prefs (KUR-132 §2): exactly four flat families, stored in `alert_prefs`,
 * absent row = enabled. GET returns them together with the dismissed list so
 * first paint needs a single round-trip. Dismissal methods are unchanged.
 */
const MAX_KEYS = 500;

function normalizeKeys(body: any): string[] | null {
  const keys = body?.keys;
  if (!Array.isArray(keys)) return null;
  const clean = [...new Set(keys.filter((k) => typeof k === 'string' && k.length > 0 && k.length <= 256))];
  if (clean.length === 0 || clean.length > MAX_KEYS) return null;
  return clean;
}

function normalizePref(body: any): { key: AlertPrefKey; enabled: boolean } | null {
  const key = body?.pref;
  if (typeof key !== 'string' || !ALERT_PREF_KEYS.includes(key as AlertPrefKey)) return null;
  if (typeof body?.enabled !== 'boolean') return null;
  return { key: key as AlertPrefKey, enabled: body.enabled };
}

export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({ dismissed: getDismissedAlertKeys(), prefs: getAlertPrefs() }),
    {
      headers: { 'Content-Type': 'application/json' },
    },
  );
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

export const PATCH: APIRoute = async ({ request }) => {
  const body = await parseJsonBody(request);
  if (!body) return jsonError('Invalid JSON body');
  const pref = normalizePref(body);
  if (!pref) {
    return jsonError(
      `pref must be one of ${ALERT_PREF_KEYS.join(', ')} and enabled must be a boolean`,
    );
  }
  try {
    const enabled = setAlertPref(pref.key, pref.enabled);
    return new Response(JSON.stringify({ ok: true, pref: pref.key, enabled }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('PATCH /api/alerts/state failed:', err);
    return jsonError('Failed to save preference', 500);
  }
};

export const OPTIONS: APIRoute = () => jsonPreflight();
