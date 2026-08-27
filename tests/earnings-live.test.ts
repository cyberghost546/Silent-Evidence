import { describe, it, expect, beforeAll, afterAll } from 'vitest';
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

let authorId: number,
  buyerId: number,
  storyId: number,
  chapterId: number,
  bundleId: number,
  catId: number;

beforeAll(async () => {
  const author = await prisma.user.create({
    data: { username: 'zz_earn_author', email: 'zz_ea@x.invalid', password: 'x'.repeat(60) },
    select: { id: true },
  });
  const buyer = await prisma.user.create({
    data: { username: 'zz_earn_buyer', email: 'zz_eb@x.invalid', password: 'x'.repeat(60) },
    select: { id: true },
  });
  authorId = author.id;
  buyerId = buyer.id;
  // Create (or reuse) a dedicated category so the test does not depend on seed
  // data — CI runs against a freshly-migrated, empty database.
  const cat = await prisma.category.upsert({
    where: { slug: 'zz-earn-cat' },
    update: {},
    create: { name: 'zz earn cat', slug: 'zz-earn-cat' },
    select: { id: true },
  });
  catId = cat.id;
  const story = await prisma.story.create({
    data: {
      title: 'zz earn story',
      slug: `zz-earn-${Date.now()}`,
      content: 'x',
      authorId,
      categoryId: catId,
      status: 'PUBLISHED',
    },
    select: { id: true },
  });
  storyId = story.id;
  const chapter = await prisma.storyChapter.create({
    data: { title: 'ch', content: 'x', storyId },
    select: { id: true },
  });
  chapterId = chapter.id;
  const bundle = await prisma.storyBundle.create({
    data: { title: 'zz bundle', slug: `zz-b-${Date.now()}`, price: 500, authorId },
    select: { id: true },
  });
  bundleId = bundle.id;

  // Earnings: tip 1000 + story 300 + chapter 99 + bundle 500 = 1899 gross.
  await prisma.tip.create({ data: { amount: 1000, fromUserId: buyerId, toUserId: authorId } });
  await prisma.storyPurchase.create({ data: { amount: 300, userId: buyerId, storyId } });
  await prisma.chapterPurchase.create({ data: { amount: 99, userId: buyerId, chapterId } });
  await prisma.bundlePurchase.create({ data: { paidCents: 500, userId: buyerId, bundleId } });
});

afterAll(async () => {
  await prisma.tip.deleteMany({ where: { toUserId: authorId } });
  await prisma.storyPurchase.deleteMany({ where: { storyId } });
  await prisma.chapterPurchase.deleteMany({ where: { chapterId } });
  await prisma.bundlePurchase.deleteMany({ where: { bundleId } });
  await prisma.payout.deleteMany({ where: { authorId } });
  await prisma.storyBundle.delete({ where: { id: bundleId } }).catch(() => {});
  await prisma.storyChapter.delete({ where: { id: chapterId } }).catch(() => {});
  await prisma.story.delete({ where: { id: storyId } }).catch(() => {});
  await prisma.user.deleteMany({ where: { username: { startsWith: 'zz_earn_' } } });
  await prisma.category.delete({ where: { slug: 'zz-earn-cat' } }).catch(() => {});
  await prisma.$disconnect();
});

describe('getEarnings (live)', () => {
  it('sums all four sources, applies the 10% fee, and tracks payouts', async () => {
    const { getEarnings } = await import('@/lib/earnings');
    let e = await getEarnings(authorId);

    expect(e.gross).toEqual({ tips: 1000, stories: 300, chapters: 99, bundles: 500, total: 1899 });
    expect(e.counts).toEqual({ tips: 1, stories: 1, chapters: 1, bundles: 1 });
    // 1899 * 0.9 = 1709.1 → 1709 net; fee 190.
    expect(e.net).toBe(1709);
    expect(e.fee).toBe(190);
    expect(e.paidOut).toBe(0);
    expect(e.available).toBe(1709);

    // Record a payout of 1000; available drops, paidOut rises.
    await prisma.payout.create({
      data: { authorId, amountCents: 1000, status: 'paid', coveredThrough: new Date() },
    });
    e = await getEarnings(authorId);
    expect(e.paidOut).toBe(1000);
    expect(e.available).toBe(709);

    // A pending (not paid) payout must NOT count against the balance.
    await prisma.payout.create({
      data: { authorId, amountCents: 500, status: 'pending', coveredThrough: new Date() },
    });
    e = await getEarnings(authorId);
    expect(e.paidOut).toBe(1000);
  }, 60000);
});
