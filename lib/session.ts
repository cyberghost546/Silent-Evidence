// lib/session.ts
// Centralized session helpers — use these in API routes instead of reading the
// userId cookie directly. This makes it easy to change the session mechanism later
// (e.g. switch from userId cookie to JWT) without touching every route.

import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  SESSION_COOKIE,
  SESSION_SIG_COOKIE,
  SESSION_VER_COOKIE,
  verifyUserId,
  setSessionCookies,
} from '@/lib/sessionCookie';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SessionUser {
  id: number;
  username: string;
  email: string;
  role: string; // 'GUEST' | 'USER' | 'AUTHOR' | 'ADMIN'
  verified: boolean; // email verified or manually verified by admin
}

// ── Session helpers ───────────────────────────────────────────────────────────

/**
 * getSessionUserId — reads the userId from the session cookie.
 * Returns the ID as a number, or null if not logged in.
 *
 * This is the lightest check — use it when you just need to know if someone is logged in.
 */
export async function getSessionUserId(): Promise<number | null> {
  const c = await cookies();
  const raw = c.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  // Verify the HMAC signature over (id, version) — a cookie whose signature does
  // not match has been forged or tampered with, so reject it. (Middleware
  // normally strips these before we get here; this is defense in depth.)
  const sig = c.get(SESSION_SIG_COOKIE)?.value;
  const ver = c.get(SESSION_VER_COOKIE)?.value;
  if (!(await verifyUserId(raw, sig, ver))) return null;

  // Parse and validate — the cookie value must be a positive integer
  const id = parseInt(raw, 10);
  if (!Number.isFinite(id) || id <= 0) return null;

  // Freshness: reject a cookie whose version is behind the account's current
  // sessionVersion, so "log out everywhere", break-glass, and password reset
  // actually evict this session on the next request — not only on the routes
  // that use getSessionUser. This costs one indexed lookup; it is the price of
  // real session revocation. (Routes that read the `userId` cookie directly,
  // rather than through this helper, are not covered — closing that gap fully
  // needs a version check in middleware, which requires the Node runtime.)
  const cookieVersion = parseInt(ver ?? '', 10);
  const account = await prisma.user.findUnique({ where: { id }, select: { sessionVersion: true } });
  if (!account || !Number.isFinite(cookieVersion) || cookieVersion !== account.sessionVersion)
    return null;

  return id;
}

/**
 * Reads the authenticated session version from the (verified) cookie, or null if
 * absent/invalid. Only meaningful after the signature has been verified, since
 * the version is bound into that signature.
 */
async function getSessionVersionFromCookie(): Promise<number | null> {
  const c = await cookies();
  const v = c.get(SESSION_VER_COOKIE)?.value;
  if (v === undefined) return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * createSession — issue a session cookie for a user, reading their current
 * sessionVersion from the database so the cookie is stamped with it. Use this
 * (not setSessionCookies directly) wherever a login completes, so every session
 * is version-stamped and therefore revocable.
 */
export async function createSession(res: NextResponse, userId: number): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { sessionVersion: true },
  });
  await setSessionCookies(res, userId, user?.sessionVersion ?? 0);
}

/**
 * getSessionUser — reads the session cookie AND fetches the user from the DB.
 * Returns the full SessionUser object, or null if not logged in / user deleted.
 *
 * Use this when you need the user's role or other details (not just the ID).
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const id = await getSessionUserId();
  if (!id) return null;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      isVerified: true,
      sessionVersion: true,
    },
  });

  if (!user) return null;

  // ── Session freshness ──────────────────────────────────────────────────────
  // The cookie carries the sessionVersion it was issued with, bound into its
  // signature. If the account's version has since moved on — because the user
  // logged out everywhere, or an owner ran break-glass recovery — this cookie is
  // stale and must be rejected even though its signature is still valid. This is
  // what makes revocation real: incrementing sessionVersion now actually evicts
  // every session that was issued before the bump, on the next request each makes
  // through any getSessionUser / requireAuth / requireAdmin path.
  const cookieVersion = await getSessionVersionFromCookie();
  if (cookieVersion === null || cookieVersion !== user.sessionVersion) return null;

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    verified: user.isVerified ?? false,
  };
}

/**
 * requireAdmin — returns the user if they are logged in, have the ADMIN role,
 * AND (unless disabled) have two-factor authentication enabled. Returns null
 * otherwise. Use at the top of admin-only route handlers.
 *
 * The 2FA requirement matches the admin UI gate in app/admin/layout.tsx, so an
 * admin cannot dodge it by calling the API directly. It is skipped when
 * REQUIRE_ADMIN_2FA=false — the escape hatch for when email-delivered 2FA is not
 * yet configured (see the layout for the rationale).
 *
 * Example:
 *   const admin = await requireAdmin();
 *   if (!admin) return forbidden();
 */
export async function requireAdmin(): Promise<SessionUser | null> {
  const user = await getSessionUser();
  if (!user || user.role !== 'ADMIN') return null;

  if (process.env.REQUIRE_ADMIN_2FA !== 'false') {
    const { twoFactorEnabled } = (await prisma.user.findUnique({
      where: { id: user.id },
      select: { twoFactorEnabled: true },
    })) ?? { twoFactorEnabled: false };
    if (!twoFactorEnabled) return null;
  }

  return user;
}

/**
 * requireAuth — returns the user if they are logged in (any role except GUEST).
 * Returns null if not logged in or if the account no longer exists.
 *
 * Example:
 *   const user = await requireAuth();
 *   if (!user) return unauthorized();
 */
export async function requireAuth(): Promise<SessionUser | null> {
  const user = await getSessionUser();
  if (!user) return null;
  return user;
}
