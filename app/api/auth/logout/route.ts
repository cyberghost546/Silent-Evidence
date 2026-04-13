// app/api/auth/logout/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// This file handles the GET /api/auth/logout endpoint.
// When called, it clears the user's session cookie and redirects them to the
// homepage. After this runs the browser will no longer send a userId cookie,
// so all auth-protected API routes will treat the user as a guest.
// ─────────────────────────────────────────────────────────────────────────────

// Import NextResponse to build redirect responses in Next.js API routes
import { NextResponse } from 'next/server';

// ── GET handler ───────────────────────────────────────────────────────────────
// This function runs whenever a GET request is made to /api/auth/logout.
// No parameters are needed because we only need to clear the cookie.
export async function GET() {
  // Build a redirect response that sends the browser to the homepage ('/').
  // process.env.NEXT_PUBLIC_BASE_URL is read from the .env file (e.g. "https://mysite.com").
  // The ?? fallback 'http://localhost:3000' is used in local development when
  // the environment variable hasn't been set yet.
  const res = NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'));

  // Overwrite the 'userId' cookie with an empty string and set maxAge to 0.
  // maxAge: 0 tells the browser to delete this cookie immediately.
  // path: '/' must match the path the cookie was set on, otherwise the browser
  // won't delete it (a common gotcha with cookie deletion).
  res.cookies.set('userId', '', { maxAge: 0, path: '/' });

  // Return the redirect response — the browser clears the cookie and navigates home
  return res;
}
