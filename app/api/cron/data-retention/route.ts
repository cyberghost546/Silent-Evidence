// ============================================================
//  app/api/cron/data-retention/route.ts
//
//  Deletes operational log records once they pass the retention
//  period the privacy policy promises.
//
//  WHY THIS EXISTS
//  ---------------
//  GDPR Art. 5(1)(e) — storage limitation — says personal data may
//  be kept "no longer than is necessary". The privacy policy states
//  retention periods for security logs, analytics events and cookie
//  consent records, but nothing ever deleted them, so those rows
//  accumulated forever. A stated retention period that nothing
//  enforces is worse than none: it is an inaccurate disclosure on
//  top of the underlying over-retention.
//
//  Each table here holds data about identifiable people:
//    LoginLog      — IP address, user agent, approximate location
//    FunnelEvent   — behavioural events tied to a user id
//    CookieConsent — truncated IP, user agent, consent choice
//    EmailLog      — recipient addresses and delivery outcomes
//
//  WHAT IS DELIBERATELY NOT TOUCHED
//  --------------------------------
//  Account data, stories and comments are kept until the user
//  deletes their account, and payment records have their own much
//  longer statutory retention under tax law. Neither is expired
//  here — deleting a purchase record to satisfy a privacy promise
//  would breach a different legal duty.
//
//  How to call it:
//    GET /api/cron/data-retention
//    Authorization: Bearer <CRON_SECRET>
//
//  Scheduled daily in vercel.json. Running it more often is
//  harmless — it is idempotent, deleting only what is already
//  past its cutoff.
//
//  NOTE: keep the windows below in step with the retention section
//  of app/privacy/page.tsx. If they drift, the policy is wrong again.
// ============================================================

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/** Retention windows in days. These are the numbers the privacy policy states. */
const RETENTION_DAYS = {
  loginLog: 365, // security logs — "no longer than 12 months"
  funnelEvent: 365, // usage analytics — "no longer than 12 months"
  cookieConsent: 365, // proof of consent — "12 months"
  emailLog: 180, // delivery diagnostics; shorter, nothing depends on them
} as const;

function cutoff(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export async function GET(req: Request) {
  const auth = req.headers.get('authorization') ?? '';
  const secret = process.env.CRON_SECRET ?? '';

  // Same guard as the other cron routes: a missing secret blocks the endpoint
  // rather than leaving it open.
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Independent deletes, so one failing table does not strand the others.
    const [loginLog, funnelEvent, cookieConsent, emailLog] = await Promise.all([
      prisma.loginLog.deleteMany({ where: { createdAt: { lt: cutoff(RETENTION_DAYS.loginLog) } } }),
      prisma.funnelEvent.deleteMany({
        where: { createdAt: { lt: cutoff(RETENTION_DAYS.funnelEvent) } },
      }),
      prisma.cookieConsent.deleteMany({
        where: { createdAt: { lt: cutoff(RETENTION_DAYS.cookieConsent) } },
      }),
      prisma.emailLog.deleteMany({ where: { createdAt: { lt: cutoff(RETENTION_DAYS.emailLog) } } }),
    ]);

    const deleted = {
      loginLog: loginLog.count,
      funnelEvent: funnelEvent.count,
      cookieConsent: cookieConsent.count,
      emailLog: emailLog.count,
    };

    // Logged so there is an operational record that retention actually ran —
    // useful evidence if a regulator ever asks how the policy is enforced.
    console.log('[cron/data-retention]', JSON.stringify(deleted));

    return NextResponse.json({
      ok: true,
      ranAt: new Date().toISOString(),
      retentionDays: RETENTION_DAYS,
      deleted,
    });
  } catch (err) {
    console.error('[cron/data-retention]', err);
    return NextResponse.json({ error: 'Retention sweep failed.' }, { status: 500 });
  }
}
