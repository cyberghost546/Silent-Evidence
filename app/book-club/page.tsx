// app/book-club/page.tsx
// Lists all book clubs the user belongs to + public clubs they can join.

import { Metadata } from 'next';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import BookClubList from '@/app/components/ui/BookClubList';

export const metadata: Metadata = { title: 'Horror Book Clubs | Silent Evidence' };

export default async function BookClubPage() {
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0) || null;

  const isPremium = userId
    ? (await prisma.subscription.findUnique({ where: { userId }, select: { status: true } }))?.status === 'active'
    : false;

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />

      <div className="relative bg-gray-950 border-b border-gray-800 py-12 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(220,38,38,0.12)_0%,transparent_70%)]" />
        <div className="max-w-4xl mx-auto px-4 relative">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-4xl font-extrabold text-white">Horror Book Clubs</h1>
          </div>
          <p className="text-gray-400 text-sm mt-1">
            Read the same story with friends. Share theories. Discuss the horror together.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10">
        <BookClubList userId={userId} isPremium={isPremium} />
      </div>

      <Footer />
    </main>
  );
}
