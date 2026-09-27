// ============================================================
//  app/api/cron/publish-scheduled/route.ts
//
//  This file is a scheduled-job endpoint (a "cron route").
//  Its job is to find every story that an author has scheduled
//  for future publication, check whether that publish time has
//  now passed, and flip those stories from SCHEDULED → PUBLISHED.
//
//  How to call it:
//    GET /api/cron/publish-scheduled
//    Authorization: Bearer <CRON_SECRET>
//
//  You should run this every 5–15 minutes using an external
//  service such as Vercel Cron Jobs, GitHub Actions, or
//  cron-job.org.  Add CRON_SECRET to your .env file to keep
//  the endpoint protected from random internet traffic.
// ============================================================

// Import NextResponse so we can send JSON responses back to the caller
import { NextResponse } from 'next/server';

// Import the Prisma client so we can read and write to the database
import { prisma } from '@/lib/prisma';

// Import the helper that checks whether an author has earned any new badges
// (e.g. "Published 10 stories") after their story goes live
import { checkAndAwardBadges } from '@/lib/badges';

// Import the helper that updates an author's writing streak when a story publishes
import { updateWritingStreak } from '@/lib/streaks';

// ── GET handler ───────────────────────────────────────────────────────────────
// This is the main function Next.js will call when a GET request hits this URL.
// req is the raw incoming HTTP Request object
export async function GET(req: Request) {
  // Read the "Authorization" header from the request.
  // If no header was sent, fall back to an empty string so the comparison below
  // doesn't crash with a null reference error.
  const auth = req.headers.get('authorization') ?? '';

  // Read the expected secret from our environment variables (.env file).
  // The ?? '' fallback means if the env var is missing we treat it as blank,
  // which will cause the check below to fail (both an empty secret AND a
  // missing header would match "" === "", so we explicitly block a missing secret).
  const secret = process.env.CRON_SECRET ?? '';

  // Security check: if CRON_SECRET is not configured at all, or if the header
  // sent by the caller doesn't match "Bearer <CRON_SECRET>", refuse the request.
  // This stops anyone without the secret from triggering mass-publishing.
  if (!secret || auth !== `Bearer ${secret}`) {
    // Return HTTP 401 Unauthorized with a JSON error message
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Capture the current date and time so we can compare it to scheduledAt
  const now = new Date();

  // Query the database for stories that are still in SCHEDULED status
  // AND whose scheduledAt timestamp is less than or equal to the current time
  // (lte = "less than or equal to").
  // We only SELECT the id and authorId because that's all we need here —
  // fetching only what we need is faster than fetching the whole story row.
  const due = await prisma.story.findMany({
    where: {
      // Only look at stories that are waiting to be published
      status: 'SCHEDULED',
      // Only those whose scheduled publish time has now arrived or passed
      scheduledAt: { lte: now },
    },
    // Only fetch the columns we actually need — keeps the query lean
    select: { id: true, authorId: true },
  });

  // If no stories are due yet, return early with a success response showing 0 published
  if (due.length === 0) {
    return NextResponse.json({ published: 0, ids: [] });
  }

  // Publish all due stories at the same time using Promise.all.
  // This fires all the UPDATE queries to the database simultaneously
  // instead of one at a time, which is much faster for large batches.
  await Promise.all(
    // .map() turns each story object into a Prisma update promise
    due.map((s) =>
      prisma.story.update({
        // Target this specific story by its unique id
        where: { id: s.id },
        // Change the status field to PUBLISHED
        data: { status: 'PUBLISHED' },
      })
    )
  );

  // Build a deduplicated list of author IDs so we don't run the badge/streak
  // checks twice for the same author if they had multiple stories publishing now.
  // new Set() removes duplicates, then [...] spreads it back into a plain array.
  const authorIds = [...new Set(due.map((s) => s.authorId))];

  // Loop over each unique author and trigger their post-publish side effects.
  // .catch(() => {}) means "fire and forget" — if these helpers throw an error
  // we swallow it silently so a badge failure never prevents publishing.
  for (const authorId of authorIds) {
    // Check if the author has unlocked any badge milestones (e.g. "5 stories published")
    checkAndAwardBadges(authorId).catch(() => {});
    // Update the author's writing streak day counter
    updateWritingStreak(authorId).catch(() => {});
  }

  // Return a success response with how many stories were published
  // and an array of their IDs (useful for logging in the cron service dashboard)
  return NextResponse.json({ published: due.length, ids: due.map((s) => s.id) });
}
