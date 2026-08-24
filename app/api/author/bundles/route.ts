// app/api/author/bundles/route.ts
// Lets an Author Pro member build and manage their own story bundles.
//
// Bundles previously existed only as an admin tool (/api/admin/bundles), which
// created site-wide bundles with no owner. These are author-owned: authorId is
// set, and an author may only ever put their OWN stories in one.
//
// GET    — the calling author's bundles
// POST   — create a bundle from a list of their own story IDs
// DELETE — remove one of their bundles (blocked once it has been purchased)

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { requireAuthorPro } from '@/lib/authorPro';
import { badRequest, forbidden, notFound, unauthorized, serverError } from '@/lib/apiError';
import { z } from 'zod';

const CreateBundleSchema = z.object({
  title:       z.string().min(1, 'Title is required.').max(200),
  description: z.string().max(2000).nullable().optional(),
  coverImage:  z.string().max(500).nullable().optional(),
  // Price in cents. Bundles are a paid product — a free bundle is just a list,
  // which the StoryList feature already covers.
  price:       z.number().int().min(100, 'Minimum bundle price is $1.00.').max(100_000),
  storyIds:    z.array(z.number().int().positive()).min(2, 'A bundle needs at least 2 stories.').max(50),
});

async function currentUserId(): Promise<number | null> {
  const cookieStore = await cookies();
  return Number(cookieStore.get('userId')?.value ?? 0) || null;
}

/** Builds a URL-safe slug and guarantees uniqueness against existing bundles. */
async function uniqueSlug(title: string): Promise<string> {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'bundle';

  let slug = base;
  let n = 2;
  // StoryBundle.slug is @unique, so collide-and-retry rather than risk a 500 on
  // two authors picking the same bundle title.
  while (await prisma.storyBundle.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${n++}`;
  }
  return slug;
}

// ── GET /api/author/bundles ──────────────────────────────────────────────────
export async function GET() {
  const userId = await currentUserId();
  if (!userId) return unauthorized();

  try {
    const bundles = await prisma.storyBundle.findMany({
      where:   { authorId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        items:  { include: { story: { select: { id: true, title: true, slug: true } } } },
        _count: { select: { purchases: true } },
      },
    });
    return NextResponse.json(bundles);
  } catch (err) {
    console.error('[author/bundles GET]', err);
    return serverError();
  }
}

// ── POST /api/author/bundles ─────────────────────────────────────────────────
export async function POST(req: Request) {
  const userId = await currentUserId();
  if (!userId) return unauthorized();

  // Building bundles is an Author Pro feature
  const denied = await requireAuthorPro('Bundles are an Author Pro feature.');
  if (denied) return denied;

  try {
    const parsed = CreateBundleSchema.safeParse(await req.json());
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? 'Invalid request.');
    }
    const { title, description, coverImage, price, storyIds } = parsed.data;

    // Verify every story belongs to this author. Without this an author could
    // bundle and sell someone else's stories by passing arbitrary IDs.
    const uniqueIds = [...new Set(storyIds)];
    const owned = await prisma.story.findMany({
      where:  { id: { in: uniqueIds }, authorId: userId },
      select: { id: true },
    });

    if (owned.length !== uniqueIds.length) {
      return forbidden('A bundle can only contain stories you wrote.');
    }

    const bundle = await prisma.storyBundle.create({
      data: {
        title,
        slug:        await uniqueSlug(title),
        description: description || null,
        coverImage:  coverImage || null,
        price,
        authorId:    userId,
        items: { create: uniqueIds.map((storyId) => ({ storyId })) },
      },
      include: { items: true },
    });

    return NextResponse.json(bundle, { status: 201 });
  } catch (err) {
    console.error('[author/bundles POST]', err);
    return serverError();
  }
}

// ── DELETE /api/author/bundles ───────────────────────────────────────────────
// Body: { bundleId: number }
export async function DELETE(req: Request) {
  const userId = await currentUserId();
  if (!userId) return unauthorized();

  try {
    const body = await req.json();
    const bundleId = Number(body?.bundleId);
    if (!bundleId || isNaN(bundleId)) return badRequest('bundleId is required.');

    const bundle = await prisma.storyBundle.findUnique({
      where:  { id: bundleId },
      select: { authorId: true, _count: { select: { purchases: true } } },
    });
    if (!bundle) return notFound('Bundle not found.');

    // Ownership check. Note this also blocks deleting admin/site bundles, whose
    // authorId is null and so can never equal a real user id.
    if (bundle.authorId !== userId) {
      return forbidden('You can only delete your own bundles.');
    }

    // Readers who paid for a bundle must keep access to it, and BundlePurchase
    // rows reference it. Deactivate instead of deleting so the purchase history
    // and the buyers' access both survive.
    if (bundle._count.purchases > 0) {
      await prisma.storyBundle.update({
        where: { id: bundleId },
        data:  { active: false },
      });
      return NextResponse.json({
        ok: true,
        deactivated: true,
        message: 'This bundle has been sold, so it was hidden from the store rather than deleted. Existing buyers keep access.',
      });
    }

    await prisma.storyBundle.delete({ where: { id: bundleId } });
    return NextResponse.json({ ok: true, deactivated: false });
  } catch (err) {
    console.error('[author/bundles DELETE]', err);
    return serverError();
  }
}
