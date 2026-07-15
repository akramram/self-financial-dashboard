import type { APIRoute } from 'astro';
import { getRecurringCostAnalysis } from '../../lib/db';

export const GET: APIRoute = async () => {
  const result = getRecurringCostAnalysis();
  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' },
  });
};
