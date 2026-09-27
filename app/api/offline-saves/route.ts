// app/api/offline-saves/route.ts
// Manages the user's offline reading list (OfflineSave records).
//
// GET    — returns all stories the logged-in user has saved for offline reading.
// POST   — saves a story to the user's offline list (upsert, safe to call twice).
// DELETE — removes a story from the user's offline list.
//
// PREMIUM GATE: saving a story for offline reading is a premium perk, so POST
// requires an active subscription. GET and DELETE deliberately do NOT — a member
// who lets their subscription lapse must still be able to see the library they
// built and remove things from it. Only *adding* new downloads is restricted.

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { requirePremium } from '@/lib/premiumCheck';
import { unauthorized, notFound, serverError } from '@/lib/apiError';

// ── GET /api/offline-saves ────────────────────────────────────────────────────
// Returns the full list of stories the current user has saved for offline use.
// Auth required — returns 401 if the user is not logged in.
export async function GET() {
  // Read the userId cookie set at login to identify the current user
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0) || null;
  if (!userId) return unauthorized();

  try {
    // Fetch all OfflineSave rows for this user and include the related story data
    // we need to render the offline library page (title, slug, excerpt, cover, author).
    const saves = await prisma.offlineSave.findMany({
      where: { userId },
      orderBy: { savedAt: 'desc' }, // most recently saved first
      include: {
        story: {
          select: {
            id: true,
            title: true,
            slug: true,
            excerpt: true,
            coverImage: true,
            mood: true,
            author: { select: { username: true } },
          },
        },
      },
    });

    // Return just the story objects (we don't need the OfflineSave metadata on the client)
    return NextResponse.json(saves.map((s) => s.story));
  } catch (err) {
    console.error('[offline-saves GET]', err);
    return serverError();
  }
}

// ── POST /api/offline-saves ───────────────────────────────────────────────────
// Body: { storyId: number }
// Upserts an OfflineSave — creates it if it doesn't exist, does nothing if it does.
// Safe to call multiple times without creating duplicates.
export async function POST(req: Request) {
  // Verify the user is logged in
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0) || null;
  if (!userId) return unauthorized();

  // Offline downloads are a premium perk. This is the real gate — hiding the
  // button in the UI is only a courtesy, this is what actually stops a free user
  // POSTing to the endpoint directly.
  const denied = await requirePremium('Offline downloads are a premium perk.');
  if (denied) return denied;

  try {
    const body = await req.json();
    const storyId = Number(body?.storyId);

    // Validate that storyId is a real number before querying
    if (!storyId || isNaN(storyId)) {
      return NextResponse.json({ error: 'storyId is required.' }, { status: 400 });
    }

    // Confirm the story actually exists before saving — avoid orphaned records
    const story = await prisma.story.findUnique({ where: { id: storyId }, select: { id: true } });
    if (!story) return notFound('Story not found.');

    // upsert: create the save if it doesn't exist; if it does, no-op (update: {})
    // The @@unique([userId, storyId]) constraint prevents duplicates at the DB level too.
    await prisma.offlineSave.upsert({
      where: { userId_storyId: { userId, storyId } },
      create: { userId, storyId },
      update: {}, // nothing to update — the record's existence is all that matters
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[offline-saves POST]', err);
    return serverError();
  }
}

// ── DELETE /api/offline-saves ─────────────────────────────────────────────────
// Body: { storyId: number }
// Removes the OfflineSave record. Silently succeeds if it was never saved.
export async function DELETE(req: Request) {
  // Verify the user is logged in
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0) || null;
  if (!userId) return unauthorized();

  try {
    const body = await req.json();
    const storyId = Number(body?.storyId);

    if (!storyId || isNaN(storyId)) {
      return NextResponse.json({ error: 'storyId is required.' }, { status: 400 });
    }

    // deleteMany is used instead of delete so it doesn't throw if the record
    // doesn't exist (e.g. user double-tapped the remove button).
    await prisma.offlineSave.deleteMany({
      where: { userId, storyId },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[offline-saves DELETE]', err);
    return serverError();
  }
}
