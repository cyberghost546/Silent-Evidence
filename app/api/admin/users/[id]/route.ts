// app/api/admin/users/[id]/route.ts
// Admin-only API for managing a single user account, identified by their numeric ID
// in the URL path (e.g. /api/admin/users/5).
//
// PATCH  /api/admin/users/[id] — change the user's role.
//                                Body: { role: "GUEST" | "USER" | "AUTHOR" | "ADMIN" }
// DELETE /api/admin/users/[id] — permanently delete the user account.
//
// AUTH:
//   Both handlers require an ADMIN session and a valid CSRF token. Both also
//   enforce the owner / last-admin protections in lib/owner.ts, so this route
//   cannot be used — even by a legitimate admin, or a hijacked admin session —
//   to lock the site's owner out or remove the final administrator.

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifyCsrfToken } from '@/lib/csrf';
import { checkOwnerProtection, adminCount } from '@/lib/owner';

type Params = { params: Promise<{ id: string }> };

// Returns the acting admin's user id, or null if the caller is not an admin.
// Returning the id (rather than a boolean) lets the handlers attribute audit-log
// entries to the admin who made the change.
async function currentAdminId(): Promise<number | null> {
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0);
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return user?.role === 'ADMIN' ? userId : null;
}

// ── PATCH /api/admin/users/[id] — change a user's role ───────────────────────
export async function PATCH(req: Request, { params }: Params) {
  const actingAdminId = await currentAdminId();
  if (!actingAdminId) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  // Mutating admin action — protect it against CSRF like the rest of the app.
  if (!(await verifyCsrfToken(req))) {
    return NextResponse.json({ error: 'Invalid CSRF token.' }, { status: 403 });
  }

  const { id } = await params;
  const { role } = await req.json();

  const VALID_ROLES = ['GUEST', 'USER', 'AUTHOR', 'ADMIN'];
  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Invalid role.' }, { status: 400 });
  }

  // ── Owner / last-admin protection ──────────────────────────────────────────
  // Without this, an admin (or a compromised admin session) could demote the
  // owner, or demote the only remaining admin, leaving the site with no way in
  // except server access. checkOwnerProtection encodes both invariants.
  const target = await prisma.user.findUnique({
    where: { id: Number(id) },
    select: { id: true, email: true, role: true },
  });
  if (!target) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

  const protection = checkOwnerProtection(target, role, await adminCount());
  if (!protection.allowed) {
    return NextResponse.json({ error: protection.reason }, { status: 409 });
  }

  await prisma.user.update({ where: { id: target.id }, data: { role } });

  // Role changes are exactly the kind of privileged action the audit log exists
  // for, and this route logged nothing before.
  await prisma.auditLog
    .create({
      data: {
        adminId: actingAdminId,
        action: 'CHANGE_USER_ROLE',
        detail: `Changed role of user ${target.id} (${target.email}) from ${target.role} to ${role}.`,
        targetType: 'User',
        targetId: target.id,
      },
    })
    .catch(() => {});

  return NextResponse.json({ ok: true });
}

// ── DELETE /api/admin/users/[id] — delete a user account ─────────────────────
export async function DELETE(req: Request, { params }: Params) {
  const actingAdminId = await currentAdminId();
  if (!actingAdminId) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  if (!(await verifyCsrfToken(req))) {
    return NextResponse.json({ error: 'Invalid CSRF token.' }, { status: 403 });
  }

  const { id } = await params;

  const target = await prisma.user.findUnique({
    where: { id: Number(id) },
    select: { id: true, email: true, role: true },
  });
  if (!target) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

  // Deletion is a role change to "nobody": pass newRole = null so the owner and
  // last-admin guards apply here too.
  const protection = checkOwnerProtection(target, null, await adminCount());
  if (!protection.allowed) {
    return NextResponse.json({ error: protection.reason }, { status: 409 });
  }

  await prisma.user.delete({ where: { id: target.id } });

  await prisma.auditLog
    .create({
      data: {
        adminId: actingAdminId,
        action: 'DELETE_USER',
        detail: `Deleted user ${target.id} (${target.email}), role ${target.role}.`,
        targetType: 'User',
        targetId: target.id,
      },
    })
    .catch(() => {});

  return NextResponse.json({ ok: true });
}
