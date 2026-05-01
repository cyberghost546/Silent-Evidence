/**
 * app/admin/health/page.tsx
 *
 * PURPOSE:
 *   Real-time site health dashboard for administrators. Verifies that the two
 *   critical external services (MariaDB database and Redis cache) are reachable,
 *   reports connection latency for each, displays aggregate DB record counts,
 *   and audits every required and optional environment variable.
 *
 * ACCESS CONTROL:
 *   Protected by the admin layout (app/admin/layout.tsx), which redirects any
 *   non-ADMIN user before this component ever renders. No additional auth checks
 *   are needed here.
 *
 * DATA SOURCES:
 *   - Live TCP ping to MariaDB via Prisma.$queryRaw`SELECT 1`
 *   - Live TCP ping to Redis via ioredis (dynamically imported to avoid bundling
 *     the ioredis client in every page)
 *   - prisma.user.count() and prisma.story.count() for record totals
 *   - process.env for environment-variable presence checks
 *
 * RENDERING:
 *   Pure Server Component — no 'use client' directive. All four async operations
 *   run in a single Promise.all so the page waits for all of them in parallel.
 */

// Prisma client singleton — reused across hot-reloads in development
import { prisma } from '@/lib/prisma';

// ---------------------------------------------------------------------------
// Service probe helpers
// ---------------------------------------------------------------------------

/**
 * checkDb
 * Sends a trivial SQL query (`SELECT 1`) through the Prisma connection pool to
 * verify that the database is reachable and that the connection string in
 * DATABASE_URL is valid.
 *
 * Returns:
 *   ok        — true if the query succeeded
 *   latencyMs — round-trip time in milliseconds, or -1 on failure
 */
async function checkDb(): Promise<{ ok: boolean; latencyMs: number }> {
  const t = Date.now(); // capture start time before any async work
  try {
    // prisma.$queryRaw executes raw SQL; `SELECT 1` is the lightest possible
    // statement — it doesn't touch any table and always returns a single row
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, latencyMs: Date.now() - t };
  } catch {
    // Any error (wrong credentials, host unreachable, etc.) is treated as a fail
    return { ok: false, latencyMs: -1 };
  }
}

/**
 * checkRedis
 * Dynamically imports ioredis (so the 200 KB client is not included in the
 * initial JS bundle) and attempts a PING command to verify the Redis server
 * is reachable.
 *
 * Key ioredis options chosen for a health-check context:
 *   lazyConnect: true        — don't connect in the constructor; wait for r.connect()
 *   connectTimeout: 2000     — fail quickly instead of hanging for the default 10 s
 *   maxRetriesPerRequest: 0  — don't retry failed commands
 *   retryStrategy: () => null — don't reconnect on disconnect; fail immediately
 *
 * The 'error' event listener is attached with an empty handler to prevent Node.js
 * from throwing an unhandled-error exception when the connection is refused.
 */
async function checkRedis(): Promise<{ ok: boolean; latencyMs: number }> {
  const t = Date.now();
  try {
    // Dynamic import keeps ioredis out of the server-side bundle for every page
    const { default: Redis } = await import('ioredis');
    const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
    // Parse the connection URL so we can pass host/port/password as named options
    // (ioredis's URL parsing can sometimes mis-handle complex Redis Cloud URLs)
    const parsed = new URL(redisUrl);
    const r = new Redis({
      host: parsed.hostname,
      port: Number(parsed.port) || 6379,         // default Redis port is 6379
      password: parsed.password || undefined,     // undefined means no auth
      lazyConnect: true,                          // don't auto-connect in constructor
      connectTimeout: 2000,                       // give up after 2 seconds
      maxRetriesPerRequest: 0,                    // fail immediately on error
      retryStrategy: () => null,                  // don't retry — fail fast
    });
    // Suppress the unhandled error event that ioredis emits on connection failure;
    // without this, a refused connection would crash the process in Node.js
    r.on('error', () => {});
    await r.connect(); // establish TCP connection
    await r.ping();    // send PING, expect PONG — confirms the server is processing commands
    await r.disconnect(); // clean up — don't leave an idle connection open
    return { ok: true, latencyMs: Date.now() - t };
  } catch {
    return { ok: false, latencyMs: -1 };
  }
}

// ---------------------------------------------------------------------------
// Environment-variable manifests
// ---------------------------------------------------------------------------

// REQUIRED_VARS: the app cannot function correctly without these.
// If any are missing the CheckRow will show a red FAIL badge.
const REQUIRED_VARS = [
  'DATABASE_URL',         // Prisma connection string
  'NEXTAUTH_SECRET',      // JWT signing secret for NextAuth
  'SMTP_HOST',            // outgoing mail server hostname
  'SMTP_PORT',            // SMTP port (usually 587 or 465)
  'SMTP_USER',            // SMTP login username
  'SMTP_PASS',            // SMTP login password
  'REDIS_URL',            // Redis connection string for rate limiting / caching
  'NEXT_PUBLIC_SITE_URL', // canonical site URL used in email links and OG tags
];

// OPTIONAL_VARS: missing values disable specific features rather than breaking the app.
// The CheckRow shows "Feature disabled" as a sub-label when the var is absent.
const OPTIONAL_VARS = [
  'GOOGLE_CLIENT_ID',             // enables Google OAuth sign-in
  'MICROSOFT_CLIENT_ID',          // enables Microsoft OAuth sign-in
  'DISCORD_CLIENT_ID',            // enables Discord OAuth sign-in
  'STRIPE_SECRET_KEY',            // enables payment/subscription features
  'OPENAI_API_KEY',               // enables AI-powered writing prompts
  'NEXT_PUBLIC_VAPID_PUBLIC_KEY', // enables Web Push notifications
  'VAPID_PRIVATE_KEY',            // server-side VAPID key for push signing
];

// ---------------------------------------------------------------------------
// Small presentational components
// ---------------------------------------------------------------------------

/**
 * Badge
 * Renders a coloured pill indicating pass/fail status.
 * Green with a tick = OK; red with an ✕ = FAIL.
 * The `status-ok` class is a custom CSS selector used in Playwright E2E tests
 * to assert that a check passed without relying on text content.
 *
 * TypeScript: `ok: boolean` is a simple discriminant — no nullable props needed.
 */
function Badge({ ok }: { ok: boolean }) {
  if (ok) {
    return (
      // status-ok is a hook for automated tests (Playwright can target it)
      <span className="status-ok text-xs font-bold px-3 py-1 rounded-full bg-green-500 text-white">
        ✓ OK
      </span>
    );
  }
  return (
    <span className="text-xs font-bold px-3 py-1 rounded-full bg-red-600 text-white">
      ✕ FAIL
    </span>
  );
}

/**
 * CheckRow
 * A single labelled row in a check list.
 * `sub` is optional — it appears in a smaller muted font below the label
 * and is used to show either latency ("42ms") or a warning ("Feature disabled").
 *
 * `last:border-0` removes the bottom border from the final row, preventing
 * a double border against the card's own bottom edge.
 */
function CheckRow({ ok, label, sub }: { ok: boolean; label: string; sub?: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-800 last:border-0">
      <div>
        {/* font-mono keeps env-var names aligned and easier to scan */}
        <p className="text-sm text-white font-mono">{label}</p>
        {/* Only render the sub-label element when there is something to show */}
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
      {/* Badge is purely a visual indicator; the ok prop drives the colour */}
      <Badge ok={ok} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

/**
 * AdminHealthPage (default export)
 *
 * This is an async Server Component. Next.js renders it on the server on every
 * request (no caching) so the health data is always live.
 *
 * Promise.all parallelises all four async operations:
 *   1. checkDb()           — probe the database
 *   2. checkRedis()        — probe the Redis cache
 *   3. prisma.user.count() — total registered users
 *   4. prisma.story.count()— total stories
 *
 * Running them concurrently rather than sequentially means the page load time
 * equals the slowest single operation rather than the sum of all four.
 */
export default async function AdminHealthPage() {
  // Destructure the four results from the parallel fetch
  const [db, redis, userCount, storyCount] = await Promise.all([
    checkDb(),
    checkRedis(),
    prisma.user.count(),
    prisma.story.count(),
  ]);

  return (
    <div>
      {/* Page title and description */}
      <h1 className="text-2xl font-bold text-white mb-1">Site Health</h1>
      <p className="text-gray-500 text-sm mb-8">
        Real-time status of database, cache, and environment configuration.
      </p>

      {/* ── Top row: service pings + DB record counts ── */}
      {/* lg:grid-cols-2 stacks to a single column on mobile, two on large screens */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">

        {/* Service checks card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="font-semibold text-white mb-1">Services</h2>
          <p className="text-xs text-gray-600 mb-4">Checked live on page load</p>

          {/* Database row: show latency on success, error message on failure */}
          <CheckRow
            ok={db.ok}
            label="Database (MariaDB)"
            sub={db.ok ? `${db.latencyMs}ms` : 'Connection failed'}
          />

          {/* Redis row: warn that rate limiting falls back to in-memory when Redis is down */}
          <CheckRow
            ok={redis.ok}
            label="Cache (Redis)"
            sub={redis.ok ? `${redis.latencyMs}ms` : 'Connection failed — rate limiting is memory-only'}
          />
        </div>

        {/* DB record counts card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="font-semibold text-white mb-1">Database counts</h2>
          <p className="text-xs text-gray-600 mb-4">Live from DB</p>

          {/* Use `as const` so TypeScript knows the tuple types precisely */}
          <div className="grid grid-cols-2 gap-4">
            {([['Users', userCount], ['Stories', storyCount]] as const).map(([label, value]) => (
              <div key={label} className="bg-gray-800 rounded-xl p-4">
                {/* toLocaleString adds thousands separators (e.g. 1,234) */}
                <p className="text-xl font-bold text-white">{Number(value).toLocaleString()}</p>
                {/* uppercase tracking-widest gives the label a small-caps label look */}
                <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom row: required and optional environment variables ── */}
      <div className="grid lg:grid-cols-2 gap-6">

        {/* Required vars — any FAIL here means a broken feature */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="font-semibold text-white mb-4">Required env vars</h2>
          {REQUIRED_VARS.map(v => (
            // !!process.env[v] coerces the string value (or undefined) to a boolean
            <CheckRow key={v} ok={!!process.env[v]} label={v} />
          ))}
        </div>

        {/* Optional vars — FAIL just means the related feature is inactive */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="font-semibold text-white mb-4">Optional env vars</h2>
          {OPTIONAL_VARS.map(v => (
            <CheckRow
              key={v}
              ok={!!process.env[v]}
              label={v}
              // Only show the "Feature disabled" note when the var is absent
              sub={!process.env[v] ? 'Feature disabled' : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
