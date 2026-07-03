import type { APIRoute } from 'astro';
import { getSavingsRate } from '../../lib/db';

export const GET: APIRoute = async () => {
  const result = getSavingsRate();
  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' },
  });
};
