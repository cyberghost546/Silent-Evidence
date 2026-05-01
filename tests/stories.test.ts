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

vi.mock('next/headers', () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      get: vi.fn((name: string) => (name === 'userId' ? { value: '1' } : undefined)),
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
    headers: { 'Content-Type': 'application/json', Cookie: `userId=${userId}` },
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

describe('POST /api/stories', () => {
  beforeEach(() => {
    vi.mocked(prisma.story.create).mockResolvedValue(MOCK_STORY as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 1, username: 'testuser', ageGroup: 'ADULT' } as any);
  });

  it('returns 401 when not logged in', async () => {
    // Override cookies mock to return no userId
    const { cookies } = await import('next/headers');
    vi.mocked(cookies).mockResolvedValueOnce({
      get: vi.fn(() => undefined),
      set: vi.fn(),
    } as any);

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
