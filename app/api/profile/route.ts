// ============================================================
//  app/api/profile/route.ts
//
//  PATCH /api/profile
//
//  Updates the logged-in user's public profile information.
//  This endpoint handles the main "Account Settings" form.
//
//  Fields that can be updated:
//    - username  — must be non-empty and not already taken
//    - bio       — short personal description (stored in Profile)
//    - avatar    — profile photo URL (stored in Profile)
//    - website   — personal website link (stored in Profile)
//    - fearMoods — comma-separated Mood values stored on Profile
//
// Note: password changes are handled by a separate endpoint
// at /api/profile/password.
//
// The User and Profile rows are updated separately because they
// live in different tables:
//    - username lives on the User table
//    - bio, avatar, website, fearMoods live on the related Profile table
// ============================================================

// Import NextResponse so we can return JSON HTTP responses
import { NextResponse } from 'next/server';

// Import the cookies helper to read the session cookie
import { cookies } from 'next/headers';

// Import the Prisma database client for all DB queries and writes
import { prisma } from '@/lib/prisma';

// ── PATCH handler ─────────────────────────────────────────────────────────────
// Updates profile fields for the currently logged-in user.
// Expected JSON body: { username?: string, bio?: string, avatar?: string, website?: string, fearMoods?: string }
export async function PATCH(req: Request) {
  // Read all cookies from the incoming request
  const cookieStore = await cookies();

  // Extract the logged-in user's ID from the session cookie
  const userId = Number(cookieStore.get('userId')?.value ?? 0);

  // Must be logged in to update a profile
  if (!userId) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });

  // Parse the JSON body to get the fields to update
  const { username, bio, avatar, website, fearMoods } = await req.json();

  // Username is optional here because other settings may update only profile fields.
  if (username !== undefined) {
    if (!username?.trim()) {
      return NextResponse.json({ error: 'Username cannot be empty.' }, { status: 400 });
    }

    // Check whether the new username is already taken by a DIFFERENT user.
    // NOT: { id: userId } means "exclude the current user from this check"
    // (so a user can re-save the same username without getting a conflict error)
    const conflict = await prisma.user.findFirst({
      where: {
        // Match any user with this username...
        username,
        // ...except the current user themselves
        NOT: { id: userId },
      },
    });

    // If another user has this username, reject the request
    if (conflict) {
      return NextResponse.json({ error: 'That username is already taken.' }, { status: 409 });
    }

    // Update the username on the User record.
    // username lives directly on the User table so it gets its own update call.
    await prisma.user.update({
      where: { id: userId },
      data: {
        // Trim surrounding whitespace before saving
        username: username.trim(),
      },
    });
  }

  const profileUpdates: {
    bio?: string | null;
    avatar?: string | null;
    website?: string | null;
    fearMoods?: string | null;
  } = {};

  if (bio !== undefined) profileUpdates.bio = bio || null;
  if (avatar !== undefined) profileUpdates.avatar = avatar || null;
  if (website !== undefined) profileUpdates.website = website || null;
  if (fearMoods !== undefined) profileUpdates.fearMoods = fearMoods || null;

  if (Object.keys(profileUpdates).length > 0) {
    await prisma.profile.upsert({
      where: {
        // Target the profile belonging to this specific user
        userId,
      },
      // If the profile already exists, update these fields
      update: profileUpdates,
      // If no profile exists yet, create one with the fields we have
      create: {
        userId,
        bio: profileUpdates.bio ?? null,
        avatar: profileUpdates.avatar ?? null,
        website: profileUpdates.website ?? null,
        fearMoods: profileUpdates.fearMoods ?? null,
      },
    });
  }

  // Return the updated username when it was included, otherwise return a generic success flag.
  return NextResponse.json(
    username !== undefined
      ? { username: username.trim() }
      : { success: true }
  );
}
