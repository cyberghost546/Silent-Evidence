// tests/auth.test.ts
// Integration-style tests for POST /api/auth/login and POST /api/auth/register.
// Heavy external dependencies (prisma, bcrypt, rateLimit, mailer) are mocked so
// the tests run without a real database.

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock modules before importing route handlers ──────────────────────────────
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    loginLog: { create: vi.fn() },
    twoFactorCode: {
      deleteMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}));

vi.mock('@/lib/rateLimit', () => ({
  checkRateLimit: vi.fn(() => ({ blocked: false })),
  getClientIp: vi.fn(() => '127.0.0.1'),
  anonymizeIp: vi.fn((ip: string) => ip),
}));

vi.mock('@/lib/mailer', () => ({
  sendMail: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/lib/geoip', () => ({
  lookupGeoIp: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve({ set: vi.fn(), get: vi.fn() })),
}));

// ── Import after mocks are set up ─────────────────────────────────────────────
import { POST as loginPost }    from '@/app/api/auth/login/route';
import { POST as registerPost } from '@/app/api/auth/register/route';
import { prisma }               from '@/lib/prisma';
import bcrypt                   from 'bcryptjs';
import { checkRateLimit }       from '@/lib/rateLimit';

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const MOCK_USER = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  password: '$2b$12$hashedpassword',
  twoFactorEnabled: false,
  role: 'USER',
};

// ── Login tests ───────────────────────────────────────────────────────────────
describe('POST /api/auth/login', () => {
  it('returns 400 when email is missing', async () => {
    const res = await loginPost(makeRequest({ password: 'secret123' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when email is invalid', async () => {
    const res = await loginPost(makeRequest({ email: 'not-an-email', password: 'secret123' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when password is missing', async () => {
    const res = await loginPost(makeRequest({ email: 'test@example.com' }));
    expect(res.status).toBe(400);
  });

  it('returns 429 when rate limit is exceeded', async () => {
    // checkRateLimit is async — resolve the result rather than returning it raw.
    vi.mocked(checkRateLimit).mockResolvedValueOnce({ blocked: true, remaining: 0, resetAt: Date.now() });
    const res = await loginPost(makeRequest({ email: 'test@example.com', password: 'secret123' }));
    expect(res.status).toBe(429);
  });

  it('returns 401 when user does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);
    const res = await loginPost(makeRequest({ email: 'nobody@example.com', password: 'secret123' }));
    expect(res.status).toBe(401);
  });

  it('returns 401 when password is wrong', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(MOCK_USER as any);
    vi.mocked(bcrypt.compare).mockResolvedValueOnce(false as never);
    const res = await loginPost(makeRequest({ email: 'test@example.com', password: 'wrongpassword' }));
    expect(res.status).toBe(401);
  });

  it('returns 200 and sets cookie on valid credentials', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(MOCK_USER as any);
    vi.mocked(bcrypt.compare).mockResolvedValueOnce(true as never);
    const res = await loginPost(makeRequest({ email: 'test@example.com', password: 'correctpassword' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it('returns 202 and requires2fa when 2FA is enabled', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ ...MOCK_USER, twoFactorEnabled: true } as any);
    vi.mocked(bcrypt.compare).mockResolvedValueOnce(true as never);
    vi.mocked(prisma.twoFactorCode.deleteMany).mockResolvedValueOnce({ count: 0 });
    vi.mocked(prisma.twoFactorCode.create).mockResolvedValueOnce({} as any);
    const res = await loginPost(makeRequest({ email: 'test@example.com', password: 'correctpassword' }));
    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body.requires2fa).toBe(true);
    expect(body.tempUserId).toBe(1);
  });
});

// ── Register tests ────────────────────────────────────────────────────────────
describe('POST /api/auth/register', () => {
  beforeEach(() => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue(MOCK_USER as any);
    vi.mocked(bcrypt.hash).mockResolvedValue('$2b$12$hashed' as never);
  });

  it('returns 400 when username is too short', async () => {
    const res = await registerPost(makeRequest({ username: 'ab', email: 'test@example.com', password: 'password123' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when username contains invalid characters', async () => {
    const res = await registerPost(makeRequest({ username: 'bad user!', email: 'test@example.com', password: 'password123' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when email is invalid', async () => {
    const res = await registerPost(makeRequest({ username: 'validuser', email: 'bademail', password: 'password123' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when password is too short', async () => {
    const res = await registerPost(makeRequest({ username: 'validuser', email: 'test@example.com', password: 'short' }));
    expect(res.status).toBe(400);
  });

  it('returns 409 when email is already taken', async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce({ email: 'test@example.com', username: 'other' } as any);
    const res = await registerPost(makeRequest({ username: 'newuser', email: 'test@example.com', password: 'password123' }));
    expect(res.status).toBe(409);
  });

  it('returns 409 when username is already taken', async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce({ email: 'other@example.com', username: 'testuser' } as any);
    const res = await registerPost(makeRequest({ username: 'testuser', email: 'new@example.com', password: 'password123' }));
    expect(res.status).toBe(409);
  });

  it('returns 201 on valid registration', async () => {
    const res = await registerPost(makeRequest({ username: 'brandnew', email: 'new@example.com', password: 'password123' }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
