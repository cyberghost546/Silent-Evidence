// app/api/admin/calendar/events/[id]/route.ts
// PATCH  — update a calendar event
// DELETE — delete a calendar event

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUserId } from '@/lib/session';
import { serverError } from '@/lib/apiError';

async function requireAdmin() {
  const userId = await getSessionUserId();
  if (!userId) return false;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return user?.role === 'ADMIN';
}

interface Props {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: Request, { params }: Props) {
  try {
    if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { id } = await params;
    const { title, icon, note, linkUrl } = await req.json();
    const event = await prisma.calendarEvent.update({
      where: { id: Number(id) },
      data: {
        ...(title ? { title: title.trim() } : {}),
        ...(icon ? { icon: icon.trim() } : {}),
        ...(note !== undefined ? { note: note?.trim() || null } : {}),
        ...(linkUrl !== undefined ? { linkUrl: linkUrl?.trim() || null } : {}),
      },
    });
    return NextResponse.json(event);
  } catch (err) {
    console.error('[PATCH /api/admin/calendar/events/[id]]', err);
    return serverError();
  }
}

export async function DELETE(_req: Request, { params }: Props) {
  try {
    if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { id } = await params;
    await prisma.calendarEvent.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/admin/calendar/events/[id]]', err);
    return serverError();
  }
}
