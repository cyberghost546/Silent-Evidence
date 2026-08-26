// app/api/user/2fa/route.ts
// PATCH — toggles two-factor authentication on/off for the current user.
// When enabling 2FA, the next login will require an emailed code.
//
// Enabling 2FA also generates a set of backup recovery codes, returned once so
// the user can store them. Without that, a user who turns on 2FA and later loses
// access to their email inbox would be permanently locked out — the codes are
// the escape hatch, so they must be issued at the same moment 2FA is turned on.

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifyCsrfToken } from '@/lib/csrf';
import { regenerateRecoveryCodes, countUnused } from '@/lib/recoveryCodes';

export async function PATCH(req: Request) {
  // This changes a security setting, so it must be CSRF-protected — it was not
  // before, which meant a malicious page could silently toggle a victim's 2FA.
  if (!(await verifyCsrfToken(req))) {
    return NextResponse.json({ error: 'Invalid CSRF token.' }, { status: 403 });
  }

  const c = await cookies();
  const userId = Number(c.get('userId')?.value ?? 0);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { enabled } = await req.json();
  const turnOn = Boolean(enabled);

  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorEnabled: turnOn },
  });

  await prisma.auditLog
    .create({
      data: {
        adminId: userId,
        action: turnOn ? 'ENABLE_2FA' : 'DISABLE_2FA',
        detail: turnOn
          ? 'Two-factor authentication enabled.'
          : 'Two-factor authentication disabled.',
        targetType: 'User',
        targetId: userId,
      },
    })
    .catch(() => {});

  // Issue recovery codes when enabling — but only if the user has none yet, so
  // toggling 2FA off and on again does not silently invalidate codes they have
  // already saved. They can always regenerate deliberately from settings.
  if (turnOn && (await countUnused(userId)) === 0) {
    const codes = await regenerateRecoveryCodes(userId);
    return new NextResponse(JSON.stringify({ twoFactorEnabled: true, recoveryCodes: codes }), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store, private' },
    });
  }

  return NextResponse.json({ twoFactorEnabled: turnOn });
}
