import type { APIRoute } from 'astro';
import { getRecurringVsDiscretionary } from '../../lib/db';

export const GET: APIRoute = async ({ url }) => {
  try {
    const periodIdParam = url.searchParams.get('period_id');
    const periodId = periodIdParam ? parseInt(periodIdParam, 10) : undefined;

    const data = getRecurringVsDiscretionary(periodId);

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
