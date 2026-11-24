import type { APIRoute } from 'astro';
import { getMonthComparison } from '../../lib/db';

export const GET: APIRoute = async ({ url }) => {
  const periodAIdParam = url.searchParams.get('period_a');
  const periodBIdParam = url.searchParams.get('period_b');
  const monthAParam = url.searchParams.get('month_a');
  const monthBParam = url.searchParams.get('month_b');
  const categoryParam = url.searchParams.get('category');

  const periodAId = periodAIdParam ? parseInt(periodAIdParam, 10) : undefined;
  const periodBId = periodBIdParam ? parseInt(periodBIdParam, 10) : undefined;

  const result = getMonthComparison({
    periodAId: isNaN(periodAId as any) ? undefined : periodAId,
    periodBId: isNaN(periodBId as any) ? undefined : periodBId,
    monthA: monthAParam || undefined,
    monthB: monthBParam || undefined,
    drilldownCategory: categoryParam || undefined,
  });

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
