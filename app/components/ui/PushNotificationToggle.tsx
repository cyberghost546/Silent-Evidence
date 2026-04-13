'use client';
// app/components/ui/PushNotificationToggle.tsx
// Lets logged-in users subscribe/unsubscribe from browser push notifications.
// Requires NEXT_PUBLIC_VAPID_PUBLIC_KEY to be set and a registered service worker.
// Falls back gracefully when push isn't supported (old browsers / HTTP).

import { useEffect, useState } from 'react';

// Converts a URL-safe base64 VAPID public key to the Uint8Array the browser needs
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

type Status = 'loading' | 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed';

export default function PushNotificationToggle() {
  const [status, setStatus] = useState<Status>('loading');
  const [busy, setBusy]     = useState(false);
  const [saved, setSaved]   = useState(false);

  useEffect(() => {
    // Push is only available over HTTPS with a registered SW and VAPID keys configured
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window) ||
      !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    ) {
      setStatus('unsupported');
      return;
    }

    if (Notification.permission === 'denied') {
      setStatus('denied');
      return;
    }

    // Check if this browser already has an active push subscription
    navigator.serviceWorker.ready.then((reg) =>
      reg.pushManager.getSubscription().then((sub) => {
        setStatus(sub ? 'subscribed' : 'unsubscribed');
      })
    );
  }, []);

  const subscribe = async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;

      // Request notification permission — this triggers the browser's permission prompt
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus('denied');
        setBusy(false);
        return;
      }

      // Subscribe to the push service using the server's VAPID public key
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!).buffer as ArrayBuffer,
      });

      // Save the subscription object on the server
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      });

      setStatus('subscribed');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // Permission denied mid-flow, or push service error
    } finally {
      setBusy(false);
    }
  };

  const unsubscribe = async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        // Remove from push service
        await sub.unsubscribe();
        // Remove from our database
        await fetch('/api/push/unsubscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
      }
      setStatus('unsubscribed');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setBusy(false);
    }
  };

  if (status === 'unsupported') return null; // silently hide on unsupported browsers

  return (
    <div className="flex items-center justify-between py-3 border border-gray-800 rounded-xl px-4 bg-gray-900">
      <div>
        <p className="text-sm font-medium text-white">Browser Push Notifications</p>
        <p className="text-xs text-gray-500 mt-0.5">
          {status === 'denied'
            ? 'Blocked by browser — allow notifications in your browser settings.'
            : 'Get notified instantly for new followers, comments, and replies.'}
        </p>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        {saved && <span className="text-xs text-green-400 font-medium">✓ Saved</span>}

        {status === 'loading' ? (
          <span className="text-xs text-gray-600">…</span>
        ) : status === 'denied' ? (
          <span className="text-xs text-red-400 font-medium">Blocked</span>
        ) : (
          // Toggle switch — same visual pattern as NewsletterToggle
          <button
            onClick={status === 'subscribed' ? unsubscribe : subscribe}
            disabled={busy}
            aria-label={status === 'subscribed' ? 'Disable push notifications' : 'Enable push notifications'}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
              status === 'subscribed' ? 'bg-red-600' : 'bg-gray-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                status === 'subscribed' ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        )}
      </div>
    </div>
  );
}
