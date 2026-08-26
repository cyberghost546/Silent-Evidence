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
import { createSession } from '@/lib/session';
import { consumeRecoveryCode, countUnused } from '@/lib/recoveryCodes';

// ── POST handler ──────────────────────────────────────────────────────────────
// This function runs whenever a POST request is made to /api/auth/2fa/verify.
// "req" is a standard Web API Request containing the submitted code and user ID.
export async function POST(req: Request) {
  // ── Rate limiting ─────────────────────────────────────────────────────────
  // Allow at most 5 code attempts per IP per 15 minutes.
  // We key on IP alone first so that an attacker cannot bypass this by rotating
  // tempUserIds — all guesses from a single IP are counted together.
  const ip = getClientIp(req);
  const ipLimit = await checkRateLimit(ip, '2fa-verify', {
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
  const userLimit = await checkRateLimit(String(userId), '2fa-verify-user', {
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });
  if (userLimit.blocked) {
    return tooManyRequests('Too many verification attempts for this account. Please request a new code.');
  }

  // ── Validate the code ─────────────────────────────────────────────────────
  // Two kinds of code are accepted here:
  //   1. The 6-digit code emailed during login (the normal path).
  //   2. A backup recovery code, for when the user cannot reach their email
  //      inbox at all. Without this fallback, enabling 2FA and then losing inbox
  //      access would lock the account out permanently — the exact failure mode
  //      recovery codes exist to prevent.
  //
  // A recovery code is longer and contains letters, so we only try that path
  // when the submitted value does not look like a 6-digit code. This keeps a
  // mistyped email code from silently burning a one-time recovery code.
  const submitted = String(code).trim();
  const looksLikeEmailCode = /^\d{6}$/.test(submitted);

  let authenticated = false;
  let usedRecoveryCode = false;

  if (looksLikeEmailCode) {
    const record = await prisma.twoFactorCode.findFirst({
      where: {
        userId,
        code: submitted,
        used: false,
        expiresAt: { gt: new Date() },
      },
    });
    if (record) {
      // One-time use: mark it so a replay of the same code cannot work.
      await prisma.twoFactorCode.update({ where: { id: record.id }, data: { used: true } });
      authenticated = true;
    }
  } else {
    // consumeRecoveryCode both checks and atomically claims the code.
    authenticated = await consumeRecoveryCode(userId, submitted);
    usedRecoveryCode = authenticated;
  }

  if (!authenticated) {
    return NextResponse.json({ error: 'Invalid or expired code.' }, { status: 401 });
  }

  // Surface how many recovery codes are left so the client can nudge the user to
  // regenerate before they run out and lock themselves out again.
  let recoveryCodesRemaining: number | undefined;
  if (usedRecoveryCode) {
    recoveryCodesRemaining = await countUnused(userId);
    await prisma.auditLog.create({
      data: {
        adminId: userId,
        action: 'RECOVERY_CODE_USED',
        detail: `Recovery code used to complete 2FA login. ${recoveryCodesRemaining} remaining.`,
        targetType: 'User',
        targetId: userId,
      },
    }).catch(() => {});
  }

  // ── Complete the login by setting the session cookie ──────────────────────
  // Build the success JSON response. recoveryCodesRemaining is present only when
  // a recovery code was spent, so the UI can warn when the supply runs low.
  const res = NextResponse.json(
    usedRecoveryCode ? { ok: true, usedRecoveryCode: true, recoveryCodesRemaining } : { ok: true },
  );

  // Now that 2FA is verified, set the userId cookie — the user is fully logged in.
  // httpOnly: true   — JavaScript in the browser cannot read this cookie (XSS protection).
  // path: '/'        — the cookie is sent with all requests to the site.
  // sameSite: 'lax'  — CSRF protection while still allowing normal link navigation.
  // secure in production — only transmitted over HTTPS, not plain HTTP.
  // maxAge: 7 days   — the session lasts for one week.
  await createSession(res, userId);

  // Return the response — the browser stores the cookie, and the user is now logged in
  return res;
}
