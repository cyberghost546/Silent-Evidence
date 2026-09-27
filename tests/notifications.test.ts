// End-to-end check of the in-app notification pipeline against the real DB:
// social actions (follow, like, comment, reply, @mention) must create Notification
// rows for the right user, GET /api/notifications must return them with an unread
// count, and PATCH must mark them read. Email/push senders are stubbed but their
// calls are recorded so we can assert they were triggered too.
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

// Plain functions (not vi.fn) so the global vi.resetAllMocks() can't wipe them.
const sent: { channel: 'push' | 'email'; to: number | string }[] = [];
vi.mock('@/lib/csrf', () => ({ verifyCsrfToken: async () => true }));
vi.mock('@/lib/rateLimit', () => ({
  checkRateLimit: async () => ({ blocked: false }),
  getClientIp: () => '127.0.0.1',
}));
vi.mock('@/lib/toxicityCheck', () => ({ checkToxicity: async () => ({ flagged: false }) }));
vi.mock('@/lib/badges', () => ({ checkAndAwardBadges: async () => {} }));
vi.mock('@/lib/webpush', () => ({
  sendPushToUser: async (to: number) => void sent.push({ channel: 'push', to }),
}));
vi.mock('@/lib/notifyEmail', () => {
  const rec = async (o: { toEmail: string }) => void sent.push({ channel: 'email', to: o.toEmail });
  return { notifyNewFollower: rec, notifyNewComment: rec, notifyCommentReply: rec };
});

// Routes read the `userId` cookie (middleware has already verified its signature).
const jar: Record<string, string> = {};
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (n: string) => (jar[n] !== undefined ? { value: jar[n] } : undefined),
  }),
}));
const as = (id: number) => (jar.userId = String(id));

const post = (body: unknown) =>
  new Request('http://localhost/api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

let author: number, fan: number, storyId: number;

// Notification writes are fire-and-forget, so poll until they land.
const notesFor = async (userId: number, count: number) => {
  let rows: { type: string; read: boolean }[] = [];
  await vi.waitFor(
    async () => {
      rows = await prisma.notification.findMany({ where: { userId }, orderBy: { id: 'asc' } });
      expect(rows.length).toBeGreaterThanOrEqual(count);
    },
    { timeout: 5000, interval: 100 }
  );
  return rows;
};

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { username: { startsWith: 'zz_nt_' } } });
  const mk = async (n: string) =>
    (
      await prisma.user.create({
        data: { username: n, email: `${n}@x.invalid`, password: 'x'.repeat(60) },
        select: { id: true },
      })
    ).id;
  author = await mk('zz_nt_author');
  fan = await mk('zz_nt_fan');
  const cat = await prisma.category.findFirst({ select: { id: true } });
  storyId = (
    await prisma.story.create({
      data: {
        title: 'zz notify story',
        slug: `zz-nt-${Date.now()}`,
        content: 'x',
        authorId: author,
        categoryId: cat!.id,
        status: 'PUBLISHED',
      },
      select: { id: true },
    })
  ).id;
});

afterAll(async () => {
  // Cascades remove the story, comments, likes, follows and notifications.
  await prisma.user.deleteMany({ where: { username: { startsWith: 'zz_nt_' } } });
  await prisma.$disconnect();
});

describe('notifications', () => {
  it('follow, like and comment notify the story author (bell + email + push)', async () => {
    as(fan);
    const { POST: follow } = await import('@/app/api/follows/route');
    expect((await follow(post({ followingId: author }))).status).toBe(200);

    const { POST: like } = await import('@/app/api/likes/route');
    expect((await like(post({ storyId }))).status).toBe(200);

    const { POST: comment } = await import('@/app/api/comments/route');
    expect((await comment(post({ storyId, content: 'Chilling.' }))).status).toBe(201);

    const rows = await notesFor(author, 3);
    expect(rows.map((r) => r.type).sort()).toEqual(['COMMENT', 'FOLLOW', 'LIKE']);
    expect(rows.every((r) => !r.read)).toBe(true);

    await vi.waitFor(() => {
      expect(sent).toContainEqual({ channel: 'push', to: author });
      expect(sent).toContainEqual({ channel: 'email', to: 'zz_nt_author@x.invalid' });
    });
  });

  it('a reply with an @mention notifies the parent commenter', async () => {
    const parent = await prisma.comment.findFirst({
      where: { storyId, userId: fan },
      select: { id: true },
    });
    as(author);
    const { POST: comment } = await import('@/app/api/comments/route');
    const res = await comment(
      post({ storyId, parentId: parent!.id, content: '@zz_nt_fan thank you' })
    );
    expect(res.status).toBe(201);

    const rows = await notesFor(fan, 2);
    expect(rows.map((r) => r.type).sort()).toEqual(['MENTION', 'REPLY']);
  });

  it('does not notify users about their own actions', async () => {
    as(author);
    const { POST: like } = await import('@/app/api/likes/route');
    await like(post({ storyId }));
    await new Promise((r) => setTimeout(r, 300)); // give a stray write time to land
    const own = await prisma.notification.count({ where: { userId: author, type: 'LIKE' } });
    expect(own).toBe(1); // only the fan's like
  });

  it('GET returns the bell list + unread count, PATCH marks all read', async () => {
    as(author);
    const { GET, PATCH } = await import('@/app/api/notifications/route');

    const before = await (await GET()).json();
    expect(before.unread).toBe(3);
    expect(before.notifications[0].story?.slug).toMatch(/^zz-nt-/);

    expect((await PATCH()).status).toBe(200);
    const after = await (await GET()).json();
    expect(after.unread).toBe(0);

    // Marking the author's notifications read must not touch the fan's
    expect(await prisma.notification.count({ where: { userId: fan, read: false } })).toBe(2);
  });

  it('guests get an empty bell instead of an error', async () => {
    delete jar.userId;
    const { GET } = await import('@/app/api/notifications/route');
    expect(await (await GET()).json()).toEqual({ notifications: [], unread: 0 });
  });
});
