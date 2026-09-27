// lib/edgeRateLimit.ts
// A rate limiter that can run inside middleware.
//
// WHY A SECOND LIMITER EXISTS
// lib/rateLimit.ts is the good one — it uses Redis, so its counters are shared
// across every server instance. It cannot be used here: it imports ioredis,
// which needs Node APIs that the Edge runtime middleware executes in does not
// provide.
//
// The alternative was adding a per-route limiter call to 152 individual route
// handlers. That is 152 chances to typo a limit, forget an early return, or miss
// a route added next month. Doing it in middleware covers every current route
// and every future one from a single place.
//
// HONEST LIMITATION
// Counters live in this process's memory. On one server that is the whole
// picture; across several instances an attacker gets the limit multiplied by the
// number of instances, and a deploy resets the counters. That is meaningfully
// weaker than the Redis limiter — which is exactly why the Redis one stays on
// the authentication routes, where the stakes are highest. This layer exists to
// stop the content endpoints being hammered, not to replace that.

/** One counter per key, tracking a fixed window. */
type Bucket = { count: number; windowStart: number };

// Module scope, so it survives between requests in the same instance.
const buckets = new Map<string, Bucket>();

// Hard ceiling on tracked keys. Without it, an attacker rotating source
// addresses turns the limiter itself into a memory-exhaustion vector — the
// defence becomes the vulnerability.
const MAX_KEYS = 20_000;

/**
 * Removes expired buckets, and if the map is still oversized, drops the oldest.
 *
 * Called opportunistically on write rather than on a timer: the Edge runtime
 * gives no reliable long-lived timer, and pruning on write means cleanup happens
 * exactly when there is pressure.
 */
function prune(now: number, windowMs: number): void {
  for (const [key, b] of buckets) {
    if (now - b.windowStart > windowMs) buckets.delete(key);
  }
  if (buckets.size <= MAX_KEYS) return;

  // Still too big — evict oldest first.
  const entries = [...buckets.entries()].sort((a, b) => a[1].windowStart - b[1].windowStart);
  for (let i = 0; i < entries.length - MAX_KEYS; i++) buckets.delete(entries[i][0]);
}

export interface EdgeRateLimitResult {
  blocked: boolean;
  /** Seconds until the current window resets — sent as Retry-After. */
  retryAfter: number;
  remaining: number;
}

/**
 * Fixed-window counter.
 *
 * Fixed rather than sliding on purpose: a sliding window needs a timestamp list
 * per key, which multiplies the memory this must be careful about. The tradeoff
 * is burstiness at a window boundary, which does not matter at these limits.
 */
export function edgeRateLimit(key: string, limit: number, windowMs: number): EdgeRateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now - existing.windowStart > windowMs) {
    if (buckets.size > MAX_KEYS) prune(now, windowMs);
    buckets.set(key, { count: 1, windowStart: now });
    return { blocked: false, retryAfter: 0, remaining: limit - 1 };
  }

  existing.count++;
  const elapsed = now - existing.windowStart;
  const retryAfter = Math.max(1, Math.ceil((windowMs - elapsed) / 1000));

  return {
    blocked: existing.count > limit,
    retryAfter,
    remaining: Math.max(0, limit - existing.count),
  };
}

/**
 * Client IP from proxy headers.
 *
 * Deliberately duplicated from lib/rateLimit.ts rather than imported: that
 * module pulls in ioredis through lib/cache, and importing it here would drag
 * Node-only code into the Edge bundle and break the build.
 */
export function edgeClientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return headers.get('x-real-ip') ?? 'unknown';
}

// ── Policy ───────────────────────────────────────────────────────────────────

/** Requests allowed per minute for a mutating API call, by path prefix. */
const LIMITS: { prefix: string; limit: number }[] = [
  // Content creation is expensive (sanitising, AI moderation, notification
  // fan-out) and no human publishes faster than this.
  { prefix: '/api/stories', limit: 10 },
  { prefix: '/api/chapters', limit: 10 },
  { prefix: '/api/comments', limit: 20 },
  // Social actions are cheap individually but are the classic spam/harassment
  // vector, and the volumes here are far above genuine use.
  { prefix: '/api/follows', limit: 30 },
  { prefix: '/api/likes', limit: 60 },
  { prefix: '/api/reactions', limit: 60 },
  { prefix: '/api/messages', limit: 20 },
  { prefix: '/api/reports', limit: 10 },
  // Anything that costs money or an outbound email.
  { prefix: '/api/stripe', limit: 10 },
  { prefix: '/api/upload', limit: 20 },
];

/** Default for any mutating API route not listed above. */
const DEFAULT_LIMIT = 40;

export const WINDOW_MS = 60_000;

/**
 * Paths that must never be rate limited here.
 *
 * The Stripe webhook is the important one: it is authenticated by signature, not
 * by session, and Stripe retries on failure. Throttling it would silently drop
 * payment confirmations and then retry them into the same wall.
 */
const EXEMPT = ['/api/stripe/webhook', '/api/cron'];

export function isExempt(pathname: string): boolean {
  return EXEMPT.some((p) => pathname.startsWith(p));
}

export function limitFor(pathname: string): number {
  const match = LIMITS.find((l) => pathname.startsWith(l.prefix));
  return match ? match.limit : DEFAULT_LIMIT;
}
