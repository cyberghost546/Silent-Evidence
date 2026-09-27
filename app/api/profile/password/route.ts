// ============================================================
//  app/api/profile/password/route.ts
//
//  PATCH /api/profile/password
//
//  Changes the logged-in user's password.
//
//  Flow:
//    1. Verify the caller is logged in.
//    2. Validate that both currentPassword and newPassword are provided.
//    3. Enforce a minimum length of 8 characters for the new password.
//    4. Look up the user's hashed password from the database.
//    5. Compare the provided currentPassword against the stored hash.
//       (If wrong, reject — prevents someone who hijacks a session
//       from changing the password without knowing the original.)
//    6. Hash the new password with bcrypt (cost factor 12).
//    7. Save the new hash to the database.
//
//  Security notes:
//    - We never store plain-text passwords.
//    - bcrypt.compare is used instead of a plain equality check.
//    - Cost factor 12 is a good balance of security and speed (≈250ms on modern hardware).
// ============================================================

// Import NextResponse so we can return JSON HTTP responses
import { NextResponse } from 'next/server';

// Import the cookies helper to read the session cookie
import { cookies } from 'next/headers';

// Import bcryptjs for password hashing and comparison.
// bcryptjs is a pure-JS implementation — no native bindings required.
import bcrypt from 'bcryptjs';

// Import the Prisma database client
import { prisma } from '@/lib/prisma';

// ── PATCH handler ─────────────────────────────────────────────────────────────
// Verifies the current password and then saves a new one.
// Expected JSON body: { currentPassword: string, newPassword: string }
export async function PATCH(req: Request) {
  // Read all cookies from the request
  const cookieStore = await cookies();

  // Extract the logged-in user's ID from the session cookie
  const userId = Number(cookieStore.get('userId')?.value ?? 0);

  // Must be logged in to change a password
  if (!userId) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });

  // Parse the JSON body to get both passwords
  const { currentPassword, newPassword } = await req.json();

  // Both fields are required — reject if either is missing or empty
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Both fields are required.' }, { status: 400 });
  }

  // Enforce a minimum password length for basic security.
  // 8 characters is a common minimum recommended by security guidelines.
  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: 'New password must be at least 8 characters.' },
      { status: 400 }
    );
  }

  // Look up the user's full record from the database.
  // We need the stored password hash to compare against currentPassword.
  const user = await prisma.user.findUnique({ where: { id: userId } });

  // This should rarely happen (the session cookie is valid, so the user should exist),
  // but we handle it gracefully just in case the account was deleted mid-session.
  if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

  // Compare the user-provided currentPassword against the stored bcrypt hash.
  // bcrypt.compare handles the salting automatically — it extracts the salt from the hash.
  // Returns true if the password is correct, false if it's wrong.
  const valid = await bcrypt.compare(currentPassword, user.password);

  // If the current password doesn't match, reject with 401 Unauthorized.
  // This prevents someone who grabbed a session cookie from changing the password.
  if (!valid) {
    return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 401 });
  }

  // Hash the new password using bcrypt with a cost factor of 12.
  // The cost factor controls how computationally expensive the hash is:
  // higher = slower brute force but slower to generate (12 is a good balance).
  // bcrypt.hash() automatically generates a random salt and includes it in the output.
  const hashed = await bcrypt.hash(newPassword, 12);

  // Save the new hashed password to the database, overwriting the old hash
  await prisma.user.update({
    where: { id: userId },
    data: {
      // The hashed string includes the algorithm, cost factor, salt, and digest — all in one string
      password: hashed,
    },
  });

  // Return a simple success response — the client will show a "Password updated" toast
  return NextResponse.json({ ok: true });
}
