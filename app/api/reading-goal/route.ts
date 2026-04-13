// app/api/reading-goal/route.ts
// GET  — returns the current user's reading goal + progress for the current period.
// POST — creates or updates the reading goal (target + period).

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const c = await cookies();
  const userId = Number(c.get('userId')?.value ?? 0);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const goal = await prisma.readingGoal.findUnique({ where: { userId } });
  if (!goal) return NextResponse.json(null);

  // Calculate progress: count distinct stories read in the current period
  const now = new Date();
  let periodStart: Date;
  if (goal.period === 'weekly') {
    // Start of the current ISO week (Monday)
    const day = now.getDay(); // 0=Sun, 1=Mon…
    const diff = (day === 0 ? -6 : 1 - day); // days back to Monday
    periodStart = new Date(now);
    periodStart.setDate(now.getDate() + diff);
    periodStart.setHours(0, 0, 0, 0);
  } else {
    // Start of current calendar month
    periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  const progress = await prisma.readingHistory.count({
    where: { userId, readAt: { gte: periodStart } },
  });

  return NextResponse.json({ ...goal, progress });
}

export async function POST(req: NextRequest) {
  const c = await cookies();
  const userId = Number(c.get('userId')?.value ?? 0);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { target, period } = await req.json();
  if (!target || target < 1 || target > 500) {
    return NextResponse.json({ error: 'Invalid target' }, { status: 400 });
  }
  if (!['weekly', 'monthly'].includes(period)) {
    return NextResponse.json({ error: 'Period must be weekly or monthly' }, { status: 400 });
  }

  const goal = await prisma.readingGoal.upsert({
    where: { userId },
    create: { userId, target: Number(target), period },
    update: { target: Number(target), period },
  });

  return NextResponse.json(goal);
}

export async function DELETE() {
  const c = await cookies();
  const userId = Number(c.get('userId')?.value ?? 0);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await prisma.readingGoal.deleteMany({ where: { userId } });
  return NextResponse.json({ ok: true });
}
