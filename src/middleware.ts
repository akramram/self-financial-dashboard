import { defineMiddleware } from 'astro:middleware';
import { validateSession, cleanExpiredSessions, type User } from './lib/auth';

export interface Locals {
  user?: User;
}

// Public paths that don't require auth
const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/auth/me', '/api/auth/logout'];
const PUBLIC_PREFIXES = ['/sw.js', '/manifest.json', '/favicon.svg', '/icons/', '/_astro/', '/data/'];

export const onRequest = defineMiddleware(async ({ cookies, request, url, locals, redirect }, next) => {
  // Clean expired sessions occasionally (on login page access is a good trigger)
  if (url.pathname === '/login') {
    cleanExpiredSessions();
  }

  // Allow public paths
  if (PUBLIC_PATHS.includes(url.pathname)) {
    return next();
  }
  if (PUBLIC_PREFIXES.some(p => url.pathname.startsWith(p))) {
    return next();
  }

  // Extract session token from cookie
  const token = cookies.get('fin_session')?.value;
  const user = token ? validateSession(token) : null;

  // API routes
  if (url.pathname.startsWith('/api/')) {
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Viewer role: block write operations
    if (user.role === 'viewer' && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    locals.user = user;
    return next();
  }

  // Page routes: redirect to login if not authenticated
  if (!user) {
    return redirect('/login');
  }

  locals.user = user;
  return next();
});
