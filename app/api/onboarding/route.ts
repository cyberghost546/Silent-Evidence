// ============================================================
//  app/api/onboarding/route.ts
//
//  POST /api/onboarding
//
//  Saves a new user's onboarding choices and marks the onboarding
//  wizard as complete so it is never shown to them again.
//
//  Called when the user finishes all steps of the welcome wizard.
//
//  The wizard collects:
//    Step 1 — bio (short description of themselves)
//             avatar (URL of a chosen/uploaded profile photo)
//    Step 2 — moods (array of preferred horror sub-genre tags,
//             e.g. ["DARK", "CREEPY", "PARANORMAL"])
//
//  What this endpoint does:
//    1. Upserts the Profile row (creates it if it's the first time)
//       with the bio and avatar from step 1.
//    2. Marks User.onboardingDone = true so the wizard never
//       appears again on future logins.
//
//  Note: the `moods` field is accepted in the body for forward-
//  compatibility but is not currently persisted (the profile row
//  stores it separately when the feature is implemented).
// ============================================================

// Import NextRequest (typed request) and NextResponse for JSON replies
import { NextRequest, NextResponse } from 'next/server';

// Import the cookies helper to read the session cookie and identify the logged-in user
import { cookies } from 'next/headers';

// Import the Prisma database client for all DB writes
import { prisma } from '@/lib/prisma';

// ── POST handler ──────────────────────────────────────────────────────────────
// Saves onboarding choices and flags onboarding as complete.
// Expected JSON body:
//   {
//     bio:    string | null,    — short self-description from step 1
//     avatar: string | null,    — profile photo URL from step 1
//     moods:  string[]          — preferred horror mood tags from step 2
//   }
export async function POST(req: NextRequest) {
  // Read all cookies from the incoming request
  const c = await cookies();

  // Extract the logged-in user's ID from the session cookie.
  // Number() converts the string to a number; ?? 0 handles a missing cookie.
  const userId = Number(c.get('userId')?.value ?? 0);

  // Block unauthenticated requests — the wizard should only be shown to logged-in users
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Parse the request body to get the values the user entered in the wizard
  // bio and avatar come from step 1; moods is an array of Mood strings from step 2
  const { bio, avatar, moods } = await req.json();

  // ── Step 1: Save bio and avatar to the Profile row ───────────────────────────
  // "upsert" means: if a Profile row already exists for this user, UPDATE it;
  // if it doesn't exist yet (e.g. first login), CREATE a new one.
  // This is safer than always using create (which would fail if the row exists)
  // or always using update (which would fail if the row doesn't exist).
  await prisma.profile.upsert({
    where: {
      // Target the profile belonging to this specific user
      userId,
    },
    // If no Profile row exists yet, create one with all provided values
    create: {
      userId,
      // Store bio if provided, otherwise null
      bio: bio || null,
      // Store avatar URL if provided, otherwise null
      avatar: avatar || null,
    },
    // If a Profile row already exists, update only the provided fields.
    // undefined means "don't change this field" — Prisma skips undefined values.
    update: {
      // Only overwrite bio if a value was actually sent
      bio: bio || undefined,
      // Only overwrite avatar if a value was actually sent
      avatar: avatar || undefined,
    },
  });

  // ── Step 2: Mark onboarding as complete ──────────────────────────────────────
  // Update the User row to set onboardingDone = true.
  // This flag is checked on every page load — if true, the wizard is not shown.
  await prisma.user.update({
    where: {
      // Target only this specific user
      id: userId,
    },
    data: {
      // Permanently marks the wizard as done for this account
      onboardingDone: true,
    },
  });

  // Return a simple success response — the client will navigate to the home page
  return NextResponse.json({ ok: true });
}
