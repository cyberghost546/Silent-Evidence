// public/sw.js
// Service Worker — runs in the background on the user's phone.
// Caches pages so the app works offline and loads faster.

// Cache name — bumped when a new version of the SW is deployed
const CACHE_NAME = 'animenexus-v1';

// Separate cache dedicated to user-saved offline stories.
// Kept independently so we never accidentally purge it during version upgrades.
// Separate cache for user-saved offline stories — kept across SW upgrades
const OFFLINE_STORIES_CACHE = 'av-offline-stories';

// These files get cached immediately when the app is installed
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/widget',   // home screen widget page — must work offline
];

// ── Install event ──
// Fires once when the service worker is first installed.
// Pre-caches the most important pages.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // Take control immediately without waiting for old SW to die
  self.skipWaiting();
});

// ── Activate event ──
// Fires after install. Cleans up old caches from previous versions.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          // Keep the main app cache AND the user's offline stories cache.
          // Deleting OFFLINE_STORIES_CACHE would force every saved story to be
          // re-fetched from the network, which defeats the purpose of offline saves.
          .filter((key) => key !== CACHE_NAME && key !== OFFLINE_STORIES_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  // Take control of all open pages immediately
  self.clients.claim();
});

// ── Push event ──
// Fires when the server sends a Web Push message to this subscription.
// Shows a system notification using the payload from the server.
self.addEventListener('push', (event) => {
  let data = { title: 'Anime Nexus', body: 'You have a new notification.', url: '/', icon: '/icon-192.png' };

  // Parse the JSON payload the server sent (see lib/webpush.ts PushPayload type)
  try { if (event.data) data = { ...data, ...JSON.parse(event.data.text()) }; } catch {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: '/icon-72.png',  // small monochrome icon shown in the notification shade
      data: { url: data.url }, // passed through to notificationclick below
    })
  );
});

// ── Notification click event ──
// Fires when the user taps a push notification.
// Focuses an existing tab for the target URL or opens a new one.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url ?? '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Reuse an existing tab if one is already on that page
      const existing = clients.find((c) => c.url === targetUrl);
      if (existing) return existing.focus();
      return self.clients.openWindow(targetUrl);
    })
  );
});

// ── Fetch event ──
// Intercepts every network request.
// Strategy: Network first, fall back to cache, fall back to offline page.
self.addEventListener('fetch', (event) => {
  // Only handle GET requests — skip POST/PUT/DELETE (API calls)
  if (event.request.method !== 'GET') return;

  // Skip Stripe and external requests — always go to network for those
  const url = new URL(event.request.url);
  if (!url.origin.includes(self.location.origin)) return;

  event.respondWith(
    // ── Cache-first for offline stories ──────────────────────────────────────
    // Check the user's offline story cache BEFORE hitting the network.
    // If the user saved this story, we serve it immediately — even without internet.
    // This runs before the regular network-first logic below so saved stories
    // are always instant and always available offline.
    caches.open(OFFLINE_STORIES_CACHE).then((offlineCache) =>
      offlineCache.match(event.request)
    ).then((offlineCached) => {
      // If we found a cached offline story, return it right away — no network needed
      if (offlineCached) return offlineCached;

      // No offline story match — fall through to the regular network-first strategy
      return fetch(event.request)
      .then((response) => {
        // If we got a valid response, cache it for next time
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        // Network failed — try the cache
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          // Nothing in cache either — show the offline page
          return caches.match('/offline');
        });
      });
    }) // closes the .then((offlineCached) => { ... }) block
  );  // closes event.respondWith(...)
}); // closes self.addEventListener('fetch', ...)

// ── Periodic Background Sync ──
// Fires once per day (if the user granted permission) to refresh the daily story widget.
// The app requests this registration in PWAInstallPrompt.tsx via navigator.periodicSync.register().
// This keeps the /widget page and /api/widget/daily-story fresh in cache automatically.
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'daily-story-sync') {
    event.waitUntil(
      // Re-cache the widget page and its data so it's fresh when opened offline
      Promise.all([
        caches.open(CACHE_NAME).then(async (cache) => {
          try {
            // Fetch a fresh copy of the widget page and store it
            const [widgetPage, widgetData] = await Promise.all([
              fetch('/widget'),
              fetch('/api/widget/daily-story'),
            ]);
            if (widgetPage.ok)  cache.put('/widget', widgetPage);
            if (widgetData.ok)  cache.put('/api/widget/daily-story', widgetData);
          } catch {
            // Periodic sync failed (no network) — existing cache is still valid
          }
        }),
      ])
    );
  }
});
