// app/api/contact/[id]/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// This file handles two admin-only endpoints for managing individual contact messages:
//
//   PATCH  /api/contact/[id] — marks a message as read and/or resolved.
//                               Both flags can be updated in the same request
//                               or independently (partial update pattern).
//
//   DELETE /api/contact/[id] — permanently deletes a contact message.
//
// Both endpoints require the requesting user to have the ADMIN role.
// The [id] in the file path is a Next.js dynamic route segment — it captures
// the message's database ID from the URL (e.g. PATCH /api/contact/12 → id = "12").
// ─────────────────────────────────────────────────────────────────────────────

// Import NextRequest (typed request with URL helpers) and NextResponse (JSON builder)
import { NextRequest, NextResponse } from 'next/server';

// Import cookies() to read the session cookie for admin authentication
import { cookies } from 'next/headers';

// Import the Prisma database client to query users and update/delete messages
import { prisma } from '@/lib/prisma';

// Next.js App Router passes dynamic route segments (e.g. [id]) through a params Promise.
// We declare the type so TypeScript knows the shape of the resolved params object.
type Params = { params: Promise<{ id: string }> };

// ── Helper: verify the requesting user is an admin ────────────────────────────
// This function is called by both PATCH and DELETE so the auth check isn't repeated.
// Returns true if the logged-in user has the ADMIN role, false otherwise.
async function requireAdmin() {
  // Access the request's cookie store
  const c = await cookies();

  // Extract and convert the userId from the session cookie; default to 0 if missing
  const userId = Number(c.get('userId')?.value ?? 0);

  // If userId is 0 (falsy), the user is not logged in — return false immediately
  if (!userId) return false;

  // Look up the user in the database and check their role.
  // We query the DB because cookies can be tampered with — the DB is the source of truth.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }, // we only need the role field for this check
  });

  // Return true only if the role is exactly 'ADMIN'
  return user?.role === 'ADMIN';
}

// ── PATCH /api/contact/[id] — body: { read?: boolean, resolved?: boolean } ────
// Updates the read and/or resolved status of a contact message.
// Both flags are optional — you can update just one or both in a single request.
// "req"    — the incoming request; the JSON body contains the fields to update
// "params" — contains the dynamic [id] segment (the message's database ID)
export async function PATCH(req: NextRequest, { params }: Params) {
  // Verify admin status — reject non-admins with 403 Forbidden
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Await the params Promise to get the message ID string from the URL segment
  const { id } = await params;

  // Parse the JSON body from the request
  const body = await req.json();

  // ── Build the partial update object ──────────────────────────────────────
  // Start with an empty object — we only add fields that were actually provided
  // in the body. Record<string, boolean> means "an object with string keys and boolean values".
  // Allow toggling read and/or resolved independently
  const data: Record<string, boolean> = {};

  // Only include the 'read' field if it was provided AND is a boolean.
  // typeof check prevents accidentally accepting "true" as a string or 1 as a number.
  if (typeof body.read === 'boolean') data.read = body.read;

  // Only include the 'resolved' field if it was provided AND is a boolean.
  if (typeof body.resolved === 'boolean') data.resolved = body.resolved;

  // ── Apply the update ──────────────────────────────────────────────────────
  // Update the contact message in the database with the partial data object.
  // Only the fields present in `data` will be changed — other fields are left alone.
  const updated = await prisma.contactMessage.update({
    where: { id: Number(id) }, // Number() converts the URL string to an integer
    data, // the partial update — may contain 'read', 'resolved', or both
  });

  // Return the full updated message record so the admin UI can reflect the new state
  return NextResponse.json(updated);
}

// ── DELETE /api/contact/[id] ──────────────────────────────────────────────────
// Permanently deletes a contact message from the database.
// This is a hard delete — there is no soft-delete / recycle bin.
// "_req" is the incoming request — prefixed with _ because we don't read its body.
export async function DELETE(_req: NextRequest, { params }: Params) {
  // Verify admin status — reject non-admins with 403 Forbidden
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Await the params Promise to get the message ID string from the URL segment
  const { id } = await params;

  // Delete the contact message from the database by its primary key.
  // If the ID doesn't exist, Prisma will throw a "Record to delete does not exist" error.
  // For now we let that propagate naturally rather than adding an extra findUnique check.
  await prisma.contactMessage.delete({
    where: { id: Number(id) }, // Number() converts the URL string to an integer
  });

  // Return 200 OK — the message was permanently deleted
  return NextResponse.json({ ok: true });
}
