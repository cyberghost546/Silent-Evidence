// app/challenges/[id]/page.tsx
// Detail page for a single writing challenge at /challenges/:id.
//
// Shows:
//   - The challenge title, description, and writing prompt
//   - Dates and current status (active / upcoming / ended)
//   - A submit section (ChallengeActions) where logged-in users can enter one of
//     their published stories, or see that they've already entered
//   - A ranked leaderboard of all entries, sorted by community votes

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import ChallengeActions from '@/app/components/ui/ChallengeActions';
import { readingTime } from '@/lib/readingTime';

type Props = { params: Promise<{ id: string }> };

export default async function ChallengePage({ params }: Props) {
  const { id } = await params;

  // Check if the viewer is logged in so we can personalise the submit section
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0) || null;

  // Fetch the challenge along with all its entries, ordered by vote count descending
  // so the highest-voted entry appears at the top (leaderboard style).
  const challenge = await prisma.challenge.findUnique({
    where: { id: Number(id) },
    include: {
      entries: {
        orderBy: { votes: 'desc' },
        include: {
          story: {
            select: {
              id: true, title: true, slug: true, excerpt: true,
              coverImage: true, content: true,
              author: { select: { username: true } },
              _count: { select: { likes: true } },
            },
          },
          user: { select: { username: true } },
        },
      },
    },
  });

  if (!challenge) return notFound();

  const now = new Date();
  // Active = admin enabled it AND we're within the start/end date window
  const isActive = challenge.active && now >= challenge.startDate && now <= challenge.endDate;

  // Find the current user's entry (if any) so ChallengeActions can show
  // "You've already entered" instead of the submission form.
  const userEntry = userId ? challenge.entries.find(e => e.userId === userId) : null;

  // Fetch the user's published stories so they can pick one to submit.
  // Only published stories can be entered — drafts can't compete.
  const userStories = userId ? await prisma.story.findMany({
    where: { authorId: userId, status: 'PUBLISHED' },
    select: { id: true, title: true },
    orderBy: { createdAt: 'desc' },
  }) : [];

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex items-center gap-2 mb-6 text-xs text-gray-500">
          <Link href="/challenges" className="hover:text-gray-300 transition">Challenges</Link>
          <span>/</span>
          <span className="text-gray-400">{challenge.title}</span>
        </div>

        {/* Header */}
        <div className="bg-gray-800 border border-red-600/20 rounded-2xl p-8 mb-8">
          <div className="flex items-start justify-between gap-4 mb-4">
            <h1 className="text-2xl font-bold text-white">{challenge.title}</h1>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full flex-shrink-0 ${isActive ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 'bg-gray-700 text-gray-400'}`}>
              {isActive ? 'Active' : now > challenge.endDate ? 'Ended' : 'Upcoming'}
            </span>
          </div>
          <p className="text-gray-400 mb-5">{challenge.description}</p>
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 mb-5">
            <p className="text-xs text-red-400 font-bold uppercase tracking-widest mb-2">✍️ The Prompt</p>
            <p className="text-lg text-white italic leading-relaxed">"{challenge.prompt}"</p>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>📅 {new Date(challenge.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} – {new Date(challenge.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            <span>·</span>
            <span>{challenge.entries.length} entries</span>
          </div>
        </div>

        {/* Submit / status */}
        <ChallengeActions
          challengeId={challenge.id}
          isActive={isActive}
          isLoggedIn={!!userId}
          userEntry={userEntry ? { storyId: userEntry.storyId } : null}
          userStories={userStories}
        />

        {/* Entries */}
        {challenge.entries.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-bold text-white mb-4">Entries ({challenge.entries.length})</h2>
            <div className="flex flex-col gap-4">
              {challenge.entries.map((entry, i) => (
                <div key={entry.id} className="flex gap-4 bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
                  {/* Rank panel — gold/silver/bronze medals for top 3, then numbered */}
                  <div className="w-14 bg-gray-900 flex items-center justify-center flex-shrink-0">
                    <span className={`text-xl font-bold ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-orange-600' : 'text-gray-700'}`}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                    </span>
                  </div>
                  {entry.story.coverImage && (
                    <div className="w-20 flex-shrink-0">
                      <img src={entry.story.coverImage} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1 py-4 pr-4 min-w-0">
                    <Link href={`/story/${entry.story.slug}`} className="text-sm font-semibold text-white hover:text-red-300 transition line-clamp-1">{entry.story.title}</Link>
                    <p className="text-xs text-gray-500 mt-0.5">by {entry.story.author.username}</p>
                    {entry.story.excerpt && <p className="text-xs text-gray-500 line-clamp-1 mt-1">{entry.story.excerpt}</p>}
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
                      <span>{readingTime(entry.story.content)}</span>
                      <span>·</span>
                      <span>♥ {entry.story._count.likes}</span>
                      <span>·</span>
                      <span className="text-yellow-400 font-semibold">⭐ {entry.votes} votes</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}
