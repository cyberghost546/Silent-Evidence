// app/api/calendar-events/route.ts
// Public endpoint — returns upcoming custom calendar events for the homepage widget.
// Returns events from today onwards, up to 90 days ahead.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { serverError } from '@/lib/apiError';
import { unstable_cache } from 'next/cache';

const getEvents = unstable_cache(
  async () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const ninety = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    return prisma.calendarEvent.findMany({
      where: { date: { gte: now, lte: ninety } },
      orderBy: { date: 'asc' },
      select: { id: true, date: true, title: true, icon: true, note: true, linkUrl: true },
    });
  },
  ['calendar-events'],
  { revalidate: 60, tags: ['calendar-events'] }
);

export async function GET() {
  try {
    const events = await getEvents();
    return NextResponse.json(events);
  } catch (err) {
    console.error('[GET /api/calendar-events]', err);
    return serverError();
  }
}
