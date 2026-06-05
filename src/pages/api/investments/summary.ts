import type { APIRoute } from 'astro';
import { getPortfolioSummary } from '../../../lib/db';

export const GET: APIRoute = async () => {
  const summary = getPortfolioSummary();
  return new Response(JSON.stringify(summary), {
    headers: { 'Content-Type': 'application/json' },
  });
};
