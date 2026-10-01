/**
 * Parse a pasted AKSes (KSEI) credential into a bearer token (KUR-40).
 *
 * Accepts either a raw JWT or a full `curl` command copied from the browser
 * devtools ("Copy as cURL" on any /service/myportofolio request). The token
 * is extracted from the `Authorization: Bearer …` header; a JSESSIONID cookie
 * in the input is detected but not required — AKSes authorizes on the bearer
 * token alone.
 */

export interface ParsedKseiCredential {
  token: string;
  /** where the token was found — surfaced for the UI confirmation line */
  source: 'jwt' | 'curl';
  /** JSESSIONID cookie was included in the paste (informational) */
  hasSessionCookie: boolean;
}

/** JWS compact serialization: header.payload.signature, base64url segments. */
const JWT_RE = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/;

/** Unix-seconds `exp` claim of a JWT, or null when absent/unparseable. */
export function decodeJwtExp(token: string): number | null {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8'));
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

/**
 * Extract the bearer token from arbitrary pasted text. Prefers an explicit
 * `Authorization: Bearer <jwt>` pair, falls back to the first JWT-looking
 * string anywhere in the input. Null when the input contains no JWT.
 */
export function extractKseiToken(input: string): string | null {
  const bearer = input.match(/Authorization\s*:\s*Bearer\s+(eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/i);
  const token = bearer?.[1] ?? input.match(JWT_RE)?.[0] ?? null;
  return token ? token.trim() : null;
}

/** Parse a pasted token/curl into a credential, or null when no JWT found. */
export function parseKseiCredential(input: string): ParsedKseiCredential | null {
  const token = extractKseiToken(input);
  if (!token) return null;
  return {
    token,
    source: /^\s*curl/i.test(input) || /Authorization\s*:/i.test(input) ? 'curl' : 'jwt',
    hasSessionCookie: /JSESSIONID\s*=/i.test(input),
  };
}
