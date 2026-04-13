'use client';
// app/components/ui/ServiceWorkerRegistration.tsx
// Registers the service worker (sw.js) when the app loads.
// Must be a client component because it runs browser-only code.
// Renders nothing visible — it's purely a background registration.

import { useEffect } from 'react';

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    // Service workers only work in secure contexts (https or localhost)
    if ('serviceWorker' in navigator) {
      // Register after the page has fully loaded so it doesn't slow down first paint
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            console.log('[PWA] Service worker registered:', reg.scope);
          })
          .catch((err) => {
            console.error('[PWA] Service worker registration failed:', err);
          });
      });
    }
  }, []); // Empty array = run once on mount

  // This component renders nothing — it's just a side-effect runner
  return null;
}
