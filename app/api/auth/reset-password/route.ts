// app/api/auth/reset-password/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// This file handles the POST /api/auth/reset-password endpoint.
// It accepts a reset token (from the email link) and a new password, then:
//   1. Looks up the token in the database and checks it's valid and unexpired
//   2. Hashes the new password
//   3. Updates the user's password in the database
//   4. Marks the token as used so it can't be replayed
//
// Rate limited to 5 attempts per IP per 15 minutes to prevent token brute-forcing.
// Even though tokens are 256-bit random values (essentially unguessable), the rate
// limit adds a defense-in-depth layer.
// ─────────────────────────────────────────────────────────────────────────────

// Import NextRequest and NextResponse for typed request handling and JSON responses
import { NextRequest, NextResponse } from 'next/server';

// Import z (Zod) to validate the token and new password fields in the request body
import { z } from 'zod';

// Import the Prisma database client to look up the reset token and update the user
import { prisma } from '@/lib/prisma';

// Import bcrypt to hash the new password before storing it
import bcrypt from 'bcryptjs';
import { hashToken } from '@/lib/token';

// Import rate-limiting helpers to count and block excessive reset attempts
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

// Import pre-built error response helpers:
// badRequest      — 400 when the token is invalid/expired or input is wrong
// tooManyRequests — 429 when rate limit is hit
// zodError        — 400 with detailed Zod validation errors
// serverError     — 500 for unexpected failures
import { badRequest, tooManyRequests, zodError, serverError } from '@/lib/apiError';

// ── Zod schema — validates the token and new password fields ──────────────────
const ResetSchema = z.object({
  // The token is a 64-character hex string that was emailed to the user.
  // We just require it to be non-empty here — we'll validate it against the DB below.
  token: z.string().min(1, 'Reset token is required.'),

  // New password rules mirror the registration page rules for consistency.
  // min 8 characters for basic security, max 72 because bcrypt truncates beyond that.
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .max(72, 'Password is too long.'),
});

// ── POST handler ──────────────────────────────────────────────────────────────
// This function runs whenever a POST request is made to /api/auth/reset-password.
// "req" is a NextRequest with URL helpers attached.
export async function POST(req: NextRequest) {
  // ── Rate limiting ──────────────────────────────────────────────────────────
  // Identify the requester's IP address for rate-limit tracking
  const ip = getClientIp(req);

  // Allow at most 5 password reset submissions from the same IP per 15 minutes.
  // This prevents systematic token guessing.
  const rateLimit = await checkRateLimit(ip, 'reset-password', {
    limit: 5, // max 5 attempts before blocking
    windowMs: 15 * 60 * 1000, // 15-minute window in milliseconds
  });

  // If blocked, too many attempts have been made recently — reject the request
  if (rateLimit.blocked) {
    return tooManyRequests('Too many attempts. Please wait 15 minutes and try again.');
  }

  try {
    // ── Input validation ─────────────────────────────────────────────────────
    // Parse the JSON body from the request (expects { token: "...", password: "..." })
    const body = await req.json();

    // Validate both fields against the schema
    const parsed = ResetSchema.safeParse(body);

    // Return field-level errors if either field fails validation
    if (!parsed.success) return zodError(parsed.error);

    // Destructure the validated token and new password
    const { token, password } = parsed.data;

    // ── Validate token ────────────────────────────────────────────────────────
    // Look up the token in the passwordResetToken table.
    // findUnique only returns a result if the token string matches exactly.
    // select: only retrieve the columns we need to keep the query efficient.
    // The DB stores only the hash of the token (see forgot-password), so hash the
    // value from the email link the same way and look it up by that. The raw
    // token never exists in the database.
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token: hashToken(token) },
      select: { id: true, used: true, expiresAt: true, userId: true },
    });

    // Reject the request if:
    // - resetToken is null (token doesn't exist in the DB — never issued or already deleted)
    // - resetToken.used is true (the link was already used once — one-time use only)
    // - resetToken.expiresAt is in the past (the 1-hour window has elapsed)
    if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
      return badRequest('This reset link is invalid or has expired.');
    }

    // ── Update password ───────────────────────────────────────────────────────
    // Hash the new password with bcrypt cost factor 12 before storing it.
    // This is the same cost factor used at registration for consistency.
    const hashed = await bcrypt.hash(password, 12);

    // Update the user's password in the database. Bumping sessionVersion evicts
    // every existing session for this account (see lib/session.ts) — a password
    // reset often means the account was compromised, so any session an attacker
    // holds must be invalidated, not just the password changed.
    await prisma.user.update({
      where: { id: resetToken.userId }, // target the correct user
      data: { password: hashed, sessionVersion: { increment: 1 } },
    });

    // ── Invalidate token ──────────────────────────────────────────────────────
    // Mark this token as used so the same reset link can't be reused.
    // Even if someone intercepts the email, they can't change the password again.
    await prisma.passwordResetToken.update({
      where: { id: resetToken.id }, // target this specific token record
      data: { used: true }, // flag it so future lookups reject it
    });

    // Return 200 with { ok: true } — password was successfully reset
    return NextResponse.json({ ok: true });
  } catch (err) {
    // Log the error server-side for debugging
    console.error('[reset-password]', err);

    // Return a generic 500 — never expose internal details to the caller
    return serverError();
  }
}
