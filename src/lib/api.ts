// lib/api.ts
// Base URL and authenticated fetch helper for the Silent Evidence API.
// Change BASE_URL to your computer's local IP (e.g. http://192.168.1.5:3000)
// when testing on a physical Android/iOS device — localhost won't work on a phone.

import { getAuth } from './auth';

// Use your computer's Wi-Fi IP so the phone can reach the dev server.
// Both your phone and computer must be on the same Wi-Fi network.
// If your IP changes, update this value (run `ipconfig` to check).
export const BASE_URL = 'http://192.168.1.210:3000';

// Sends a fetch request with JSON content-type and the x-user-id header
// automatically attached if the user is logged in.
export async function apiFetch(path: string, options: RequestInit = {}) {
  const auth = getAuth();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    // Spread any caller-provided headers on top
    ...((options.headers as Record<string, string>) ?? {}),
  };

  // Attach the user's ID so API routes can identify who is calling
  if (auth?.userId) {
    headers['x-user-id'] = String(auth.userId);
  }

  return fetch(`${BASE_URL}${path}`, { ...options, headers });
}
