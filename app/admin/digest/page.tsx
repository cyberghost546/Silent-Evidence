// app/admin/digest/page.tsx
//
// Server Component — admin page for previewing and sending the comments digest email.
//
// The "comments digest" is a scheduled email sent to story authors summarising new
// comments they have received since the last digest. This page lets the admin:
//   1. Preview what the digest would contain right now (who gets what).
//   2. Manually trigger a send without waiting for the scheduled job.
//
// AUTH FLOW:
//   Standard double-check: cookie → userId → role === 'ADMIN'.
//   If either check fails the user is redirected before any data is fetched.
//
// DATA FLOW:
//   `previewCommentsDigest()` is a server-side utility function (lib/sendCommentsDigest.ts)
//   that queries the database and returns a preview object showing which authors
//   would receive an email and how many new comments each has. This runs on the server
//   so the data is ready on first paint — AdminDigestClient receives it as a prop
//   and doesn't need its own loading state for the initial preview.

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { previewCommentsDigest } from '@/lib/sendCommentsDigest';
import AdminDigestClient from './AdminDigestClient';

export default async function AdminDigestPage() {
  // ── Auth: must be logged in ───────────────────────────────────────────────
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0);
  if (!userId) redirect('/login');

  // ── Auth: must be an admin ────────────────────────────────────────────────
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role !== 'ADMIN') redirect('/');

  // ── Prefetch the digest preview ───────────────────────────────────────────
  // Runs the same logic the digest scheduler uses, but returns data instead of
  // actually sending emails — safe to call at any time without side effects.
  const preview = await previewCommentsDigest();

  // Pass the preview to the Client Component which renders the table and
  // provides the "Send now" button that triggers the real email send.
  return <AdminDigestClient initialPreview={preview} />;
}
