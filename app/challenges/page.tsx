// =============================================================================
// app/challenges/page.tsx
// =============================================================================
//
// PURPOSE:
//   Lists all writing challenges at /challenges.
//   A "challenge" is a community writing contest: an admin posts a creative
//   prompt with a date range, and users enter by submitting a published story.
//
// ACCESS:
//   Public — anyone can view the challenges list.
//   Admin users additionally see a "+ New Challenge" button to create new ones.
//   Logged-in users can click through to enter individual challenges.
//
// DATA FETCHED:
//   - prisma.user: the current user's role (to show admin controls).
//   - prisma.challenge: all challenges newest-first, with entry count.
//
// STATUS LOGIC (computed at render time, not stored in DB):
//   - "Upcoming"  → challenge.startDate is in the future
//   - "X days left" → currently within the start–end window AND active = true
//   - "Ended"     → challenge.endDate is in the past
//
// SERVER COMPONENT:
//   Runs entirely on the server. Reads cookies() for the session.
// =============================================================================

import Link from 'next/link';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';

// Static page metadata — sets the browser tab title
export const metadata = { title: 'Story Challenges — Silent Evidence' };

export default async function ChallengesPage() {
  // ── Auth check ────────────────────────────────────────────────────────────
  // Read the session cookie to identify the current user.
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0) || null;

  // Fetch the user's role — only needed to conditionally show the admin button.
  // We short-circuit with null if userId is null (guest) to avoid a DB query.
  const user = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }, // Only need the role — don't load the whole user
      })
    : null;

  // isAdmin drives the conditional "+ New Challenge" button render below
  const isAdmin = user?.role === 'ADMIN';

  // ── DB query ──────────────────────────────────────────────────────────────
  // Fetch all challenges, ordered newest-first.
  // _count.entries aggregates the number of submissions for each challenge
  // without loading every entry record — efficient for display purposes.
  const challenges = await prisma.challenge.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { entries: true } } },
  });

  // Capture now once so all status calculations in the .map() below are
  // consistent (avoids tiny timestamp drift if Date.now() is called per-item).
  const now = new Date();

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-12">

        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            {/* Decorative red vertical bar — a repeated design motif on the site */}
            <span className="w-1 h-7 bg-red-600 rounded-full" />
            <div>
              <h1 className="text-2xl font-bold text-white">Story Challenges</h1>
              <p className="text-sm text-gray-500 mt-0.5">Write for the prompt. Win glory.</p>
            </div>
          </div>

          {/* Admin-only "+ New Challenge" button — hidden for regular users */}
          {isAdmin && (
            <Link
              href="/admin/challenges/new"
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition"
            >
              + New Challenge
            </Link>
          )}
        </div>

        {/* ── Content area ─────────────────────────────────────────────────── */}
        {challenges.length === 0 ? (
          // ── Empty state ──────────────────────────────────────────────────
          // Shown when no challenges have been created yet.
          <div className="text-center py-24">
            <div className="text-5xl mb-4">✍️</div>
            <h2 className="text-xl font-semibold text-white mb-2">No challenges yet</h2>
            <p className="text-gray-500">Check back soon — challenges are posted monthly.</p>
          </div>
        ) : (
          // ── Challenge cards list ─────────────────────────────────────────
          <div className="flex flex-col gap-5">
            {challenges.map((c) => {
              // ── Status computation ──────────────────────────────────────
              // isActive requires BOTH admin approval (c.active) AND the
              // time window to be current. Either condition alone is insufficient.
              const isActive = c.active && now >= c.startDate && now <= c.endDate;
              const isEnded  = now > c.endDate;

              // Days remaining — used in the "Xd left" badge.
              // 86400000 ms = 24 * 60 * 60 * 1000 (milliseconds in one day).
              // Math.ceil rounds up so "23 hours left" shows as "1d left" not "0d left".
              const daysLeft = Math.ceil(
                (c.endDate.getTime() - now.getTime()) / 86_400_000,
              );

              return (
                // Entire card is a <Link> — clicking anywhere navigates to the detail page
                <Link
                  key={c.id}
                  href={`/challenges/${c.id}`}
                  className="group bg-gray-800 border border-gray-700 hover:border-red-600/50 rounded-xl p-6 transition-all duration-200"
                >
                  {/* ── Card header: title + status badge ─────────────────── */}
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <h2 className="text-lg font-bold text-white group-hover:text-red-300 transition-colors">
                      {c.title}
                    </h2>

                    {/* Status badge — three visual states with distinct colours */}
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${
                        isEnded
                          ? 'bg-gray-700 text-gray-400'                              // Grey: ended
                          : isActive
                          ? 'bg-green-500/10 text-green-400 border border-green-500/30' // Green: active
                          : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30' // Yellow: upcoming
                      }`}
                    >
                      {/* Ternary chain: Ended → "Xd left" → "Upcoming" */}
                      {isEnded ? 'Ended' : isActive ? `${daysLeft}d left` : 'Upcoming'}
                    </span>
                  </div>

                  {/* Challenge description — truncated at 2 lines */}
                  <p className="text-sm text-gray-400 mb-4 line-clamp-2">{c.description}</p>

                  {/* The writing prompt — shown in a dark pill for emphasis */}
                  <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 mb-4">
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">
                      The Prompt
                    </p>
                    {/* line-clamp-2: long prompts are truncated with "…" */}
                    <p className="text-sm text-gray-300 italic line-clamp-2">"{c.prompt}"</p>
                  </div>

                  {/* Card footer: date range + entry count */}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    {/* Short date format: "Apr 1 – Apr 30, 2026" */}
                    <span>
                      📅{' '}
                      {new Date(c.startDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}{' '}
                      –{' '}
                      {new Date(c.endDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    <span>·</span>
                    {/* Proper singular/plural: "1 entry" vs "5 entries" */}
                    <span>
                      ✍️ {c._count.entries}{' '}
                      {c._count.entries === 1 ? 'entry' : 'entries'}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}
