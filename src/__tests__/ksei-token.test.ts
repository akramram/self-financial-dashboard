import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Real kseiToken module — no mocks. Hermeticity comes from a temp cwd:
// data/ksei.json resolution is process.cwd()-relative, so we chdir into a
// fresh temp dir per test (restored in afterEach).
import { loadKseiToken, isTokenExpired } from '../lib/kseiToken';

const TOKEN_NOT_EXPIRED =
  'aaa.' + Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 86400 })).toString('base64url') + '.bbb';
const TOKEN_EXPIRED =
  'aaa.' + Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 86400 })).toString('base64url') + '.bbb';
const TOKEN_SOON =
  'aaa.' + Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 1800 })).toString('base64url') + '.bbb';

let tmp: string;
const origCwd = process.cwd();

beforeEach(() => {
  delete process.env.KSEI_BEARER_TOKEN;
  tmp = mkdtempSync(join(tmpdir(), 'ksei-token-'));
  process.chdir(tmp);
});

afterEach(() => {
  process.chdir(origCwd);
  rmSync(tmp, { recursive: true, force: true });
  delete process.env.KSEI_BEARER_TOKEN;
  vi.restoreAllMocks();
});

describe('kseiToken — expiry detection', () => {
  it('flags JWTs past exp (minus a 1h safety margin)', () => {
    expect(isTokenExpired(TOKEN_EXPIRED)).toBe(true);
    expect(isTokenExpired(TOKEN_NOT_EXPIRED)).toBe(false);
    expect(isTokenExpired(TOKEN_SOON)).toBe(true); // < 1h margin
    expect(isTokenExpired('garbage')).toBe(false); // unparseable → assume valid
  });
});

describe('kseiToken — resolution order', () => {
  it('prefers KSEI_BEARER_TOKEN env over data/ksei.json', () => {
    mkdirSync(join(tmp, 'data'));
    writeFileSync(join(tmp, 'data', 'ksei.json'), JSON.stringify({ token: 'file-token' }));
    process.env.KSEI_BEARER_TOKEN = 'env-token';
    expect(loadKseiToken().token).toBe('env-token');
    expect(loadKseiToken().expired).toBe(false);
  });

  it('falls back to data/ksei.json when env is unset', () => {
    mkdirSync(join(tmp, 'data'));
    writeFileSync(join(tmp, 'data', 'ksei.json'), JSON.stringify({ token: TOKEN_NOT_EXPIRED }));
    const res = loadKseiToken();
    expect(res.token).toBe(TOKEN_NOT_EXPIRED);
    expect(res.expired).toBe(false);
  });

  it('returns null token when neither env nor file exists', () => {
    expect(loadKseiToken().token).toBeNull();
  });

  it('flags expired token from the file', () => {
    mkdirSync(join(tmp, 'data'));
    writeFileSync(join(tmp, 'data', 'ksei.json'), JSON.stringify({ token: TOKEN_EXPIRED }));
    const res = loadKseiToken();
    expect(res.token).toBe(TOKEN_EXPIRED);
    expect(res.expired).toBe(true);
  });
});
