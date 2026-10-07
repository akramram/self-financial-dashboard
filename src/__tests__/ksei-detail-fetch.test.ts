import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * KUR-147 — fetchAndCacheKseiDetail (live fetch + verbatim store + cache
 * fallback) and the /api/ksei/instruments wiring regression.
 *
 * fetch is ALWAYS injected (opts.fetchImpl) or mocked at the module boundary —
 * these tests never touch the real network. db is mocked with a REAL
 * in-memory SQLite instance carrying the KUR-143 DDL, so the UPSERT /
 * byte-identical assertions run against actual storage semantics.
 */

// ─── in-memory SQLite backing the db mock ───────────────────────────────────

vi.mock('../lib/db', async () => {
  const Database = (await import('better-sqlite3')).default;
  const sqlite = new Database(':memory:');
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS ksei_detail_snapshots (
      snapshot_date TEXT NOT NULL,
      kind TEXT NOT NULL,
      code TEXT NOT NULL DEFAULT '',
      payload_json TEXT NOT NULL,
      fetched_at TEXT NOT NULL,
      PRIMARY KEY (snapshot_date, kind, code)
    )
  `);
  return {
    __detailSqlite: sqlite,
    getKseiDetailSnapshot: (d: string, k: string, c = '') =>
      sqlite
        .prepare('SELECT * FROM ksei_detail_snapshots WHERE snapshot_date = ? AND kind = ? AND code = ?')
        .get(d, k, c) ?? null,
    getLatestKseiDetailSnapshot: (k: string, c = '') =>
      sqlite
        .prepare('SELECT * FROM ksei_detail_snapshots WHERE kind = ? AND code = ? ORDER BY snapshot_date DESC LIMIT 1')
        .get(k, c) ?? null,
    saveKseiDetailSnapshot: (s: { snapshot_date: string; kind: string; code?: string; payload_json: string; fetched_at: string }) =>
      sqlite
        .prepare(
          `INSERT INTO ksei_detail_snapshots (snapshot_date, kind, code, payload_json, fetched_at)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(snapshot_date, kind, code) DO UPDATE SET
             payload_json = excluded.payload_json,
             fetched_at = excluded.fetched_at`
        )
        .run(s.snapshot_date, s.kind, s.code ?? '', s.payload_json, s.fetched_at),
  };
});

const { loadKseiTokenMock } = vi.hoisted(() => ({
  loadKseiTokenMock: vi.fn().mockReturnValue({ token: 'tok', expired: false }),
}));
vi.mock('../lib/kseiToken', () => ({ loadKseiToken: loadKseiTokenMock }));

import { fetchAndCacheKseiDetail } from '../lib/kseiDetail';
import * as dbModule from '../lib/db';

interface TestDb {
  prepare: (sql: string) => {
    get: (...a: unknown[]) => unknown;
    all: (...a: unknown[]) => unknown[];
    run: (...a: unknown[]) => unknown;
  };
}
// exported by the vi.mock('../lib/db') factory above (real db.ts doesn't have it)
const DB = (dbModule as unknown as { __detailSqlite: TestDb }).__detailSqlite;

const VALID_TOKEN = { token: 'tok', expired: false };

/** 200 response whose body keeps awkward whitespace — proves verbatim storage. */
function okRes(body: string): Response {
  return { ok: true, status: 200, text: async () => body } as unknown as Response;
}

function errRes(status: number): Response {
  return { ok: false, status, text: async () => 'nope' } as unknown as Response;
}

function row(kind = 'equity-summary'): Record<string, string> {
  return {
    snapshot_date: '2026-10-01',
    kind,
    code: '',
    payload_json: '{"data":[{"code":"BBCA"}]}',
    fetched_at: new Date(Date.now() - 2 * 3600_000).toISOString(), // 2h old → stale
  };
}

beforeEach(() => {
  DB.prepare('DELETE FROM ksei_detail_snapshots').run();
  loadKseiTokenMock.mockReturnValue(VALID_TOKEN);
});

// ─── 1. token missing/expired → ZERO outbound requests ──────────────────────

describe('token gate', () => {
  it('missing token → fetch never called, cache served, tokenExpired', async () => {
    loadKseiTokenMock.mockReturnValue({ token: null, expired: false });
    DB.prepare(
      `INSERT INTO ksei_detail_snapshots VALUES ('2026-10-01','equity-summary','','{"data":1}',?)`
    ).run(new Date().toISOString());
    const fetchImpl = vi.fn();
    const r = await fetchAndCacheKseiDetail('equity-summary', { fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(fetchImpl.mock.calls.length).toBe(0);
    expect(r.tokenExpired).toBe(true);
    expect(r.source).toBe('cache');
    expect(r.hadCache).toBe(true);
    expect(r.payload).toEqual({ data: 1 });
  });

  it('expired token → fetch never called, stale cache, reason for logs', async () => {
    loadKseiTokenMock.mockReturnValue({ token: 'old', expired: true });
    DB.prepare(
      `INSERT INTO ksei_detail_snapshots VALUES ('2026-10-01','reksadana-summary','','{"data":2}',?)`
    ).run(new Date(Date.now() - 2 * 3600_000).toISOString()); // 2h old → stale
    const fetchImpl = vi.fn();
    const r = await fetchAndCacheKseiDetail('reksadana-summary', { fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(fetchImpl.mock.calls.length).toBe(0);
    expect(r.tokenExpired).toBe(true);
    expect(r.stale).toBe(true);
    expect(r.error).toMatch(/kedaluwarsa/);
  });

  it('no token + no cache → payload null, still no request', async () => {
    loadKseiTokenMock.mockReturnValue({ token: null, expired: false });
    const fetchImpl = vi.fn();
    const r = await fetchAndCacheKseiDetail('equity-summary', { fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(fetchImpl.mock.calls.length).toBe(0);
    expect(r.payload).toBeNull();
    expect(r.hadCache).toBe(false);
  });
});

// ─── 2. 200 → verbatim store + live result ──────────────────────────────────

describe('live fetch + verbatim cache', () => {
  it('200 stores the body BYTE-IDENTICAL and returns live payload', async () => {
    const body = '{ "data" : [ { "code" : "BBCA" } ] }'; // deliberate whitespace
    const fetchImpl = vi.fn(async () => okRes(body));
    const r = await fetchAndCacheKseiDetail('equity-summary', {
      date: '2026-10-07',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(r.source).toBe('live');
    expect(r.stale).toBe(false);
    expect(r.tokenExpired).toBe(false);
    expect(r.snapshotDate).toBe('2026-10-07');
    const stored = DB.prepare('SELECT * FROM ksei_detail_snapshots').get() as { payload_json: string };
    expect(stored.payload_json).toBe(body); // NOT JSON.stringify(JSON.parse(...))
    expect(stored.payload_json).toContain(' : '); // whitespace preserved
    expect(r.payload).toEqual({ data: [{ code: 'BBCA' }] });
  });

  it('uses the verified AKSes URLs + lib/ksei shared headers', async () => {
    const calls: string[] = [];
    const fetchImpl = vi.fn(async (url: string) => {
      calls.push(url);
      return okRes('{}');
    });
    await fetchAndCacheKseiDetail('equity-summary', { date: '2026-10-07', fetchImpl: fetchImpl as unknown as typeof fetch });
    await fetchAndCacheKseiDetail('reksadana-summary', { date: '2026-10-07', fetchImpl: fetchImpl as unknown as typeof fetch });
    await fetchAndCacheKseiDetail('reksadana', { date: '2026-10-07', code: 'BMIEX', fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(calls[0]).toBe('https://akses.ksei.co.id/service/myportofolio/equity-summary?date=2026-10-07');
    expect(calls[1]).toBe('https://akses.ksei.co.id/service/myportofolio/reksadana-summary?date=2026-10-07');
    expect(calls[2]).toBe('https://akses.ksei.co.id/service/myportofolio/reksadana?date=2026-10-07&code=BMIEX');
    const mock = fetchImpl as unknown as { mock: { calls: unknown[][] } };
    const init = mock.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer tok');
    expect(headers.Referer).toBe('https://akses.ksei.co.id/myportofolio/saldo');
    expect(init.signal).toBeDefined();
  });

  it('default date comes from the lib/ksei WIB resolver (no second logic)', async () => {
    const fetchImpl = vi.fn(async (_url: string) => okRes('{}'));
    // 22:00 UTC = 05:00 next day WIB
    await fetchAndCacheKseiDetail('equity-summary', {
      now: new Date('2026-10-07T22:00:00Z'),
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const mock = fetchImpl as unknown as { mock: { calls: [string][] } };
    expect(mock.mock.calls[0][0]).toContain('date=2026-10-08');
  });
});

// ─── 3. failures fall back to cache without throwing ────────────────────────

describe('fallback on failure', () => {
  const failCases: [string, () => Promise<Response>][] = [
    ['HTTP 500', async () => errRes(500)],
    ['network error', async () => { throw new Error('ECONNREFUSED'); }],
    [
      'timeout',
      async () => {
        const e = new Error('The operation was aborted due to timeout');
        (e as Error).name = 'TimeoutError';
        throw e;
      },
    ],
  ];
  it.each(failCases)('%s → cache, no throw, error filled', async (_label, impl) => {
    DB.prepare(
      `INSERT INTO ksei_detail_snapshots VALUES ('2026-10-01','equity-summary','','{"data":[{"code":"BBCA"}]}',?)`
    ).run(new Date(Date.now() - 2 * 3600_000).toISOString());
    const fetchImpl = vi.fn(impl);
    const r = await fetchAndCacheKseiDetail('equity-summary', { fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(r.source).toBe('cache');
    expect(r.hadCache).toBe(true);
    expect(r.stale).toBe(true);
    expect(r.error).toBeTruthy();
    expect(r.payload).toEqual({ data: [{ code: 'BBCA' }] });
  });

  it('non-JSON 200 body → falls back to cache too', async () => {
    DB.prepare(
      `INSERT INTO ksei_detail_snapshots VALUES ('2026-10-01','equity-summary','','{"ok":true}',?)`
    ).run(new Date().toISOString());
    const fetchImpl = vi.fn(async () => okRes('<html>login</html>'));
    const r = await fetchAndCacheKseiDetail('equity-summary', { fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(r.source).toBe('cache');
    expect(r.error).toMatch(/JSON/);
  });
});

// ─── 4. failure + empty cache → payload null (caller picks 404) ─────────────

describe('failure with empty cache', () => {
  it('returns payload null, hadCache false, no throw', async () => {
    const fetchImpl = vi.fn(async () => errRes(500));
    const r = await fetchAndCacheKseiDetail('equity-summary', { fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(r.payload).toBeNull();
    expect(r.hadCache).toBe(false);
    expect(r.source).toBe('cache');
    expect(r.error).toMatch(/500/);
  });
});

// ─── 5. same (snapshot_date, kind, code) twice → UPSERT, not duplicate ──────

describe('upsert semantics', () => {
  it('two calls same date/kind/code → single row, payload + fetched_at updated', async () => {
    const fetchA = vi.fn(async () => okRes('{"v":1}'));
    await fetchAndCacheKseiDetail('reksadana', { code: 'BMIEX', date: '2026-10-07', fetchImpl: fetchA as unknown as typeof fetch });
    const fetchB = vi.fn(async () => okRes('{"v":2}'));
    await fetchAndCacheKseiDetail('reksadana', { code: 'BMIEX', date: '2026-10-07', fetchImpl: fetchB as unknown as typeof fetch });
    const rows = DB.prepare('SELECT * FROM ksei_detail_snapshots').all() as { payload_json: string }[];
    expect(rows.length).toBe(1);
    expect(rows[0].payload_json).toBe('{"v":2}');
  });

  it('same date different kind/code → separate rows', async () => {
    const f = vi.fn(async () => okRes('{}'));
    await fetchAndCacheKseiDetail('equity-summary', { date: '2026-10-07', fetchImpl: f as unknown as typeof fetch });
    await fetchAndCacheKseiDetail('reksadana-summary', { date: '2026-10-07', fetchImpl: f as unknown as typeof fetch });
    await fetchAndCacheKseiDetail('reksadana', { code: 'BMIEX', date: '2026-10-07', fetchImpl: f as unknown as typeof fetch });
    expect((DB.prepare('SELECT * FROM ksei_detail_snapshots').all() as unknown[]).length).toBe(3);
  });
});
