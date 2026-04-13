// app/api/coauthor-requests/[id]/route.ts
// PATCH — close/reopen a request (author only)
// DELETE — delete a request (author or admin only)

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { unauthorized, forbidden, notFound, serverError } from '@/lib/apiError';

type Ctx = { params: Promise<{ id: string }> };

// PATCH — toggle isOpen (close or reopen)
export async function PATCH(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const requestId = Number(id);

  const c = await cookies();
  const userId = Number(c.get('userId')?.value ?? 0) || null;
  if (!userId) return unauthorized();

  try {
    const existing = await prisma.coauthorRequest.findUnique({ where: { id: requestId } });
    if (!existing) return notFound();
    if (existing.authorId !== userId) return forbidden();

    const updated = await prisma.coauthorRequest.update({
      where: { id: requestId },
      data:  { isOpen: !existing.isOpen },  // toggle open/closed
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error('[coauthor-request PATCH]', err);
    return serverError();
  }
}

// DELETE — remove the request entirely
export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const requestId = Number(id);

  const c = await cookies();
  const userId = Number(c.get('userId')?.value ?? 0) || null;
  if (!userId) return unauthorized();

  try {
    const existing = await prisma.coauthorRequest.findUnique({
      where:  { id: requestId },
      select: { authorId: true },
    });
    if (!existing) return notFound();

    // Check if requester is the author or an admin
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (existing.authorId !== userId && user?.role !== 'ADMIN') return forbidden();

    await prisma.coauthorRequest.delete({ where: { id: requestId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[coauthor-request DELETE]', err);
    return serverError();
  }
}
