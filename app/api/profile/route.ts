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
//
//  Note: password changes are handled by a separate endpoint
//  at /api/profile/password.
//
//  The User and Profile rows are updated separately because they
//  live in different tables:
//    - username lives on the User table
//    - bio, avatar, website live on the related Profile table
// ============================================================

// Import NextResponse so we can return JSON HTTP responses
import { NextResponse } from 'next/server';

// Import the cookies helper to read the session cookie
import { cookies } from 'next/headers';

// Import the Prisma database client for all DB queries and writes
import { prisma } from '@/lib/prisma';

// ── PATCH handler ─────────────────────────────────────────────────────────────
// Updates profile fields for the currently logged-in user.
// Expected JSON body: { username: string, bio?: string, avatar?: string, website?: string }
export async function PATCH(req: Request) {
  // Read all cookies from the incoming request
  const cookieStore = await cookies();

  // Extract the logged-in user's ID from the session cookie
  const userId = Number(cookieStore.get('userId')?.value ?? 0);

  // Must be logged in to update a profile
  if (!userId) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });

  // Parse the JSON body to get the fields to update
  const { username, bio, avatar, website } = await req.json();

  // Username is required and cannot be blank or only whitespace
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

  // Upsert the Profile row — "upsert" means:
  //   - If a Profile row already exists for this user → UPDATE it
  //   - If no Profile row exists yet → CREATE a new one
  // This handles both new users (who have no profile yet) and existing users.
  await prisma.profile.upsert({
    where: {
      // Target the profile belonging to this specific user
      userId,
    },
    // If the profile already exists, update these fields
    update: {
      // Store bio, or null if the field was cleared
      bio: bio || null,
      // Store avatar URL, or null if cleared
      avatar: avatar || null,
      // Store website URL, or null if cleared
      website: website || null,
    },
    // If no profile exists yet, create one with all the fields
    create: {
      // Link to the user
      userId,
      bio: bio || null,
      avatar: avatar || null,
      website: website || null,
    },
  });

  // Return the updated username so the client can update any UI that displays it
  return NextResponse.json({ username: username.trim() });
}
