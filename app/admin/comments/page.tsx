// app/admin/comments/page.tsx
// Server-side admin page for moderating user comments.
// Performs two auth checks before rendering:
//   1. Must be logged in (userId cookie present)
//   2. Must have the ADMIN role — anyone else is redirected home
//
// Fetches the 100 most recent comments (newest first) with the commenter's username
// and the story title/slug so the admin can identify context at a glance.
// The actual delete/approve actions are handled in AdminCommentsClient (client component).

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import AdminCommentsClient from '@/app/components/ui/AdminCommentsClient';

export default async function AdminCommentsPage() {
  // Read the session cookie to identify who is viewing this page
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0);

  // Not logged in — send to login page
  if (!userId) redirect('/login');

  // Look up the user's role to confirm they're an admin
  const me = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });

  // Non-admin users are silently redirected to the homepage
  if (me?.role !== 'ADMIN') redirect('/');

  // Load the 100 most recent comments, including who wrote them and which story they're on
  // — capped at 100 to keep the page fast; older comments can be filtered/paginated later
  const comments = await prisma.comment.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      user:  { select: { username: true } },
      story: { select: { title: true, slug: true } },
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-8">Comment Moderation</h1>
      {/*
        JSON.parse(JSON.stringify(...)) strips non-serialisable values like Date objects
        before passing the data from this server component to the client component.
        Without this, Next.js would throw a serialisation error.
      */}
      <AdminCommentsClient comments={JSON.parse(JSON.stringify(comments))} />
    </div>
  );
}
