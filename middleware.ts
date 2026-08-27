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
//
//   3. RATE LIMITING — throttles mutating /api/* calls per client. Doing it here
//      covers all ~162 mutating routes at once, including any added later; the
//      alternative was a limiter call inside each handler, which is 152 chances
//      to forget one. Auth routes keep their stronger Redis-backed limiter too.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  SESSION_COOKIE,
  SESSION_SIG_COOKIE,
  SESSION_VER_COOKIE,
  verifyUserId,
} from '@/lib/sessionCookie';
import { edgeRateLimit, edgeClientIp, isExempt, limitFor, WINDOW_MS } from '@/lib/edgeRateLimit';

// HTTP methods that change state. GETs are deliberately not limited here.
const MUTATING_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

// NOTE: Content-Security-Policy is set statically in next.config.ts, not here.
// A per-request nonce CSP was prototyped (lib/csp.ts) but not shipped: Next.js 16
// + Turbopack does not nonce its own inline bootstrap scripts, so an enforcing
// nonce policy blanks the page. See the CSP comment in next.config.ts.

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Rate limit mutating API calls ───────────────────────────────────────────
  // Runs first, and before any database work: a request that is going to be
  // rejected should cost as little as possible, otherwise the limiter itself
  // becomes the load.
  //
  // Only mutating methods are limited. GETs are cached, cheap, and throttling
  // them breaks ordinary browsing — the goal is to stop someone hammering the
  // endpoints that write, send email, or cost money.
  //
  // This is a second layer, not a replacement: the auth routes keep their
  // Redis-backed limiter from lib/rateLimit.ts, whose counters are shared across
  // instances. This one is per-instance (see the note in lib/edgeRateLimit.ts).
  if (pathname.startsWith('/api') && MUTATING_METHODS.has(request.method) && !isExempt(pathname)) {
    const ip = edgeClientIp(request.headers);
    const limit = limitFor(pathname);

    // Keyed on the endpoint FAMILY (/api/likes), not the full path. Including
    // the id would hand /api/likes/1 and /api/likes/2 separate budgets, letting
    // an attacker sidestep the limit entirely just by varying the parameter.
    const bucket = pathname.split('/').slice(0, 3).join('/');
    const { blocked, retryAfter } = edgeRateLimit(`${ip}:${bucket}`, limit, WINDOW_MS);

    if (blocked) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down and try again shortly.' },
        {
          status: 429,
          // Retry-After tells well-behaved clients exactly when to come back,
          // instead of retrying immediately and compounding the problem.
          headers: { 'Retry-After': String(retryAfter) },
        }
      );
    }
  }

  const rawId = request.cookies.get(SESSION_COOKIE)?.value;
  const sig = request.cookies.get(SESSION_SIG_COOKIE)?.value;
  const ver = request.cookies.get(SESSION_VER_COOKIE)?.value;

  // A session is authentic only if the signature matches the (id, version) we
  // signed. Middleware checks integrity only — whether the version is still
  // current is a database question, enforced in getSessionUser. A session that
  // predates this change has no version cookie, so it fails here and the user is
  // asked to log in again once; that is the expected one-time cost of the upgrade.
  const authenticated = rawId ? await verifyUserId(rawId, sig, ver) : false;

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
        redirect.cookies.delete(SESSION_VER_COOKIE);
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
      .filter(
        (c) =>
          c.name !== SESSION_COOKIE &&
          c.name !== SESSION_SIG_COOKIE &&
          c.name !== SESSION_VER_COOKIE
      );
    const headers = new Headers(request.headers);
    headers.set('cookie', remaining.map((c) => `${c.name}=${c.value}`).join('; '));

    const res = NextResponse.next({ request: { headers } });
    // Also tell the browser to drop the bad cookies.
    res.cookies.delete(SESSION_COOKIE);
    res.cookies.delete(SESSION_SIG_COOKIE);
    res.cookies.delete(SESSION_VER_COOKIE);
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
