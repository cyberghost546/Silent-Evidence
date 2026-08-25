// POST /api/admin/security/acknowledge
// Marks one security alert as reviewed. Admin only.
//
// Acknowledging never deletes: the row stays as a record of what happened and
// when. An incident log that can be erased is worth far less afterwards.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/session';
import { badRequest, forbidden, serverError } from '@/lib/apiError';

export async function POST(req: Request) {
  // Re-checked here rather than trusting the admin layout: this is a mutation,
  // and API routes are reachable without ever rendering that layout.
  const admin = await requireAdmin();
  if (!admin) return forbidden();

  try {
    const body = await req.json();
    const alertId = Number(body?.alertId);
    if (!alertId || Number.isNaN(alertId)) return badRequest('alertId is required.');

    // updateMany rather than update so an unknown id is a no-op instead of a
    // thrown 500 — the button is idempotent if double-clicked.
    await prisma.securityAlert.updateMany({
      where: { id: alertId },
      data: { acknowledged: true },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[security/acknowledge]', err);
    return serverError();
  }
}
