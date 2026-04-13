// app/api/tags/[slug]/follow/route.ts
// Handles following and unfollowing a tag by its slug.
// POST  → toggles follow state (upsert if not following, delete if already following)
// GET   → returns current follow state + total follower count for the tag

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import {
  unauthorized,
  notFound,
  serverError,
} from '@/lib/apiError';

// ── POST /api/tags/[slug]/follow — toggle follow/unfollow ─────────────────────
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    // Read the logged-in user ID from the session cookie
    const cookieStore = await cookies();
    const userId = Number(cookieStore.get('userId')?.value ?? 0);
    if (!userId) return unauthorized();

    const { slug } = await params;

    // Find the tag by its URL slug — return 404 if it doesn't exist
    const tag = await prisma.tag.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!tag) return notFound('Tag not found.');

    // Check if the user is already following this tag
    const existing = await prisma.tagFollow.findUnique({
      where: { userId_tagId: { userId, tagId: tag.id } },
    });

    if (existing) {
      // Already following — unfollow by deleting the record
      await prisma.tagFollow.delete({
        where: { userId_tagId: { userId, tagId: tag.id } },
      });
      return NextResponse.json({ following: false });
    } else {
      // Not following yet — create the follow record
      await prisma.tagFollow.create({
        data: { userId, tagId: tag.id },
      });
      return NextResponse.json({ following: true });
    }
  } catch (err) {
    console.error('[POST /api/tags/[slug]/follow]', err);
    return serverError();
  }
}

// ── GET /api/tags/[slug]/follow — get follow status + follower count ──────────
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    // Read session cookie — user may not be logged in (guest)
    const cookieStore = await cookies();
    const userId = Number(cookieStore.get('userId')?.value ?? 0);

    const { slug } = await params;

    // Find tag and count its followers in one query
    const tag = await prisma.tag.findUnique({
      where: { slug },
      select: {
        id: true,
        _count: { select: { followers: true } }, // total number of TagFollow rows
      },
    });
    if (!tag) return notFound('Tag not found.');

    // If the user is not logged in they are never following
    let following = false;
    if (userId) {
      const record = await prisma.tagFollow.findUnique({
        where: { userId_tagId: { userId, tagId: tag.id } },
      });
      following = !!record;
    }

    return NextResponse.json({
      following,
      followerCount: tag._count.followers,
    });
  } catch (err) {
    console.error('[GET /api/tags/[slug]/follow]', err);
    return serverError();
  }
}
