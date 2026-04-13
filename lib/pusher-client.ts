// lib/pusher-client.ts
// Client-side Pusher setup for receiving real-time events in the browser.
// Provides a singleton Pusher instance and a React hook for subscribing to channels.
//
// Usage in a component:
//   const channel = usePusherChannel('private-user-42');
//   useEffect(() => {
//     if (!channel) return;
//     channel.bind('new-message', (data) => { /* handle message */ });
//     return () => channel.unbind('new-message');
//   }, [channel]);
//
// If NEXT_PUBLIC_PUSHER_KEY is not set, the hook returns null and
// components fall back to their existing polling behavior.

'use client';

import Pusher from 'pusher-js';
import { useEffect, useRef } from 'react';

// Singleton Pusher instance — shared across all components
let pusherInstance: Pusher | null = null;

function getPusherClient(): Pusher | null {
  // Key must be set as a public env var for the browser to use
  const key     = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

  if (!key || !cluster) return null;

  if (!pusherInstance) {
    pusherInstance = new Pusher(key, {
      cluster,
      // Auth endpoint for private/presence channels — Pusher calls this
      // automatically when subscribing to a private-* or presence-* channel
      channelAuthorization: {
        endpoint: '/api/pusher/auth',
        transport: 'ajax',
      },
    });
  }

  return pusherInstance;
}

/**
 * React hook that subscribes to a Pusher channel and returns it.
 * Automatically unsubscribes when the component unmounts or channelName changes.
 * Returns null if Pusher is not configured (components should fall back to polling).
 */
export function usePusherChannel(channelName: string | null) {
  const channelRef = useRef<ReturnType<Pusher['subscribe']> | null>(null);

  useEffect(() => {
    if (!channelName) return;

    const client = getPusherClient();
    if (!client) return;

    // Subscribe to the channel
    const channel = client.subscribe(channelName);
    channelRef.current = channel;

    // Cleanup: unsubscribe when component unmounts or channel name changes
    return () => {
      client.unsubscribe(channelName);
      channelRef.current = null;
    };
  }, [channelName]);

  return channelRef.current;
}

export { getPusherClient };
