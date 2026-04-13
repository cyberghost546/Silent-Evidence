// app/api/admin/digest/route.ts
// This file manages the comment digest email system for story authors.
//
// GET  /api/admin/digest — admin only: returns a preview of what the digest would contain
//                          (counts, recipients, sample data) WITHOUT actually sending any emails.
//                          Used by the admin UI to show a summary before the admin pulls the trigger.
// POST /api/admin/digest — admin only: actually sends the digest emails to all eligible authors.
//                          Requires SMTP to be configured in the environment variables.
//
// The digest collects comments received on each author's stories since the last digest
// was sent, then emails a summary to each author.  Logic lives in lib/sendCommentsDigest.ts.

// Import NextResponse for building JSON HTTP responses with optional status codes
import { NextResponse } from 'next/server';

// Import the cookies() helper to read the userId cookie server-side
import { cookies } from 'next/headers';

// Import the Prisma client to look up the requesting user's role
import { prisma } from '@/lib/prisma';

// Import the two digest functions from the shared library:
// - sendCommentsDigest: actually sends the emails and returns a result summary
// - previewCommentsDigest: gathers the same data but stops before sending
import { sendCommentsDigest, previewCommentsDigest } from '@/lib/sendCommentsDigest';

// ── Auth helper ───────────────────────────────────────────────────────────────

// Reads the userId cookie and confirms the user has the ADMIN role in the database.
// Returns true for admins, false for everyone else.
// "Promise<boolean>" declares the async return type explicitly for clarity.
async function isAdmin(): Promise<boolean> {
  // Read all cookies from the incoming request
  const cookieStore = await cookies();

  // Get the userId cookie value; default to 0 if absent
  const userId = Number(cookieStore.get('userId')?.value ?? 0);

  // userId of 0 means no cookie — not logged in
  if (!userId) return false;

  // Fetch only the role column from the database for this user
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });

  // Return true only if the user exists and has the ADMIN role
  return user?.role === 'ADMIN';
}

// ── GET /api/admin/digest ─────────────────────────────────────────────────────

// Returns a dry-run preview of the digest without sending any emails.
// The admin can review recipient counts, comment counts, and sample data
// before deciding whether to send.
export async function GET() {
  // Block non-admins — return 403 Forbidden
  if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Call previewCommentsDigest() to gather digest data without sending emails.
  // "await" pauses here until the function resolves; its return value is passed to JSON.
  return NextResponse.json(await previewCommentsDigest());
}

// ── POST /api/admin/digest ────────────────────────────────────────────────────

// Triggers the actual sending of comment digest emails to all eligible story authors.
// Requires SMTP environment variables to be configured — returns 503 if they're not.
export async function POST() {
  // Block non-admins — return 403 Forbidden
  if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Check that SMTP is configured before attempting to send.
  // process.env.SMTP_HOST is read from the server's environment variables (.env file).
  // If it's not set, emails would fail — return a 503 Service Unavailable with a helpful message.
  if (!process.env.SMTP_HOST) {
    return NextResponse.json(
      { error: 'SMTP is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS in your environment.' },
      { status: 503 }, // 503 = Service Unavailable — the server exists but a dependency is missing
    );
  }

  // Send the digest emails and return the result summary.
  // sendCommentsDigest() returns an object like { sent: 12, skipped: 3, errors: 0 }
  const result = await sendCommentsDigest();

  // Return the result summary so the admin UI can display how many emails were sent
  return NextResponse.json(result);
}
