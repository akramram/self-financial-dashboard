/**
 * AKSes (KSEI) drill-down detail fetch layer (KUR-147, parent KUR-42).
 *
 * Shape-agnostic by design: the only job here is fetch → store the response
 * body VERBATIM into `ksei_detail_snapshots` (KUR-143) → fall back to the
 * newest cached row on any failure. No field names are read or guessed —
 * parsing stays isolated in lib/kseiInstruments.ts (gated on live fixtures
 * in KUR-42).
 *
 * Behaviour contract:
 * - Token missing/expired → ZERO outbound requests; serve latest cache with
 *   tokenExpired=true (same gate as scripts/ksei-capture-fixtures.sh).
 * - HTTP 200 + valid JSON → UPSERT (snapshot_date, kind, code) with the raw
 *   body string (NOT JSON.stringify(JSON.parse(...))) so fixtures and cache
 *   stay byte-identical for shape verification.
 * - Any failure (non-200, network, timeout, invalid JSON) → latest cache,
 *   never throws when a row exists; `error` carries the reason for logging.
 * - No cache + failure → payload=null, hadCache=false; the caller decides
 *   the HTTP status.
 * - `stale` mirrors the KseiCard refresh interval (1h) — same threshold as
 *   the KUR-145 endpoint used before wiring.
 *
 * Request constants (base URL, timeout, headers) and the WIB date resolver
 * are reused from lib/ksei.ts — no duplicated constants.
 */

import { getLatestKseiDetailSnapshot, saveKseiDetailSnapshot } from './db';
import {
  KSEI_BASE,
  KSEI_TIMEOUT_MS,
  MIN_REFRESH_INTERVAL_MS,
  kseiRequestHeaders,
  wibDateString,
} from './ksei';
import { loadKseiToken } from './kseiToken';

export type KseiDetailKind = 'equity-summary' | 'reksadana-summary' | 'reksadana';

export interface KseiDetailResult {
  /** raw JSON payload (live or cache); null only when nothing usable exists */
  payload: unknown;
  snapshotDate: string;
  fetchedAt: string;
  source: 'live' | 'cache';
  stale: boolean;
  tokenExpired: boolean;
  /** fallback reason (fetch failure, token state) — for logging */
  error?: string;
  /** false when no cached row exists at all (caller picks the 404) */
  hadCache: boolean;
}

export interface KseiDetailOpts {
  /** per-fund code — required for kind 'reksadana' */
  code?: string;
  /** snapshot date (YYYY-MM-DD); default = today WIB via lib/ksei resolver */
  date?: string;
  now?: Date;
  fetchImpl?: typeof fetch;
}

function detailUrl(kind: KseiDetailKind, date: string, code: string): string {
  switch (kind) {
    case 'equity-summary':
      return `${KSEI_BASE}/service/myportofolio/equity-summary?date=${date}`;
    case 'reksadana-summary':
      return `${KSEI_BASE}/service/myportofolio/reksadana-summary?date=${date}`;
    case 'reksadana':
      return `${KSEI_BASE}/service/myportofolio/reksadana?date=${date}&code=${encodeURIComponent(code)}`;
  }
}

/** Same 1h threshold the KUR-145 endpoint (and KseiCard refresh) uses. */
function isStale(fetchedAt: string, now: Date): boolean {
  const age = now.getTime() - new Date(fetchedAt).getTime();
  return !(age >= 0 && age < MIN_REFRESH_INTERVAL_MS);
}

function fromCache(
  kind: KseiDetailKind,
  code: string,
  tokenExpired: boolean,
  error: string,
  now: Date
): KseiDetailResult {
  const row = getLatestKseiDetailSnapshot(kind, code);
  if (!row) {
    return {
      payload: null,
      snapshotDate: '',
      fetchedAt: '',
      source: 'cache',
      stale: true,
      tokenExpired,
      error,
      hadCache: false,
    };
  }
  let payload: unknown = null;
  try {
    payload = JSON.parse(row.payload_json);
  } catch {
    payload = null; // corrupt row → caller degrades defensively
  }
  return {
    payload,
    snapshotDate: row.snapshot_date,
    fetchedAt: row.fetched_at,
    source: 'cache',
    stale: isStale(row.fetched_at, now),
    tokenExpired,
    error,
    hadCache: true,
  };
}

export async function fetchAndCacheKseiDetail(
  kind: KseiDetailKind,
  opts: KseiDetailOpts = {}
): Promise<KseiDetailResult> {
  const now = opts.now ?? new Date();
  const code = opts.code ?? '';
  const { token, expired } = loadKseiToken(now);
  const tokenExpired = !token || expired;

  // Gate BEFORE any request — no token, no outbound call (KUR-143 script pattern).
  if (tokenExpired) {
    const reason = expired
      ? 'Token AKSes kedaluwarsa — rotasi via scripts/rotate-ksei-token.sh'
      : 'Token AKSes belum diatur (data/ksei.json / KSEI_BEARER_TOKEN)';
    return fromCache(kind, code, true, reason, now);
  }
  if (kind === 'reksadana' && !code) {
    return fromCache(kind, code, false, "kind 'reksadana' membutuhkan opts.code", now);
  }

  const date = opts.date ?? wibDateString(now);
  const fetchImpl = opts.fetchImpl ?? fetch;
  try {
    const res = await fetchImpl(detailUrl(kind, date, code), {
      headers: kseiRequestHeaders(token),
      signal: AbortSignal.timeout(KSEI_TIMEOUT_MS),
    });
    if (!res.ok) {
      return fromCache(kind, code, false, `AKSes HTTP ${res.status}`, now);
    }
    const text = await res.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return fromCache(kind, code, false, 'Respons AKSes bukan JSON valid', now);
    }
    // Store the body VERBATIM — fixture and cache must stay byte-identical
    // for the KUR-42 shape verification. Never re-stringify.
    saveKseiDetailSnapshot({
      snapshot_date: date,
      kind,
      code,
      payload_json: text,
      fetched_at: now.toISOString(),
    });
    return {
      payload: parsed,
      snapshotDate: date,
      fetchedAt: now.toISOString(),
      source: 'live',
      stale: false,
      tokenExpired: false,
      hadCache: true,
    };
  } catch (err) {
    return fromCache(
      kind,
      code,
      false,
      err instanceof Error ? err.message : 'AKSes fetch gagal',
      now
    );
  }
}
