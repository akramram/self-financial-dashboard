import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * GET /api/ksei/instruments — endpoint contract.
 *
 * KUR-145 wrote this route cache-only; KUR-147 rewired it through the fetch
 * layer (fetchAndCacheKseiDetail): live AKSes request when the token allows,
 * verbatim cache store, cache fallback on failure. The KUR-145 response
 * contract { snapshot_date, fetched_at, stale, tokenExpired, instruments }
 * is frozen — KUR-147 may only ADD fields (source).
 *
 * The fetch layer is mocked at the module boundary; these tests never touch
 * the network. (The fetch layer itself is covered in ksei-detail-fetch.test.ts,
 * including the ZERO-request token gate and byte-identical verbatim store.)
 */

const { fetchAndCacheKseiDetailMock } = vi.hoisted(() => ({
  fetchAndCacheKseiDetailMock: vi.fn(),
}));
vi.mock('../lib/kseiDetail', () => ({
  fetchAndCacheKseiDetail: fetchAndCacheKseiDetailMock,
}));

import { GET } from '../pages/api/ksei/instruments';

function req(type: string | null): { url: URL } {
  const q = type === null ? '' : `?type=${type}`;
  return { url: new URL(`http://localhost/api/ksei/instruments${q}`) };
}

beforeEach(() => {
  fetchAndCacheKseiDetailMock.mockReset();
});

describe('GET /api/ksei/instruments (KUR-145 contract, KUR-147 fetch layer)', () => {
  it('400 on missing / invalid type', async () => {
    for (const t of [null, 'KAS', 'OBLIGASI', 'DROP TABLE']) {
      const res = await GET(req(t) as any);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/type/i);
    }
    expect(fetchAndCacheKseiDetailMock).not.toHaveBeenCalled();
  });

  it('200 keeps every KUR-145 field and adds source', async () => {
    fetchAndCacheKseiDetailMock.mockResolvedValue({
      payload: {
        data: [
          { codeBaseSec: 'BBCA', emitenName: 'Bank Central Asia', summaryAmount: 10_550_000, jmlLembar: 200 },
        ],
      },
      snapshotDate: '2026-10-07',
      fetchedAt: new Date().toISOString(),
      source: 'live',
      stale: false,
      tokenExpired: false,
      hadCache: true,
    });
    const res = await GET(req('EKUITAS') as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    // KUR-145 fields — sheet drill-down binds to these
    expect(body.snapshot_date).toBe('2026-10-07');
    expect(typeof body.fetched_at).toBe('string');
    expect(body.stale).toBe(false);
    expect(body.tokenExpired).toBe(false);
    expect(body.instruments).toEqual([
      { code: 'BBCA', name: 'Bank Central Asia', value: 10_550_000, volume: 200 },
    ]);
    // additive only — KUR-147
    expect(body.source).toBe('live');
  });

  it('200 from cache carries source=cache and stale=true', async () => {
    fetchAndCacheKseiDetailMock.mockResolvedValue({
      payload: { data: [] },
      snapshotDate: '2026-10-01',
      fetchedAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
      source: 'cache',
      stale: true,
      tokenExpired: true,
      hadCache: true,
      error: 'Token AKSes kedaluwarsa',
    });
    const res = await GET(req('REKSADANA') as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.source).toBe('cache');
    expect(body.stale).toBe(true);
    expect(body.tokenExpired).toBe(true);
    expect(body.instruments).toEqual([]); // tolerant extractor, unchanged
  });

  it('404 when the fetch layer has no cache and no live payload', async () => {
    fetchAndCacheKseiDetailMock.mockResolvedValue({
      payload: null, snapshotDate: '', fetchedAt: '', source: 'cache',
      stale: true, tokenExpired: true, hadCache: false, error: 'Token belum diatur',
    });
    const res = await GET(req('REKSADANA') as any);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBeTruthy();
    expect(body.tokenExpired).toBe(true);
  });

  it('503 when the fetch layer throws (table missing / DB hiccup)', async () => {
    fetchAndCacheKseiDetailMock.mockRejectedValue(new Error('no such table: ksei_detail_snapshots'));
    const res = await GET(req('REKSADANA') as any);
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  it('route delegates with the KIND_BY_SLICE kind for the slice', async () => {
    fetchAndCacheKseiDetailMock.mockResolvedValue({
      payload: {}, snapshotDate: 'd', fetchedAt: 'f', source: 'cache',
      stale: true, tokenExpired: false, hadCache: true,
    });
    await GET(req('REKSADANA') as any);
    expect(fetchAndCacheKseiDetailMock).toHaveBeenCalledWith('reksadana-summary');
  });
});
