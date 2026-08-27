// app/api/auth/break-glass/route.ts
//
// Emergency owner recovery ("break glass").
//
// PURPOSE
//   Lets the site owner regain admin access when the normal path is unavailable:
//   password forgotten, session lost, or the account accidentally demoted. It is
//   the web counterpart to the server-side CLI (scripts/admin-recovery.mjs) — use
//   the CLI if you can reach the server, this if you can only reach the browser.
//
// THIS IS NOT A BACKDOOR — WHY
//   A backdoor is a hidden path that skips authentication. This is the opposite:
//   it authenticates with two independent factors and records everything.
//     Factor 1: the account must be the configured OWNER_EMAIL. Ownership lives
//               in server environment, not the database, so it cannot be claimed
//               by editing data or guessing a URL (see lib/owner.ts).
//     Factor 2: a valid, unused backup recovery code — a secret the owner
//               generated in advance and stored offline. It is single use and
//               only its bcrypt hash is in the database.
//   Every attempt, success or failure, is written to the audit log and an alert
//   email is sent to the owner address, so the mechanism cannot be exercised
//   quietly.
//
// WHAT IT DOES ON SUCCESS
//   - Sets the new password supplied in the request.
//   - Restores the account to ADMIN (this is the "regain access" part).
//   - Increments sessionVersion, which evicts every other active session (see
//     below), then issues a fresh session stamped with the new version.
//   - Logs the owner in.
//
// SESSION EVICTION
//   sessionVersion is bound into the signed session cookie, and getSessionUser
//   rejects any cookie whose version is behind the account's current value. So
//   incrementing it here genuinely kicks out a session an intruder may already
//   hold: their next request through any authenticated path is rejected. The new
//   cookie this route sets carries the incremented version, so the owner stays
//   logged in while everyone else is turned out.

import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIp, anonymizeIp } from '@/lib/rateLimit';
import { tooManyRequests } from '@/lib/apiError';
import { createSession } from '@/lib/session';
import { ownerEmail, isOwnerEmail } from '@/lib/owner';
import { consumeRecoveryCode } from '@/lib/recoveryCodes';
import { sendMail } from '@/lib/mailer';

const Schema = z.object({
  email: z.string().email('A valid email is required.'),
  recoveryCode: z.string().min(1, 'A recovery code is required.'),
  // A recovery necessarily happens because the old password is unusable, so a
  // new one is set as part of the same step. Kept in step with the register
  // route's minimum so recovered accounts are not weaker than new ones.
  newPassword: z.string().min(8, 'New password must be at least 8 characters.'),
});

// Generic reply for every failure. An attacker probing this endpoint must not be
// able to tell "wrong email" from "wrong code" from "no owner configured", or it
// becomes an oracle for which of those is true.
const GENERIC_FAILURE = { error: 'Recovery failed. Check your details and try again.' };

async function alertOwner(subject: string, body: string) {
  const to = ownerEmail();
  if (!to) return;
  sendMail({
    to,
    subject: `[Silent Evidence security] ${subject}`,
    html: `<p>${body}</p><p>If this was not you, your recovery codes may be compromised. Sign in and regenerate them immediately, and rotate OWNER_EMAIL if needed.</p>`,
  }).catch(() => {});
}

export async function POST(req: Request) {
  const ip = getClientIp(req);

  // Hard rate limit. This endpoint gates the most powerful action in the app, so
  // the budget is far tighter than ordinary login: a handful of tries per hour.
  const limit = await checkRateLimit(ip, 'break-glass', { limit: 5, windowMs: 60 * 60 * 1000 });
  if (limit.blocked) {
    return tooManyRequests('Too many recovery attempts. Please wait and try again later.');
  }

  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(GENERIC_FAILURE, { status: 400 });
  }
  const { email, recoveryCode, newPassword } = parsed.data;

  try {
    // The break-glass path is only ever for the owner account. Anyone else, even
    // a legitimate admin, uses the normal password-reset flow.
    //
    // There is no real user to attribute this attempt to, and the AuditLog actor
    // is a required foreign key, so this goes to SecurityAlert (nullable userId)
    // instead — which is where attacker signals belong anyway.
    if (!ownerEmail() || !isOwnerEmail(email)) {
      await prisma.securityAlert
        .create({
          data: {
            kind: 'BREAK_GLASS_NON_OWNER',
            severity: 'high',
            summary: 'Break-glass recovery attempted for a non-owner account',
            detail: `Attempt from ${anonymizeIp(ip)} for email that is not the configured owner.`,
            ip: anonymizeIp(ip),
            windowKey: `break-glass:${anonymizeIp(ip)}`,
          },
        })
        .catch(() => {});
      return NextResponse.json(GENERIC_FAILURE, { status: 401 });
    }

    const owner = await prisma.user.findUnique({
      where: { email: ownerEmail()! },
      select: { id: true, email: true, role: true },
    });
    if (!owner) {
      return NextResponse.json(GENERIC_FAILURE, { status: 401 });
    }

    // Second factor: a valid unused recovery code, atomically consumed.
    const ok = await consumeRecoveryCode(owner.id, recoveryCode);
    if (!ok) {
      await prisma.auditLog
        .create({
          data: {
            adminId: owner.id,
            action: 'BREAK_GLASS_FAILED',
            detail: `Invalid recovery code presented from ${anonymizeIp(ip)}.`,
            targetType: 'User',
            targetId: owner.id,
          },
        })
        .catch(() => {});
      await alertOwner(
        'Failed emergency recovery attempt',
        `Someone tried to use break-glass recovery for your account from ${anonymizeIp(ip)}, with an invalid recovery code.`
      );
      return NextResponse.json(GENERIC_FAILURE, { status: 401 });
    }

    // Both factors passed. Reset the password, restore admin, invalidate sessions.
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: owner.id },
      data: {
        password: passwordHash,
        role: 'ADMIN',
        sessionVersion: { increment: 1 },
      },
    });

    await prisma.auditLog.create({
      data: {
        adminId: owner.id,
        action: 'BREAK_GLASS_SUCCESS',
        detail: `Owner regained admin access via break-glass recovery from ${anonymizeIp(ip)}. Password reset; role restored to ADMIN.`,
        targetType: 'User',
        targetId: owner.id,
      },
    });

    await alertOwner(
      'Emergency recovery used',
      `Your account's break-glass recovery was just used successfully from ${anonymizeIp(ip)}. Your password was reset and admin access restored.`
    );

    const res = NextResponse.json({ ok: true });
    await createSession(res, owner.id);
    return res;
  } catch (err) {
    console.error('[POST /api/auth/break-glass]', err);
    // Still generic — never leak internal state on this endpoint.
    return NextResponse.json(GENERIC_FAILURE, { status: 500 });
  }
}
