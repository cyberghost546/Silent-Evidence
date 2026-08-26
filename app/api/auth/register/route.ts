// app/api/auth/register/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// This file handles the POST /api/auth/register endpoint.
// It validates the submitted username/email/password, checks that neither the
// email nor username is already taken, hashes the password, creates the new
// user record in the database, and then immediately logs them in by setting
// a session cookie — so the user doesn't have to log in separately after signing up.
// Rate limited to 3 registrations per IP per hour to slow mass account creation.
// ─────────────────────────────────────────────────────────────────────────────

// Import NextResponse to build JSON HTTP responses in Next.js API routes
import { NextResponse } from 'next/server';

// Import bcrypt to securely hash passwords before storing them in the database.
// Storing plain-text passwords is extremely dangerous — bcrypt makes them
// computationally expensive to crack even if the database is leaked.
import bcrypt from 'bcryptjs';

// Import z (Zod) for declaring a validation schema and checking the request body
import { z } from 'zod';

// Import the Prisma database client to query and create user records
import { prisma } from '@/lib/prisma';

// Import the cookies() helper to write the session cookie after registration.
// In Next.js App Router, cookies() from 'next/headers' lets you read/write cookies
// directly inside server-side route handlers.
import { cookies } from 'next/headers';

// Import rate-limiting helpers:
// checkRateLimit — counts requests per IP and returns whether the limit is exceeded
// getClientIp    — extracts the visitor's IP address from the request headers
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

// Import pre-built error response helpers for consistent HTTP error responses:
// conflict        — 409 response (e.g. email/username already taken)
// tooManyRequests — 429 response when rate limit is exceeded
// zodError        — 400 response with field-level validation errors from Zod
// serverError     — 500 response for unexpected failures
import { conflict, tooManyRequests, zodError, serverError } from '@/lib/apiError';
import { signSession, SESSION_COOKIE, SESSION_SIG_COOKIE, SESSION_VER_COOKIE } from '@/lib/sessionCookie';

// ── Zod schema — declares validation rules for all registration fields ─────────
// Each field has its own chain of validators that run left-to-right.
// If any rule fails, safeParse() returns a descriptive error message for that field.
const RegisterSchema = z.object({
  // Username: only letters, numbers, and underscores are allowed.
  // Minimum 3 characters (too short = not a real name).
  // Maximum 30 characters (reasonable display limit).
  // .regex() rejects anything with spaces, hyphens, or special characters.
  // .trim() strips leading/trailing whitespace before validation.
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters.')
    .max(30, 'Username must be 30 characters or fewer.')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username may only contain letters, numbers, and underscores.')
    .trim(),

  // Email: must be a real email format; max 254 characters per the RFC 5321 standard.
  // .toLowerCase() and .trim() normalize it before we store or compare it.
  email: z
    .string()
    .min(1, 'Email is required.')
    .max(254, 'Email address is too long.')
    .email('Please enter a valid email address.')
    .toLowerCase()
    .trim(),

  // Password: minimum 8 characters for basic security.
  // Maximum 72 characters — bcrypt silently truncates anything longer than 72 bytes,
  // so capping at 72 prevents users from thinking a longer password is providing
  // more security when bcrypt would actually ignore the extra characters.
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .max(72, 'Password is too long.'),
});

// ── POST handler ──────────────────────────────────────────────────────────────
// This function runs whenever a POST request is made to /api/auth/register.
// "req" is a standard Web API Request object (body, headers, etc.)
export async function POST(req: Request) {

  // ── Rate limiting ──────────────────────────────────────────────────────────
  // Get the client's IP address to track how many registrations they've attempted
  const ip = getClientIp(req);

  // Allow at most 3 new accounts from the same IP in any 1-hour window.
  // 'register' namespaces this counter separately from the login or other limiters.
  const rateLimit = await checkRateLimit(ip, 'register', {
    limit: 3,                  // max 3 registrations per window
    windowMs: 60 * 60 * 1000, // 1-hour window in milliseconds
  });

  // If blocked is true, this IP has already registered 3 accounts this hour
  if (rateLimit.blocked) {
    return tooManyRequests('Too many accounts created. Please wait an hour and try again.');
  }

  try {
    // ── Input validation ─────────────────────────────────────────────────────
    // Read the JSON body that the registration form submitted
    const body = await req.json();

    // Run the body through the RegisterSchema rules.
    // safeParse never throws — it returns a result object instead.
    const parsed = RegisterSchema.safeParse(body);

    // If validation failed, send the Zod error details back to the client
    if (!parsed.success) return zodError(parsed.error);

    // Extract the clean, validated values from the parse result
    const { username, email, password } = parsed.data;

    // ── Duplicate check ───────────────────────────────────────────────────────
    // Search for any existing user that matches EITHER the email OR the username.
    // Using OR avoids two separate database round trips.
    // select: only retrieve the fields we need for the error message (saves bandwidth).
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
      select: { email: true, username: true },
    });

    // If we found a match, figure out which field is duplicated and tell the user.
    // We never reveal details about other accounts — just which field conflicts.
    if (existing) {
      // Compare the found email to what was submitted to determine the conflict
      const field = existing.email === email ? 'Email' : 'Username';
      return conflict(`${field} is already taken.`);
    }

    // ── Create user ───────────────────────────────────────────────────────────
    // Hash the plain-text password using bcrypt with a cost factor of 12.
    // Cost factor 12 means bcrypt runs 2^12 = 4,096 iterations — slow enough to
    // resist brute-force attacks, but fast enough for a single login check.
    const hashed = await bcrypt.hash(password, 12);

    // Insert the new user row into the database.
    // role: 'USER' assigns the default non-admin role.
    const user = await prisma.user.create({
      data: { username, email, password: hashed, role: 'USER' },
    });

    // ── Auto-login: set session cookie ────────────────────────────────────────
    // Immediately log the new user in so they land on the onboarding page,
    // not back on the login page. We write the cookie server-side here.
    const c = await cookies();

    // Write the session cookie containing the new user's database ID.
    // httpOnly: true  — not readable by browser JavaScript (XSS protection).
    // path: '/'       — sent on every request to this site.
    // maxAge: 30 days — cookie persists across browser sessions for a month.
    // sameSite: 'lax' — blocks CSRF while allowing normal link navigation.
    // secure in production — only sent over HTTPS to prevent interception.
    const cookieOpts = {
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days in seconds
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
    };
    // Set the signed session cookies so the session can't be forged. A brand-new
    // account is at sessionVersion 0, and that version is bound into the signature
    // (see lib/sessionCookie.ts) and carried in its own cookie so it can be checked.
    c.set(SESSION_COOKIE, String(user.id), cookieOpts);
    c.set(SESSION_VER_COOKIE, '0', cookieOpts);
    c.set(SESSION_SIG_COOKIE, await signSession(user.id, 0), cookieOpts);

    // Return 201 Created — the registration and auto-login succeeded
    return NextResponse.json({ ok: true }, { status: 201 });

  } catch (err) {
    // Log the unexpected error to the server console for debugging
    console.error('[register]', err);

    // Return a generic 500 — never send internal error details to the client
    return serverError();
  }
}
