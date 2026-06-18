import type { APIRoute } from 'astro';
import { getCategoryStats } from '../../lib/db';

export const GET: APIRoute = async () => {
  try {
    const stats = getCategoryStats();
    return new Response(JSON.stringify(stats), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
