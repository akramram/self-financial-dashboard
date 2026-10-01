import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../lib/db', () => ({
  getCachedKseiSnapshot: vi.fn().mockReturnValue(null),
  getLatestKseiSnapshot: vi.fn().mockReturnValue(null),
  saveKseiSnapshot: vi.fn(),
}));

vi.mock('../lib/kseiToken', () => ({
  loadKseiToken: vi.fn(),
  isTokenExpired: vi.fn(),
}));

import {
  fetchKseiSummary,
  fetchLatestKseiPortfolio,
  getKseiWithCache,
  normalizeSummary,
  wibDateString,
  addDaysIso,
  MIN_REFRESH_INTERVAL_MS,
} from '../lib/ksei';
import { loadKseiToken } from '../lib/kseiToken';
import { getCachedKseiSnapshot, getLatestKseiSnapshot, saveKseiSnapshot } from '../lib/db';

const AKSES_JSON = {
  summaryValue: 37152544.31,
  estimasiLR: 0.0,
  summaryResponse: [
    { type: 'REKSADANA', summaryAmount: 10284298.08, estimasiLR: 0.0, percent: 27.68 },
    { type: 'EKUITAS', summaryAmount: 26866500.0, estimasiLR: 0.0, percent: 72.31 },
    { type: 'KAS', summaryAmount: 1746.23, estimasiLR: 0, percent: 0.0 },
    { type: 'OBLIGASI', summaryAmount: 0, estimasiLR: 0, percent: 0.0 },
  ],
};

const TOKEN = 'test-bearer-token';

const okRes = (json: unknown) => ({ ok: true, status: 200, json: async () => json } as Response);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCachedKseiSnapshot).mockReturnValue(null);
  vi.mocked(getLatestKseiSnapshot).mockReturnValue(null);
  vi.mocked(loadKseiToken).mockReturnValue({ token: TOKEN, expired: false });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ksei lib — AKSes fetch', () => {
  it('builds the summary URL with Bearer auth and parses the payload', async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return okRes(AKSES_JSON);
    });
    const json = await fetchKseiSummary('2026-09-30', TOKEN, fetchImpl as unknown as typeof fetch);
    expect(json?.summaryValue).toBe(37152544.31);
    expect(calls[0].url).toBe('https://akses.ksei.co.id/service/myportofolio/summary?type=&tanggal=2026-09-30');
    expect((calls[0].init?.headers as Record<string, string>).Authorization).toBe(`Bearer ${TOKEN}`);
  });

  it('returns null (not throw) when the date has no snapshot yet (timeout/404)', async () => {
    const timeoutErr = new Error('The operation was aborted due to timeout');
    timeoutErr.name = 'TimeoutError';
    const fetchImpl = vi.fn(async () => {
      throw timeoutErr;
    });
    await expect(fetchKseiSummary('2026-10-01', TOKEN, fetchImpl as unknown as typeof fetch)).resolves.toBeNull();

    const fetch404 = vi.fn(async () => ({ ok: false, status: 404 } as Response));
    await expect(fetchKseiSummary('2026-10-01', TOKEN, fetch404 as unknown as typeof fetch)).resolves.toBeNull();
  });

  it('throws on hard HTTP failures (e.g. 500 from a bad token)', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 500 } as Response));
    await expect(
      fetchKseiSummary('2026-09-30', 'bad', fetchImpl as unknown as typeof fetch)
    ).rejects.toThrow('AKSes HTTP 500');
  });
});

describe('ksei lib — day walk-back + normalize', () => {
  it('walks back from today until AKSes has a snapshot', async () => {
    const now = new Date('2026-10-01T03:00:00.000Z'); // 10:00 WIB
    const dates: string[] = [];
    const fetchImpl = vi.fn(async (url: string) => {
      dates.push(new URL(url).searchParams.get('tanggal') ?? '');
      if (dates.length === 1) throw Object.assign(new Error('timeout'), { name: 'TimeoutError' });
      return okRes(AKSES_JSON);
    });
    const p = await fetchLatestKseiPortfolio(TOKEN, now, fetchImpl as unknown as typeof fetch);
    expect(dates[0]).toBe('2026-10-01');
    expect(dates[1]).toBe('2026-09-30');
    expect(p.snapshot_date).toBe('2026-09-30');
    expect(p.total_value).toBe(37152544.31);
    expect(p.breakdown).toHaveLength(4);
    expect(p.breakdown.find(s => s.type === 'EKUITAS')?.amount).toBe(26866500);
  });

  it('normalizes amounts/percents and rejects malformed payloads', () => {
    const p = normalizeSummary(AKSES_JSON, '2026-09-30', '2026-10-01T03:00:00.000Z');
    expect(p?.breakdown[0]).toEqual({ type: 'REKSADANA', amount: 10284298.08, percent: 27.68 });
    expect(normalizeSummary({}, '2026-09-30', 'x')).toBeNull();
  });

  it('WIB date helpers', () => {
    expect(wibDateString(new Date('2026-10-01T16:59:00.000Z'))).toBe('2026-10-01');
    expect(wibDateString(new Date('2026-10-01T17:01:00.000Z'))).toBe('2026-10-02');
    expect(addDaysIso('2026-10-01', -1)).toBe('2026-09-30');
  });
});

describe('ksei lib — cache-first read path', () => {
  const CACHED_ROW = {
    snapshot_date: '2026-09-30',
    total_value: 37152544.31,
    breakdown_json: JSON.stringify(
      AKSES_JSON.summaryResponse.map(s => ({ type: s.type, amount: s.summaryAmount, percent: s.percent }))
    ),
    fetched_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  };

  it('throws with tokenExpired when no token and no cache', async () => {
    vi.mocked(loadKseiToken).mockReturnValue({ token: null, expired: false });
    await expect(getKseiWithCache()).rejects.toMatchObject({ tokenExpired: true });
  });

  it('serves stale cache without network when token is missing or expired', async () => {
    vi.mocked(loadKseiToken).mockReturnValue({ token: null, expired: true });
    vi.mocked(getLatestKseiSnapshot).mockReturnValue(CACHED_ROW);
    const res = await getKseiWithCache(MIN_REFRESH_INTERVAL_MS, new Date());
    expect(res.stale).toBe(true);
    expect(res.tokenExpired).toBe(true);
    expect(res.total_value).toBe(37152544.31);
    expect(res.error).toContain('kedaluwarsa');
  });

  it('returns fresh cache with no network', async () => {
    vi.mocked(getCachedKseiSnapshot).mockReturnValue(CACHED_ROW);
    const res = await getKseiWithCache(MIN_REFRESH_INTERVAL_MS, new Date());
    expect(res.stale).toBe(false);
    expect(res.refreshed).toBe(false);
    expect(res.snapshot_date).toBe('2026-09-30');
    expect(res.tokenExpired).toBe(false);
  });

  it('refreshes via walk-back and persists when cache is stale', async () => {
    vi.mocked(getCachedKseiSnapshot).mockReturnValue({
      ...CACHED_ROW,
      fetched_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    });
    const fetchImpl = vi.fn(async () => okRes(AKSES_JSON));
    vi.stubGlobal('fetch', fetchImpl);
    try {
      const res = await getKseiWithCache(MIN_REFRESH_INTERVAL_MS, new Date());
      expect(res.refreshed).toBe(true);
      expect(res.stale).toBe(false);
      // mock always succeeds → walk-back stops at today (WIB)
      expect(res.snapshot_date).toBe(wibDateString(new Date()));
      expect(saveKseiSnapshot).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('falls back to latest cache (stale) when AKSes fails entirely', async () => {
    vi.mocked(getLatestKseiSnapshot).mockReturnValue(CACHED_ROW);
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 500 } as Response));
    vi.stubGlobal('fetch', fetchImpl);
    try {
      const res = await getKseiWithCache(MIN_REFRESH_INTERVAL_MS, new Date());
      expect(res.stale).toBe(true);
      expect(res.refreshed).toBe(false);
      expect(res.error).toContain('500');
      expect(res.total_value).toBe(37152544.31);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('throws when nothing is cached and AKSes fails', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 500 } as Response));
    vi.stubGlobal('fetch', fetchImpl);
    try {
      await expect(getKseiWithCache(MIN_REFRESH_INTERVAL_MS, new Date())).rejects.toThrow('500');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
