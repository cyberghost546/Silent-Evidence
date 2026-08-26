// app/api/admin/newsletter/route.ts
// This file manages the weekly newsletter email system.
//
// GET  /api/admin/newsletter — admin only: returns a preview of what the newsletter
//                              would contain (top 5 stories, subscriber count, etc.)
//                              WITHOUT actually sending any emails.
//                              Lets the admin review content before committing to send.
// POST /api/admin/newsletter — admin only: actually sends the weekly newsletter to
//                              all users who have opted in to receive it.
//                              Requires SMTP environment variables to be configured.
//
// The email content and sending logic live in lib/sendNewsletter.ts.
// This route only handles auth, SMTP validation, and calling those library functions.

// Import NextResponse for building JSON HTTP responses with optional status codes
import { NextResponse } from 'next/server';

// Import the cookies() helper to read the userId cookie server-side
import { cookies } from 'next/headers';

// Import the Prisma client to look up the requesting user's role
import { prisma } from '@/lib/prisma';

// Import the two newsletter functions from the shared library:
// - sendWeeklyNewsletter: builds the email HTML and sends it to all subscribers
// - previewNewsletter: returns the newsletter data without sending (dry run)
import { sendWeeklyNewsletter, previewNewsletter } from '@/lib/sendNewsletter';

// ── Auth helper ───────────────────────────────────────────────────────────────

// Verifies the requesting user is an ADMIN.
// Returns true if they are, false otherwise.
// "Promise<boolean>" declares the return type explicitly — useful documentation for readers.
// "async" is required because we use "await" for cookies() and the DB query.
async function isAdmin(): Promise<boolean> {
  // Read all cookies from the incoming request
  const cookieStore = await cookies();

  // Get the userId cookie and convert it to a number; default to 0 if absent
  const userId = Number(cookieStore.get('userId')?.value ?? 0);

  // A userId of 0 means the cookie was absent — the user is not logged in
  if (!userId) return false;

  // Fetch only the role column from the database for this user (avoids loading unnecessary data)
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });

  // Return true only if the user exists and has the ADMIN role
  return user?.role === 'ADMIN';
}

// ── GET /api/admin/newsletter ─────────────────────────────────────────────────

// Returns a preview of the newsletter without sending it.
// The admin panel calls this to show a "here's what would be sent" summary.
export async function GET() {
  // Block non-admins — return 403 Forbidden before doing anything else
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // previewNewsletter() gathers the top stories and subscriber count
  // without sending any emails.  "await" waits for it to resolve.
  const data = await previewNewsletter();

  // Return the preview data as JSON so the admin UI can render it
  return NextResponse.json(data);
}

// ── POST /api/admin/newsletter ────────────────────────────────────────────────

// Triggers the actual newsletter send.  Requires SMTP to be configured.
export async function POST() {
  // Block non-admins — return 403 Forbidden before doing anything else
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Check that SMTP configuration exists before attempting to send.
  // process.env.SMTP_HOST reads the value from the server's environment / .env file.
  // If it's not set, emails cannot be sent — return 503 Service Unavailable with guidance.
  // 503 means "the server is running but this feature is not available right now".
  if (!process.env.SMTP_HOST) {
    return NextResponse.json(
      {
        error:
          'SMTP is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM in your environment.',
      },
      { status: 503 }
    );
  }

  // Send the newsletter and get back a result summary (e.g. { sent: 47, errors: 0 })
  // "await" pauses until all emails have been attempted
  const result = await sendWeeklyNewsletter();

  // Return the result so the admin UI can display a "Sent X emails successfully" message
  return NextResponse.json(result);
}
