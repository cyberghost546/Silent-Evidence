// app/api/mood-of-day/route.ts
// GET /api/mood-of-day — returns the most recently set Mood of the Day.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const row = await prisma.moodOfDay.findFirst({
    orderBy: { setAt: 'desc' },
    select: { mood: true, message: true, setAt: true },
  });

  if (!row) return NextResponse.json(null);
  return NextResponse.json(row);
}
