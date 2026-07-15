import type { APIRoute } from 'astro';
import { getBudgetPace } from '../../lib/db';

export const GET: APIRoute = async ({ url }) => {
  const periodIdParam = url.searchParams.get('period_id');
  const periodId = periodIdParam ? parseInt(periodIdParam, 10) : undefined;

  const result = getBudgetPace(periodId);

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
