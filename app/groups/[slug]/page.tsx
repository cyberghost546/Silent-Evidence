// app/groups/[slug]/page.tsx
//
// Server Component — group detail page. Fetches all group data in a single query,
// determines the current user's membership/role, and passes everything to
// GroupDetailClient which handles the interactive post feed, polls, and join/leave.
//
// PURPOSE:
//   A group is a community space for a specific horror subgenre or theme.
//   This page is the "inside" view — it shows posts, members, and polls
//   once you're viewing a group (public or after joining a private one).
//
// SINGLE QUERY WITH DEEP INCLUDES:
//   `findUnique` with nested `include` fetches all related data in one round-trip:
//   - `members` — all members with their user profile (avatar, username)
//   - `posts`   — 20 most recent posts with author info (desc order)
//   - `polls`   — active polls (not yet ended) with options and vote counts
//   - `_count`  — total member and post counts
//
// POLL VOTES CONDITIONAL INCLUDE:
//   `votes: userId ? { where: { userId }, select: { id: true } } : false`
//   When logged in, we fetch each option's votes filtered to this user — this
//   tells GroupDetailClient whether the user has already voted on each poll.
//   When not logged in, we pass `false` to skip loading votes entirely.
//
// MEMBERSHIP CHECK:
//   `membership` is found by scanning the already-loaded `group.members` array
//   (no extra DB query). `userRole` drives whether the UI shows admin controls.
//
// JSON SERIALIZATION:
//   `JSON.parse(JSON.stringify(group))` converts Dates to ISO strings for the
//   Server → Client Component prop boundary.

import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import GroupDetailClient from './GroupDetailClient';

type Props = { params: Promise<{ slug: string }> };

export default async function GroupPage({ params }: Props) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0) || null;

  const group = await prisma.group.findUnique({
    where: { slug },
    include: {
      members: {
        include: { user: { select: { id: true, username: true, profile: { select: { avatar: true } } } } },
        orderBy: { joinedAt: 'asc' },
      },
      posts: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { author: { select: { id: true, username: true, profile: { select: { avatar: true } } } } },
      },
      polls: {
        where: { OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }] },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          author: { select: { username: true } },
          _count: { select: { votes: true } },
          options: {
            select: {
              id: true, text: true,
              _count: { select: { votes: true } },
              votes: userId ? { where: { userId }, select: { id: true } } : false,
            },
          },
        },
      },
      _count: { select: { members: true, posts: true } },
    },
  });

  if (!group) return notFound();

  const membership = group.members.find(m => m.userId === userId);

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />
      <GroupDetailClient
        group={JSON.parse(JSON.stringify(group))}
        userId={userId}
        userRole={membership?.role ?? null}
      />
      <Footer />
    </main>
  );
}
