import type { APIRoute } from 'astro';
import { db } from '../../../lib/db';
import { loadKseiToken } from '../../../lib/kseiToken';
import {
  extractInstruments,
  KIND_BY_SLICE,
  type KseiInstrument,
} from '../../../lib/kseiInstruments';

/**
 * GET /api/ksei/instruments?type=EKUITAS|REKSADANA   (KUR-145, parent KUR-42)
 *
 * Drill-down instrument list for one asset-class slice of the KSEI card.
 * Cache-only: reads the raw, shape-agnostic rows KUR-143's capture flow
 * persists into `ksei_detail_snapshots` (payload_json stored VERBATIM).
 * This endpoint NEVER calls AKSes — no network, no token usage, instant
 * answer when nothing is cached yet.
 *
 * Response (spec KUR-144 §8):
 *   200 { snapshot_date, fetched_at, stale, tokenExpired, instruments: [...] }
 *   400 { error }                      — type missing / not EKUITAS|REKSADANA
 *   404 { error }                      — nothing cached for this class
 *   503 { error }                      — cache table not available yet
 *
 * Field mapping lives in lib/kseiInstruments.ts; the raw AKSes 200 shape is
 * still unverified (token expired), so the extractor is deliberately
 * tolerant: unknown shapes map to an empty list (defensive empty state),
 * and alias handling means a mapping tweak — not a UI change — once fixtures
 * land (KUR-42 wiring).
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
    // Latest cached row for this class — newest snapshot_date wins. Reads the
    // shared ksei_detail_snapshots table (KUR-143); the query lives in this
    // module so db.ts stays untouched (avoids merge contention with KUR-143).
    const row = db
      .prepare(
        `SELECT snapshot_date, payload_json, fetched_at
           FROM ksei_detail_snapshots
          WHERE kind = ?
          ORDER BY snapshot_date DESC
          LIMIT 1`
      )
      .get(kind) as
      | { snapshot_date: string; payload_json: string; fetched_at: string }
      | undefined;

    if (!row) {
      return json(
        { error: 'Belum ada data instrumen tersimpan untuk kelas ini.', tokenExpired: tokenExpired() },
        404
      );
    }

    let raw: unknown = null;
    try {
      raw = JSON.parse(row.payload_json);
    } catch {
      raw = null; // corrupt row → defensive empty below
    }

    const instruments: KseiInstrument[] = extractInstruments(raw, type);

    return json({
      snapshot_date: row.snapshot_date,
      fetched_at: row.fetched_at,
      stale: isStale(row.fetched_at),
      tokenExpired: tokenExpired(),
      instruments,
    });
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

/** Cache row is stale once older than the summary card's 1h refresh interval. */
function isStale(fetchedAt: string): boolean {
  const age = Date.now() - new Date(fetchedAt).getTime();
  return !(age >= 0 && age < 60 * 60 * 1000);
}
