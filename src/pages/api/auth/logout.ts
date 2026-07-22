import type { APIRoute } from 'astro';
import { deleteSession } from '../../../lib/auth';

export const POST: APIRoute = async ({ cookies }) => {
  const token = cookies.get('fin_session')?.value;
  if (token) {
    deleteSession(token);
  }
  cookies.delete('fin_session', { path: '/' });
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
