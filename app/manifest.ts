// app/manifest.ts
// Next.js built-in PWA manifest — tells the phone how to install the app.
// Controls the app name, icon, colors, and how it launches.

import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    // App name shown on the home screen
    name: 'Silent Evidence',
    // Shorter name shown under the icon if the full name is too long
    short_name: 'Silent Evidence',
    description: 'A community for horror story readers and writers.',

    // Start page when the app is opened
    start_url: '/',

    // standalone = opens without browser address bar (looks like a real app)
    display: 'standalone',

    // Portrait mode feels more natural for reading stories
    orientation: 'portrait',

    // Background color shown on the splash screen while the app loads
    background_color: '#111827',

    // Color of the status bar at the top of the phone
    // Color of the status bar — black/green for the horror theme
    theme_color: '#22c55e',

    // PWABuilder requires:
    //   - A 192x192 with purpose "any"
    //   - A 512x512 with purpose "any"   ← for store listing / splash screen
    //   - A 512x512 with purpose "maskable" ← for adaptive icons on Android
    icons: [
      {
        src: '/icons/web-app-manifest-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/web-app-manifest-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/web-app-manifest-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],

    // App categories for app stores / search
    categories: ['entertainment', 'books', 'social'],

    // Home screen shortcuts — long-press the icon on Android to see these
    shortcuts: [
      {
        name: 'Daily Story',
        short_name: 'Daily',
        description: "Today's featured horror story",
        url: '/story-of-day',
        icons: [{ src: '/icons/web-app-manifest-192x192.png', sizes: '192x192' }],
      },
      {
        name: 'Discover',
        short_name: 'Discover',
        description: 'Swipe through new horror stories',
        url: '/discover',
        icons: [{ src: '/icons/web-app-manifest-192x192.png', sizes: '192x192' }],
      },
      {
        name: 'Write',
        short_name: 'Write',
        description: 'Write a new story',
        url: '/write',
        icons: [{ src: '/icons/web-app-manifest-192x192.png', sizes: '192x192' }],
      },
      {
        name: 'Offline Reads',
        short_name: 'Offline',
        description: 'Your saved offline stories',
        url: '/offline-reads',
        icons: [{ src: '/icons/web-app-manifest-192x192.png', sizes: '192x192' }],
      },
    ],

    // Share target — lets other apps share URLs/text into Silent Evidence
    // e.g. share a URL from Chrome → Silent Evidence to create a story referencing it
    share_target: {
      action: '/write',
      method: 'GET',
      params: {
        title: 'promptTitle',
        text: 'prompt',
        url: 'url',
      },
    },
  };
}
