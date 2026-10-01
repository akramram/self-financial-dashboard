import type { APIRoute } from 'astro';
import { getKseiWithCache, MIN_REFRESH_INTERVAL_MS } from '../../lib/ksei';

/**
 * GET /api/ksei?max_age_ms=3600000   (KUR-40)
 *
 * AKSes (KSEI) portfolio snapshot — total value + per-type breakdown, served
 * cache-first from the `ksei_snapshots` SQLite table. When the cached row is
 * older than max_age_ms (default 60 min) a live AKSes refresh is attempted
 * server-side (walking back from today WIB to the latest posted EOD file)
 * and persisted; on failure the cached snapshot is returned marked
 * stale=true. tokenExpired=true tells the UI to nudge for token rotation.
 * UI always renders from this response — no client-side calls to AKSes.
 */
export const GET: APIRoute = async ({ url }) => {
  const raw = url.searchParams.get('max_age_ms');
  let maxAgeMs = MIN_REFRESH_INTERVAL_MS;
  if (raw != null) {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0) maxAgeMs = n;
  }

  try {
    const result = await getKseiWithCache(maxAgeMs);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    // No cache at all and the live fetch failed (e.g. missing/expired token).
    const tokenExpired = (err as any)?.tokenExpired === true;
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : 'KSEI fetch failed',
        tokenExpired,
      }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
