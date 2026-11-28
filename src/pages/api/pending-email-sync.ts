import type { APIRoute } from 'astro';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { listPendingEmailTx } from '../../lib/db';

/**
 * POST /api/pending-email-sync
 *
 * Manual "Sync email" trigger for the review modal: runs
 * scripts/jenius-email-ingest.py right now instead of waiting for the 5-minute
 * launchd job. Session-authed (middleware), so an admin click can never be
 * confused with the token-gated ingest bridge.
 *
 * The script is idempotent (Message-ID dedup), so hammering the button is safe.
 */
const SCRIPT = 'scripts/jenius-email-ingest.py';
const TIMEOUT_MS = 90_000;

export const POST: APIRoute = async ({ request }) => {
  const scriptPath = resolve(process.cwd(), SCRIPT);

  // Time filter: how far back to scan. 1 = today only, so a quick recheck does
  // not re-read the whole mailbox history.
  const body = await request.json().catch(() => ({} as any));
  const days = Math.min(90, Math.max(1, Number(body?.days) || 7));
  const argv = [scriptPath, '--lookback-days', String(days)];

  const result = await new Promise<{ code: number | null; out: string; err: string; timedOut: boolean }>(
    (done) => {
      const child = spawn('python3', argv, { cwd: process.cwd() });
      let out = '';
      let err = '';
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        child.kill('SIGKILL');
      }, TIMEOUT_MS);

      child.stdout.on('data', (d) => { out += String(d); });
      child.stderr.on('data', (d) => { err += String(d); });
      child.on('close', (code) => {
        clearTimeout(timer);
        done({ code, out, err, timedOut });
      });
      child.on('error', (e) => {
        clearTimeout(timer);
        done({ code: -1, out, err: String(e?.message || e), timedOut });
      });
    }
  );

  const pending = listPendingEmailTx().length;

  if (result.code !== 0) {
    return new Response(
      JSON.stringify({
        ok: false,
        pending,
        days,
        error: result.timedOut
          ? 'Sync timeout (>90s)'
          : result.err.trim() || result.out.trim() || `ingest exited ${result.code}`,
      }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const lastLine = result.out.trim().split('\n').filter(Boolean).pop() || 'sync selesai';
  return new Response(JSON.stringify({ ok: true, pending, days, message: lastLine }), {
    headers: { 'Content-Type': 'application/json' },
  });
};