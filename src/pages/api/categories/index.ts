import type { APIRoute } from 'astro';
import { getCategories, insertCategory, getCategoryByName } from '../../../lib/db';

export const GET: APIRoute = async () => {
  const rows = getCategories();
  return new Response(JSON.stringify(rows), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  if (!body.name || typeof body.name !== 'string') {
    return new Response(JSON.stringify({ error: 'Name is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const existing = getCategoryByName(body.name);
  if (existing) {
    return new Response(JSON.stringify({ error: 'Category already exists' }), {
      status: 409,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const id = insertCategory({
    name: body.name.trim(),
    color: body.color || '#3b82f6',
    monthly_limit: body.monthly_limit != null ? Number(body.monthly_limit) : 0,
  });
  return new Response(JSON.stringify({ id, ...body }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
