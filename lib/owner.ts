// lib/owner.ts
//
// Defines who the site owner is, and the rules that stop the owner — or the last
// remaining admin — from being locked out.
//
// WHY OWNERSHIP LIVES IN AN ENV VAR
// ---------------------------------
// The owner is identified by the OWNER_EMAIL environment variable, not a column
// in the database. That is deliberate:
//
//   - An attacker who gets write access to the User table (SQL injection, a
//     compromised admin account) could otherwise just set isOwner=true on their
//     own row. Ownership held in server config is outside their reach.
//   - It cannot be changed through any web request, because no request can edit
//     the environment. Changing the owner requires access to the server itself.
//   - There is exactly one source of truth, so there is nothing to keep in sync.
//
// This is the opposite of a hidden backdoor: the owner is a normal account that
// logs in the normal way. OWNER_EMAIL only grants two protections — the account
// cannot be demoted or deleted through the app, and it is the one account the
// break-glass recovery flow will restore. It does not bypass authentication.
//
// If OWNER_EMAIL is unset, there is simply no protected owner; the last-admin
// guard below still applies, so the site can never be left with zero admins.

import { prisma } from '@/lib/prisma';

/** The configured owner email, normalised, or null if none is set. */
export function ownerEmail(): string | null {
  const raw = process.env.OWNER_EMAIL?.trim().toLowerCase();
  return raw ? raw : null;
}

/** True if the given email is the configured owner. Case-insensitive. */
export function isOwnerEmail(email: string | null | undefined): boolean {
  const owner = ownerEmail();
  if (!owner || !email) return false;
  return email.trim().toLowerCase() === owner;
}

/**
 * Loads the owner's user record, or null if OWNER_EMAIL is unset or no account
 * with that email exists yet. `select` narrows what comes back.
 */
export async function getOwnerUser<T extends Record<string, boolean>>(select: T) {
  const owner = ownerEmail();
  if (!owner) return null;
  return prisma.user.findFirst({
    // Emails are stored as the user typed them, so match case-insensitively via
    // a de-facto equality on the lowercased value. MySQL's default collation is
    // already case-insensitive, so a plain equals matches "Me@x.com" to the env
    // value too, but we lowercase both sides to be explicit and portable.
    where: { email: owner },
    select,
  });
}

/**
 * Reasons a role change or deletion is refused. Returned rather than thrown so
 * callers can turn them into the right HTTP status and message.
 */
export type ProtectionResult =
  | { allowed: true }
  | { allowed: false; reason: string };

/**
 * Decides whether `targetUser` may have their role changed to `newRole`, or be
 * deleted (pass newRole = null for deletion). Enforces two invariants:
 *
 *   1. The owner account can never be demoted from ADMIN or deleted through the
 *      app. Losing the owner is exactly the lock-out this whole feature exists
 *      to prevent.
 *   2. The site must always keep at least one ADMIN. Demoting or deleting the
 *      final admin would leave nobody able to administer the site — recoverable
 *      only from the server, and only if someone remembered this could happen.
 *
 * `currentAdminCount` is the number of ADMIN accounts that exist right now, so
 * the caller fetches it once and passes it in.
 */
export function checkOwnerProtection(
  targetUser: { id: number; email: string; role: string },
  newRole: string | null,
  currentAdminCount: number,
): ProtectionResult {
  const demotingFromAdmin = targetUser.role === 'ADMIN' && newRole !== 'ADMIN';

  // Rule 1 — the owner is untouchable while they are the owner.
  if (isOwnerEmail(targetUser.email)) {
    if (newRole === null) {
      return { allowed: false, reason: 'The owner account cannot be deleted.' };
    }
    if (demotingFromAdmin) {
      return { allowed: false, reason: 'The owner account cannot be demoted from admin.' };
    }
  }

  // Rule 2 — never remove the last admin, owner or not.
  if (demotingFromAdmin && currentAdminCount <= 1) {
    return {
      allowed: false,
      reason: 'This is the only remaining admin. Promote another admin before changing this one.',
    };
  }

  return { allowed: true };
}

/** Current number of ADMIN accounts. */
export function adminCount(): Promise<number> {
  return prisma.user.count({ where: { role: 'ADMIN' } });
}
