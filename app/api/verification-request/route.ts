// POST /api/verification-request
// Saves a verified-author application to the SiteSetting table (JSON array of requests).
// Admins can view and approve requests in the admin panel.

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0);
  if (!userId) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { username: true, isVerified: true, _count: { select: { stories: true } } },
  });
  if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  if (user.isVerified) return NextResponse.json({ error: 'Already verified.' }, { status: 400 });
  if (user._count.stories < 1) {
    return NextResponse.json({ error: 'You need at least one published story to apply.' }, { status: 400 });
  }

  const body = await req.json();
  const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 1000) : '';
  const links  = typeof body.links  === 'string' ? body.links.trim().slice(0, 500)   : '';

  if (reason.length < 20) {
    return NextResponse.json({ error: 'Please provide a reason (at least 20 characters).' }, { status: 400 });
  }

  // Store applications as a JSON array in the site_settings table
  const KEY = 'verification_requests';
  const existing = await prisma.siteSetting.findUnique({ where: { key: KEY } });
  const requests: unknown[] = existing?.value ? JSON.parse(existing.value) : [];

  // Prevent duplicate applications
  if (requests.some((r: unknown) => (r as { userId: number }).userId === userId)) {
    return NextResponse.json({ error: 'You have already submitted an application.' }, { status: 400 });
  }

  requests.push({
    userId,
    username: user.username,
    reason,
    links,
    submittedAt: new Date().toISOString(),
    status: 'pending',
  });

  await prisma.siteSetting.upsert({
    where: { key: KEY },
    create: { key: KEY, value: JSON.stringify(requests) },
    update: { value: JSON.stringify(requests) },
  });

  return NextResponse.json({ ok: true });
}
