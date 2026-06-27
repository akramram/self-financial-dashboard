import type { APIRoute } from 'astro';
import { getCategoryPeriodMatrix, getCategories } from '../../../lib/db';

export const GET: APIRoute = async () => {
  const matrix = getCategoryPeriodMatrix();
  const categories = getCategories();

  return new Response(JSON.stringify({ matrix, categories }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
