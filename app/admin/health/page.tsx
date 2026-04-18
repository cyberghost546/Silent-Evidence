// app/admin/health/page.tsx — Site health check: DB, Redis, env vars
import { prisma } from '@/lib/prisma';

async function checkDb(): Promise<{ ok: boolean; latencyMs: number }> {
  const t = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, latencyMs: Date.now() - t };
  } catch {
    return { ok: false, latencyMs: -1 };
  }
}

async function checkRedis(): Promise<{ ok: boolean; latencyMs: number }> {
  const t = Date.now();
  try {
    const { default: Redis } = await import('ioredis');
    const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
    const parsed = new URL(redisUrl);
    const r = new Redis({
      host: parsed.hostname,
      port: Number(parsed.port) || 6379,
      password: parsed.password || undefined,
      lazyConnect: true,
      connectTimeout: 2000,
      maxRetriesPerRequest: 0,
      retryStrategy: () => null, // don't retry — fail fast
    });
    // Suppress the unhandled error event that ioredis emits on connection failure
    r.on('error', () => {});
    await r.connect();
    await r.ping();
    await r.disconnect();
    return { ok: true, latencyMs: Date.now() - t };
  } catch {
    return { ok: false, latencyMs: -1 };
  }
}

const REQUIRED_VARS = [
  'DATABASE_URL', 'NEXTAUTH_SECRET', 'SMTP_HOST', 'SMTP_PORT',
  'SMTP_USER', 'SMTP_PASS', 'REDIS_URL', 'NEXT_PUBLIC_SITE_URL',
];
const OPTIONAL_VARS = [
  'GOOGLE_CLIENT_ID', 'MICROSOFT_CLIENT_ID', 'DISCORD_CLIENT_ID',
  'STRIPE_SECRET_KEY', 'OPENAI_API_KEY', 'NEXT_PUBLIC_VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY',
];

function Badge({ ok }: { ok: boolean }) {
  if (ok) {
    return (
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

function CheckRow({ ok, label, sub }: { ok: boolean; label: string; sub?: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-800 last:border-0">
      <div>
        <p className="text-sm text-white font-mono">{label}</p>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
      <Badge ok={ok} />
    </div>
  );
}

export default async function AdminHealthPage() {
  const [db, redis, userCount, storyCount] = await Promise.all([
    checkDb(), checkRedis(), prisma.user.count(), prisma.story.count(),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Site Health</h1>
      <p className="text-gray-500 text-sm mb-8">
        Real-time status of database, cache, and environment configuration.
      </p>

      {/* Service checks + DB counts */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="font-semibold text-white mb-1">Services</h2>
          <p className="text-xs text-gray-600 mb-4">Checked live on page load</p>
          <CheckRow
            ok={db.ok}
            label="Database (MariaDB)"
            sub={db.ok ? `${db.latencyMs}ms` : 'Connection failed'}
          />
          <CheckRow
            ok={redis.ok}
            label="Cache (Redis)"
            sub={redis.ok ? `${redis.latencyMs}ms` : 'Connection failed — rate limiting is memory-only'}
          />
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="font-semibold text-white mb-1">Database counts</h2>
          <p className="text-xs text-gray-600 mb-4">Live from DB</p>
          <div className="grid grid-cols-2 gap-4">
            {([['Users', userCount], ['Stories', storyCount]] as const).map(([label, value]) => (
              <div key={label} className="bg-gray-800 rounded-xl p-4">
                <p className="text-xl font-bold text-white">{Number(value).toLocaleString()}</p>
                <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Environment variables */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="font-semibold text-white mb-4">Required env vars</h2>
          {REQUIRED_VARS.map(v => (
            <CheckRow key={v} ok={!!process.env[v]} label={v} />
          ))}
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="font-semibold text-white mb-4">Optional env vars</h2>
          {OPTIONAL_VARS.map(v => (
            <CheckRow
              key={v}
              ok={!!process.env[v]}
              label={v}
              sub={!process.env[v] ? 'Feature disabled' : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
