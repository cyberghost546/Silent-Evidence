// app/api/admin/categories/[id]/route.ts
// This file handles operations on a SINGLE category, identified by its numeric ID
// in the URL path (e.g. /api/admin/categories/5).
//
// DELETE /api/admin/categories/[id] — admin only: permanently removes the category.
//
// WARNING: deleting a category that has stories associated with it may fail or cascade
// depending on the referential actions configured in the Prisma schema.
// The admin UI should warn before allowing deletion of non-empty categories.

// Import NextResponse for building JSON HTTP responses with optional status codes
import { NextResponse } from 'next/server';

// Import the cookies() helper to read the userId cookie server-side
import { cookies } from 'next/headers';

// Import the Prisma client to execute database operations
import { prisma } from '@/lib/prisma';

// Declare the shape of the dynamic route params object.
// Next.js passes URL segments as strings wrapped in a Promise.
// "{ id: string }" means the URL contains a segment named "id" that is a string.
// We will convert it to a number before using it in Prisma queries.
type Params = { params: Promise<{ id: string }> };

// ── Auth helper ───────────────────────────────────────────────────────────────

// Reads the userId cookie and returns true if the user is an ADMIN, false otherwise.
// Used at the start of the DELETE handler to prevent unauthorised access.
async function isAdmin() {
  // Read all cookies from the incoming request
  const cookieStore = await cookies();

  // Get the userId cookie value; default to 0 if the cookie is absent
  const userId = Number(cookieStore.get('userId')?.value ?? 0);

  // A userId of 0 means no cookie — the user is not logged in
  if (!userId) return false;

  // Look up the user in the database; only fetch the role column
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });

  // Return true only if the user record exists and their role is ADMIN
  return user?.role === 'ADMIN';
}

// ── DELETE /api/admin/categories/[id] ────────────────────────────────────────

// Permanently deletes the category row with the given ID.
// "_req" is prefixed with an underscore to indicate we deliberately ignore the request body.
// "{ params }: Params" is how Next.js passes the dynamic [id] segment from the URL.
export async function DELETE(_req: Request, { params }: Params) {
  // Block non-admins — return 403 Forbidden without touching the database
  if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  // Await the params Promise to get the id string from the URL
  const { id } = await params;

  // Delete the category row — Number(id) converts the URL string "5" to the integer 5
  // Prisma's delete() throws if no row matches, so the category must exist
  await prisma.category.delete({ where: { id: Number(id) } });

  // Return a simple success acknowledgement — { ok: true } is a common convention
  return NextResponse.json({ ok: true });
}
