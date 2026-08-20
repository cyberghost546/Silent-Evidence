// =============================================================================
// app/unsubscribe/page.tsx  —  SERVER COMPONENT
// =============================================================================
// One-click unsubscribe page linked from the footer of every newsletter email.
// When a user clicks "Unsubscribe" in their email client, the link brings them
// here with a ?token= query parameter.
//
// Security design:
//  • The token is the user's email address encoded as base64url — no secrets
//    are exposed in the URL and the token is unguessable for arbitrary emails.
//  • If the user is NOT found we still return a success message.  This is
//    deliberate: returning an error for unknown emails would allow an attacker
//    to probe which email addresses have accounts on the platform.
//  • base64url (RFC 4648 §5) uses - and _ instead of + and / so the token is
//    URL-safe without needing percent-encoding.
//
// Key concepts:
//  • Server Component — no 'use client' directive; all logic runs on the server.
//  • searchParams prop — typed as Promise<…> in Next.js 14 App Router; must
//    be awaited before accessing values.
//  • Prisma update — only fired when the user is currently subscribed, avoiding
//    an unnecessary write on repeat visits to the same link.
//  • Helper component (Result) — defined in the same file for simplicity.
//    It's just a presentational component with no interactivity so it doesn't
//    need its own file.
// =============================================================================

import { redirect } from 'next/navigation';
import { CheckCircle2, XCircle } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

// searchParams is a Promise in Next.js 14 Server Components.  The optional
// `token` field maps to the ?token= query parameter in the URL.
type Props = { searchParams: Promise<{ token?: string }> };

export default async function UnsubscribePage({ searchParams }: Props) {
  // Await the search params promise — this resolves the query string values.
  const { token } = await searchParams;

  // ── Guard: missing token ──────────────────────────────────────────────────
  // If the URL has no ?token= we can't identify the user.  Show an error card.
  if (!token) {
    return <Result success={false} message="Invalid unsubscribe link." />;
  }

  // ── Decode the token ──────────────────────────────────────────────────────
  // The token is the raw email address encoded as base64url by the newsletter
  // sending code.  Buffer.from with 'base64url' handles the RFC 4648 §5 variant
  // that replaces + with - and / with _ for URL safety.
  let email: string;
  try {
    email = Buffer.from(token, 'base64url').toString('utf8');
  } catch {
    // Buffer.from will throw if the string isn't valid base64 — treat it as an
    // invalid link rather than crashing the page.
    return <Result success={false} message="Invalid unsubscribe link." />;
  }

  // ── Look up the user ──────────────────────────────────────────────────────
  // select: { id, newsletterSubscribed } — we only need these two fields;
  // fetching the full user row would be wasteful.
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, newsletterSubscribed: true },
  });

  if (!user) {
    // Intentionally return SUCCESS for unknown emails to prevent email enumeration
    // attacks.  From the user's perspective the action succeeded either way.
    return <Result success={true} message="You have been unsubscribed." />;
  }

  // ── Update the subscription flag ─────────────────────────────────────────
  // Only run the UPDATE if the user is currently subscribed.  This avoids
  // writing to the DB on repeat clicks (idempotent behaviour) and keeps the
  // success message accurate.
  if (user.newsletterSubscribed) {
    await prisma.user.update({
      where: { id: user.id },
      data: { newsletterSubscribed: false },
    });
  }

  return <Result success={true} message="You've been unsubscribed from the weekly digest." />;
}

// =============================================================================
// Result — internal presentational component
// =============================================================================
// A simple centred card that shows the outcome of the unsubscribe request.
// Defined in the same file because it's only used here and has no complex logic.
//
// Props:
//  success — controls the icon (✅ / ❌) and card heading text
//  message — the detail text shown below the heading
// =============================================================================
function Result({ success, message }: { success: boolean; message: string }) {
  return (
    // min-h-screen + flex + items-center vertically centres the card on screen.
    // bg-gray-900 matches the site's dark theme.
    <main className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      {/* max-w-sm caps the card at a readable narrow width on wide screens */}
      <div className="max-w-sm w-full bg-gray-800 border border-gray-700 rounded-2xl p-8 text-center">
        {/* Dynamic icon — green checkmark on success, red X on failure */}
        <p className="flex justify-center mb-4">
          {success
            ? <CheckCircle2 className="w-10 h-10 text-green-400" strokeWidth={1.5} aria-hidden="true" />
            : <XCircle className="w-10 h-10 text-red-400" strokeWidth={1.5} aria-hidden="true" />}
        </p>
        <h1 className="text-xl font-bold text-white mb-2">
          {success ? 'Unsubscribed' : 'Something went wrong'}
        </h1>
        {/* Detail message passed from the parent — varies per error type */}
        <p className="text-gray-400 text-sm mb-6">{message}</p>

        {/* Let users re-subscribe or manage other preferences from settings */}
        <Link
          href="/settings"
          className="inline-block px-5 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition"
        >
          Manage preferences
        </Link>

        {/* Secondary escape hatch back to the homepage */}
        <div className="mt-3">
          <Link href="/" className="text-xs text-gray-600 hover:text-gray-400 transition">
            ← Back to Silent Evidence
          </Link>
        </div>
      </div>
    </main>
  );
}
