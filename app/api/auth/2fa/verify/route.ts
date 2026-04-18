// app/api/auth/2fa/verify/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// This file handles POST /api/auth/2fa/verify — the final step of the 2FA login flow.
//
// When a user with two-factor authentication enabled logs in:
//   1. The /login endpoint sends them a 6-digit code by email and returns 202 + tempUserId.
//   2. The frontend shows a code-entry screen and submits to THIS endpoint.
//   3. This endpoint checks the code against the database, marks it used, and
//      sets the session cookie — completing the login.
//
// Without this step, the user cannot log in even if their password is correct.
// ─────────────────────────────────────────────────────────────────────────────

// Import NextResponse to build JSON HTTP responses in Next.js API routes
import { NextResponse } from 'next/server';

// Import the Prisma database client to look up and update 2FA code records
import { prisma } from '@/lib/prisma';

// Import rate-limiting helpers to block brute-force attempts on the 6-digit code.
// A 6-digit code has only 1,000,000 possibilities — without rate limiting an
// attacker who has the tempUserId can enumerate all codes in seconds.
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { tooManyRequests } from '@/lib/apiError';

// ── POST handler ──────────────────────────────────────────────────────────────
// This function runs whenever a POST request is made to /api/auth/2fa/verify.
// "req" is a standard Web API Request containing the submitted code and user ID.
export async function POST(req: Request) {
  // ── Rate limiting ─────────────────────────────────────────────────────────
  // Allow at most 5 code attempts per IP per 15 minutes.
  // We key on IP alone first so that an attacker cannot bypass this by rotating
  // tempUserIds — all guesses from a single IP are counted together.
  const ip = getClientIp(req);
  const ipLimit = checkRateLimit(ip, '2fa-verify', {
    limit: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
  });
  if (ipLimit.blocked) {
    return tooManyRequests('Too many verification attempts. Please wait 15 minutes and try again.');
  }

  // Parse the JSON body sent by the 2FA verification form.
  // Expected shape: { tempUserId: number, code: string }
  // tempUserId — the user ID returned by the login endpoint in its 202 response
  // code       — the 6-digit code the user received by email
  const { tempUserId, code } = await req.json();

  // Both fields are required — return 400 if either is missing
  if (!tempUserId || !code) {
    return NextResponse.json({ error: 'Missing fields.' }, { status: 400 });
  }

  // Convert tempUserId to a proper integer (it may arrive as a string from JSON)
  const userId = Number(tempUserId);

  // Also rate-limit per user ID so that distributed IPs cannot share the attempt
  // budget against a single victim account (5 attempts per userId per 15 minutes).
  const userLimit = checkRateLimit(String(userId), '2fa-verify-user', {
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });
  if (userLimit.blocked) {
    return tooManyRequests('Too many verification attempts for this account. Please request a new code.');
  }

  // ── Validate the code against the database ────────────────────────────────
  // Look for a TwoFactorCode record that:
  //   - belongs to this specific user (userId match)
  //   - exactly matches the submitted code (String() and .trim() normalize whitespace)
  //   - has NOT been used yet (used: false)
  //   - has NOT expired yet (expiresAt must be in the future: gt = "greater than")
  // findFirst returns the first matching record, or null if none found.
  const record = await prisma.twoFactorCode.findFirst({
    where: {
      userId,                          // must belong to this user
      code: String(code).trim(),       // normalize the submitted code
      used: false,                     // reject already-used codes
      expiresAt: { gt: new Date() },   // reject expired codes (gt = greater than now)
    },
  });

  // If no valid matching record was found — wrong code, expired, or already used
  if (!record) {
    return NextResponse.json({ error: 'Invalid or expired code.' }, { status: 401 });
  }

  // ── Mark the code as used ─────────────────────────────────────────────────
  // Update this specific record to set used: true so it can never be used again.
  // This enforces one-time-use behavior — replaying the same code won't work.
  await prisma.twoFactorCode.update({ where: { id: record.id }, data: { used: true } });

  // ── Complete the login by setting the session cookie ──────────────────────
  // Build the success JSON response
  const res = NextResponse.json({ ok: true });

  // Now that 2FA is verified, set the userId cookie — the user is fully logged in.
  // httpOnly: true   — JavaScript in the browser cannot read this cookie (XSS protection).
  // path: '/'        — the cookie is sent with all requests to the site.
  // sameSite: 'lax'  — CSRF protection while still allowing normal link navigation.
  // secure in production — only transmitted over HTTPS, not plain HTTP.
  // maxAge: 7 days   — the session lasts for one week.
  res.cookies.set('userId', String(userId), {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
  });

  // Return the response — the browser stores the cookie, and the user is now logged in
  return res;
}
