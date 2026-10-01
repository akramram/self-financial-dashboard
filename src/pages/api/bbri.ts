import type { APIRoute } from 'astro';
import { getBbriWithCache, MIN_REFRESH_INTERVAL_MS } from '../../lib/bbri';

/**
 * GET /api/bbri?max_age_ms=3600000   (KUR-29)
 *
 * BBRI.JK quote + trailing-12-month dividends, served cache-first from the
 * `bbri_quotes` SQLite table. When the cached row is older than max_age_ms
 * (default 60 min) a live Yahoo Finance refresh is attempted server-side and
 * persisted; on network failure the cached row is returned marked stale=true.
 * UI always renders from this response — no client-side calls to Yahoo.
 */
export const GET: APIRoute = async ({ url }) => {
  const raw = url.searchParams.get('max_age_ms');
  let maxAgeMs = MIN_REFRESH_INTERVAL_MS;
  if (raw != null) {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0) maxAgeMs = n;
  }

  try {
    const result = await getBbriWithCache(maxAgeMs);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    // No cache at all and the live fetch failed (e.g. Yahoo rate-limiting).
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'BBRI fetch failed' }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
