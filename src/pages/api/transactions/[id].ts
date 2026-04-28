import type { APIRoute } from 'astro';
import { updateTransaction, deleteTransaction, getTransactionById } from '../../../lib/db';

export const GET: APIRoute = async ({ params }) => {
  const id = Number(params.id);
  const row = getTransactionById(id);
  if (!row) {
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }
  return new Response(JSON.stringify(row), { headers: { 'Content-Type': 'application/json' } });
};

export const PUT: APIRoute = async ({ params, request }) => {
  const id = Number(params.id);
  const body = await request.json();
  updateTransaction(id, body);
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ params }) => {
  const id = Number(params.id);
  deleteTransaction(id);
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
