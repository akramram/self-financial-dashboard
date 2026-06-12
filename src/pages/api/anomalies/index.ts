import type { APIRoute } from 'astro';
import { getAnomalies } from '../../../lib/db';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const month = url.searchParams.get('month');

  if (!month) {
    return new Response(JSON.stringify({ error: 'month parameter required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const anomalies = getAnomalies(month);

  return new Response(JSON.stringify(anomalies), {
    headers: { 'Content-Type': 'application/json' },
  });
};
