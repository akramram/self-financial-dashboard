/**
 * BBRI dividend lens (KUR-210) — shared math for the /networth dividend
 * metrics. Pure module (no DOM, no fetch) so both NetworthComposition.tsx and
 * tests consume identical numbers.
 *
 * Data sources:
 *  - live  : GET /api/bbri/quote → bbri_quotes cache (KUR-29 Yahoo refresh)
 *  - manual: MANUAL_BBRI_FALLBACK const below, used when the quote is stale
 *            (> 7 days), missing, or the fetch failed. UI shows a
 *            "manual estimate" badge whenever source === 'manual'.
 *
 * Edge rules (per KUR-210): sahamValue <= 0, ttm_dividend === 0 or
 * price === 0 → hide the metrics (null), never NaN.
 */

/** Founder-confirmed ballpark TTM yield (346/3100 ≈ 11,2% as of 2026-10). */
export const MANUAL_BBRI_FALLBACK = { ttmYieldPct: 11.2 } as const;

export interface BbriQuoteLite {
  symbol: string;
  price: number;
  ttm_dividend: number;
  fetched_at: string;
}

export interface DividendLensInput {
  /** Quote from GET /api/bbri/quote; null when missing or fetch failed. */
  quote: BbriQuoteLite | null;
  /** true when quote is stale or absent (response `stale` flag). */
  stale: boolean;
  /** Current month value of the 'Saham' asset from the networth breakdown. */
  sahamValue: number;
}

export interface DividendLens {
  /** TTM yield in percent (e.g. 11.2), 1-decimal precision left to the UI. */
  ttmYieldPct: number | null;
  /** Projected annual dividend income in IDR (yield × sahamValue). */
  projectedAnnualDividend: number | null;
  /** 'live' = cached quote used; 'manual' = fallback const; null = hidden. */
  source: 'live' | 'manual' | null;
}

export function computeDividendLens({ quote, stale, sahamValue }: DividendLensInput): DividendLens {
  if (!(sahamValue > 0)) return { ttmYieldPct: null, projectedAnnualDividend: null, source: null };

  const freshQuote = quote && !stale ? quote : null;

  if (freshQuote) {
    // Fresh cached quote — live math; hide on degenerate values per issue.
    if (freshQuote.price > 0 && freshQuote.ttm_dividend > 0) {
      const ttmYieldPct = (freshQuote.ttm_dividend / freshQuote.price) * 100;
      return { ttmYieldPct, projectedAnnualDividend: (ttmYieldPct / 100) * sahamValue, source: 'live' };
    }
    return { ttmYieldPct: null, projectedAnnualDividend: null, source: null };
  }

  // Stale / missing quote or failed fetch — manual fallback estimate.
  const ttmYieldPct = MANUAL_BBRI_FALLBACK.ttmYieldPct;
  return { ttmYieldPct, projectedAnnualDividend: (ttmYieldPct / 100) * sahamValue, source: 'manual' };
}
