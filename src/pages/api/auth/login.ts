import type { APIRoute } from 'astro';
import { getUserByUsername, verifyPassword, createSession } from '../../../lib/auth';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { username, password } = await request.json();
    if (!username || !password) {
      return new Response(JSON.stringify({ error: 'Username and password required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const user = getUserByUsername(username);
    if (!user || !verifyPassword(password, user.password_hash)) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { token, expiresAt } = createSession(user.id);

    cookies.set('fin_session', token, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: false, // set true when HTTPS is enabled
      expires: new Date(expiresAt),
    });

    return new Response(JSON.stringify({
      id: user.id,
      username: user.username,
      role: user.role,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
