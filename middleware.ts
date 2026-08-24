// middleware.ts
// ─────────────────────────────────────────────────────────────────────────────
// Runs on every request (except static assets) and does three jobs:
//
//   1. SESSION INTEGRITY — verifies the HMAC signature on the `userId` cookie.
//      The signature lives in the `userId_sig` cookie (see lib/sessionCookie.ts).
//      If a request presents a `userId` cookie whose signature is missing or
//      invalid — i.e. someone hand-edited the cookie to impersonate an account —
//      we strip both cookies before the request reaches any route handler, so the
//      forged session is seen as anonymous. This is what makes the bare-integer
//      `userId` cookie safe for the ~130 routes that read it directly.
//
//   2. ADMIN GATE — redirects unauthenticated users away from /admin/* to /login
//      without hitting the database. The full DB-level role check still happens in
//      app/admin/layout.tsx; this just short-circuits the round-trip.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE, SESSION_SIG_COOKIE, verifyUserId } from '@/lib/sessionCookie';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const rawId = request.cookies.get(SESSION_COOKIE)?.value;
  const sig = request.cookies.get(SESSION_SIG_COOKIE)?.value;

  // A session is authentic only if the signature matches the id we signed.
  const authenticated = rawId ? await verifyUserId(rawId, sig) : false;

  // A `userId` cookie that fails verification is forged or stale — clear it.
  const forged = !!rawId && !authenticated;

  // ── Admin gate ──────────────────────────────────────────────────────────────
  if (pathname.startsWith('/admin')) {
    if (!authenticated || rawId === '0') {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      // Preserve the intended destination so login can redirect back
      loginUrl.searchParams.set('from', pathname);
      const redirect = NextResponse.redirect(loginUrl);
      if (forged) {
        redirect.cookies.delete(SESSION_COOKIE);
        redirect.cookies.delete(SESSION_SIG_COOKIE);
      }
      return redirect;
    }
  }

  // ── Strip a forged session so downstream route handlers see anonymous ─────────
  if (forged) {
    // Rebuild the Cookie header without the session cookies, and forward it so
    // that `cookies().get('userId')` returns undefined inside route handlers.
    const remaining = request.cookies
      .getAll()
      .filter((c) => c.name !== SESSION_COOKIE && c.name !== SESSION_SIG_COOKIE);
    const headers = new Headers(request.headers);
    headers.set('cookie', remaining.map((c) => `${c.name}=${c.value}`).join('; '));

    const res = NextResponse.next({ request: { headers } });
    // Also tell the browser to drop the bad cookies.
    res.cookies.delete(SESSION_COOKIE);
    res.cookies.delete(SESSION_SIG_COOKIE);
    return res;
  }

  return NextResponse.next();
}

// Run on everything except Next.js internals and static asset files.
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|avif|css|js|txt|xml|woff|woff2|ttf|map)$).*)',
  ],
};
