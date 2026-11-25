import { describe, it, expect, afterAll } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';
import { backupFileName, createBackup, listBackups } from '../lib/backup';

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'finbak-test-'));

afterAll(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

function makeSourceDb(dir: string, rowTitle: string) {
  const source = new Database(path.join(dir, `src-${rowTitle}.db`));
  source.exec('CREATE TABLE t (id INTEGER PRIMARY KEY, title TEXT)');
  source.prepare('INSERT INTO t (title) VALUES (?)').run(rowTitle);
  return source;
}

describe('db backup helper', () => {
  it('generates traversal-safe local-time filenames with sanitized reason', () => {
    const plain = backupFileName(new Date(2026, 10, 25, 18, 0, 5));
    expect(plain).toBe('financial-2026-11-25-180005.db');

    const evil = backupFileName(new Date(2026, 10, 25, 18, 0, 5), '../../etc/passwd');
    expect(evil).toMatch(/^financial-[a-z0-9-]*\d{4}-\d{2}-\d{2}-\d{6}\.db$/);
    expect(evil).not.toMatch(/[/\\]|\.\./);
  });

  it('creates a restorable snapshot and lists it', async () => {
    const dir = path.join(tmpRoot, 'one');
    const source = makeSourceDb(tmpRoot, 'hello');
    const meta = await createBackup({ source, dir, now: new Date(2026, 10, 25, 18, 0, 0), reason: 'kickoff' });

    expect(meta.name).toBe('financial-kickoff-2026-11-25-180000.db');
    expect(meta.size).toBeGreaterThan(0);

    const restored = new Database(path.join(dir, meta.name), { readonly: true });
    expect(restored.prepare('SELECT title FROM t').get()).toEqual({ title: 'hello' });
    restored.close();
    source.close();

    const listed = listBackups(dir);
    expect(listed).toHaveLength(1);
    expect(listed[0].name).toBe(meta.name);
  });

  it('ignores files that do not match its naming scheme', () => {
    const dir = path.join(tmpRoot, 'one');
    fs.writeFileSync(path.join(dir, 'someone-elses.db'), 'x');
    expect(listBackups(dir).some((b) => b.name === 'someone-elses.db')).toBe(false);
  });

  it('prunes to the newest maxKeep snapshots', async () => {
    const dir = path.join(tmpRoot, 'prune');
    const source = makeSourceDb(tmpRoot, 'prune');
    for (let i = 0; i < 4; i++) {
      await createBackup({ source, dir, now: new Date(2026, 10, 25, 17, 0, i), maxKeep: 2 });
    }
    const left = listBackups(dir);
    expect(left).toHaveLength(2);
    expect(left.map((b) => b.name)).toEqual([
      'financial-2026-11-25-170003.db',
      'financial-2026-11-25-170002.db',
    ]);
    source.close();
  });
});
