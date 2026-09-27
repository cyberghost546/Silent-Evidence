// lib/csrf.ts
// CSRF (Cross-Site Request Forgery) protection utilities.
//
// How our CSRF protection works (Double-Submit Cookie pattern):
//   1. The server issues a random CSRF token stored in a non-httpOnly cookie ("csrf_token").
//   2. The frontend reads that cookie and sends it back as a request header ("x-csrf-token").
//   3. The server compares the header value to the cookie value.
//   4. If they don't match, the request is rejected.
//
// Why this works: A malicious site can trigger cross-origin requests but cannot READ the
// csrf_token cookie (same-origin policy) so it can't set the correct header.
//
// Note: Because our auth cookies already use sameSite:'lax', CSRF is already mitigated
// for most state-changing requests (browsers won't send lax cookies on cross-origin POST).
// This library adds an extra layer for defense in depth on sensitive write endpoints.

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';

// Cookie name for the CSRF token (NOT httpOnly so JS can read it)
const CSRF_COOKIE = 'csrf_token';
// Header name the frontend must send the token in
const CSRF_HEADER = 'x-csrf-token';
// Token lifetime — 24 hours
const TOKEN_MAX_AGE = 60 * 60 * 24;

/**
 * generateCsrfToken — creates a new CSRF token and sets it as a cookie.
 * Call this on GET requests for pages with sensitive forms (e.g. settings, account delete).
 * Returns the token so you can pass it to the page as a prop if needed.
 */
export async function generateCsrfToken(): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const c = await cookies();
  c.set(CSRF_COOKIE, token, {
    httpOnly: false, // MUST be readable by JS so the frontend can send it as a header
    path: '/',
    sameSite: 'strict', // strict: only sent on same-origin requests
    secure: process.env.NODE_ENV === 'production',
    maxAge: TOKEN_MAX_AGE,
  });
  return token;
}

/**
 * verifyCsrfToken — validates the CSRF token on a mutating request (POST/PUT/DELETE).
 * Returns true if valid, false if the token is missing or doesn't match the cookie.
 *
 * Usage in an API route:
 *   if (!(await verifyCsrfToken(req))) return forbidden('Invalid CSRF token.');
 */
export async function verifyCsrfToken(req: Request): Promise<boolean> {
  // Read the token the client sent in the header
  const headerToken = req.headers.get(CSRF_HEADER);
  if (!headerToken) return false;

  // Read the token stored in the cookie
  const c = await cookies();
  const cookieToken = c.get(CSRF_COOKIE)?.value;
  if (!cookieToken) return false;

  // Use timing-safe comparison to prevent timing attacks
  // (regular === could leak info about how much of the string matches)
  try {
    return crypto.timingSafeEqual(
      Buffer.from(headerToken, 'utf8'),
      Buffer.from(cookieToken, 'utf8')
    );
  } catch {
    // timingSafeEqual throws if buffers have different lengths — that means mismatch
    return false;
  }
}

/**
 * getCsrfToken — reads the current CSRF token from cookies without generating a new one.
 * Returns null if no token exists yet.
 */
export async function getCsrfToken(): Promise<string | null> {
  const c = await cookies();
  return c.get(CSRF_COOKIE)?.value ?? null;
}
