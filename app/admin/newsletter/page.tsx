// app/admin/newsletter/page.tsx
//
// Server Component — auth-gated page that pre-loads the newsletter preview,
// then passes it to AdminNewsletterClient as initial data.
//
// PURPOSE:
//   Lets the admin compose and send the weekly horror digest email to all
//   subscribers. The preview shows what the email will contain (top stories,
//   featured authors, etc.) before the admin hits "Send".
//
// WHY AUTH IS CHECKED TWICE HERE:
//   This page does its own explicit auth check (cookie → DB role) instead of
//   relying solely on the admin layout. That's because `previewNewsletter()` is
//   an expensive operation that queries the DB — we want to abort early with a
//   redirect before running it if the user isn't an admin.
//   The admin layout's redirect is the first gate; this is a second, belt-and-
//   suspenders check specific to this sensitive page.
//
// PATTERN — server-side preview to avoid client loading flash:
//   `previewNewsletter()` runs the same logic as the scheduled newsletter job
//   but returns the data instead of sending an email. Running it here (server-side)
//   means AdminNewsletterClient receives `initialPreview` as a prop and can render
//   the preview immediately on first paint, without showing a spinner.
//
// JSON SERIALIZATION:
//   `JSON.parse(JSON.stringify(preview))` strips Date objects into ISO strings so
//   the data can safely cross the Server → Client Component boundary as props.

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { previewNewsletter } from '@/lib/sendNewsletter';
import AdminNewsletterClient from './AdminNewsletterClient';

export default async function AdminNewsletterPage() {
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0);
  if (!userId) redirect('/login');

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role !== 'ADMIN') redirect('/');

  // Load preview data on the server so the client renders immediately
  const preview = await previewNewsletter();

  return <AdminNewsletterClient initialPreview={JSON.parse(JSON.stringify(preview))} />;
}
