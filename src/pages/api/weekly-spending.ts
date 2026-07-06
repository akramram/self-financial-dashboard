import type { APIRoute } from 'astro';
import { db, getWeeklySpending, getActivePeriodId } from '../../lib/db';

export const GET: APIRoute = async ({ url }) => {
  const periodId = url.searchParams.get('period_id');

  if (!periodId) {
    const activeId = getActivePeriodId();
    if (!activeId) {
      return new Response(JSON.stringify({ error: 'No active period' }), { status: 404 });
    }
    const data = getWeeklySpending(activeId);
    return new Response(JSON.stringify(data));
  }

  const pid = parseInt(periodId);
  if (isNaN(pid)) {
    return new Response(JSON.stringify({ error: 'Invalid period_id' }), { status: 400 });
  }

  const data = getWeeklySpending(pid);
  return new Response(JSON.stringify(data));
};
