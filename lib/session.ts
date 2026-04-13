// lib/session.ts
// Centralized session helpers — use these in API routes instead of reading the
// userId cookie directly. This makes it easy to change the session mechanism later
// (e.g. switch from userId cookie to JWT) without touching every route.

import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SessionUser {
  id: number;
  username: string;
  email: string;
  role: string;         // 'GUEST' | 'USER' | 'AUTHOR' | 'ADMIN'
  verified: boolean;    // email verified or manually verified by admin
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
  const raw = c.get('userId')?.value;
  if (!raw) return null;

  // Parse and validate — the cookie value must be a positive integer
  const id = parseInt(raw, 10);
  if (!Number.isFinite(id) || id <= 0) return null;

  return id;
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
      id:       true,
      username: true,
      email:    true,
      role:     true,
      isVerified: true,
    },
  });

  if (!user) return null;

  return {
    id:       user.id,
    username: user.username,
    email:    user.email,
    role:     user.role,
    verified: user.isVerified ?? false,
  };
}

/**
 * requireAdmin — returns the user if they are logged in AND have the ADMIN role.
 * Returns null otherwise. Use at the top of admin-only route handlers.
 *
 * Example:
 *   const admin = await requireAdmin();
 *   if (!admin) return forbidden();
 */
export async function requireAdmin(): Promise<SessionUser | null> {
  const user = await getSessionUser();
  if (!user || user.role !== 'ADMIN') return null;
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
