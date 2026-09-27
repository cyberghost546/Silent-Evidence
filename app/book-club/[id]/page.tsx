// app/book-club/[id]/page.tsx
// Detail page for a single book club — shows current story, members, and invite code.

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import BookClubRoom from '@/app/components/ui/BookClubRoom';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const club = await prisma.bookClub.findUnique({ where: { id: Number(id) } });
  if (!club) return { title: 'Not Found' };
  return { title: `${club.name} | Book Club | Silent Evidence` };
}

export default async function BookClubDetailPage({ params }: Props) {
  const { id } = await params;
  const clubId = Number(id);

  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0) || null;

  const club = await prisma.bookClub.findUnique({
    where: { id: clubId },
    include: {
      owner: { select: { id: true, username: true, profile: { select: { avatar: true } } } },
      members: {
        orderBy: { joinedAt: 'asc' },
        include: {
          user: { select: { id: true, username: true, profile: { select: { avatar: true } } } },
        },
      },
      story: {
        select: {
          id: true,
          title: true,
          slug: true,
          coverImage: true,
          excerpt: true,
          content: true,
          author: { select: { username: true } },
          _count: { select: { likes: true, comments: true } },
        },
      },
    },
  });

  if (!club) notFound();

  // Only members (or public club visitors) can view
  const isMember = userId ? club.members.some((m) => m.userId === userId) : false;
  const isOwner = userId === club.owner.id;
  const canView = !club.isPrivate || isMember;

  if (!canView) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center flex-col gap-4 px-4">
          <h1 className="text-2xl font-bold text-white">Private Club</h1>
          <p className="text-gray-400 text-sm text-center max-w-sm">
            This book club is invite-only. Ask a member for the invite code to join.
          </p>
          <Link
            href="/book-club"
            className="mt-2 px-5 py-2 bg-red-600 hover:bg-red-700 rounded-xl text-sm font-semibold transition"
          >
            Browse Public Clubs
          </Link>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-10">
        <BookClubRoom
          club={JSON.parse(JSON.stringify(club))}
          userId={userId}
          isMember={isMember}
          isOwner={isOwner}
        />
      </div>
      <Footer />
    </main>
  );
}
