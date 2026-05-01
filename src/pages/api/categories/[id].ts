import type { APIRoute } from 'astro';
import { updateCategory, deleteCategory, getCategoryById, getCategoryByName } from '../../../lib/db';

export const GET: APIRoute = async ({ params }) => {
  const id = Number(params.id);
  const row = getCategoryById(id);
  if (!row) {
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }
  return new Response(JSON.stringify(row), { headers: { 'Content-Type': 'application/json' } });
};

export const PUT: APIRoute = async ({ params, request }) => {
  const id = Number(params.id);
  const body = await request.json();
  if (body.name) {
    const existing = getCategoryByName(body.name);
    if (existing && existing.id !== id) {
      return new Response(JSON.stringify({ error: 'Category name already exists' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }
  const update: any = {};
  if (body.name !== undefined) update.name = body.name.trim();
  if (body.color !== undefined) update.color = body.color;
  if (body.monthly_limit !== undefined) update.monthly_limit = Number(body.monthly_limit);
  updateCategory(id, update);
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ params }) => {
  const id = Number(params.id);
  deleteCategory(id);
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
