// app/groups/page.tsx
//
// Server Component — fetches publicly visible groups and passes them to
// GroupsClient which handles the create-group modal and join/leave actions.
//
// PURPOSE:
//   Groups are community spaces where readers/writers can discuss a shared
//   horror subgenre, series, or topic. This page is the discovery listing —
//   it shows all public groups so anyone can browse and join.
//
// DATA:
//   `where: { isPrivate: false }` — only public groups shown on the listing.
//   Private groups exist but are only accessible by direct invite.
//   `take: 40` — caps the listing at 40 most recent groups (no pagination yet).
//   `_count: { select: { members, posts } }` — adds member and post counts without
//   loading the actual member/post rows (efficient: one query, no N+1).
//
// CONDITIONAL MEMBER LOOKUP:
//   `members: userId ? { where: { userId }, select: { id, role } } : false`
//   If the user is logged in, Prisma also fetches whether THEY are a member of
//   each group (and their role). This lets GroupsClient show "Leave" vs "Join".
//   If not logged in, we pass `false` to skip the join, avoiding a query per group.
//   Prisma treats `false` as "don't include this relation" — a useful performance trick.

import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import GroupsClient from './GroupsClient';

export const metadata = { title: 'Groups — Silent Evidence' };

export default async function GroupsPage() {
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0) || null;

  const groups = await prisma.group.findMany({
    where: { isPrivate: false },
    orderBy: { createdAt: 'desc' },
    take: 40,
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      coverImage: true,
      subgenre: true,
      isPrivate: true,
      createdAt: true,
      _count: { select: { members: true, posts: true } },
      members: userId ? { where: { userId }, select: { id: true, role: true } } : false,
    },
  });

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />
      <div className="max-w-5xl mx-auto px-4 py-12">
        <GroupsClient groups={groups as never} userId={userId} />
      </div>
      <Footer />
    </main>
  );
}
