import type { APIRoute } from 'astro';
import { getTopAmounts } from '../../lib/db';

function formatShort(value: number): string {
  if (value >= 1_000_000_000) return `${trim(value / 1_000_000_000)}B`;
  if (value >= 1_000_000) return `${trim(value / 1_000_000)}M`;
  if (value >= 1_000) return `${trim(value / 1_000)}K`;
  return String(value);
}

function trim(n: number): string {
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

/**
 * GET /api/amount-presets
 *
 * Personalized amount presets for Quick Add — the user's most frequently
 * used exact amounts from recent paid expense transactions.
 * Returns { presets: [{ label, value }] }, possibly empty (caller falls
 * back to static defaults).
 */
export const GET: APIRoute = async () => {
  const rows = getTopAmounts(6, 6);
  return new Response(
    JSON.stringify({
      presets: rows.map((r) => ({ label: formatShort(r.value), value: r.value })),
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
};
