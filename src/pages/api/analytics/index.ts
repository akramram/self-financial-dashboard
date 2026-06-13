import type { APIRoute } from 'astro';
import { getDailySpending, getDayOfWeekSpending, getTransactionStats, getSpendingVelocity, getTitleSpending, getPeriodByMonth } from '../../../lib/db';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const month = url.searchParams.get('month');
  const periodIdStr = url.searchParams.get('period_id');

  let periodId: number | null = null;

  if (periodIdStr) {
    periodId = parseInt(periodIdStr, 10);
  } else if (month) {
    const period = getPeriodByMonth(month);
    periodId = period?.id ?? null;
  }

  if (periodId === null || isNaN(periodId)) {
    return new Response(JSON.stringify({ error: 'period_id or month parameter required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const pid: number = periodId;
  const daily = getDailySpending(pid);
  const dow = getDayOfWeekSpending();
  const stats = getTransactionStats(pid);
  const velocity = getSpendingVelocity(pid);
  const titleSpending = getTitleSpending(pid);

  return new Response(JSON.stringify({ daily, dow, stats, velocity, titleSpending }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
