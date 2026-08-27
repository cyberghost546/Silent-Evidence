// app/my-invites/page.tsx
// Shows the logged-in user all pending co-author invitations.
// Users can accept or decline each invite from this page.

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import MyInvitesClient from './MyInvitesClient';

export const metadata = { title: 'Co-author Invites' };

export default async function MyInvitesPage() {
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0);
  if (!userId) redirect('/login');

  // Fetch all collaborator records for this user (pending + resolved)
  const invites = await prisma.storyCollaborator.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      story: {
        select: {
          id: true,
          title: true,
          slug: true,
          author: { select: { username: true } },
        },
      },
    },
  });

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold text-white mb-2">Co-author Invites</h1>
        <p className="text-sm text-gray-500 mb-8">
          Stories you have been invited to collaborate on.
        </p>
        <MyInvitesClient
          invites={invites.map((inv) => ({
            id: inv.id,
            accepted: inv.accepted,
            createdAt: inv.createdAt.toISOString(),
            story: {
              id: inv.story.id,
              title: inv.story.title,
              slug: inv.story.slug,
              authorUsername: inv.story.author.username,
            },
          }))}
        />
      </div>
      <Footer />
    </main>
  );
}
