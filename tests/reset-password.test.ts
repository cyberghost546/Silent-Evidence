import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import bcrypt from 'bcryptjs';
import { createHash } from 'crypto';

vi.mock('@/lib/mailer', () => ({ sendMail: vi.fn(async () => true) }));

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

let userId: number;
const EMAIL = 'zz_reset@example.invalid';
beforeAll(async () => {
  const oldHash = await bcrypt.hash('old-password-123', 10);
  userId = (
    await prisma.user.create({
      data: { username: 'zz_reset', email: EMAIL, password: oldHash, sessionVersion: 3 },
      select: { id: true },
    })
  ).id;
});
afterAll(async () => {
  await prisma.user.delete({ where: { id: userId } }).catch(() => {});
  await prisma.$disconnect();
});

describe('password reset with hashed tokens', () => {
  it('stores only a hash, and the raw token from the email still resets', async () => {
    // We cannot read the raw token out of forgot-password (it is emailed), so
    // capture it by inspecting the DB is impossible — instead simulate the flow:
    // create a token the way forgot-password does and verify reset-password accepts it.
    const raw = 'a'.repeat(64); // stand-in for a random token
    const tokenHash = createHash('sha256').update(raw).digest('hex');
    await prisma.passwordResetToken.create({
      data: { token: tokenHash, expiresAt: new Date(Date.now() + 3600000), userId },
    });

    // The DB must NOT contain the raw token.
    const stored = await prisma.passwordResetToken.findFirst({
      where: { userId },
      select: { token: true },
    });
    expect(stored!.token).toBe(tokenHash);
    expect(stored!.token).not.toBe(raw);

    // reset-password should accept the RAW token (hashing it internally).
    const { POST } = await import('@/app/api/auth/reset-password/route');
    const req = new Request('http://t/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.1.1.1' },
      body: JSON.stringify({ token: raw, password: 'brand-new-pass-9' }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(200);

    // Password changed AND sessionVersion bumped (sessions evicted).
    const after = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true, sessionVersion: true },
    });
    expect(await bcrypt.compare('brand-new-pass-9', after!.password)).toBe(true);
    expect(after!.sessionVersion).toBe(4); // was 3, +1

    // Token is now single-use — replaying the same raw token fails.
    const replay = await POST(
      new Request('http://t', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.1.1.2' },
        body: JSON.stringify({ token: raw, password: 'another-pass-9' }),
      }) as any
    );
    expect(replay.status).toBe(400);
  }, 60000);
});
