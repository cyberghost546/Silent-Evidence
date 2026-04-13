// lib/cache.ts
// Redis-backed caching layer for expensive database queries.
// Falls back gracefully to no-cache if Redis is not configured (REDIS_URL not set).
//
// Usage:
//   const stories = await cache('homepage:stories', 60, () => prisma.story.findMany(...));
//
// This will:
//   1. Check Redis for a cached result under the key 'homepage:stories'
//   2. If found (and not expired), return the cached value immediately — no DB hit
//   3. If not found, run the fetcher function, store the result in Redis for 60 seconds,
//      then return it

import Redis from 'ioredis';

// ── Redis client ──────────────────────────────────────────────────────────────
// Singleton pattern — reuse the same connection across hot reloads in dev
let redis: Redis | null = null;

function getRedis(): Redis | null {
  // If no REDIS_URL is configured, caching is disabled — all fetches go to the DB
  if (!process.env.REDIS_URL) return null;

  // In Next.js dev mode, the module can be re-evaluated on hot reload.
  // Store the client on globalThis to avoid creating multiple connections.
  const g = globalThis as typeof globalThis & { __redis?: Redis };
  if (!g.__redis) {
    g.__redis = new Redis(process.env.REDIS_URL, {
      // Retry strategy: wait 2 seconds between attempts, give up after 3 attempts
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => (times > 3 ? null : 2000),
      // Don't crash the app if Redis is temporarily unavailable
      enableOfflineQueue: false,
      lazyConnect: true,
    });

    // Log errors but don't throw — the app should work without Redis
    g.__redis.on('error', (err: Error) => {
      console.warn('[cache] Redis error:', err.message);
    });
  }
  g.__redis.connect().catch(() => {}); // connect lazily, ignore already-connected errors
  redis = g.__redis;
  return redis;
}

// ── Cache prefix — namespaces all keys to avoid collisions ───────────────────
const PREFIX = 'se:'; // "se" = Silent Evidence

// ── Main cache helper ─────────────────────────────────────────────────────────

/**
 * cache<T> — get a value from Redis, or compute and store it.
 *
 * @param key      - Cache key (e.g. 'homepage:stories' or `story:${id}`)
 * @param ttlSecs  - How long to cache the result in seconds
 * @param fetcher  - Async function that produces the value if cache misses
 *
 * Returns the cached or freshly fetched value.
 * If Redis is unavailable, always runs the fetcher (no-cache mode).
 */
export async function cache<T>(
  key: string,
  ttlSecs: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const client = getRedis();

  // No Redis configured — skip caching entirely
  if (!client) return fetcher();

  const fullKey = PREFIX + key;

  try {
    // Try to get existing cached value
    const cached = await client.get(fullKey);
    if (cached !== null) {
      // Cache hit — parse JSON and return without hitting the DB
      return JSON.parse(cached) as T;
    }
  } catch (err) {
    // Redis read failed — fall through to fetcher
    console.warn('[cache] Redis GET failed for', key, err);
  }

  // Cache miss — fetch the real data
  const value = await fetcher();

  try {
    // Store in Redis with an expiry (EX = seconds)
    await client.set(fullKey, JSON.stringify(value), 'EX', ttlSecs);
  } catch (err) {
    // Redis write failed — still return the data, just not cached
    console.warn('[cache] Redis SET failed for', key, err);
  }

  return value;
}

/**
 * invalidate — deletes one or more cache keys.
 * Call this when data changes (e.g. a story is published, a user is updated).
 *
 * @param keys - One or more keys to delete (without the prefix)
 *
 * Example:
 *   await invalidate('homepage:stories', `story:${id}`);
 */
export async function invalidate(...keys: string[]): Promise<void> {
  const client = getRedis();
  if (!client || keys.length === 0) return;

  try {
    const fullKeys = keys.map((k) => PREFIX + k);
    await client.del(...fullKeys);
  } catch (err) {
    console.warn('[cache] Redis DEL failed:', err);
  }
}

/**
 * invalidatePattern — deletes all cache keys matching a glob pattern.
 * Use sparingly — SCAN is slower than DEL on large key sets.
 *
 * @param pattern - Glob pattern e.g. 'story:*' or 'user:42:*'
 *
 * Example:
 *   await invalidatePattern('homepage:*');
 */
export async function invalidatePattern(pattern: string): Promise<void> {
  const client = getRedis();
  if (!client) return;

  try {
    // SCAN is non-blocking unlike KEYS — safe to use in production
    let cursor = '0';
    do {
      const [nextCursor, keys] = await client.scan(
        cursor,
        'MATCH',
        PREFIX + pattern,
        'COUNT',
        100
      );
      cursor = nextCursor;
      if (keys.length > 0) {
        await client.del(...keys);
      }
    } while (cursor !== '0');
  } catch (err) {
    console.warn('[cache] Redis SCAN/DEL failed for pattern', pattern, err);
  }
}

// ── Cache TTL constants — use these for consistency across routes ─────────────
export const TTL = {
  SHORT:   30,         // 30 seconds — frequently changing data (notifications, counts)
  MEDIUM:  60 * 5,     // 5 minutes  — semi-static data (story listings, categories)
  LONG:    60 * 60,    // 1 hour     — rarely changing data (user profiles, tags)
  DAY:     60 * 60 * 24, // 24 hours — very stable data (static pages, leaderboards)
} as const;
