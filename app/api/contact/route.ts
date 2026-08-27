// app/api/contact/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// This file handles two endpoints for the contact form:
//
//   POST /api/contact — public: anyone (including guests) can submit a message.
//                        Validates all fields and saves the message to the database.
//
//   GET  /api/contact — admin only: returns all contact messages.
//                        Supports optional filtering by read/resolved status.
//                        Used by the admin dashboard to triage incoming messages.
//
// Contact messages are stored in the contactMessage table and can be marked as
// read or resolved by admins via the PATCH endpoint in the [id]/route.ts file.
// ─────────────────────────────────────────────────────────────────────────────

// Import NextRequest (typed request with URL helpers) and NextResponse (JSON builder)
import { NextRequest, NextResponse } from 'next/server';

// Import cookies() to read the session cookie for the admin auth check in GET
import { cookies } from 'next/headers';

// Import the Prisma database client to save and retrieve contact messages
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const ContactSchema = z.object({
  name: z.string().min(1, 'Name is required.').max(100),
  email: z.string().min(1, 'Email is required.').email('Invalid email address.').max(254),
  subject: z.string().min(1, 'Subject is required.').max(200),
  message: z.string().min(1, 'Message is required.').max(5000, 'Message is too long.'),
});

// ── POST — public: anyone can submit a contact message ───────────────────────
// This function runs whenever a POST request is made to /api/contact.
// "req" contains the name, email, subject, and message in its JSON body.
export async function POST(req: NextRequest) {
  // ── Parse and validate the request body ─────────────────────────────────
  const rawBody = await req.json();
  const parsed = ContactSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', issues: parsed.error.issues },
      { status: 400 }
    );
  }
  const { name, email, subject, message } = parsed.data;

  // ── Save the message to the database ─────────────────────────────────────
  // Insert a new contactMessage row with all four validated fields.
  // The read and resolved fields default to false (set by the Prisma schema default).
  await prisma.contactMessage.create({
    data: { name, email, subject, message },
  });

  // Return 201 Created — the message was saved successfully
  return NextResponse.json({ ok: true }, { status: 201 });
}

// ── GET — admin only: list messages ──────────────────────────────────────────
// This function runs whenever a GET request is made to /api/contact.
// Only admins can access this endpoint — regular users get 403 Forbidden.
// An optional ?filter= query parameter narrows the results.
export async function GET(req: NextRequest) {
  // ── Admin auth check ──────────────────────────────────────────────────────
  // Read the session cookie to identify the requesting user
  const cookieStore = await cookies();

  // Extract the userId from the 'userId' cookie; default to 0 if missing
  const userId = Number(cookieStore.get('userId')?.value ?? 0);

  // If userId is 0 (falsy), the user is not logged in at all — reject with 403 Forbidden.
  // We use 403 instead of 401 here because this is an admin-only resource —
  // we don't want to hint that logging in would help a regular user access it.
  if (!userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Look up the user's role in the database to confirm they are an admin.
  // We must check the database — the cookie can be forged, so we never trust it for roles.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }, // only retrieve the role field — nothing else is needed
  });

  // If the user's role is not 'ADMIN', deny access with 403 Forbidden
  if (user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // ── Read the optional filter query parameter ──────────────────────────────
  // ?filter=unread    — show only messages that haven't been read yet
  // ?filter=resolved  — show only messages that have been marked as resolved
  // no filter          — show all messages
  const filter = req.nextUrl.searchParams.get('filter'); // 'unread' | 'resolved' | null (all)

  // ── Fetch messages from the database ──────────────────────────────────────
  // Build a where clause based on the filter parameter.
  // The conditional expression (ternary chains) selects the right filter object.
  // orderBy createdAt desc — most recent message appears first (important for triage)
  const messages = await prisma.contactMessage.findMany({
    // If filter is 'unread',   only return messages where read is false.
    // If filter is 'resolved', only return messages where resolved is true.
    // If filter is null/other, pass an empty object {} — no filter, return all messages.
    where: filter === 'unread' ? { read: false } : filter === 'resolved' ? { resolved: true } : {},

    orderBy: { createdAt: 'desc' }, // newest message at the top of the admin list
  });

  // Return the full array of matching contact messages as JSON
  return NextResponse.json(messages);
}
