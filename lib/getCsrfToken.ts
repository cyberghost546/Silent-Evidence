// lib/getCsrfToken.ts
// Browser-only utility that returns the current CSRF token.
//
// On first call:
//   1. Reads the csrf_token cookie set by the server.
//   2. If the cookie is absent, fetches /api/csrf to generate one.
//   3. Caches the token in a module-level variable for the page lifetime.
//
// Usage (in any client event handler):
//   const token = await getCsrfToken();
//   fetch('/api/comments', { method: 'POST', headers: { ..., 'x-csrf-token': token }, ... })

let cached: string | null = null;

function readCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function getCsrfToken(): Promise<string> {
  if (cached) return cached;

  const fromCookie = readCookie();
  if (fromCookie) {
    cached = fromCookie;
    return cached;
  }

  try {
    const res = await fetch('/api/csrf');
    if (res.ok) {
      const data = await res.json();
      const token: string = data.token ?? '';
      cached = token;
      return token;
    }
  } catch {
    // If the CSRF endpoint is unreachable, return empty string.
    // The server will reject the request with 403 — the user sees an error.
  }
  return '';
}
