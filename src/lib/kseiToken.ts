/**
 * AKSes (KSEI) bearer-token handling (KUR-40). Kept in its own module so the
 * fetch/cache logic can mock it cleanly in tests.
 *
 * Resolution order: PM2 env KSEI_BEARER_TOKEN (injected at boot by
 * ecosystem.config.cjs) → gitignored data/ksei.json (written by
 * scripts/rotate-ksei-token.sh).
 */

export interface KseiTokenFile {
  token?: string;
  note?: string;
  updated?: string;
  expires?: string;
}

/** Read gitignored data/ksei.json (relative to cwd). Null when absent/corrupt. */
export function readKseiTokenFile(): KseiTokenFile | null {
  try {
    // Lazy require — keeps this module importable in node test env.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('node:fs') as typeof import('node:fs');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const path = require('node:path') as typeof import('node:path');
    const file = path.join(process.cwd(), 'data', 'ksei.json');
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf8')) as KseiTokenFile;
  } catch {
    return null;
  }
}

/** JWT exp minus a 1h safety margin. Unparseable tokens are assumed valid (AKSes will say otherwise). */
export function isTokenExpired(token: string, now = new Date()): boolean {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8'));
    return typeof payload.exp === 'number' && now.getTime() / 1000 >= payload.exp - 3600;
  } catch {
    return false;
  }
}

/** Resolve the AKSes bearer token + expiry flag. */
export function loadKseiToken(now = new Date()): { token: string | null; expired: boolean } {
  let raw: string | null = process.env.KSEI_BEARER_TOKEN ?? null;
  if (!raw || !raw.trim()) raw = readKseiTokenFile()?.token ?? null;
  const token = raw && raw.trim() ? raw.trim() : null;
  if (!token) return { token: null, expired: false };
  return { token, expired: isTokenExpired(token, now) };
}
