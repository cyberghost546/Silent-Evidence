// app/api/admin/calendar/events/route.ts
// GET  — all calendar events (admin)
// POST — create a new calendar event

import { NextResponse } from 'next/server';
import { DEFAULT_EVENT_ICON_ID } from '@/lib/calendarIcons';
import { prisma } from '@/lib/prisma';
import { getSessionUserId } from '@/lib/session';
import { serverError } from '@/lib/apiError';

async function requireAdmin() {
  const userId = await getSessionUserId();
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return user?.role === 'ADMIN' ? userId : null;
}

export async function GET() {
  try {
    if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const events = await prisma.calendarEvent.findMany({ orderBy: { date: 'asc' } });
    return NextResponse.json(events);
  } catch (err) {
    console.error('[GET /api/admin/calendar/events]', err);
    return serverError();
  }
}

export async function POST(req: Request) {
  try {
    if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { date, title, icon, note, linkUrl } = await req.json();
    if (!date || !title?.trim()) {
      return NextResponse.json({ error: 'date and title are required' }, { status: 400 });
    }
    const event = await prisma.calendarEvent.create({
      data: {
        date:    new Date(date),
        title:   title.trim(),
        icon:    icon?.trim() || DEFAULT_EVENT_ICON_ID,
        note:    note?.trim() || null,
        linkUrl: linkUrl?.trim() || null,
      },
    });
    return NextResponse.json(event, { status: 201 });
  } catch (err) {
    console.error('[POST /api/admin/calendar/events]', err);
    return serverError();
  }
}
