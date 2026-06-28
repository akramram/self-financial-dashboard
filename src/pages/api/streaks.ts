import type { APIRoute } from 'astro';
import { getSpendingStreaks } from '../../lib/db';

export const GET: APIRoute = async () => {
  const result = getSpendingStreaks();
  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' },
  });
};
