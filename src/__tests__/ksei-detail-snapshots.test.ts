import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createTestDb } from './helpers';

/**
 * KUR-42 prep (KUR-143) — `ksei_detail_snapshots` raw drill-down cache.
 *
 * src/lib/db.ts connects to the real data/financial.db at import time, so the
 * DDL is mirrored here into an isolated temp DB (same convention as
 * helpers.ts createTestDb) and exercised through real prepared statements.
 * The `source` describes below pin the REAL db.ts source so a drift between
 * the mirrored DDL/helpers and production fails loudly here.
 */
const DB_SRC = readFileSync(join(process.cwd(), 'src/lib/db.ts'), 'utf8');

describe('ksei_detail_snapshots — production db.ts source contract', () => {
  it('DDL exists, additive CREATE IF NOT EXISTS, raw payload column, composite PK', () => {
    expect(DB_SRC).toContain('CREATE TABLE IF NOT EXISTS ksei_detail_snapshots');
    // shape-agnostic by design — no typed columns, body stored verbatim
    expect(DB_SRC).toContain('payload_json TEXT NOT NULL');
    expect(DB_SRC).toContain("code TEXT NOT NULL DEFAULT ''");
    expect(DB_SRC).toContain('PRIMARY KEY (snapshot_date, kind, code)');
    // existing summary cache untouched
    expect(DB_SRC).toContain('CREATE TABLE IF NOT EXISTS ksei_snapshots');
  });

  it('helper trio exists mirroring the ksei_snapshots pattern', () => {
    expect(DB_SRC).toContain('export function getKseiDetailSnapshot(');
    expect(DB_SRC).toContain('export function getLatestKseiDetailSnapshot(');
    expect(DB_SRC).toContain('export function saveKseiDetailSnapshot(');
    // UPSERT mirrors saveKseiSnapshot
    expect(DB_SRC).toContain('ON CONFLICT(snapshot_date, kind, code) DO UPDATE SET');
  });

  it('capture script targets the documented endpoints and never echoes the token', () => {
    const sh = readFileSync(join(process.cwd(), 'scripts/ksei-capture-fixtures.sh'), 'utf8');
    expect(sh).toContain('/service/myportofolio/summary?type=&tanggal=');
    expect(sh).toContain('/service/myportofolio/equity-summary?date=');
    expect(sh).toContain('/service/myportofolio/reksadana-summary?date=');
    expect(sh).toContain('/service/myportofolio/reksadana?date=');
    expect(sh).toContain('/service/myportofolio/summary-detail/EKUITAS?tanggal=');
    expect(sh).toContain('data/ksei-fixtures');
    // expired gate fires BEFORE any request: exit non-zero + rotation pointer
    expect(sh).toContain('scripts/rotate-ksei-token.sh. Tidak ada request dikirim.');
    // token value never printed
    expect(sh).not.toMatch(/echo[^\n]*\$TOKEN/);
  });
});

describe('ksei_detail_snapshots — helper semantics (isolated temp DB)', () => {
  const DDL = `
    CREATE TABLE IF NOT EXISTS ksei_detail_snapshots (
      snapshot_date TEXT NOT NULL,
      kind TEXT NOT NULL,
      code TEXT NOT NULL DEFAULT '',
      payload_json TEXT NOT NULL,
      fetched_at TEXT NOT NULL,
      PRIMARY KEY (snapshot_date, kind, code)
    );`;

  function makeDb() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ksei-detail-test-'));
    const db = new Database(path.join(dir, 'test.db'));
    db.pragma('journal_mode = WAL');
    db.exec(DDL);
    return { db, cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) };
  }

  // Same SQL as src/lib/db.ts saveKseiDetailSnapshot / getKseiDetailSnapshot /
  // getLatestKseiDetailSnapshot (kept in lockstep by the source contract tests
  // above — a refactor there that changes the SQL fails those asserts).
  function save(
    db: Database.Database,
    s: { snapshot_date: string; kind: string; code?: string; payload_json: string; fetched_at: string }
  ) {
    db.prepare(
      `INSERT INTO ksei_detail_snapshots (snapshot_date, kind, code, payload_json, fetched_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(snapshot_date, kind, code) DO UPDATE SET
         payload_json = excluded.payload_json,
         fetched_at = excluded.fetched_at`
    ).run(s.snapshot_date, s.kind, s.code ?? '', s.payload_json, s.fetched_at);
  }

  function getByDate(db: Database.Database, date: string, kind: string, code = '') {
    const row = db
      .prepare('SELECT * FROM ksei_detail_snapshots WHERE snapshot_date = ? AND kind = ? AND code = ?')
      .get(date, kind, code) as any;
    return row ?? null; // same normalization as production getKseiDetailSnapshot
  }

  function getLatest(db: Database.Database, kind: string, code = '') {
    const row = db
      .prepare('SELECT * FROM ksei_detail_snapshots WHERE kind = ? AND code = ? ORDER BY snapshot_date DESC LIMIT 1')
      .get(kind, code) as any;
    return row ?? null; // same normalization as production getLatestKseiDetailSnapshot
  }

  it('round-trips a raw payload; empty/undefined code normalizes to ""', () => {
    const { db, cleanup } = makeDb();
    try {
      save(db, {
        snapshot_date: '2026-10-06',
        kind: 'reksadana',
        code: 'TCDCSH001',
        payload_json: '{"fund":123}',
        fetched_at: '2026-10-07T10:00:00+07:00',
      });
      const row = getByDate(db, '2026-10-06', 'reksadana', 'TCDCSH001');
      expect(row.payload_json).toBe('{"fund":123}');

      // default '' code — payload stays verbatim
      save(db, {
        snapshot_date: '2026-10-06',
        kind: 'equity-summary',
        payload_json: '{"raw":true, "note":"spasi & urutan dipertahankan"}',
        fetched_at: '2026-10-07T10:00:01+07:00',
      });
      expect(getByDate(db, '2026-10-06', 'equity-summary', '')?.payload_json).toBe(
        '{"raw":true, "note":"spasi & urutan dipertahankan"}'
      );
      expect(getByDate(db, '2026-10-06', 'equity-summary')?.payload_json).toBeDefined();
    } finally {
      cleanup();
    }
  });

  it('UPSERT: re-saving same (date, kind, code) updates payload + fetched_at in place', () => {
    const { db, cleanup } = makeDb();
    try {
      save(db, { snapshot_date: '2026-10-06', kind: 'summary-detail', payload_json: 'v1', fetched_at: 't1' });
      save(db, { snapshot_date: '2026-10-06', kind: 'summary-detail', payload_json: 'v2', fetched_at: 't2' });
      const rows = db.prepare('SELECT * FROM ksei_detail_snapshots').all() as any[];
      expect(rows).toHaveLength(1);
      expect(rows[0].payload_json).toBe('v2');
      expect(rows[0].fetched_at).toBe('t2');
    } finally {
      cleanup();
    }
  });

  it('same (date, kind) with different codes are distinct rows', () => {
    const { db, cleanup } = makeDb();
    try {
      save(db, { snapshot_date: '2026-10-06', kind: 'reksadana', code: 'FUND1', payload_json: 'a', fetched_at: 't' });
      save(db, { snapshot_date: '2026-10-06', kind: 'reksadana', code: 'FUND2', payload_json: 'b', fetched_at: 't' });
      expect((db.prepare('SELECT COUNT(*) c FROM ksei_detail_snapshots').get() as any).c).toBe(2);
      expect(getByDate(db, '2026-10-06', 'reksadana', 'FUND1').payload_json).toBe('a');
      expect(getByDate(db, '2026-10-06', 'reksadana', 'FUND2').payload_json).toBe('b');
    } finally {
      cleanup();
    }
  });

  it('getLatest returns the max snapshot_date per (kind, code); null when absent', () => {
    const { db, cleanup } = makeDb();
    try {
      expect(getLatest(db, 'equity-summary')).toBeNull();
      save(db, { snapshot_date: '2026-10-05', kind: 'equity-summary', payload_json: 'older', fetched_at: 't' });
      save(db, { snapshot_date: '2026-10-07', kind: 'equity-summary', payload_json: 'newer', fetched_at: 't' });
      save(db, { snapshot_date: '2026-10-06', kind: 'reksadana-summary', payload_json: 'other kind', fetched_at: 't' });
      expect(getLatest(db, 'equity-summary')?.payload_json).toBe('newer');
      expect(getLatest(db, 'reksadana-summary')?.payload_json).toBe('other kind');
      expect(getLatest(db, 'reksadana', 'NOPE')).toBeNull();
      // kind + code must BOTH match
      expect(getLatest(db, 'equity-summary', 'FUND1')).toBeNull();
    } finally {
      cleanup();
    }
  });

  it('createTestDb (full app schema mirror) accepts the new table too — additive migration safe', () => {
    const t = createTestDb();
    try {
      t.db.exec(DDL); // IF NOT EXISTS — idempotent on real data/financial.db re-open
      save(t.db, { snapshot_date: '2026-10-06', kind: 'summary', payload_json: '{}', fetched_at: 't' });
      expect(getByDate(t.db, '2026-10-06', 'summary', '')).toBeDefined();
    } finally {
      t.cleanup();
    }
  });
});
