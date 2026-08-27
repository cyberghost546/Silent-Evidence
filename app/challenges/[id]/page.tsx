// =============================================================================
// app/challenges/[id]/page.tsx
// =============================================================================
//
// PURPOSE:
//   Detail page for a single writing challenge at /challenges/[id].
//   Challenges are community writing contests with a specific prompt and a
//   start/end date window during which entries can be submitted.
//
// HOW DYNAMIC ROUTING WORKS:
//   [id] in the folder name is a URL variable. Visiting /challenges/42 sets
//   params.id === "42". Note: IDs are always strings from URL params — we
//   convert to Number with Number(id) before passing to Prisma.
//
// ACCESS:
//   Public — anyone can view a challenge and its entries.
//   Logged-in users additionally see the ChallengeActions submission form.
//
// DATA FETCHED:
//   - prisma.challenge: the challenge record with all entries ordered by votes
//     (leaderboard). Each entry includes the submitted story and its author.
//   - prisma.story: the logged-in user's own published stories (for the
//     submission dropdown — only published stories can be entered).
//
// SERVER COMPONENT:
//   Runs on the server. Reads the session cookie directly via cookies().
// =============================================================================

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import ChallengeActions from '@/app/components/ui/ChallengeActions';
import { readingTime } from '@/lib/readingTime';

// ---------------------------------------------------------------------------
// Props type
// ---------------------------------------------------------------------------
// params is a Promise in Next.js 14 App Router. The [id] segment becomes
// params.id as a string — must be parsed to Number before Prisma queries.
type Props = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// ChallengePage — main Server Component
// ---------------------------------------------------------------------------
export default async function ChallengePage({ params }: Props) {
  const { id } = await params;

  // ── Auth check ────────────────────────────────────────────────────────────
  // Read the userId cookie. Unauthenticated visitors get userId = null.
  // We don't redirect guests — they can view the challenge but see a
  // "log in to enter" message in ChallengeActions instead.
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0) || null;

  // ── Primary DB query ──────────────────────────────────────────────────────
  // Fetch the challenge by its numeric ID.
  // Number(id) converts the URL string "42" to the integer 42.
  //
  // entries are ordered by votes: 'desc' — highest votes first.
  // This creates a leaderboard where entry #1 has the most community votes.
  //
  // Each entry includes:
  //   story — the submitted story with author username and like count
  //   user  — the username of whoever submitted the entry (may differ from
  //            story.author in collaborative scenarios)
  const challenge = await prisma.challenge.findUnique({
    where: { id: Number(id) },
    include: {
      entries: {
        orderBy: { votes: 'desc' }, // Leaderboard order: most votes at top
        include: {
          story: {
            select: {
              id: true,
              title: true,
              slug: true,
              excerpt: true,
              coverImage: true,
              content: true, // Needed for readingTime() word-count calculation
              author: { select: { username: true } },
              _count: { select: { likes: true } },
            },
          },
          user: { select: { username: true } },
        },
      },
    },
  });

  // If no challenge exists with this ID, show the 404 page
  if (!challenge) return notFound();

  // ── Status calculation ────────────────────────────────────────────────────
  // A challenge is "active" only when ALL three conditions are true:
  //   1. An admin has explicitly set challenge.active = true
  //   2. The current time is AFTER the start date
  //   3. The current time is BEFORE the end date
  const now = new Date();
  const isActive = challenge.active && now >= challenge.startDate && now <= challenge.endDate;

  // ── User's existing entry ─────────────────────────────────────────────────
  // Find whether the logged-in user already has an entry in this challenge.
  // Array.find() scans the already-loaded entries array — no extra DB query.
  // ChallengeActions uses this to show "Already entered" instead of the form.
  const userEntry = userId ? challenge.entries.find((e) => e.userId === userId) : null;

  // ── User's stories for the submission dropdown ────────────────────────────
  // Only PUBLISHED stories can be entered — drafts are not finished work.
  // If the user isn't logged in, we skip this query entirely (short-circuit).
  const userStories = userId
    ? await prisma.story.findMany({
        where: { authorId: userId, status: 'PUBLISHED' },
        select: { id: true, title: true },
        orderBy: { createdAt: 'desc' }, // Most recent stories first in the dropdown
      })
    : [];

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* ── Breadcrumb ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 mb-6 text-xs text-gray-500">
          <Link href="/challenges" className="hover:text-gray-300 transition">
            Challenges
          </Link>
          <span>/</span>
          <span className="text-gray-400">{challenge.title}</span>
        </div>

        {/* ── Challenge header card ─────────────────────────────────────── */}
        <div className="bg-gray-800 border border-red-600/20 rounded-2xl p-8 mb-8">
          <div className="flex items-start justify-between gap-4 mb-4">
            <h1 className="text-2xl font-bold text-white">{challenge.title}</h1>

            {/* ── Status badge ─────────────────────────────────────────── */}
            {/* Dynamically computes label and colour based on isActive and endDate */}
            <span
              className={`text-xs font-semibold px-3 py-1 rounded-full flex-shrink-0 ${
                isActive
                  ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                  : 'bg-gray-700 text-gray-400'
              }`}
            >
              {/* Three possible states: Active | Ended | Upcoming */}
              {isActive ? 'Active' : now > challenge.endDate ? 'Ended' : 'Upcoming'}
            </span>
          </div>

          {/* Challenge description */}
          <p className="text-gray-400 mb-5">{challenge.description}</p>

          {/* The writing prompt — highlighted in a dark card for emphasis */}
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 mb-5">
            <p className="text-xs text-red-400 font-bold uppercase tracking-widest mb-2">
              The Prompt
            </p>
            {/* The prompt is quoted and italicised to visually separate it */}
            <p className="text-lg text-white italic leading-relaxed">"{challenge.prompt}"</p>
          </div>

          {/* Date range + entry count footer */}
          <div className="flex items-center gap-4 text-sm text-gray-500">
            {/* toLocaleDateString formats dates as "April 1 – April 30, 2026" */}
            <span>
              {' '}
              {new Date(challenge.startDate).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
              })}{' '}
              –{' '}
              {new Date(challenge.endDate).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
            <span>·</span>
            <span>{challenge.entries.length} entries</span>
          </div>
        </div>

        {/* ── Submit / status section ───────────────────────────────────── */}
        {/* ChallengeActions is a Client Component that renders:
            - A story-picker dropdown + submit button (if active & logged in & no entry)
            - "You've already entered" badge (if user has an entry)
            - "Challenge has ended" notice (if ended)
            - "Log in to enter" prompt (if guest) */}
        <ChallengeActions
          challengeId={challenge.id}
          isActive={isActive}
          isLoggedIn={!!userId}
          // Only pass the storyId so we don't leak other entry data to the client
          userEntry={userEntry ? { storyId: userEntry.storyId } : null}
          userStories={userStories}
        />

        {/* ── Entries leaderboard ───────────────────────────────────────── */}
        {/* Only rendered when there's at least one entry */}
        {challenge.entries.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-bold text-white mb-4">
              Entries ({challenge.entries.length})
            </h2>
            <div className="flex flex-col gap-4">
              {challenge.entries.map((entry, i) => (
                <div
                  key={entry.id}
                  className="flex gap-4 bg-gray-800 border border-gray-700 rounded-xl overflow-hidden"
                >
                  {/* ── Rank panel ──────────────────────────────────────── */}
                  {/* Gold/silver/bronze medals for positions 1–3, then plain numbers */}
                  <div className="w-14 bg-gray-900 flex items-center justify-center flex-shrink-0">
                    <span
                      className={`text-xl font-bold ${
                        i === 0
                          ? 'text-yellow-400' // 1st: gold
                          : i === 1
                            ? 'text-gray-400' // 2nd: silver
                            : i === 2
                              ? 'text-orange-600' // 3rd: bronze
                              : 'text-gray-700' // 4th+: dark grey
                      }`}
                    >
                      {`#${i + 1}`}
                    </span>
                  </div>

                  {/* Optional story cover image */}
                  {entry.story.coverImage && (
                    <div className="w-20 flex-shrink-0">
                      <img
                        src={entry.story.coverImage}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Story info */}
                  <div className="flex-1 py-4 pr-4 min-w-0">
                    {/* Story title links to the full story page */}
                    <Link
                      href={`/story/${entry.story.slug}`}
                      className="text-sm font-semibold text-white hover:text-red-300 transition line-clamp-1"
                    >
                      {entry.story.title}
                    </Link>
                    <p className="text-xs text-gray-500 mt-0.5">by {entry.story.author.username}</p>
                    {entry.story.excerpt && (
                      <p className="text-xs text-gray-500 line-clamp-1 mt-1">
                        {entry.story.excerpt}
                      </p>
                    )}

                    {/* Stats: reading time (computed), like count, vote count */}
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
                      {/* readingTime() estimates minutes to read based on word count */}
                      <span>{readingTime(entry.story.content)}</span>
                      <span>·</span>
                      <span>{entry.story._count.likes}</span>
                      <span>·</span>
                      {/* Vote count in gold — this is the challenge ranking metric */}
                      <span className="text-yellow-400 font-semibold">{entry.votes} votes</span>
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
