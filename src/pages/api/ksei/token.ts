import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';
import { parseKseiCredential, decodeJwtExp } from '../../../lib/kseiTokenInput';
import { isTokenExpired } from '../../../lib/kseiToken';
import { getKseiWithCache } from '../../../lib/ksei';

/**
 * POST /api/ksei/token   (KUR-40)
 *
 * Rotate the AKSes (KSEI) bearer token from the dashboard UI: paste a raw
 * JWT or a full "copy as cURL" command, we extract + validate the JWT,
 * persist it to gitignored data/ksei.json (the same file scripts/
 * rotate-ksei-token.sh manages) and hot-apply it via process.env
 * KSEI_BEARER_TOKEN — no PM2 restart needed. With refresh=true a live AKSes
 * fetch runs immediately; on refresh failure the rotation itself still
 * stands and the error is reported so the user knows the token didn't take.
 *
 * Admin-only (middleware blocks viewers on POST; re-checked here because
 * this endpoint writes a server-side secret). The token value never
 * appears in any response or log line.
 */

const WIB_MS = 7 * 60 * 60 * 1000;

function wibDateString(now = new Date()): string {
  return new Date(now.getTime() + WIB_MS).toISOString().slice(0, 10);
}

function fmtExpiry(expSeconds: number): string {
  return new Date(expSeconds * 1000 + WIB_MS)
    .toISOString()
    .replace('Z', ' WIB')
    .slice(0, 16)
    .replace('T', ' ');
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

export const POST: APIRoute = async ({ request, locals }) => {
  // Defense in depth — middleware already blocks non-admin writes.
  const role = (locals as { user?: { role?: string } } | undefined)?.user?.role;
  if (role !== 'admin') {
    return json({ error: 'Hanya admin yang boleh mengganti token.' }, 403);
  }

  let body: { token?: string; refresh?: boolean } = {};
  try {
    body = (await request.json()) as { token?: string; refresh?: boolean };
  } catch {
    /* empty/invalid body → treated as missing token below */
  }

  const input = (body?.token ?? '').toString();
  if (!input.trim()) {
    return json({ error: 'Token atau curl masih kosong — paste dulu.' }, 400);
  }

  const cred = parseKseiCredential(input);
  if (!cred) {
    return json(
      { error: 'Tidak menemukan JWT di input. Copy baris "Authorization: Bearer eyJ…" dari devtools AKSes.' },
      400
    );
  }

  const exp = decodeJwtExp(cred.token);
  if (exp !== null && exp * 1000 <= Date.now()) {
    return json({ error: 'Token sudah kedaluwarsa — login ulang di akses.ksei.co.id dan ambil yang baru.' }, 400);
  }

  // Sanity: reuse the shared expiry check (1h safety margin) so a token that
  // would immediately be flagged `tokenExpired` is rejected up front.
  if (isTokenExpired(cred.token)) {
    return json({ error: 'Token kedaluwarsa < 1 jam — ambil yang baru supaya tidak langsung kedaluwarsa lagi.' }, 400);
  }

  // 1 — persist to gitignored data/ksei.json (cwd-relative, same file the
  //     rotate script manages, so boot-time env injection keeps working).
  try {
    const file = path.join(process.cwd(), 'data', 'ksei.json');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(
      file,
      JSON.stringify(
        {
          token: cred.token,
          note: 'AKSes (KSEI) Bearer token — rotate from the dashboard KSEI card or scripts/rotate-ksei-token.sh.',
          updated: wibDateString(),
          expires: exp !== null ? fmtExpiry(exp) : 'unknown',
        },
        null,
        2
      ) + '\n'
    );
  } catch (err) {
    return json({ error: `Gagal menulis data/ksei.json: ${err instanceof Error ? err.message : 'unknown'}` }, 500);
  }

  // 2 — hot-apply so the running server uses it without a PM2 restart.
  //     loadKseiToken() prefers the env var, so this wins until the next
  //     boot, where ecosystem.config.cjs re-injects from the file anyway.
  process.env.KSEI_BEARER_TOKEN = cred.token;

  const base = {
    ok: true,
    source: cred.source,
    hasSessionCookie: cred.hasSessionCookie,
    expires: exp !== null ? fmtExpiry(exp) : null,
  };

  // 3 — optional immediate refresh (refresh=true in the JSON body)
  if (body?.refresh) {
    try {
      const snap = await getKseiWithCache(0); // maxAge 0 → force network refresh
      return json({
        ...base,
        refreshed: true,
        snapshot: {
          snapshot_date: snap.snapshot_date,
          total_value: snap.total_value,
          fetched_at: snap.fetched_at,
          stale: snap.stale,
          error: snap.error,
        },
      });
    } catch (err) {
      return json(
        {
          ...base,
          refreshed: false,
          error: `Token tersimpan, tapi refresh AKSes gagal: ${err instanceof Error ? err.message : 'unknown'}`,
        },
        502
      );
    }
  }

  return json({ ...base, refreshed: false });
};
