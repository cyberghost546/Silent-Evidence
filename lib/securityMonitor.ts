// lib/securityMonitor.ts
// Turns the raw authentication log into alerts a human will actually read.
//
// THE PROBLEM THIS SOLVES
// LoginLog has always recorded every attempt — email, IP, user agent, success.
// Nothing read it. An attacker could grind against an account for a week and the
// only trace would be rows in a table nobody opens.
//
// DESIGN NOTES
//
// Runs inline on the login path, not on a schedule. A cron sweep every five
// minutes gives an attacker a five-minute head start and needs infrastructure
// that does not exist here; evaluating a few indexed COUNT queries after a
// FAILED login is cheap, and failed logins are rare in normal traffic.
//
// Everything is best-effort. A detection rule must never break the login
// endpoint — if the monitor throws, authentication proceeds normally and the
// error is logged. Security tooling that takes the site down with it has made
// things worse, not better.
//
// IP CAVEAT
// LoginLog stores anonymised IPs (last octet replaced), so "same IP" here really
// means "same /24". That slightly over-groups — an office or campus NAT can look
// like a single source — which is why the thresholds sit well above what
// ordinary shared-network typo traffic produces.

import { prisma } from '@/lib/prisma';
import { sendMail } from '@/lib/email';

export type Severity = 'low' | 'medium' | 'high' | 'critical';

/** Detection thresholds, kept in one place so they are tunable. */
export const RULES = {
  /** Failed attempts against ONE account before it counts as brute force. */
  bruteForcePerAccount: 8,
  /** Failed attempts from ONE source before it looks automated. */
  perIpAttempts: 15,
  /** Distinct accounts one source must touch to look like credential stuffing. */
  perIpDistinctAccounts: 5,
  /** Minutes of history each rule looks back over. */
  windowMinutes: 15,
  /** Failed attempts that lock an account, and for how long. */
  lockoutThreshold: 10,
  lockoutMinutes: 15,
} as const;

/** Severities that trigger an email. Low and medium are dashboard-only. */
const EMAIL_ON: Severity[] = ['high', 'critical'];

/** Dedupe bucket — one alert per rule, per source, per hour. */
function windowKey(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}`;
}

function since(minutes: number): Date {
  return new Date(Date.now() - minutes * 60_000);
}

/**
 * Records an alert, and emails admins when it is serious enough.
 *
 * Idempotent per (kind, ip, window): a repeat inside the same hour updates the
 * existing row rather than creating a new one, so the dashboard says "this is
 * happening" once instead of ten thousand times.
 */
async function raise(args: {
  kind: string;
  severity: Severity;
  summary: string;
  detail?: unknown;
  ip?: string | null;
  userId?: number | null;
}): Promise<void> {
  const { kind, severity, summary, detail, ip = null, userId = null } = args;
  const key = windowKey();
  const ipKey = ip ?? '';

  // Whether this was already reported this hour decides if we email, so a
  // sustained attack does not send one email per attempt.
  const existing = await prisma.securityAlert.findUnique({
    where: { kind_ip_windowKey: { kind, ip: ipKey, windowKey: key } },
    select: { id: true },
  });

  await prisma.securityAlert.upsert({
    where: { kind_ip_windowKey: { kind, ip: ipKey, windowKey: key } },
    create: {
      kind,
      severity,
      summary,
      detail: detail ? JSON.stringify(detail) : null,
      ip: ipKey,
      userId,
      windowKey: key,
    },
    // Refresh the evidence so the dashboard shows current counts, but leave
    // createdAt pointing at when the attack was first seen.
    update: {
      severity,
      summary,
      detail: detail ? JSON.stringify(detail) : null,
    },
  });

  if (!existing && EMAIL_ON.includes(severity)) {
    await emailAdmins(severity, summary, detail);
  }
}

/** Sends the alert to every admin. Never throws. */
async function emailAdmins(severity: Severity, summary: string, detail?: unknown): Promise<void> {
  try {
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { email: true },
    });

    const base = process.env.NEXT_PUBLIC_BASE_URL ?? '';
    const evidence = detail
      ? `<pre style="background:#f4f4f5;padding:12px;border-radius:6px;font-size:12px">${JSON.stringify(detail, null, 2)}</pre>`
      : '';

    const html =
      `<p><strong>${severity.toUpperCase()} security alert on Silent Evidence</strong></p>` +
      `<p>${summary}</p>` +
      evidence +
      `<p><a href="${base}/admin/security">Review in the security dashboard</a></p>` +
      `<p style="color:#71717a;font-size:12px">You are receiving this because you are an administrator. ` +
      `Alerts are grouped by the hour, so a sustained attack sends one email, not thousands.</p>`;

    for (const a of admins) {
      if (!a.email) continue;
      await sendMail({
        to: a.email,
        subject: `[${severity.toUpperCase()}] Security alert — Silent Evidence`,
        html,
      });
    }
  } catch (err) {
    console.error('[security] failed to email admins', err);
  }
}

/**
 * onFailedLogin — evaluate the detection rules after a rejected attempt.
 * Call WITHOUT awaiting. Never throws.
 */
export async function onFailedLogin(email: string, anonymisedIp: string): Promise<void> {
  try {
    const from = since(RULES.windowMinutes);

    const [perAccount, ipAttempts, ipTargets, targetUser] = await Promise.all([
      prisma.loginLog.count({ where: { email, success: false, createdAt: { gte: from } } }),
      prisma.loginLog.count({ where: { ip: anonymisedIp, success: false, createdAt: { gte: from } } }),
      prisma.loginLog.findMany({
        where: { ip: anonymisedIp, success: false, createdAt: { gte: from } },
        select: { email: true },
        distinct: ['email'],
      }),
      prisma.user.findUnique({ where: { email }, select: { id: true, role: true } }),
    ]);

    // Rule 1 — an admin account is being targeted.
    // Escalated above ordinary brute force: compromising an admin is materially
    // worse, and admin accounts should essentially never accumulate failed
    // logins from strangers, so the threshold is deliberately low.
    if (targetUser?.role === 'ADMIN' && perAccount >= 3) {
      await raise({
        kind: 'admin_account_targeted',
        severity: 'critical',
        summary: `Admin account "${email}" has ${perAccount} failed logins in the last ${RULES.windowMinutes} minutes.`,
        detail: { email, failedAttempts: perAccount, ip: anonymisedIp, windowMinutes: RULES.windowMinutes },
        ip: anonymisedIp,
        userId: targetUser.id,
      });
    }

    // Rule 2 — brute force against one account.
    else if (perAccount >= RULES.bruteForcePerAccount) {
      await raise({
        kind: 'brute_force',
        severity: 'high',
        summary: `${perAccount} failed logins for "${email}" in ${RULES.windowMinutes} minutes.`,
        detail: { email, failedAttempts: perAccount, ip: anonymisedIp },
        ip: anonymisedIp,
        userId: targetUser?.id ?? null,
      });
    }

    // Rule 3 — one source, many accounts: credential stuffing.
    // BOTH conditions must hold. Volume alone is often one person mistyping a
    // password; volume across many different accounts is not something a human
    // does by accident.
    if (ipAttempts >= RULES.perIpAttempts && ipTargets.length >= RULES.perIpDistinctAccounts) {
      await raise({
        kind: 'credential_stuffing',
        severity: 'high',
        summary: `${anonymisedIp} attempted ${ipAttempts} logins across ${ipTargets.length} different accounts in ${RULES.windowMinutes} minutes.`,
        detail: {
          ip: anonymisedIp,
          attempts: ipAttempts,
          distinctAccounts: ipTargets.length,
          sample: ipTargets.slice(0, 10).map((t) => t.email),
        },
        ip: anonymisedIp,
      });
    }
  } catch (err) {
    // Never let detection break login.
    console.error('[security] onFailedLogin check failed', err);
  }
}

/**
 * onSuccessfulLogin — flag an admin signing in from a source never seen before.
 *
 * A successful admin login from an unfamiliar network is the clearest single
 * signal that a credential has been stolen, and it costs one indexed lookup.
 */
export async function onSuccessfulLogin(
  userId: number,
  email: string,
  anonymisedIp: string,
): Promise<void> {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (user?.role !== 'ADMIN') return;

    const seenBefore = await prisma.loginLog.count({
      where: { userId, success: true, ip: anonymisedIp },
    });

    // The current attempt is already logged, so 1 means "first time from here".
    if (seenBefore <= 1) {
      await raise({
        kind: 'admin_new_location',
        severity: 'high',
        summary: `Admin "${email}" signed in successfully from a new network (${anonymisedIp}).`,
        detail: {
          email,
          ip: anonymisedIp,
          note: 'If this was not you, change the password and revoke sessions immediately.',
        },
        ip: anonymisedIp,
        userId,
      });
    }
  } catch (err) {
    console.error('[security] onSuccessfulLogin check failed', err);
  }
}

/**
 * isAccountLocked — true when an account has failed too many times recently.
 *
 * This is the hardening half. Rate limiting already caps attempts per IP, but a
 * distributed attacker rotates addresses; locking the ACCOUNT bounds the total
 * number of guesses regardless of how many machines are used.
 *
 * Time-boxed rather than permanent on purpose — a permanent lock turns a failed
 * attack into a successful denial of service against the real owner.
 */
export async function isAccountLocked(email: string): Promise<boolean> {
  try {
    const failures = await prisma.loginLog.count({
      where: { email, success: false, createdAt: { gte: since(RULES.lockoutMinutes) } },
    });
    return failures >= RULES.lockoutThreshold;
  } catch (err) {
    // Fail OPEN. If this check errors a legitimate user must still be able to
    // log in; the rate limiter and the alerts remain as defence.
    console.error('[security] lockout check failed', err);
    return false;
  }
}

/**
 * getSecurityOverview — everything the admin dashboard renders.
 *
 * Lives here rather than in the page component because the page is a React
 * component, and calling Date.now() inside one trips the purity rule: React
 * cannot guarantee a component body runs once, so a value that changes on every
 * call has no business being computed there. Data loading belongs in a plain
 * async function anyway — it leaves the page purely presentational.
 */
export async function getSecurityOverview() {
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [alerts, openCount, recentFailures, failures24h] = await Promise.all([
    prisma.securityAlert.findMany({
      // Unacknowledged first, then newest — what needs attention stays on top.
      orderBy: [{ acknowledged: 'asc' }, { createdAt: 'desc' }],
      take: 50,
    }),
    prisma.securityAlert.count({ where: { acknowledged: false } }),
    prisma.loginLog.findMany({
      where: { success: false },
      orderBy: { createdAt: 'desc' },
      take: 15,
      select: { id: true, email: true, ip: true, createdAt: true, country: true, city: true },
    }),
    prisma.loginLog.count({ where: { success: false, createdAt: { gte: dayAgo } } }),
  ]);

  return { alerts, openCount, recentFailures, failures24h };
}
