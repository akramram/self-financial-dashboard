import fs from 'fs';
import path from 'path';

/**
 * Safety-net SQLite backups (online snapshot via better-sqlite3 `db.backup()` —
 * safe while the app is running, unlike raw file copies of a WAL database).
 * Snapshots live in data/backups/ (gitignored); newest MAX_KEEP kept.
 */

export const BACKUP_DIR = path.resolve('./data/backups');
const MAX_KEEP = 10;
// Only files we created — manual CLI backups in the same dir are never pruned/deleted.
const BACKUP_NAME_RE = /^financial-[a-z0-9-]*\d{4}-\d{2}-\d{2}-\d{6}\.db$/;

export interface BackupSource {
  backup(destination: string): Promise<unknown>;
}

export interface BackupMeta {
  name: string;
  size: number;
  created_at: string;
}

export function backupFileName(now: Date, reason?: string): string {
  const p = (n: number) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`;
  const tag = reason ? `-${reason.replace(/[^a-z0-9-]/gi, '').slice(0, 20)}` : '';
  return `financial${tag}-${stamp}.db`;
}

export function listBackups(dir: string = BACKUP_DIR): BackupMeta[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => BACKUP_NAME_RE.test(f))
    .map((f) => {
      const st = fs.statSync(path.join(dir, f));
      return { name: f, size: st.size, created_at: st.mtime.toISOString() };
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

/** Delete the oldest snapshots beyond maxKeep. Only touches files matching our naming scheme. */
export function pruneBackups(dir: string = BACKUP_DIR, maxKeep: number = MAX_KEEP): void {
  for (const b of listBackups(dir).slice(maxKeep)) {
    fs.unlinkSync(path.join(dir, b.name));
  }
}

export async function createBackup(opts: {
  reason?: string;
  now?: Date;
  source?: BackupSource;
  dir?: string;
  maxKeep?: number;
} = {}): Promise<BackupMeta> {
  const { reason, now = new Date(), dir = BACKUP_DIR, maxKeep = MAX_KEEP } = opts;
  // Lazy import keeps this module side-effect-free (tests never open the live DB).
  const source = opts.source ?? (await import('./db')).db;
  fs.mkdirSync(dir, { recursive: true });
  const name = backupFileName(now, reason);
  await source.backup(path.join(dir, name));
  pruneBackups(dir, maxKeep);
  const st = fs.statSync(path.join(dir, name));
  return { name, size: st.size, created_at: st.mtime.toISOString() };
}
