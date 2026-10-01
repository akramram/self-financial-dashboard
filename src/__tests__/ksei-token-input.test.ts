import { describe, it, expect } from 'vitest';
import { extractKseiToken, parseKseiCredential, decodeJwtExp } from '../lib/kseiTokenInput';

/** Realistic AKSes-shaped JWT (header starts with eyJ, base64url segments). */
const mkJwt = (payload: Record<string, unknown>) =>
  Buffer.from(JSON.stringify({ alg: 'HS512' })).toString('base64url') +
  '.' +
  Buffer.from(JSON.stringify(payload)).toString('base64url') +
  '.' +
  'c2lnbmF0dXJlLXN0dWZm';

const TOKEN = mkJwt({ exp: 1790851419, isInvestor: '1', sub: 'akram@example.com' });

const CURL = [
  "curl --url 'https://akses.ksei.co.id/service/myportofolio/summary?type\\=\\&tanggal\\=2026-09-30' \\",
  "  -H 'Accept: */*' \\",
  '  -H \'Authorization: Bearer ' + TOKEN + '\' \\',
  '  -b \'JSESSIONID=1715BC6728B5B31B49DD159F12235D5A\' \\',
  "  -H 'Referer: https://akses.ksei.co.id/myportofolio/saldo' \\",
].join('\n');

describe('kseiTokenInput — extractKseiToken', () => {
  it('accepts a raw JWT', () => {
    expect(extractKseiToken(TOKEN)).toBe(TOKEN);
  });

  it('extracts the Bearer token from a full curl command', () => {
    expect(extractKseiToken(CURL)).toBe(TOKEN);
  });

  it('extracts from a bare Authorization header line', () => {
    expect(extractKseiToken('Authorization: Bearer ' + TOKEN)).toBe(TOKEN);
  });

  it('falls back to the first JWT-looking string without an Authorization line', () => {
    expect(extractKseiToken('random noise ' + TOKEN + ' trailing')).toBe(TOKEN);
  });

  it('returns null when there is no JWT in the input', () => {
    expect(extractKseiToken('hello world')).toBeNull();
    expect(extractKseiToken('')).toBeNull();
    expect(extractKseiToken('JSESSIONID=ABC123 only a cookie')).toBeNull();
  });
});

describe('kseiTokenInput — parseKseiCredential', () => {
  it('flags curl-shaped input and a JSESSIONID cookie', () => {
    const cred = parseKseiCredential(CURL);
    expect(cred).not.toBeNull();
    expect(cred!.token).toBe(TOKEN);
    expect(cred!.source).toBe('curl');
    expect(cred!.hasSessionCookie).toBe(true);
  });

  it('flags a bare JWT', () => {
    const cred = parseKseiCredential(TOKEN);
    expect(cred!.source).toBe('jwt');
    expect(cred!.hasSessionCookie).toBe(false);
  });

  it('returns null without a JWT', () => {
    expect(parseKseiCredential('no token here')).toBeNull();
  });
});

describe('kseiTokenInput — decodeJwtExp', () => {
  it('decodes the exp claim', () => {
    expect(decodeJwtExp(TOKEN)).toBe(1790851419);
  });

  it('returns null without an exp claim or on garbage', () => {
    expect(decodeJwtExp(mkJwt({}))).toBeNull();
    expect(decodeJwtExp('garbage')).toBeNull();
  });
});
