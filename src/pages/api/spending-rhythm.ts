import type { APIRoute } from 'astro';
import { getSpendingRhythm } from '../../lib/db';

export const GET: APIRoute = async () => {
  const result = getSpendingRhythm();
  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' },
  });
};
