import fs from 'fs';
import path from 'path';
import type { APIRoute } from 'astro';
import { jsonError } from '../../../lib/http';
import { createBackup, listBackups, BACKUP_DIR } from '../../../lib/backup';

// Same shape the lib produces — blocks path traversal before the membership check.
const BACKUP_NAME_RE = /^financial-[a-z0-9-]*\d{4}-\d{2}-\d{2}-\d{6}\.db$/;

async function fileResponse(filePath: string, filename: string): Promise<Response> {
  const data = await fs.promises.readFile(filePath);
  return new Response(data, {
    headers: {
      'Content-Type': 'application/x-sqlite3',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

export const GET: APIRoute = async ({ url }) => {
  const params = url.searchParams;

  if (params.get('list') === '1') {
    return new Response(JSON.stringify({ backups: listBackups() }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const file = params.get('file');
  if (file) {
    if (!BACKUP_NAME_RE.test(file)) return jsonError('Invalid backup name');
    const known = listBackups().find((b) => b.name === file);
    if (!known) return jsonError('Backup not found', 404);
    try {
      return await fileResponse(path.join(BACKUP_DIR, file), file);
    } catch {
      return jsonError('Backup could not be read', 500);
    }
  }

  // Fresh snapshot, then download it.
  try {
    const meta = await createBackup({ reason: 'manual' });
    return await fileResponse(path.join(BACKUP_DIR, meta.name), meta.name);
  } catch (e) {
    return jsonError(`Backup failed: ${e instanceof Error ? e.message : 'unknown error'}`, 500);
  }
};
