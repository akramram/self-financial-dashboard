import type { APIRoute } from 'astro';
import { validateSession } from '../../../lib/auth';

export const GET: APIRoute = async ({ cookies }) => {
  const token = cookies.get('fin_session')?.value;
  if (!token) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const user = validateSession(token);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Session expired' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify(user), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
