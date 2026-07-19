// lib/rateLimit.ts
// Rate limiter for API routes — prevents brute-force and request-flood abuse.
// Uses Redis (shared across all server instances) when REDIS_URL is configured,
// and transparently falls back to a per-process in-memory Map when it isn't.
// Keyed by IP address + route label.

import { getRedisClient } from '@/lib/cache';

// Stores the count of requests and the time the window started for each key
export const store = new Map<string, { count: number; windowStart: number }>();

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
export async function checkRateLimit(
  ip: string,
  key: string,
  opts: RateLimitOptions
): Promise<RateLimitResult> {
  // Combine IP + key so different endpoints have independent counters per IP
  const storeKey = `${ip}:${key}`;

  // ── Redis path — shared across all instances ────────────────────────────────
  const redis = getRedisClient();
  if (redis) {
    try {
      const redisKey = `rl:${storeKey}`;
      // Atomically increment the counter for this window.
      const count = await redis.incr(redisKey);
      // On the first request of a window, set the expiry so the window slides.
      if (count === 1) {
        await redis.pexpire(redisKey, opts.windowMs);
      }
      // Read remaining TTL to report an accurate reset time; repair a missing
      // expiry (e.g. if the process died between INCR and PEXPIRE).
      let ttl = await redis.pttl(redisKey);
      if (ttl < 0) {
        await redis.pexpire(redisKey, opts.windowMs);
        ttl = opts.windowMs;
      }
      return {
        blocked: count > opts.limit,
        remaining: Math.max(0, opts.limit - count),
        resetAt: Date.now() + ttl,
      };
    } catch {
      // Redis error — fall through to the in-memory limiter below.
    }
  }

  // ── In-memory fallback — per-process only ───────────────────────────────────
  const now = Date.now();
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
 *
 * Only trusted proxy headers are read:
 *   x-vercel-forwarded-for — set by Vercel's edge network (cannot be spoofed by clients)
 *   x-real-ip              — set by Nginx/Cloudflare at the network edge
 *
 * We deliberately do NOT trust x-forwarded-for because any client can set that
 * header to an arbitrary value, which would let attackers rotate fake IPs and
 * bypass rate limiting entirely.
 */
export function getClientIp(req: Request): string {
  // Vercel sets this header at the edge — it reflects the real client IP and
  // cannot be overridden by the client's own request headers.
  const vercelIp = req.headers.get('x-vercel-forwarded-for');
  if (vercelIp) return vercelIp.split(',')[0].trim();

  // Nginx / Cloudflare set x-real-ip at the network boundary — trusted.
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  // Local development fallback — no proxy present.
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
