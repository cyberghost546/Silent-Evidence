// lib/rateLimit.ts
// In-memory rate limiter for API routes — prevents brute-force attacks on auth endpoints.
// Uses a Map keyed by IP address + route label to track request counts and windows.
// NOTE: This is per-process only. For multi-server deployments, swap to Redis-backed rate limiting.

// Stores the count of requests and the time the window started for each key
const store = new Map<string, { count: number; windowStart: number }>();

// Clean up old entries every 5 minutes so the Map doesn't grow forever
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of store.entries()) {
    // Remove entries whose window expired more than 1 hour ago
    if (now - val.windowStart > 60 * 60 * 1000) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

interface RateLimitOptions {
  // Maximum number of requests allowed within the window
  limit: number;
  // Window size in milliseconds
  windowMs: number;
}

interface RateLimitResult {
  // true = request is blocked (too many attempts)
  blocked: boolean;
  // How many requests remain in the current window
  remaining: number;
  // When the current window resets (Unix ms timestamp)
  resetAt: number;
}

/**
 * checkRateLimit — call at the top of an API route handler.
 *
 * @param ip   - The client's IP address (from request headers)
 * @param key  - A label identifying this limiter, e.g. "login" or "register"
 * @param opts - { limit, windowMs }
 *
 * Example:
 *   const result = checkRateLimit(ip, 'login', { limit: 5, windowMs: 15 * 60 * 1000 });
 *   if (result.blocked) return NextResponse.json({ error: 'Too many attempts' }, { status: 429 });
 */
export function checkRateLimit(
  ip: string,
  key: string,
  opts: RateLimitOptions
): RateLimitResult {
  const now = Date.now();
  // Combine IP + key so different endpoints have independent counters per IP
  const storeKey = `${ip}:${key}`;
  const entry = store.get(storeKey);

  // If no entry exists OR the window has expired, start a fresh window
  if (!entry || now - entry.windowStart >= opts.windowMs) {
    store.set(storeKey, { count: 1, windowStart: now });
    return {
      blocked: false,
      remaining: opts.limit - 1,
      resetAt: now + opts.windowMs,
    };
  }

  // Window is still active — increment the counter
  entry.count += 1;

  const remaining = Math.max(0, opts.limit - entry.count);
  const blocked = entry.count > opts.limit;

  return {
    blocked,
    remaining,
    resetAt: entry.windowStart + opts.windowMs,
  };
}

/**
 * getClientIp — extracts the real client IP from Next.js request headers.
 * Falls back to '127.0.0.1' if none is found (e.g. local dev with no proxy).
 */
export function getClientIp(req: Request): string {
  // x-forwarded-for is set by reverse proxies (Vercel, Nginx, Cloudflare, etc.)
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    // May be a comma-separated list — take the first (original client) IP
    return forwarded.split(',')[0].trim();
  }
  // x-real-ip is set by some proxies (e.g. Nginx with proxy_set_header)
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  return '127.0.0.1';
}

/**
 * anonymizeIp — masks the last octet of an IPv4 address (or last group of IPv6)
 * before storing in the database. Satisfies GDPR data minimisation requirements
 * while still letting admins spot network-level patterns.
 *
 * Examples:
 *   "203.0.113.42"          → "203.0.113.x"
 *   "2001:db8::1"           → "2001:db8::x"
 *   "127.0.0.1"             → "127.0.0.x"
 */
export function anonymizeIp(ip: string): string {
  if (!ip) return 'x.x.x.x';
  // IPv4 — replace last octet
  if (ip.includes('.')) {
    const parts = ip.split('.');
    if (parts.length === 4) {
      parts[3] = 'x';
      return parts.join('.');
    }
  }
  // IPv6 — replace last colon-group
  if (ip.includes(':')) {
    const idx = ip.lastIndexOf(':');
    return ip.substring(0, idx + 1) + 'x';
  }
  return ip;
}
