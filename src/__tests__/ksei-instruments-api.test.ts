import { describe, it, expect, vi, beforeEach } from 'vitest';

// The route module imports lib/db (which opens data/financial.db at import
// time) — mock the shared module so the test never touches real data.
// vi.mock factories are hoisted, so the mock fn lives in vi.hoisted scope.
const { prepareMock, loadKseiTokenMock } = vi.hoisted(() => ({
  prepareMock: vi.fn(),
  loadKseiTokenMock: vi.fn().mockReturnValue({ token: null, expired: false }),
}));
vi.mock('../lib/db', () => ({
  db: { prepare: prepareMock },
}));
vi.mock('../lib/kseiToken', () => ({
  loadKseiToken: loadKseiTokenMock,
}));

import { GET } from '../pages/api/ksei/instruments';

function req(type: string | null): { url: URL } {
  const q = type === null ? '' : `?type=${type}`;
  return { url: new URL(`http://localhost/api/ksei/instruments${q}`) };
}

beforeEach(() => {
  prepareMock.mockReset();
});

describe('GET /api/ksei/instruments (KUR-145)', () => {
  it('400 on missing / invalid type', async () => {
    for (const t of [null, 'KAS', 'OBLIGASI', 'DROP TABLE']) {
      const res = await GET(req(t) as any);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/type/i);
    }
  });

  it('404 when nothing cached for the class + flags tokenExpired', async () => {
    prepareMock.mockReturnValue({ get: () => undefined });
    const res = await GET(req('EKUITAS') as any);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBeTruthy();
    expect(body.tokenExpired).toBe(false);
    // queried the KUR-143 kind name, newest snapshot first
    expect(prepareMock.mock.calls[0][0]).toContain('ksei_detail_snapshots');
  });

  it('200 maps cached raw payload to instruments with stale flag', async () => {
    const fetchedAt = new Date(Date.now() - 2 * 86_400_000).toISOString(); // 2d old → stale
    prepareMock.mockReturnValue({
      get: () => ({
        snapshot_date: '2026-09-30',
        fetched_at: fetchedAt,
        payload_json: JSON.stringify({
          data: [
            { codeBaseSec: 'BBCA', emitenName: 'Bank Central Asia', summaryAmount: 10_550_000, jmlLembar: 200 },
          ],
        }),
      }),
    });
    const res = await GET(req('EKUITAS') as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.snapshot_date).toBe('2026-09-30');
    expect(body.stale).toBe(true);
    expect(body.tokenExpired).toBe(false);
    expect(body.instruments).toEqual([
      { code: 'BBCA', name: 'Bank Central Asia', value: 10_550_000, volume: 200 },
    ]);
  });

  it('corrupt cached payload degrades to empty list, still 200', async () => {
    prepareMock.mockReturnValue({
      get: () => ({
        snapshot_date: '2026-09-30',
        fetched_at: new Date().toISOString(),
        payload_json: '{not json',
      }),
    });
    const res = await GET(req('REKSADANA') as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.instruments).toEqual([]);
  });

  it('503 when the cache table does not exist yet (KUR-143 not deployed)', async () => {
    prepareMock.mockImplementation(() => {
      throw new Error('no such table: ksei_detail_snapshots');
    });
    const res = await GET(req('REKSADANA') as any);
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });
});
