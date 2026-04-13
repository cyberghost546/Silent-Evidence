'use client';
// LiveReaderCount.tsx
// Shows "X reading now" on a story page.
// Sends a heartbeat every 30 seconds to mark this session active,
// and polls the count every 30 seconds to keep the display fresh.

import { useEffect, useRef, useState } from 'react';

// Generate or retrieve a stable anonymous session ID from localStorage
function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem('se_session_id');
  if (!id) {
    // Create a random ID — format: timestamp + random hex
    id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem('se_session_id', id);
  }
  return id;
}

export default function LiveReaderCount({ storyId }: { storyId: number }) {
  const [count, setCount] = useState<number | null>(null);
  const sessionId = useRef<string>('');

  useEffect(() => {
    // Get the stable session ID on the client
    sessionId.current = getSessionId();

    // Heartbeat: tell the server this session is still reading
    const sendHeartbeat = () => {
      fetch('/api/stories/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId, sessionId: sessionId.current }),
      }).catch(() => {});
    };

    // Poll: fetch the current reader count and update the display
    const fetchCount = () => {
      fetch(`/api/stories/presence?storyId=${storyId}`)
        .then(r => r.json())
        .then(d => setCount(d.count))
        .catch(() => {});
    };

    // Send immediately, then every 30 seconds
    sendHeartbeat();
    fetchCount();

    const heartbeatInterval = setInterval(sendHeartbeat, 30_000);
    const pollInterval = setInterval(fetchCount, 30_000);

    return () => {
      clearInterval(heartbeatInterval);
      clearInterval(pollInterval);
    };
  }, [storyId]);

  // Don't render until we have a count (avoids flash of 0)
  if (count === null) return null;

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-green-400 font-medium">
      {/* Pulsing green dot to indicate "live" */}
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
      </span>
      {count} reading now
    </span>
  );
}
