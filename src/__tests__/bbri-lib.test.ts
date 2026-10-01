import { describe, it, expect, vi, beforeEach } from 'vitest';

// Never touch the real SQLite file — mock the db layer entirely.
vi.mock('../lib/db', () => ({
  getCachedBbriQuote: vi.fn().mockReturnValue(null),
  saveBbriQuote: vi.fn(),
}));

import { getBbriWithCache, fetchBbriQuote, MIN_REFRESH_INTERVAL_MS } from '../lib/bbri';
import { getCachedBbriQuote, saveBbriQuote } from '../lib/db';

// Shape mirrors the verified live payload (KUR-28 standup, 1 Okt 2026):
// price 3140, prevClose 3150 IDR; 1y dividends 137 + 209 = 346 IDR/share.
const QUOTE_JSON = {
  chart: { result: [{ meta: { regularMarketPrice: 3140, chartPreviousClose: 3150, currency: 'IDR' } }] },
};
const DIV_JSON = {
  chart: {
    result: [{
      events: {
        dividends: {
          '1709020800': { date: 1709020800, amount: 137 }, // 2024-02-27
          '1725436800': { date: 1725436800, amount: 209 }, // 2024-09-04
        },
      },
    }],
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCachedBbriQuote).mockReturnValue(null);
  vi.unstubAllGlobals();
});

describe('bbri lib — live fetch path (mocked Yahoo)', () => {
  it('builds chart URLs with a single valid host (regression: no doubled .finance.yahoo.com)', async () => {
    const urls: string[] = [];
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string) => {
      urls.push(url);
      return { ok: true, json: async () => (url.includes('events=div') ? DIV_JSON : QUOTE_JSON) };
    }));
    await fetchBbriQuote();
    expect(urls).toHaveLength(2);
    for (const u of urls) {
      expect(u).toMatch(/^https:\/\/query[12]\.finance\.yahoo\.com\/v8\/finance\/chart\/BBRI\.JK\?/);
    }
  });

  it('extracts price, prev close, and TTM dividend sum from chart payloads', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (_url: string) => ({
      ok: true,
      json: async () => (_url.includes('events=div') ? DIV_JSON : QUOTE_JSON),
    })));
    const q = await fetchBbriQuote();
    expect(q.price).toBe(3140);
    expect(q.prev_close).toBe(3150);
    expect(q.ttm_dividend).toBe(346);
    expect(q.last_dividend_date).toBe('2024-09-04');
    expect(q.dividends).toHaveLength(2);
  });

  it('refreshes and persists when cache is empty', async () => {
    const fetchMock = vi.fn().mockImplementation(async (_url: string) => ({
      ok: true,
      json: async () => (_url.includes('events=div') ? DIV_JSON : QUOTE_JSON),
    }));
    vi.stubGlobal('fetch', fetchMock);
    const r = await getBbriWithCache();
    expect(r.stale).toBe(false);
    expect(r.refreshed).toBe(true);
    expect(r.price).toBe(3140);
    expect(saveBbriQuote).toHaveBeenCalledTimes(1);
  });

  it('returns fresh cache without any network call', async () => {
    vi.mocked(getCachedBbriQuote).mockReturnValue({
      symbol: 'BBRI.JK', price: 3140, prev_close: 3150, ttm_dividend: 346,
      fetched_at: new Date().toISOString(), last_dividend_date: '2024-09-04',
      dividends_json: '[{"date":"2024-09-04","amount":209}]',
    });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const r = await getBbriWithCache();
    expect(r.refreshed).toBe(false);
    expect(r.stale).toBe(false);
    expect(r.price).toBe(3140);
    expect(r.dividends).toEqual([{ date: '2024-09-04', amount: 209 }]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('falls back to stale cache when both Yahoo hosts fail', async () => {
    vi.mocked(getCachedBbriQuote).mockReturnValue({
      symbol: 'BBRI.JK', price: 3140, prev_close: 3150, ttm_dividend: 346,
      fetched_at: new Date(Date.now() - 3 * 86_400_000).toISOString(),
      last_dividend_date: '2024-09-04', dividends_json: null,
    });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Too Many Requests')));
    const r = await getBbriWithCache();
    expect(r.stale).toBe(true);
    expect(r.refreshed).toBe(false);
    expect(r.price).toBe(3140);
    expect(r.error).toBeTruthy();
    expect(saveBbriQuote).not.toHaveBeenCalled();
  });

  it('keeps cached TTM when the quote succeeds but dividend events fail', async () => {
    vi.mocked(getCachedBbriQuote).mockReturnValue({
      symbol: 'BBRI.JK', price: 3100, prev_close: 3120, ttm_dividend: 346,
      fetched_at: new Date(Date.now() - 3 * 86_400_000).toISOString(),
      last_dividend_date: '2024-09-04',
      dividends_json: '[{"date":"2024-09-04","amount":209}]',
    });
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string) => {
      if (String(url).includes('events=div')) throw new Error('div down');
      return { ok: true, json: async () => QUOTE_JSON };
    }));
    const r = await getBbriWithCache();
    expect(r.refreshed).toBe(true);
    expect(r.ttm_dividend).toBe(346); // carried over from cache
    expect(r.price).toBe(3140); // fresh quote wins
    expect(r.error).toContain('dividend');
  });

  it('throws when no cache exists and the fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')));
    await expect(getBbriWithCache()).rejects.toThrow('down');
  });

  it('min refresh interval is 1 hour', () => {
    expect(MIN_REFRESH_INTERVAL_MS).toBe(3_600_000);
  });
});
