/**
 * POST /api/ksei/token — token rotation endpoint (KUR-40 follow-up).
 *
 * The handler imports node:fs/node:path + process.cwd() and other server
 * machinery, so instead of executing it the tests assert on the contract by
 * reading the source (the meaningful, testable extraction/validation logic
 * lives in lib/kseiTokenInput and is covered by ksei-token-input.test.ts).
 * The asserts double as a regression tripwire: refactors that break the
 * documented contract fail here loudly.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const src = readFileSync(join(process.cwd(), 'src/pages/api/ksei/token.ts'), 'utf8');

describe('api/ksei/token — contract', () => {
  it('is admin-only and never blocks a non-admin role', () => {
    expect(src).toMatch(/role\s*!==\s*'admin'/);
    expect(src).toMatch(/403/);
  });

  it('persists to gitignored data/ksei.json (cwd-relative)', () => {
    expect(src).toMatch(/process\.cwd\(\),\s*'data',\s*'ksei\.json'/);
  });

  it('hot-applies the token via process.env (no PM2 restart needed)', () => {
    expect(src).toMatch(/process\.env\.KSEI_BEARER_TOKEN\s*=/);
  });

  it('rejects expired tokens and empty input', () => {
    expect(src).toMatch(/exp \* 1000 <= Date\.now\(\)/);
    expect(src).toMatch(/masih kosong/);
  });

  it('supports refresh=true via getKseiWithCache(0) and reports rotation even when the refresh fails', () => {
    expect(src).toMatch(/getKseiWithCache\(0\)/);
    expect(src).toMatch(/Token tersimpan, tapi refresh AKSes gagal/);
  });

  it('uses cred.token only for validate ×2 + file write + env hot-apply — never in a response payload', () => {
    // decodeJwtExp + isTokenExpired (validation), data/ksei.json write, env hot-apply.
    expect(src.split('cred.token').length - 1).toBe(4);
    expect(src).toContain('process.env.KSEI_BEARER_TOKEN = cred.token;');
  });
});
