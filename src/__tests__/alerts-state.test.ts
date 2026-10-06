import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * FIN-022 — /api/alerts/state endpoint tests.
 * Route handlers unit-tested with a vi.mock of ../lib/db (repo pattern from
 * api.test.ts) so the real SQLite file is never touched.
 */

const mockGetDismissedAlertKeys = vi.fn(() => [] as string[]);
const mockDismissAlertKeys = vi.fn();
const mockRestoreAlertKeys = vi.fn(() => 0);
const mockGetAlertPrefs = vi.fn(() => ({
  budget_over: true,
  budget_approaching: true,
  anomaly_amount_spike: true,
  anomaly_new_merchant: true,
}));
const mockSetAlertPref = vi.fn((_k: string, v: boolean) => v);

vi.mock('../lib/db', () => ({
  getDismissedAlertKeys: mockGetDismissedAlertKeys,
  dismissAlertKeys: mockDismissAlertKeys,
  restoreAlertKeys: mockRestoreAlertKeys,
  getAlertPrefs: mockGetAlertPrefs,
  setAlertPref: mockSetAlertPref,
}));

function makeRequest(url: string, init?: RequestInit) {
  return new Request(new URL(url, 'http://localhost:4321'), {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

describe('API — /api/alerts/state (FIN-022)', () => {
  let GET: any, POST: any, DELETE: any, PATCH: any, OPTIONS: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockGetDismissedAlertKeys.mockReturnValue([]);
    mockRestoreAlertKeys.mockReturnValue(0);
    const mod = await import('../pages/api/alerts/state');
    GET = mod.GET;
    POST = mod.POST;
    DELETE = mod.DELETE;
    PATCH = mod.PATCH;
    OPTIONS = mod.OPTIONS;
  });

  it('GET returns the dismissed key list and the default-ON prefs map', async () => {
    mockGetDismissedAlertKeys.mockReturnValue(['a:12', '5:Food']);
    const res = await GET({});
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      dismissed: ['a:12', '5:Food'],
      prefs: {
        budget_over: true,
        budget_approaching: true,
        anomaly_amount_spike: true,
        anomaly_new_merchant: true,
      },
    });
  });

  it('POST dismisses a batch of keys', async () => {
    const res = await POST({
      request: makeRequest('/api/alerts/state', {
        method: 'POST',
        body: JSON.stringify({ keys: ['a:1', '5:Food', 'a:1'] }),
      }),
    });
    expect(res.status).toBe(200);
    // Deduped but preserved content; single bulk call (never N posts).
    expect(mockDismissAlertKeys).toHaveBeenCalledTimes(1);
    expect(mockDismissAlertKeys).toHaveBeenCalledWith(['a:1', '5:Food'], undefined);
  });

  it('POST passes an explicit dismissedAt through (migration idempotency)', async () => {
    await POST({
      request: makeRequest('/api/alerts/state', {
        method: 'POST',
        body: JSON.stringify({ keys: ['5:Food'], dismissedAt: '2026-10-01T00:00:00Z' }),
      }),
    });
    expect(mockDismissAlertKeys).toHaveBeenCalledWith(['5:Food'], '2026-10-01T00:00:00Z');
  });

  it('POST rejects invalid bodies (malformed JSON, non-array keys, empty keys)', async () => {
    const malformed = await POST({
      request: makeRequest('/api/alerts/state', { method: 'POST', body: 'not json' }),
    });
    expect(malformed.status).toBe(400);

    const notArray = await POST({
      request: makeRequest('/api/alerts/state', {
        method: 'POST',
        body: JSON.stringify({ keys: 'a:1' }),
      }),
    });
    expect(notArray.status).toBe(400);

    const empty = await POST({
      request: makeRequest('/api/alerts/state', {
        method: 'POST',
        body: JSON.stringify({ keys: [] }),
      }),
    });
    expect(empty.status).toBe(400);
  });

  it('DELETE restores keys and reports the removed count', async () => {
    mockRestoreAlertKeys.mockReturnValue(2);
    const res = await DELETE({
      request: makeRequest('/api/alerts/state', {
        method: 'DELETE',
        body: JSON.stringify({ keys: ['a:1', '5:Food'] }),
      }),
    });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, removed: 2 });
    expect(mockRestoreAlertKeys).toHaveBeenCalledWith(['a:1', '5:Food']);
  });

  it('DELETE rejects invalid bodies', async () => {
    const res = await DELETE({
      request: makeRequest('/api/alerts/state', {
        method: 'DELETE',
        body: JSON.stringify({ keys: [123] }),
      }),
    });
    expect(res.status).toBe(400);
  });

  it('OPTIONS responds 204 with allowed methods', async () => {
    const res = OPTIONS();
    expect(res.status).toBe(204);
  });

  // ── FIN-022 lanjutan (KUR-132 §2): PATCH sets exactly one pref ──

  it('PATCH sets one pref and echoes the persisted value', async () => {
    mockSetAlertPref.mockReturnValue(false);
    const res = await PATCH({
      request: makeRequest('/api/alerts/state', {
        method: 'PATCH',
        body: JSON.stringify({ pref: 'anomaly_new_merchant', enabled: false }),
      }),
    });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      ok: true,
      pref: 'anomaly_new_merchant',
      enabled: false,
    });
    expect(mockSetAlertPref).toHaveBeenCalledWith('anomaly_new_merchant', false);
  });

  it('PATCH rejects unknown pref keys and non-boolean enabled', async () => {
    mockSetAlertPref.mockClear();
    const unknown = await PATCH({
      request: makeRequest('/api/alerts/state', {
        method: 'PATCH',
        body: JSON.stringify({ pref: 'category_outlier', enabled: false }),
      }),
    });
    expect(unknown.status).toBe(400);

    const notBool = await PATCH({
      request: makeRequest('/api/alerts/state', {
        method: 'PATCH',
        body: JSON.stringify({ pref: 'budget_over', enabled: 'yes' }),
      }),
    });
    expect(notBool.status).toBe(400);
    expect(mockSetAlertPref).not.toHaveBeenCalled();
  });

  it('PATCH rejects malformed JSON', async () => {
    const res = await PATCH({
      request: makeRequest('/api/alerts/state', { method: 'PATCH', body: 'nope' }),
    });
    expect(res.status).toBe(400);
  });
});

// ─── DB-layer dismissal semantics (SQL mirrors against an isolated DB) ──────

import { createTestDb, seedPeriod, seedCategory, seedTransaction } from './helpers';
import Database from 'better-sqlite3';

/** Mirror of db.ts getActiveAlertCount with dismissal filtering applied. */
function activeAlertCountWithDismissals(db: Database.Database, periodId: number) {
  const dismissed = new Set(
    (db.prepare('SELECT alert_key FROM alert_state').all() as any[]).map((r) => r.alert_key),
  );
  let count = 0;
  // Anomaly detection is out of scope here (needs stats across periods); the
  // anomaly path is covered by the store/UI tests and db.test.ts mirror. The
  // budget path below mirrors getActiveAlertCount exactly.
  const rows = db
    .prepare(
      `SELECT t.category AS cat, SUM(t.amount) AS total
       FROM transactions t
       WHERE t.period_id = ? AND t.done = 1
         AND t.type IN ('cash', 'credit_expense')
       GROUP BY t.category`,
    )
    .all(periodId) as { cat: string; total: number }[];
  const limits: Record<string, number> = {};
  for (const c of db.prepare('SELECT name, monthly_limit FROM categories').all() as any[]) {
    if (c.monthly_limit > 0) limits[c.name] = c.monthly_limit;
  }
  for (const r of rows) {
    const limit = limits[r.cat];
    if (limit && r.total > limit && !dismissed.has(`${periodId}:${r.cat}`)) count++;
  }
  return count;
}

/** Mirror of the store's key formats. */
const anomalyKey = (id: number) => `a:${id}`;

describe('DB — alert_state persistence (FIN-022)', () => {
  it('dismiss → restore roundtrip is idempotent and key-stable', () => {
    const { db, cleanup } = createTestDb();
    try {
      db.exec(
        'CREATE TABLE IF NOT EXISTS alert_state (alert_key TEXT PRIMARY KEY, dismissed_at TEXT NOT NULL)',
      );
      const dismiss = db.prepare(
        'INSERT INTO alert_state (alert_key, dismissed_at) VALUES (?, ?) ON CONFLICT(alert_key) DO NOTHING',
      );
      dismiss.run('a:1', '2026-10-07T00:00:00Z');
      dismiss.run('a:1', '2026-10-08T00:00:00Z'); // idempotent (older ts wins)
      const restore = db.prepare('DELETE FROM alert_state WHERE alert_key = ?');
      restore.run('a:1');
      restore.run('a:1'); // second restore is a no-op
      const rows = db.prepare('SELECT alert_key FROM alert_state').all();
      expect(rows).toEqual([]);
    } finally {
      cleanup();
    }
  });

  it('budget over-limit alert stops counting once its key is dismissed', () => {
    const { db, cleanup } = createTestDb();
    try {
      db.exec(
        'CREATE TABLE IF NOT EXISTS alert_state (alert_key TEXT PRIMARY KEY, dismissed_at TEXT NOT NULL)',
      );
      const p = seedPeriod(db, 'July 2026');
      seedCategory(db, 'Food', '#ef4444', 500000);
      seedTransaction(db, p.id, { category: 'Food', amount: 600000, type: 'cash', done: 1 });

      expect(activeAlertCountWithDismissals(db, p.id)).toBe(1);

      db.prepare('INSERT INTO alert_state (alert_key, dismissed_at) VALUES (?, ?)').run(
        `${p.id}:Food`,
        '2026-10-07T00:00:00Z',
      );
      expect(activeAlertCountWithDismissals(db, p.id)).toBe(0);
    } finally {
      cleanup();
    }
  });

  it('dismissing one month does not affect another month (per-period keys)', () => {
    const { db, cleanup } = createTestDb();
    try {
      db.exec(
        'CREATE TABLE IF NOT EXISTS alert_state (alert_key TEXT PRIMARY KEY, dismissed_at TEXT NOT NULL)',
      );
      const july = seedPeriod(db, 'July 2026');
      const august = seedPeriod(db, 'August 2026');
      seedCategory(db, 'Food', '#ef4444', 500000);
      seedTransaction(db, july.id, { category: 'Food', amount: 600000, type: 'cash', done: 1 });
      seedTransaction(db, august.id, { category: 'Food', amount: 700000, type: 'cash', done: 1 });

      db.prepare('INSERT INTO alert_state (alert_key, dismissed_at) VALUES (?, ?)').run(
        `${july.id}:Food`,
        '2026-10-07T00:00:00Z',
      );
      expect(activeAlertCountWithDismissals(db, july.id)).toBe(0);
      expect(activeAlertCountWithDismissals(db, august.id)).toBe(1);
    } finally {
      cleanup();
    }
  });

  it('anomaly key format is stable: a:{transaction_id}', () => {
    expect(anomalyKey(42)).toBe('a:42');
  });
});
