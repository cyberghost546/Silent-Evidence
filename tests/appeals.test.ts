import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const u = new URL(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter: new PrismaMariaDb({ host:u.hostname, port:+u.port||3306, user:u.username, password:u.password, database:u.pathname.slice(1) }) });

// Mock CSRF (verified elsewhere) and cookies/session per-test via a mutable jar.
vi.mock('@/lib/csrf', () => ({ verifyCsrfToken: async () => true }));
const jar: Record<string, string> = {};
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (jar[n] !== undefined ? { value: jar[n] } : undefined) }),
}));

// Sign a real session cookie (id + version) the way lib/sessionCookie does, so the
// hardened getSessionUser accepts it. New users are at sessionVersion 0.
async function signVersioned(id: number, version: number): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(process.env.SESSION_SECRET!), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(`${id}.${version}`)));
  let b = ''; for (const x of sig) b += String.fromCharCode(x);
  return btoa(b).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

let affected: number, modA: number, modB: number, noTfaAdmin: number, actionId: number;

beforeAll(async () => {
  // Admins are created with 2FA enabled because requireAdmin now enforces it.
  const mk = async (n: string, role: 'USER' | 'ADMIN') =>
    (await prisma.user.create({ data: { username: n, email: `${n}@x.invalid`, password: 'x'.repeat(60), role, twoFactorEnabled: role === 'ADMIN' }, select: { id: true } })).id;
  affected = await mk('zz_ap_user', 'USER');
  modA = await mk('zz_ap_modA', 'ADMIN');
  modB = await mk('zz_ap_modB', 'ADMIN');
  // An admin WITHOUT 2FA, to prove requireAdmin's 2FA enforcement.
  noTfaAdmin = (await prisma.user.create({ data: { username: 'zz_ap_no2fa', email: 'zz_ap_no2fa@x.invalid', password: 'x'.repeat(60), role: 'ADMIN', twoFactorEnabled: false }, select: { id: true } })).id;
});
afterAll(async () => {
  await prisma.moderationAction.deleteMany({ where: { affectedUserId: affected } });
  await prisma.user.deleteMany({ where: { username: { startsWith: 'zz_ap_' } } });
  await prisma.$disconnect();
});

const setUser = async (id: number) => { jar.userId = String(id); jar.userId_v = "0"; jar.userId_sig = await signVersioned(id, 0); };
const jsonReq = (body: unknown) => new Request('http://t', { method: 'POST', body: JSON.stringify(body) });
const patchReq = (body: unknown) => new Request('http://t', { method: 'PATCH', body: JSON.stringify(body) });

describe('DSA appeals lifecycle', () => {
  it('modA records an action; user sees it and appeals; modA cannot review own; modB overturns', async () => {
    // 1. Admin A records a content-removal with a statement of reasons.
    await setUser(modA);
    const { POST: recordAction } = await import('@/app/api/admin/moderation/route');
    const rec = await recordAction(jsonReq({
      type: 'CONTENT_REMOVED', targetType: 'STORY', targetId: 999, affectedUserId: affected,
      reason: 'HATE_SPEECH', explanation: 'Removed for a slur in paragraph two.',
    }));
    expect(rec.status).toBe(201);
    actionId = (await rec.json()).actionId;

    // Statement-of-reasons notification delivered to the user.
    const notif = await prisma.notification.findFirst({ where: { userId: affected, type: 'MODERATION' } });
    expect(notif).not.toBeNull();

    // 2. The user files an appeal.
    await setUser(affected);
    const { POST: fileAppeal } = await import('@/app/api/appeals/route');
    const filed = await fileAppeal(jsonReq({ actionId, message: 'The word was in dialogue by a villain, not hate speech.' }));
    expect(filed.status).toBe(201);

    // 2b. A second appeal on the same action is refused.
    const dup = await fileAppeal(jsonReq({ actionId, message: 'appealing again to test the guard' }));
    expect(dup.status).toBe(409);

    const appeal = await prisma.moderationAppeal.findFirst({ where: { actionId }, select: { id: true } });
    const appealId = appeal!.id;

    // 3. Independence: Admin A (original moderator) may NOT decide it.
    await setUser(modA);
    const { PATCH: decide } = await import('@/app/api/admin/appeals/[id]/route');
    const selfReview = await decide(patchReq({ decision: 'UPHELD' }), { params: Promise.resolve({ id: String(appealId) }) });
    expect(selfReview.status).toBe(403);

    // 4. Admin B overturns it.
    await setUser(modB);
    const overturn = await decide(patchReq({ decision: 'OVERTURNED', note: 'Agreed — it was in-character dialogue.' }), { params: Promise.resolve({ id: String(appealId) }) });
    expect(overturn.status).toBe(200);

    // 5. Effects: appeal OVERTURNED, action REVERSED, user notified.
    const finalAppeal = await prisma.moderationAppeal.findUnique({ where: { id: appealId }, select: { status: true, reviewerId: true } });
    expect(finalAppeal!.status).toBe('OVERTURNED');
    expect(finalAppeal!.reviewerId).toBe(modB);
    const finalAction = await prisma.moderationAction.findUnique({ where: { id: actionId }, select: { status: true } });
    expect(finalAction!.status).toBe('REVERSED');

    // 6. Deciding an already-decided appeal is refused.
    const again = await decide(patchReq({ decision: 'UPHELD' }), { params: Promise.resolve({ id: String(appealId) }) });
    expect(again.status).toBe(409);
  }, 60000);

  it('a user cannot appeal a decision that is not theirs', async () => {
    await setUser(modB); // a different user
    const { POST: fileAppeal } = await import('@/app/api/appeals/route');
    const res = await fileAppeal(jsonReq({ actionId, message: 'trying to appeal someone elses action' }));
    expect(res.status).toBe(404);
  }, 60000);
});

// Folded in here (rather than a separate file) because the process.env mutation
// this needs leaks across test files in a shared worker.
describe('requireAdmin 2FA enforcement', () => {
  it('rejects an admin without 2FA, accepts one with it, and honours the escape hatch', async () => {
    const { requireAdmin } = await import('@/lib/session');

    // Admin without 2FA → rejected.
    await setUser(noTfaAdmin);
    expect(await requireAdmin()).toBeNull();

    // Admin with 2FA → accepted.
    await setUser(modA);
    expect((await requireAdmin())?.id).toBe(modA);

    // Escape hatch lets the no-2FA admin through, then is cleaned up so it does
    // not leak to other tests.
    process.env.REQUIRE_ADMIN_2FA = 'false';
    try {
      await setUser(noTfaAdmin);
      expect((await requireAdmin())?.id).toBe(noTfaAdmin);
    } finally {
      delete process.env.REQUIRE_ADMIN_2FA;
    }
  }, 60000);
});
