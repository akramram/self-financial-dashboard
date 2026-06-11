import type { APIRoute } from 'astro';
import { getDailySpending, getDayOfWeekSpending, getTransactionStats, getSpendingVelocity, getTitleSpending } from '../../../lib/db';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const month = url.searchParams.get('month');

  if (!month) {
    return new Response(JSON.stringify({ error: 'month parameter required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const daily = getDailySpending(month);
  const dow = getDayOfWeekSpending();
  const stats = getTransactionStats(month);
  const velocity = getSpendingVelocity(month);
  const titleSpending = getTitleSpending(month);

  return new Response(JSON.stringify({ daily, dow, stats, velocity, titleSpending }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
