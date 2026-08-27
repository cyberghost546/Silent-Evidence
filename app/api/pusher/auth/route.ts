// app/api/pusher/auth/route.ts
// Pusher channel authorization endpoint.
// When a client subscribes to a private-* or presence-* channel,
// Pusher calls this endpoint to verify the user has permission.
// Only allows users to subscribe to their own private channels.

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getPusher } from '@/lib/pusher';

export async function POST(req: NextRequest) {
  const pusher = getPusher();
  if (!pusher) {
    return NextResponse.json({ error: 'Pusher not configured' }, { status: 500 });
  }

  // Get the logged-in user from the session cookie
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value);
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 403 });
  }

  // Pusher sends the socket_id and channel_name as form data
  const body = await req.formData();
  const socketId = body.get('socket_id') as string;
  const channelName = body.get('channel_name') as string;

  if (!socketId || !channelName) {
    return NextResponse.json({ error: 'Missing socket_id or channel_name' }, { status: 400 });
  }

  // Security check: only allow users to subscribe to their own private channel
  // Format: "private-user-{userId}" — the userId in the channel must match the logged-in user
  if (channelName.startsWith('private-user-')) {
    const channelUserId = Number(channelName.replace('private-user-', ''));
    if (channelUserId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  // Authorize the subscription — Pusher verifies this response
  const authResponse = pusher.authorizeChannel(socketId, channelName);
  return NextResponse.json(authResponse);
}
