import type { APIRoute } from 'astro';
import { getCachedBbriQuote } from '../../../lib/db';

/**
 * GET /api/bbri/quote   (KUR-210)
 *
 * Cache-only read of the last BBRI.JK quote + TTM dividend from the
 * `bbri_quotes` table (populated by the KUR-29 Yahoo refresh flow; never
 * triggers a network fetch — networth.astro renders server-side-ish and the
 * UI must never block on Yahoo). Additive read-only endpoint.
 *
 * 200 { quote: { symbol, price, prev_close, ttm_dividend, fetched_at,
 *                last_dividend_date, dividends }, stale: boolean }
 *   — stale is true when fetched_at is older than 7 days; the UI treats
 *     stale as "use manual fallback".
 * 200 { quote: null, stale: true } — no cached quote yet (not an error).
 */
export const QUOTE_STALE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const GET: APIRoute = async () => {
  try {
    const row = getCachedBbriQuote('BBRI.JK');
    if (!row) {
      return new Response(JSON.stringify({ quote: null, stale: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      });
    }

    const age = Date.now() - new Date(row.fetched_at).getTime();
    const stale = !Number.isFinite(age) || age > QUOTE_STALE_MS;

    let dividends: { date: string; amount: number }[] = [];
    if (row.dividends_json) {
      try {
        const parsed = JSON.parse(row.dividends_json);
        if (Array.isArray(parsed)) dividends = parsed;
      } catch {
        // malformed cache blob — dividend history is cosmetic, ignore
      }
    }

    return new Response(
      JSON.stringify({
        quote: {
          symbol: row.symbol,
          price: row.price,
          prev_close: row.prev_close,
          ttm_dividend: row.ttm_dividend,
          fetched_at: row.fetched_at,
          last_dividend_date: row.last_dividend_date,
          dividends,
        },
        stale,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ quote: null, stale: true, error: err instanceof Error ? err.message : 'read failed' }),
      { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }
    );
  }
};
