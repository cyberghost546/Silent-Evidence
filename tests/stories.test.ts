// tests/stories.test.ts
// Integration-style tests for POST /api/stories (story creation).
// Prisma, cookies, toxicity check, and cache are mocked so tests run without infra.

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    story: { create: vi.fn(), findMany: vi.fn() },
    user: { findUnique: vi.fn() },
    bannedWord: { findMany: vi.fn(() => Promise.resolve([])) },
    category: { findUnique: vi.fn() },
  },
}));

// POST /api/stories is CSRF-protected (double-submit cookie): the route compares
// the x-csrf-token header against the csrf_token cookie. Tests must supply both,
// otherwise every request short-circuits with 403 before the real logic runs.
const CSRF_TOKEN = 'test-csrf-token';

vi.mock('next/headers', () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      get: vi.fn((name: string) =>
        name === 'userId' ? { value: '1' }
        : name === 'csrf_token' ? { value: CSRF_TOKEN }
        : undefined
      ),
      set: vi.fn(),
    })
  ),
}));

vi.mock('@/lib/cache', () => ({
  cache: vi.fn((key: string, ttl: number, fn: () => unknown) => fn()),
  invalidatePattern: vi.fn(() => Promise.resolve()),
  TTL: { SHORT: 60, MEDIUM: 300, LONG: 3600 },
}));

vi.mock('@/lib/toxicityCheck', () => ({
  checkStoryToxicity: vi.fn(() => Promise.resolve({ flagged: false })),
}));

vi.mock('@/lib/sanitize', () => ({
  sanitizeContent: vi.fn((s: string) => s),
}));

vi.mock('@/lib/badges', () => ({
  checkAndAwardBadges: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/lib/apiError', () => ({
  serverError: vi.fn(() => new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 })),
}));

import { POST as storiesPost } from '@/app/api/stories/route';
import { prisma } from '@/lib/prisma';
import { checkStoryToxicity } from '@/lib/toxicityCheck';

function makeRequest(body: unknown, userId = '1'): Request {
  return new Request('http://localhost/api/stories', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `userId=${userId}; csrf_token=${CSRF_TOKEN}`,
      'x-csrf-token': CSRF_TOKEN,
    },
    body: JSON.stringify(body),
  });
}

const VALID_BODY = {
  title: 'The Haunted House',
  content: 'A story about a very scary house that nobody dares enter.',
  categoryId: 1,
  status: 'DRAFT',
};

const MOCK_STORY = {
  id: 1,
  slug: 'the-haunted-house-abc12',
  title: 'The Haunted House',
  status: 'DRAFT',
  author: { username: 'testuser' },
  category: { name: 'Horror', slug: 'horror' },
  _count: { likes: 0, comments: 0 },
};

// Builds a fake Next.js cookie store. `jar` maps cookie name -> value, so a test
// can drop the userId cookie while keeping the CSRF pair intact.
function mockCookieStore(jar: Record<string, string>) {
  return {
    get: vi.fn((name: string) => (name in jar ? { value: jar[name] } : undefined)),
    set: vi.fn(),
  };
}

describe('POST /api/stories', () => {
  beforeEach(async () => {
    vi.mocked(prisma.story.create).mockResolvedValue(MOCK_STORY as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 1, username: 'testuser', ageGroup: 'ADULT' } as any);

    // The global afterEach in tests/setup.ts calls vi.resetAllMocks(), which clears
    // the implementation the vi.mock factory installed. Reinstate it every test.
    const { cookies } = await import('next/headers');
    vi.mocked(cookies).mockResolvedValue(
      mockCookieStore({ userId: '1', csrf_token: CSRF_TOKEN }) as any
    );
  });

  it('returns 401 when not logged in', async () => {
    // Override cookies mock to return no userId — but keep the CSRF token valid,
    // otherwise the request is rejected as 403 before the auth check is reached.
    const { cookies } = await import('next/headers');
    vi.mocked(cookies).mockResolvedValue(
      mockCookieStore({ csrf_token: CSRF_TOKEN }) as any
    );

    const res = await storiesPost(makeRequest(VALID_BODY, ''));
    expect(res.status).toBe(401);
  });

  it('returns 400 when title is missing', async () => {
    const res = await storiesPost(makeRequest({ content: 'Some content.', categoryId: 1 }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when content is missing', async () => {
    const res = await storiesPost(makeRequest({ title: 'A Title', categoryId: 1 }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when categoryId is missing', async () => {
    const res = await storiesPost(makeRequest({ title: 'A Title', content: 'Some content here.' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when categoryId is not a positive integer', async () => {
    const res = await storiesPost(makeRequest({ ...VALID_BODY, categoryId: -5 }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when title exceeds 200 characters', async () => {
    const res = await storiesPost(makeRequest({ ...VALID_BODY, title: 'A'.repeat(201) }));
    expect(res.status).toBe(400);
  });

  it('creates a draft story successfully', async () => {
    const res = await storiesPost(makeRequest(VALID_BODY));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.slug).toBeTruthy();
  });

  it('runs toxicity check only for PUBLISHED stories', async () => {
    await storiesPost(makeRequest({ ...VALID_BODY, status: 'PUBLISHED' }));
    expect(checkStoryToxicity).toHaveBeenCalledOnce();
  });

  it('does not run toxicity check for DRAFT stories', async () => {
    await storiesPost(makeRequest({ ...VALID_BODY, status: 'DRAFT' }));
    expect(checkStoryToxicity).not.toHaveBeenCalled();
  });

  it('returns 422 when toxicity check flags the content', async () => {
    vi.mocked(checkStoryToxicity).mockResolvedValueOnce({ flagged: true, reason: 'Hate speech' } as any);
    const res = await storiesPost(makeRequest({ ...VALID_BODY, status: 'PUBLISHED' }));
    expect(res.status).toBe(422);
  });
});
