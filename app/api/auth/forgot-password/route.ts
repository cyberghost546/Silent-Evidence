// app/api/auth/forgot-password/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// This file handles the POST /api/auth/forgot-password endpoint.
// It accepts an email address and, if that email belongs to a registered user:
//   1. Invalidates any existing password reset tokens for that user
//   2. Generates a new cryptographically secure random reset token
//   3. Saves the token to the database with a 1-hour expiry
//   4. Sends a password reset link to the user's email address
//
// IMPORTANT: The endpoint always returns 200 even if the email isn't registered.
// This prevents "user enumeration" attacks where an attacker could discover
// which email addresses have accounts by checking which ones return errors.
//
// Rate limited to 3 requests per IP per hour to prevent inbox-bombing.
// ─────────────────────────────────────────────────────────────────────────────

// Import NextRequest (typed request with helpers) and NextResponse (JSON/redirect builder)
import { NextRequest, NextResponse } from 'next/server';

// Import z (Zod) for validating the submitted email address
import { z } from 'zod';

// Import the Prisma database client to query users and manage reset tokens
import { prisma } from '@/lib/prisma';

// Import sendMail to deliver the reset link to the user's inbox
import { sendMail } from '@/lib/mailer';

// Import rate-limiting helpers:
// checkRateLimit — counts requests per IP within a time window
// getClientIp    — extracts the visitor's real IP from request headers
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

// Import pre-built error response helpers for consistent HTTP error responses:
// tooManyRequests — 429 when rate limit is exceeded
// zodError        — 400 with Zod validation details
// serverError     — 500 for unexpected server failures
import { tooManyRequests, zodError, serverError } from '@/lib/apiError';

// Import the Node.js crypto module to generate cryptographically secure random tokens.
// Math.random() is NOT cryptographically secure — crypto.randomBytes() is.
import crypto from 'crypto';
import { hashToken } from '@/lib/token';

// The base URL of the site — used to build the password reset link in the email.
// Falls back through two environment variables before defaulting to the production URL.
const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_BASE_URL ??
  'https://silentevidence.com';

// How long (in milliseconds) a reset token remains valid: 1 hour = 3,600,000 ms
const EXPIRES_IN_MS = 60 * 60 * 1000;

// ── Zod schema — validates the email field in the request body ─────────────────
const ForgotSchema = z.object({
  // Email must be a valid format; normalized to lowercase + trimmed to avoid
  // mismatches between "User@Example.com" and "user@example.com"
  email: z.string().min(1, 'Email is required').email('Invalid email address').toLowerCase().trim(),
});

// ── POST handler ──────────────────────────────────────────────────────────────
// This function runs whenever a POST request is made to /api/auth/forgot-password.
// "req" is a NextRequest which extends the standard Request with URL helpers.
export async function POST(req: NextRequest) {
  // ── Rate limiting ──────────────────────────────────────────────────────────
  // Identify the requester's IP address for rate-limit tracking
  const ip = getClientIp(req);

  // Allow at most 3 reset email requests from the same IP per hour.
  // Without this, an attacker could spam someone's inbox with reset emails.
  const rateLimit = await checkRateLimit(ip, 'forgot-password', {
    limit: 3, // max 3 requests before blocking
    windowMs: 60 * 60 * 1000, // 1-hour window in milliseconds
  });

  // If blocked, this IP has already sent 3 requests this hour — reject
  if (rateLimit.blocked) {
    return tooManyRequests('Too many password reset requests. Please wait an hour and try again.');
  }

  try {
    // ── Input validation ─────────────────────────────────────────────────────
    // Read the JSON body from the request (expects { email: "..." })
    const body = await req.json();

    // Validate the email field using the Zod schema
    const parsed = ForgotSchema.safeParse(body);

    // If the email is missing or invalid format, return 400 with the error details
    if (!parsed.success) return zodError(parsed.error);

    // Extract the normalized email from the validated data
    const { email } = parsed.data;

    // ── Look up user ──────────────────────────────────────────────────────────
    // Search the database for a user with this email address.
    // select: only retrieve the fields we actually need (id and username)
    // to avoid pulling unnecessary data from the database.
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, username: true },
    });

    // Only generate and send a token if the user actually exists.
    // If they don't exist, we skip this entire block silently.
    if (user) {
      // Invalidate all existing unused reset tokens for this user.
      // This ensures only one valid reset link exists at any time —
      // if the user clicks "forgot password" twice, only the latest link works.
      await prisma.passwordResetToken.updateMany({
        where: { userId: user.id, used: false }, // target only un-used tokens
        data: { used: true }, // mark them all as used/expired
      });

      // Generate a cryptographically secure random token.
      // crypto.randomBytes(32) produces 32 random bytes (256 bits of entropy).
      // .toString('hex') converts those bytes to a 64-character hex string.
      // This is impossible to guess — the search space is 2^256.
      const token = crypto.randomBytes(32).toString('hex');

      // Calculate when this token should expire (1 hour from now)
      const expiresAt = new Date(Date.now() + EXPIRES_IN_MS);

      // Store only the HASH of the token, never the token itself. The raw token
      // goes out in the email link below and is hashed again on the way back in
      // reset-password. This way a database leak yields no usable reset tokens —
      // an attacker with the stored hash cannot reverse it to the emailed value.
      await prisma.passwordResetToken.create({
        data: { token: hashToken(token), expiresAt, userId: user.id },
      });

      // Build the full reset URL that will be included in the email.
      // The token is appended as a query parameter so the reset page can read it.
      const resetUrl = `${BASE_URL}/reset-password?token=${token}`;

      // Send the reset email with a styled HTML button linking to the reset URL.
      // await here ensures we wait for the email to be queued before responding.
      await sendMail({
        to: email, // recipient email address
        subject: 'Reset your Silent Evidence password',
        // Inline-styled HTML email compatible with most email clients
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #f3f4f6; background: #111827; padding: 32px; border-radius: 12px;">
            <h1 style="color: #ef4444; font-size: 22px; margin-bottom: 8px;">Password Reset</h1>
            <p style="color: #9ca3af; margin-bottom: 24px;">Hi ${user.username}, click the button below to reset your password. This link expires in 1 hour.</p>
            <a href="${resetUrl}" style="display: inline-block; background: #22c55e; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Reset Password</a>
            <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">If you didn't request this, you can safely ignore this email.</p>
            <p style="color: #374151; font-size: 11px; margin-top: 8px;">${resetUrl}</p>
          </div>
        `,
      });
    }

    // Always return { ok: true } regardless of whether the email existed.
    // This prevents an attacker from using the response to enumerate valid emails.
    return NextResponse.json({ ok: true });
  } catch (err) {
    // Log the error server-side for debugging without exposing it to the caller
    console.error('[forgot-password]', err);

    // Return a generic 500 error response
    return serverError();
  }
}
