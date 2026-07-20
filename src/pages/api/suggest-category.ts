import type { APIRoute } from 'astro';
import { suggestCategory } from '../../lib/db';

/**
 * GET /api/suggest-category?q=<title>
 *
 * Suggests a category for a transaction title based on historical data.
 * Returns { category, confidence, match_type, sample_count }.
 *
 * - category: the suggested category name, or null if no reliable suggestion
 * - confidence: 0-1, fraction of historical transactions with this title
 *   that used the suggested category
 * - match_type: 'exact' | 'prefix' | null
 * - sample_count: number of historical transactions considered
 */
export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const q = url.searchParams.get('q');

  if (q === null || q === undefined) {
    return new Response(
      JSON.stringify({ error: 'Missing required query parameter "q"' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const title = q.trim();
  if (!title) {
    return new Response(
      JSON.stringify({
        category: null,
        confidence: 0,
        match_type: null,
        sample_count: 0,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  const suggestion = suggestCategory(title);

  return new Response(JSON.stringify(suggestion), {
    headers: { 'Content-Type': 'application/json' },
  });
};
