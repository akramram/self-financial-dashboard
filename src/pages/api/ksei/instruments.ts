import type { APIRoute } from 'astro';
import { loadKseiToken } from '../../../lib/kseiToken';
import { fetchAndCacheKseiDetail } from '../../../lib/kseiDetail';
import {
  extractInstruments,
  KIND_BY_SLICE,
  type KseiInstrument,
} from '../../../lib/kseiInstruments';

/**
 * GET /api/ksei/instruments?type=EKUITAS|REKSADANA   (KUR-145 + KUR-147)
 *
 * Drill-down instrument list for one asset-class slice of the KSEI card.
 * Since KUR-147 the route goes through the fetch layer
 * (fetchAndCacheKseiDetail): token present → one live AKSes detail request
 * whose body is stored VERBATIM into `ksei_detail_snapshots`; token
 * missing/expired or any fetch failure → falls back to the newest cached
 * row without throwing. Zero cached rows and no live data → 404.
 *
 * Response (contract from KUR-145 — sheet binds to these fields):
 *   200 { snapshot_date, fetched_at, stale, tokenExpired, instruments: [...],
 *         source: 'live' | 'cache' }   ← source added in KUR-147
 *   400 { error }                      — type missing / not EKUITAS|REKSADANA
 *   404 { error }                      — nothing cached and live fetch empty
 *   503 { error }                      — cache table not available yet / DB hiccup
 *
 * Field mapping lives in lib/kseiInstruments.ts and is NOT touched here —
 * the raw AKSes 200 shape is still unverified (token expired); a mapping
 * tweak lands with KUR-42 once live fixtures confirm the shape.
 */

export const GET: APIRoute = async ({ url }) => {
  const type = (url.searchParams.get('type') ?? '').trim().toUpperCase();
  if (type !== 'EKUITAS' && type !== 'REKSADANA') {
    return json(
      { error: "Parameter 'type' wajib: EKUITAS atau REKSADANA" },
      400
    );
  }

  const kind = KIND_BY_SLICE[type];
  try {
    const result = await fetchAndCacheKseiDetail(kind as 'equity-summary' | 'reksadana-summary');

    // No cached row at all and live fetch produced nothing → 404. A cached
    // but corrupt row still degrades to an empty list (KUR-145 behaviour).
    if (!result.hadCache) {
      return json(
        {
          error: 'Belum ada data instrumen tersimpan untuk kelas ini.',
          tokenExpired: result.tokenExpired,
        },
        404
      );
    }

    const instruments: KseiInstrument[] = extractInstruments(result.payload, type);

    return json({
      snapshot_date: result.snapshotDate,
      fetched_at: result.fetchedAt,
      stale: result.stale,
      tokenExpired: result.tokenExpired,
      source: result.source,
      instruments,
    }, 200);
  } catch {
    // Table not migrated yet (KUR-143 not deployed) or DB hiccup.
    return json(
      { error: 'Gagal memuat daftar instrumen.', tokenExpired: tokenExpired() },
      503
    );
  }
};

// ─── helpers ────────────────────────────────────────────────────────────────

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

/** Cheap expiry read (no network) — same resolution order as the card. */
function tokenExpired(): boolean {
  const { token, expired } = loadKseiToken();
  return token !== null && expired;
}
