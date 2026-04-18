// app/api/admin/announcement/route.ts
// This file manages the site-wide announcement banner stored in the database.
//
// GET    /api/admin/announcement — public: returns the current announcement message
//                                  (or an empty string if none is set).
//                                  Used by the site layout to render the banner.
// POST   /api/admin/announcement — admin only: saves a new announcement message.
// DELETE /api/admin/announcement — admin only: clears the announcement entirely.
//
// The message is stored as a single row in the SiteSetting table using the key
// "announcement". Using a key-value settings table (rather than a dedicated column)
// means we can add new site-wide settings later without changing the schema.

// Import NextResponse, which lets us build HTTP responses (JSON, status codes, etc.)
import { NextResponse } from 'next/server';

// Import the cookies() helper so we can read the userId cookie server-side
import { cookies } from 'next/headers';

// Import the Prisma client to read and write to the database
import { prisma } from '@/lib/prisma';
import { revalidateTag } from 'next/cache';

// The key used to store the announcement in the SiteSetting table.
// Using a constant avoids typos — every reference to this string goes through KEY.
const KEY = 'announcement';

// ── Shared auth helper ────────────────────────────────────────────────────────

// requireAdmin() checks whether the currently logged-in user is an admin.
// Returns true if they are, or null if they are not (or not logged in).
// Returning null (falsy) instead of false makes the call site read neatly:
//   if (!(await requireAdmin())) return 403;
// "async" is needed because we must "await" the cookies() call and the DB query.
async function requireAdmin() {
  // Read all cookies sent with the request
  const cookieStore = await cookies();

  // Get the userId cookie value; if it doesn't exist, fall back to 0
  // Number() converts the string cookie value to a number
  // ?? 0 means "use 0 if the value is null or undefined"
  const userId = Number(cookieStore.get('userId')?.value ?? 0);

  // If userId is 0 (missing cookie), the user is not logged in — return null
  if (!userId) return null;

  // Look up the user in the database to get their role
  // findUnique() returns null if no row matches — safe to use with ?.
  // select: { role: true } means we only fetch the role column (not the whole row)
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });

  // Return true only if the user exists AND has the ADMIN role
  // The ternary returns true for ADMIN, null for anything else
  return user?.role === 'ADMIN' ? true : null;
}

// ── GET /api/admin/announcement ───────────────────────────────────────────────

// Public endpoint — no auth required.
// The site layout calls this on every page load to check whether a banner should be shown.
// "export async function GET()" registers this as Next.js's handler for GET requests.
export async function GET() {
  // Look up the announcement row in the SiteSetting table by its key
  // findUnique() returns the row object, or null if the key doesn't exist yet
  const row = await prisma.siteSetting.findUnique({ where: { key: KEY } });

  // Return the message value, or an empty string if no row was found
  // row?.value uses optional chaining: if row is null, this evaluates to undefined
  // ?? '' then replaces undefined with an empty string
  return NextResponse.json({ message: row?.value ?? '' });
}

// ── POST /api/admin/announcement ─────────────────────────────────────────────

// Admin-only endpoint — saves a new announcement message.
// "req: Request" is the incoming HTTP request object, which carries the JSON body.
export async function POST(req: Request) {
  // Block non-admins before doing anything else
  if (!(await requireAdmin())) {
    // Return a 403 Forbidden response with an error message in JSON
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  // Parse the JSON body of the request to get the { message } field
  const { message } = await req.json();

  // Validate that message is a non-empty string
  // typeof checks the type; .trim() removes leading/trailing whitespace
  // If the message is missing or blank, return a 400 Bad Request
  if (typeof message !== 'string' || !message.trim()) {
    return NextResponse.json({ error: 'Message is required.' }, { status: 400 });
  }

  // upsert = "update if it exists, create if it doesn't"
  // where: finds the row by key; update: sets the new value; create: inserts a new row
  // message.trim() removes surrounding whitespace before saving
  await prisma.siteSetting.upsert({
    where:  { key: KEY },
    update: { value: message.trim() },
    create: { key: KEY, value: message.trim() },
  });

  // Bust the 60-second cache so the new banner shows immediately on all pages
  revalidateTag('announcement-banner');

  // Return a success acknowledgement
  return NextResponse.json({ ok: true });
}

// ── DELETE /api/admin/announcement ───────────────────────────────────────────

// Admin-only endpoint — removes the announcement row entirely.
// After this, GET will return an empty message and no banner will be shown.
export async function DELETE() {
  // Block non-admins before doing anything else
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  // deleteMany removes all rows matching the filter — safe even if the row doesn't exist
  // (deleteMany won't throw when 0 rows match, unlike delete() which would)
  await prisma.siteSetting.deleteMany({ where: { key: KEY } });

  // Bust the cache so the banner disappears immediately
  revalidateTag('announcement-banner');

  // Return a success acknowledgement
  return NextResponse.json({ ok: true });
}
