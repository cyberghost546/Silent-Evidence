// app/api/app/push-token/route.ts
// Mobile API — registers an Expo Push Token for the logged-in user.
// Called by the Expo app after the user grants notification permission.
// Stores the token so the server can send push notifications to this device.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  // Read the user ID from the mobile auth header
  const userId = Number(req.headers.get('x-user-id'));
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { token, platform } = await req.json();

  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'Missing push token' }, { status: 400 });
  }

  // Upsert the push subscription — use the token endpoint as the unique key
  // This handles both first-time registration and token refresh
  await prisma.pushSubscription.upsert({
    where: { endpoint: token },
    create: {
      endpoint: token,
      // Expo Push Tokens don't use web push encryption keys,
      // so we store the platform as a marker instead
      p256dh: platform ?? 'expo',
      auth: 'expo-push',
      userId,
    },
    update: { userId },
  });

  return NextResponse.json({ ok: true });
}
