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
    // Color of the status bar — deep red for the horror theme
    theme_color: '#dc2626',

    // App icons in different sizes for different devices
    icons: [
      {
        src: '/icons/icon-72x72.png',
        sizes: '72x72',
        type: 'image/png',
      },
      {
        src: '/icons/icon-96x96.png',
        sizes: '96x96',
        type: 'image/png',
      },
      {
        src: '/icons/icon-128x128.png',
        sizes: '128x128',
        type: 'image/png',
      },
      {
        src: '/icons/icon-144x144.png',
        sizes: '144x144',
        type: 'image/png',
      },
      {
        src: '/icons/icon-152x152.png',
        sizes: '152x152',
        type: 'image/png',
      },
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-384x384.png',
        sizes: '384x384',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512x512.png',
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
        icons: [{ src: '/icons/icon-96x96.png', sizes: '96x96' }],
      },
      {
        name: 'Discover',
        short_name: 'Discover',
        description: 'Swipe through new horror stories',
        url: '/discover',
        icons: [{ src: '/icons/icon-96x96.png', sizes: '96x96' }],
      },
      {
        name: 'Write',
        short_name: 'Write',
        description: 'Write a new story',
        url: '/write',
        icons: [{ src: '/icons/icon-96x96.png', sizes: '96x96' }],
      },
      {
        name: 'Offline Reads',
        short_name: 'Offline',
        description: 'Your saved offline stories',
        url: '/offline-reads',
        icons: [{ src: '/icons/icon-96x96.png', sizes: '96x96' }],
      },
    ],

    // Share target — lets other apps share URLs/text into Silent Evidence
    // e.g. share a URL from Chrome → Silent Evidence to create a story referencing it
    share_target: {
      action: '/write',
      method: 'GET',
      params: {
        title: 'promptTitle',
        text:  'prompt',
        url:   'url',
      },
    },
  };
}
