// app/api/auth/login/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// This file handles the POST /api/auth/login endpoint.
// It accepts an email + password, verifies them against the database, and either:
//   - Sets a secure session cookie so the user is logged in, OR
//   - Triggers a 2FA flow if the user has two-factor authentication enabled.
// Rate limiting prevents automated password-guessing (brute-force) attacks.
// ─────────────────────────────────────────────────────────────────────────────

// Import NextResponse to build JSON HTTP responses in Next.js API routes
import { NextResponse } from 'next/server';

// Import bcrypt for comparing the submitted password against the stored hash
import bcrypt from 'bcryptjs';

// Import z (Zod) for validating and sanitizing the request body fields
import { z } from 'zod';

// Import the Prisma database client to query the users table
import { prisma } from '@/lib/prisma';

// Import sendMail to deliver the 2FA code to the user's email inbox
import { sendMail } from '@/lib/mailer';

// Import rate-limiting helpers:
// checkRateLimit  — checks if an IP has exceeded the allowed request count
// getClientIp     — extracts the real IP address from the incoming request
import { checkRateLimit, getClientIp, anonymizeIp } from '@/lib/rateLimit';

// Import pre-built error response helpers to keep error responses consistent:
// badRequest      — 400 response
// unauthorized    — 401 response
// tooManyRequests — 429 response
// zodError        — 400 response with Zod validation error details
// serverError     — 500 response for unexpected failures
import { badRequest, unauthorized, tooManyRequests, zodError, serverError } from '@/lib/apiError';
import { lookupGeoIp } from '@/lib/geoip';
import { onFailedLogin, onSuccessfulLogin, isAccountLocked } from '@/lib/securityMonitor';
import { setSessionCookies } from '@/lib/sessionCookie';

// ── Zod schema — validates and sanitizes the request body ─────────────────────
// z.object() defines an object shape with typed fields; safeParse() will check
// the submitted data against these rules without throwing on failure.
const LoginSchema = z.object({
  // Email must be a valid email format; .toLowerCase() and .trim() normalize it
  // before we look it up in the database (avoids case-sensitivity mismatches)
  email: z.string().min(1, 'Email is required').email('Invalid email address').toLowerCase().trim(),

  // Password just needs to be present — we never reveal complexity rules at login
  // because that helps attackers know what kinds of passwords to guess
  password: z.string().min(1, 'Password is required'),
});

// ── Helper: generate a random 6-digit numeric code for 2FA emails ─────────────
// Math.random() produces a float in [0, 1).
// Multiplying by 900000 gives a range of [0, 900000).
// Adding 100000 shifts the range to [100000, 1000000) — always 6 digits.
// Math.floor() removes the decimal, .toString() turns it into a string.
function gen6() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ── POST handler ──────────────────────────────────────────────────────────────
// This function runs whenever a POST request is made to /api/auth/login.
// "req" is a standard Web API Request object containing headers, body, etc.
export async function POST(req: Request) {
  // ── Rate limiting ──────────────────────────────────────────────────────────
  // Identify the client's IP address so we can track how many attempts they've made.
  // Some proxies put the real IP in X-Forwarded-For; getClientIp handles that.
  const ip = getClientIp(req);

  // Check whether this IP has exceeded 5 login attempts in the last 15 minutes.
  // The second argument 'login' namespaces this counter separately from other endpoints.
  const rateLimit = await checkRateLimit(ip, 'login', {
    limit: 5, // maximum allowed attempts before blocking
    windowMs: 15 * 60 * 1000, // 15-minute sliding window (in milliseconds)
  });

  // If blocked is true, this IP has made too many attempts — reject the request
  if (rateLimit.blocked) {
    return tooManyRequests('Too many login attempts. Please wait 15 minutes and try again.');
  }

  try {
    // ── Input validation ─────────────────────────────────────────────────────
    // Parse the JSON body sent by the client (e.g. { email: "...", password: "..." })
    const body = await req.json();

    // Run the body through the Zod schema.
    // safeParse returns { success: true, data: ... } or { success: false, error: ... }
    // rather than throwing an exception.
    const parsed = LoginSchema.safeParse(body);

    // If any field fails validation, return a 400 with the specific error messages
    if (!parsed.success) return zodError(parsed.error);

    // Destructure the validated, normalized fields from the parsed result
    const { email, password } = parsed.data;

    // ── Auth check ────────────────────────────────────────────────────────────
    // Query the database for a user whose email matches the submitted address.
    // findUnique returns null if no match is found.
    const user = await prisma.user.findUnique({ where: { email } });

    // If the user doesn't exist, OR if bcrypt.compare returns false (wrong password),
    // return a generic 401 error — we intentionally don't say whether the email
    // or the password was wrong, to avoid helping attackers enumerate accounts.
    if (!user || !(await bcrypt.compare(password, user.password))) {
      // Record the failed attempt — geo-lookup runs in parallel, never blocks response
      lookupGeoIp(ip)
        .then((geo) =>
          prisma.loginLog.create({
            data: {
              userId: user?.id ?? null,
              username: user?.username ?? null,
              email,
              ip: anonymizeIp(ip),
              userAgent: req.headers.get('user-agent') ?? null,
              success: false,
              country: geo?.country ?? null,
              city: geo?.city ?? null,
              lat: geo?.lat ?? null,
              lng: geo?.lng ?? null,
            },
          })
        )
        .catch(() => {});

      // Evaluate the intrusion-detection rules against the log we just wrote.
      // Not awaited: detection must never slow down or break authentication.
      onFailedLogin(email, anonymizeIp(ip)).catch(() => {});

      return unauthorized('Invalid email or password.');
    }

    // ── Account lockout ───────────────────────────────────────────────────────
    // Checked AFTER the password comparison on purpose. Checking first would
    // turn the endpoint into an account-enumeration oracle: a locked account
    // would answer differently from an unknown one, letting an attacker discover
    // which addresses are registered simply by hammering them.
    //
    // Rate limiting above caps attempts per IP, but a distributed attacker
    // rotates addresses; this bounds total guesses against one account no matter
    // how many machines are used. It is time-boxed so a failed attack cannot
    // permanently lock the real owner out.
    if (await isAccountLocked(email)) {
      return tooManyRequests(
        'This account is temporarily locked after too many failed sign-in attempts. Please try again in 15 minutes.'
      );
    }

    // ── 2FA flow ──────────────────────────────────────────────────────────────
    // If the account has two-factor authentication enabled, we can't log them
    // in yet — we first need to verify that they have access to their email inbox.
    if (user.twoFactorEnabled) {
      // Generate a fresh 6-digit one-time code
      const code = gen6();

      // Set the expiry 10 minutes from now as a Date object
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes in ms

      // Delete any previous unused codes for this user so only one is ever active.
      // This prevents accumulation of stale codes in the database.
      await prisma.twoFactorCode.deleteMany({ where: { userId: user.id, used: false } });

      // Create the new code record in the database
      await prisma.twoFactorCode.create({ data: { userId: user.id, code, expiresAt } });

      // Send the code by email — .catch(() => {}) means we ignore email delivery
      // failures (fire-and-forget) so the response isn't delayed by a slow mail server
      sendMail({
        to: user.email,
        subject: 'Your Silent Evidence login code',
        // Inline HTML email with the 6-digit code in large text for readability
        html: `<p>Your login code is: <strong style="font-size:24px">${code}</strong></p><p>It expires in 10 minutes.</p>`,
      }).catch(() => {});

      // Return 202 Accepted — the client should redirect to the 2FA verification page.
      // We include the tempUserId so the verify endpoint knows which user's code to check.
      // We do NOT set a login cookie yet — the user is not fully authenticated.
      return NextResponse.json({ requires2fa: true, tempUserId: user.id }, { status: 202 });
    }

    // ── Set auth cookie ───────────────────────────────────────────────────────
    // The user passed both checks — set the session cookie to log them in.
    // We create the response object first, then attach the cookie to it.
    const res = NextResponse.json({ ok: true });

    // Set the 'userId' cookie on the response.
    // httpOnly: true   — JavaScript running in the browser cannot read this cookie,
    //                     which prevents XSS attacks from stealing the session.
    // path: '/'        — the cookie is sent with every request to the site.
    // sameSite: 'lax'  — blocks cross-site POST requests (CSRF protection) while
    //                     still allowing normal navigation links to work.
    // secure: true in production — cookie is only sent over HTTPS, not plain HTTP.
    // maxAge           — how long the cookie lives, in seconds (7 days here).
    // Sets the signed `userId` + `userId_sig` cookies so the session can't be forged.
    await setSessionCookies(res, user.id, user.sessionVersion);

    // Record the successful login — geo-lookup runs in parallel, never blocks response
    lookupGeoIp(ip)
      .then((geo) =>
        prisma.loginLog.create({
          data: {
            userId: user.id,
            username: user.username,
            email: user.email,
            ip: anonymizeIp(ip),
            userAgent: req.headers.get('user-agent') ?? null,
            success: true,
            country: geo?.country ?? null,
            city: geo?.city ?? null,
            lat: geo?.lat ?? null,
            lng: geo?.lng ?? null,
          },
        })
      )
      .then(() =>
        // Chained after the log write so the "have we seen this network before?"
        // check counts the attempt that just happened. Not awaited by the handler.
        onSuccessfulLogin(user.id, user.email, anonymizeIp(ip))
      )
      .catch(() => {});

    // Return the response — the browser will store the cookie automatically
    return res;
  } catch (err) {
    // Log the unexpected error to the server console for debugging
    console.error('[login]', err);

    // Return a generic 500 response — never expose internal error details to clients
    return serverError();
  }
}
