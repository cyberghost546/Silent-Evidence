// tests/session-eviction.test.ts
// getSessionUserId (used by 25+ routes, not just getSessionUser) must reject a
// cookie whose version is behind the account's current sessionVersion — so
// "log out everywhere", break-glass, and password reset actually evict it.
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const u = new URL(process.env.DATABASE_URL!);
const prisma = new PrismaClient({
  adapter: new PrismaMariaDb({
    host: u.hostname,
    port: +u.port || 3306,
    user: u.username,
    password: u.password,
    database: u.pathname.slice(1),
  }),
});
const jar: Record<string, string> = {};
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (n: string) => (jar[n] !== undefined ? { value: jar[n] } : undefined),
  }),
}));

async function sign(id: number, v: number) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(process.env.SESSION_SECRET!),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const s = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(`${id}.${v}`)));
  let b = '';
  for (const x of s) b += String.fromCharCode(x);
  return btoa(b).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function cookieFor(id: number, v: number) {
  jar.userId = String(id);
  jar.userId_v = String(v);
  jar.userId_sig = await sign(id, v);
}

let id: number;
beforeAll(async () => {
  id = (
    await prisma.user.create({
      data: { username: 'zz_ev', email: 'zz_ev@x.invalid', password: 'x'.repeat(60) },
      select: { id: true },
    })
  ).id;
});
afterAll(async () => {
  await prisma.user.delete({ where: { id } }).catch(() => {});
  await prisma.$disconnect();
});

describe('getSessionUserId freshness', () => {
  it('accepts a current-version cookie and rejects a stale one', async () => {
    const { getSessionUserId } = await import('@/lib/session');
    await cookieFor(id, 0);
    expect(await getSessionUserId()).toBe(id);

    // Bump the account version (simulates logout-everywhere / reset).
    await prisma.user.update({ where: { id }, data: { sessionVersion: { increment: 1 } } });

    // The old version-0 cookie is now stale — rejected, even though its signature
    // is internally valid for version 0.
    await cookieFor(id, 0);
    expect(await getSessionUserId()).toBeNull();

    // A freshly issued version-1 cookie works again.
    await cookieFor(id, 1);
    expect(await getSessionUserId()).toBe(id);
  }, 30000);
});
