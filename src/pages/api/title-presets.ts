import type { APIRoute } from 'astro';
import { getTopTitles } from '../../lib/db';

/**
 * GET /api/title-presets
 *
 * Frequently-used transaction titles (with their most common amount/type/category)
 * for Quick Add title autocomplete + full auto-fill on match.
 * Returns { titles: [{ title, count, amount, type, category, last_used }] }.
 */
export const GET: APIRoute = async () => {
  const rows = getTopTitles(30);
  return new Response(
    JSON.stringify({
      titles: rows.map((r) => ({
        title: r.title,
        count: r.count,
        amount: r.amount,
        type: r.type,
        category: r.category,
        last_used: r.last_used,
      })),
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
};
