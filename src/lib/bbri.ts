import { getCachedBbriQuote, saveBbriQuote, type BbriQuoteRow } from './db';

/**
 * BBRI.JK market data via Yahoo Finance chart API (KUR-29).
 *
 * Server-side only. Browser UA + 10s timeout + query1→query2 host fallback,
 * then cache fallback. UI always renders from the SQLite cache; the network
 * refresh happens behind the scenes at most once per MIN_REFRESH_INTERVAL.
 */

export interface BbriDividendEvent {
  /** Ex-date, YYYY-MM-DD */
  date: string;
  /** IDR per share */
  amount: number;
}

export interface BbriQuote {
  symbol: string;
  price: number;
  prev_close: number;
  ttm_dividend: number;
  fetched_at: string;
  last_dividend_date: string | null;
  dividends: BbriDividendEvent[];
  /** non-fatal note (e.g. dividend endpoint fell back to cache) */
  error?: string;
}

export interface BbriResult extends BbriQuote {
  /** true when served from cache older than the min refresh interval */
  stale: boolean;
  /** true when this response triggered a network refresh */
  refreshed: boolean;
  /** non-fatal note when a part fell back to cache */
  error?: string;
}

const SYMBOL = 'BBRI.JK';
// Yahoo returns 403/429 for long spoofed Chrome UA strings but serves requests
// with a minimal `Mozilla/5.0` token (verified 1 Okt 2026: full Chrome UA =
// 429, "Mozilla/5.0" = 200 with live quote).
const BROWSER_UA = 'Mozilla/5.0';
const TIMEOUT_MS = 10_000;
export const MIN_REFRESH_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const HOSTS = ['query1.finance.yahoo.com', 'query2.finance.yahoo.com'];
const HOST_PLACEHOLDER = '__HOST__';

function chartUrl(range: string, interval: string, events: boolean): string {
  const ev = events ? '&events=div' : '';
  return `https://${HOST_PLACEHOLDER}/v8/finance/chart/${SYMBOL}?range=${range}&interval=${interval}${ev}`;
}

/** Fetch one chart URL, trying query1 then query2. Throws when both fail. */
async function fetchChart(range: string, interval: string, events: boolean): Promise<any> {
  let lastErr: unknown = new Error('no attempt');
  for (const host of HOSTS) {
    const url = chartUrl(range, interval, events).replace(HOST_PLACEHOLDER, host);
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': BROWSER_UA, Accept: 'application/json' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`${host} HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

function extractQuote(json: any): { price: number; prevClose: number } {
  const result = json?.chart?.result?.[0];
  const meta = result?.meta;
  const price = Number(meta?.regularMarketPrice);
  const prevClose = Number(meta?.chartPreviousClose ?? meta?.previousClose);
  if (!Number.isFinite(price) || price <= 0) throw new Error('Yahoo: missing regularMarketPrice');
  if (!Number.isFinite(prevClose) || prevClose <= 0) throw new Error('Yahoo: missing chartPreviousClose');
  return { price, prevClose };
}

function extractDividends(json: any): BbriDividendEvent[] {
  const divs = json?.chart?.result?.[0]?.events?.dividends ?? {};
  return Object.values<any>(divs)
    .map(d => ({
      date: new Date(Number(d.date) * 1000).toISOString().slice(0, 10),
      amount: Number(d.amount),
    }))
    .filter(d => Number.isFinite(d.amount) && d.amount > 0)
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** Live fetch: 5d quote + trailing-12-month dividend events. */
export async function fetchBbriQuote(now = new Date()): Promise<BbriQuote> {
  const quoteJson = await fetchChart('5d', '1d', false);
  const { price, prevClose } = extractQuote(quoteJson);

  let dividends: BbriDividendEvent[] = [];
  try {
    dividends = extractDividends(await fetchChart('1y', '1mo', true));
  } catch {
    // Dividend events are optional — quote proceeds without TTM history.
  }

  return {
    symbol: SYMBOL,
    price,
    prev_close: prevClose,
    ttm_dividend: dividends.reduce((s, d) => s + d.amount, 0),
    fetched_at: now.toISOString(),
    last_dividend_date: dividends[0]?.date ?? null,
    dividends,
  };
}

function rowToQuote(row: BbriQuoteRow): BbriQuote {
  let dividends: BbriDividendEvent[] = [];
  try {
    dividends = row.dividends_json ? (JSON.parse(row.dividends_json) as BbriDividendEvent[]) : [];
  } catch {
    dividends = [];
  }
  return {
    symbol: row.symbol,
    price: row.price,
    prev_close: row.prev_close,
    ttm_dividend: row.ttm_dividend,
    fetched_at: row.fetched_at,
    last_dividend_date: row.last_dividend_date,
    dividends,
  };
}

/**
 * Cache-first read path.
 * - Fresh cache (< maxAgeMs): return it, no network.
 * - Stale/missing cache: refresh in the background of the request; on network
 *   failure fall back to the cached row marked stale (or throw when no cache).
 */
export async function getBbriWithCache(
  maxAgeMs: number = MIN_REFRESH_INTERVAL_MS,
  now = new Date()
): Promise<BbriResult> {
  const cached = getCachedBbriQuote(SYMBOL);
  if (cached) {
    const age = now.getTime() - new Date(cached.fetched_at).getTime();
    if (age >= 0 && age < maxAgeMs) {
      return { ...rowToQuote(cached), stale: false, refreshed: false };
    }
  }

  try {
    const fresh = await fetchBbriQuote(now);
    // Quote OK but dividend events failed → keep cached TTM so the card
    // doesn't drop to zero just because one endpoint hiccuped.
    if (fresh.dividends.length === 0 && cached && cached.ttm_dividend > 0) {
      const cachedQuote = rowToQuote(cached);
      fresh.ttm_dividend = cached.ttm_dividend;
      fresh.last_dividend_date = cached.last_dividend_date;
      fresh.dividends = cachedQuote.dividends;
      fresh.error = 'dividend events unavailable — using cached TTM';
    }
    saveBbriQuote(fresh);
    return { ...fresh, stale: false, refreshed: true };
  } catch (err) {
    if (cached) {
      return {
        ...rowToQuote(cached),
        stale: true,
        refreshed: false,
        error: err instanceof Error ? err.message : 'fetch failed',
      };
    }
    throw err;
  }
}
