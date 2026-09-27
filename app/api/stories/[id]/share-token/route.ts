// app/api/stories/[id]/share-token/route.ts
// POST — generate a new draft share token (author only)
// DELETE — revoke all share tokens for this story (author only)
// GET  — list active share tokens for this story (author only)

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { unauthorized, forbidden, notFound, serverError } from '@/lib/apiError';
import crypto from 'crypto';

type Ctx = { params: Promise<{ id: string }> };

// GET — list current tokens so the author can see/copy share links
export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const storyId = Number(id);

  const c = await cookies();
  const userId = Number(c.get('userId')?.value ?? 0) || null;
  if (!userId) return unauthorized();

  try {
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: { authorId: true },
    });
    if (!story) return notFound();
    if (story.authorId !== userId) return forbidden();

    const tokens = await prisma.draftShareToken.findMany({
      where: { storyId, userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, token: true, expiresAt: true, createdAt: true },
    });

    return NextResponse.json(tokens);
  } catch (err) {
    console.error('[share-token GET]', err);
    return serverError();
  }
}

// POST — create a new share token (optionally expiring in 7 days)
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const storyId = Number(id);

  const c = await cookies();
  const userId = Number(c.get('userId')?.value ?? 0) || null;
  if (!userId) return unauthorized();

  try {
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: { authorId: true, status: true },
    });
    if (!story) return notFound();
    if (story.authorId !== userId) return forbidden();

    // Parse optional expires flag from body
    const body = await req.json().catch(() => ({}));
    const expires =
      body.expires === '7d'
        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        : body.expires === '30d'
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          : null; // null = never expires

    // Generate a secure random token (32 hex chars)
    const token = crypto.randomBytes(16).toString('hex');

    const record = await prisma.draftShareToken.create({
      data: { token, storyId, userId, expiresAt: expires },
    });

    return NextResponse.json(record, { status: 201 });
  } catch (err) {
    console.error('[share-token POST]', err);
    return serverError();
  }
}

// DELETE — revoke all tokens for this story
export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const storyId = Number(id);

  const c = await cookies();
  const userId = Number(c.get('userId')?.value ?? 0) || null;
  if (!userId) return unauthorized();

  try {
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: { authorId: true },
    });
    if (!story) return notFound();
    if (story.authorId !== userId) return forbidden();

    await prisma.draftShareToken.deleteMany({ where: { storyId, userId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[share-token DELETE]', err);
    return serverError();
  }
}
