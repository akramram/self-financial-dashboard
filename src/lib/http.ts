/**
 * Shared HTTP helpers for API routes.
 * Fixes #275: unguarded `request.json()` returned HTTP 500 on empty/malformed bodies.
 */

/** Parse a JSON request body. Returns null on empty, truncated, or malformed JSON. */
export async function parseJsonBody(request: Request): Promise<any> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

/** Standard JSON error response. */
export function jsonError(message: string, status = 400): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** 204 preflight response for API routes that browsers probe with OPTIONS. */
export function jsonPreflight(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Max-Age': '86400',
    },
  });
}
