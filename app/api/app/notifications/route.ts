// app/api/app/notifications/route.ts
// Mobile API — returns the logged-in user's notifications (newest first).
// Also marks all unread notifications as read when fetched.
// Used by the Notifications tab in the Expo app.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  // Read the user ID from the mobile auth header
  const userId = Number(req.headers.get('x-user-id'));
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Fetch the most recent 50 notifications with optional story slug for navigation
  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      type: true,
      message: true,
      read: true,
      createdAt: true,
      storyId: true,
      story: { select: { slug: true } },
    },
  });

  // Mark all unread notifications as read now that the user has seen them
  await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });

  return NextResponse.json(notifications);
}
