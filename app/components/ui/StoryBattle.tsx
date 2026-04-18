'use client';

// app/components/ui/StoryBattle.tsx
// Client component — renders the Story Battles widget.
// Two horror stories face off in a dramatic VS layout. Users vote for the scarier story.
// Vote counts and percentage bars update instantly after each vote.
// A countdown timer shows how long is left in the battle.

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────

// Shape of a single story card returned by /api/battles
interface BattleStory {
  id: number;
  title: string;
  slug: string;
  coverImage: string | null;
  author: { username: string };
  votes: number;
  pct: number; // percentage of total votes (0-100)
}

// Shape of a raw vote entry (returned in the votes array from the API)
interface VoteEntry {
  votedFor: number; // storyId
  userId: number;
}

// Full battle object as returned by GET /api/battles
interface Battle {
  id: number;
  active: boolean;
  endsAt: string; // ISO date string
  createdAt: string;
  storyA: BattleStory;
  storyB: BattleStory;
  totalVotes: number;
  votes: VoteEntry[];
}

// Props accepted by this component
interface Props {
  userId: number | null; // currently logged-in user, or null if guest
}

// ─── Countdown helper ─────────────────────────────────────────────────────────

// Given a future date string, compute a human-readable time remaining string
// e.g. "2d 14h 37m 08s" — updates every second via setInterval in the component
function formatCountdown(endsAt: string): string {
  const diff = Math.max(0, new Date(endsAt).getTime() - Date.now());

  if (diff === 0) return 'Battle over';

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  // Only show days segment if there is at least one day remaining
  const dayStr = days > 0 ? `${days}d ` : '';
  // Zero-pad hours, minutes, seconds so the display doesn't jump width
  const hStr = String(hours).padStart(2, '0');
  const mStr = String(minutes).padStart(2, '0');
  const sStr = String(seconds).padStart(2, '0');

  return `${dayStr}${hStr}h ${mStr}m ${sStr}s`;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function StoryBattle({ userId }: Props) {
  // The active battle fetched from the API (null = not yet loaded or none found)
  const [battle, setBattle] = useState<Battle | null>(null);

  // Loading state — shows skeleton while the first fetch runs
  const [loading, setLoading] = useState(true);

  // Which storyId the current user has voted for in this battle (null = hasn't voted)
  const [userVote, setUserVote] = useState<number | null>(null);

  // Optimistic local vote counts so the UI updates instantly without a full refetch
  const [localA, setLocalA] = useState<{ votes: number; pct: number } | null>(null);
  const [localB, setLocalB] = useState<{ votes: number; pct: number } | null>(null);

  // Whether a vote POST is in flight — prevents double-submits
  const [voting, setVoting] = useState(false);

  // The live countdown string rendered in the timer badge
  const [countdown, setCountdown] = useState('');

  // ─── Fetch active battles on mount ─────────────────────────────────────────
  useEffect(() => {
    async function fetchBattle() {
      try {
        const res = await fetch('/api/battles');
        if (!res.ok) throw new Error('Failed to fetch battles');
        const data: Battle[] = await res.json();

        // Take the first (most recent) active battle
        const first = data[0] ?? null;
        setBattle(first);

        if (first) {
          // Check if the current user already cast a vote in this battle
          if (userId) {
            const existing = first.votes.find((v) => v.userId === userId);
            if (existing) setUserVote(existing.votedFor);
          }

          // Seed local vote counts from the API response
          setLocalA({ votes: first.storyA.votes, pct: first.storyA.pct });
          setLocalB({ votes: first.storyB.votes, pct: first.storyB.pct });

          // Initialise the countdown string immediately so it shows before the interval fires
          setCountdown(formatCountdown(first.endsAt));
        }
      } catch (err) {
        console.error('[StoryBattle] fetch error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchBattle();
  }, [userId]);

  // ─── Countdown timer — ticks every second ──────────────────────────────────
  useEffect(() => {
    if (!battle) return;

    const interval = setInterval(() => {
      setCountdown(formatCountdown(battle.endsAt));
    }, 1000);

    // Clean up interval when battle changes or component unmounts
    return () => clearInterval(interval);
  }, [battle]);

  // ─── Vote handler ───────────────────────────────────────────────────────────
  const handleVote = useCallback(
    async (storyId: number) => {
      // Guests can't vote — the UI will show a "log in to vote" nudge instead
      if (!userId || !battle || voting) return;

      // Mark the vote in-flight
      setVoting(true);

      // Record the user's pick immediately for instant visual feedback
      setUserVote(storyId);

      try {
        const res = await fetch(`/api/battles/${battle.id}/vote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, votedFor: storyId }),
        });

        if (!res.ok) throw new Error('Vote failed');

        // Server returns updated vote counts — apply them so the bars are accurate
        const data = await res.json();
        setLocalA({ votes: data.storyA.votes, pct: data.storyA.pct });
        setLocalB({ votes: data.storyB.votes, pct: data.storyB.pct });
      } catch (err) {
        console.error('[StoryBattle] vote error:', err);
        // Roll back optimistic UI if the request failed
        setUserVote(null);
      } finally {
        setVoting(false);
      }
    },
    [userId, battle, voting]
  );

  // ─── Render: loading skeleton ───────────────────────────────────────────────
  if (loading) {
    return (
      <section className="max-w-6xl mx-auto px-4 pb-14">
        {/* Section heading placeholder */}
        <div className="flex items-center gap-3 mb-5">
          <span className="w-1 h-6 bg-red-600 rounded-full" />
          <h2 className="text-2xl font-bold text-white">Story Battle</h2>
        </div>

        {/* Skeleton card — pulses to show loading state */}
        <div className="animate-pulse rounded-2xl bg-gray-900 border border-red-900/30 h-72" />
      </section>
    );
  }

  // ─── Render: no active battle ───────────────────────────────────────────────
  if (!battle) {
    return (
      <section className="max-w-6xl mx-auto px-4 pb-14">
        {/* Section heading */}
        <div className="flex items-center gap-3 mb-5">
          <span className="w-1 h-6 bg-red-600 rounded-full" />
          <h2 className="text-2xl font-bold text-white">Story Battle</h2>
          <span className="text-sm text-red-500 font-mono uppercase tracking-widest">⚔ Showdown</span>
        </div>

        {/* Empty state — dark atmospheric card */}
        <div className="rounded-2xl border border-red-900/20 bg-gray-950 flex flex-col items-center justify-center py-16 gap-4 text-center px-6">
          <span className="text-5xl opacity-40">⚔</span>
          <p className="text-gray-400 text-lg font-semibold">No battle active right now</p>
          <p className="text-gray-600 text-sm">Check back soon — the next showdown is coming.</p>
        </div>
      </section>
    );
  }

  // ─── Derive display values ──────────────────────────────────────────────────

  // Use local (optimistic) counts if set, otherwise fall back to the API values
  const aVotes = localA?.votes ?? battle.storyA.votes;
  const bVotes = localB?.votes ?? battle.storyB.votes;
  const aPct = localA?.pct ?? battle.storyA.pct;
  const bPct = localB?.pct ?? battle.storyB.pct;
  const total = aVotes + bVotes;

  // Whether the current user has already picked story A or B
  const votedA = userVote === battle.storyA.id;
  const votedB = userVote === battle.storyB.id;

  // ─── Render: full battle UI ─────────────────────────────────────────────────
  return (
    <section className="max-w-6xl mx-auto px-4 pb-14">

      {/* ── Section heading ── */}
      <div className="flex items-center gap-3 mb-5">
        <span className="w-1 h-6 bg-red-600 rounded-full" />
        <h2 className="text-2xl font-bold text-white">Story Battle</h2>
        <span className="text-sm text-red-500 font-mono uppercase tracking-widest">⚔ Showdown</span>
      </div>

      {/* ── Main battle card ── */}
      {/* Outer wrapper — dark card with a dramatic red glow border */}
      <div className="relative rounded-2xl overflow-hidden border border-red-800/40 bg-gray-950 shadow-[0_4px_60px_rgba(220,38,38,0.18)]">

        {/* Radial blood-red glow behind the VS centre */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(220,38,38,0.12)_0%,_transparent_65%)] pointer-events-none" />

        {/* ── Top bar: live indicator + countdown timer ── */}
        <div className="relative flex items-center justify-between px-6 pt-5 pb-3">
          {/* LIVE badge — pulses red to show the battle is ongoing */}
          <span className="flex items-center gap-2 text-xs font-bold text-red-400 uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Live Battle
          </span>

          {/* Countdown timer — monospaced font keeps width stable as digits change */}
          <span className="text-xs font-mono text-gray-400 bg-gray-900 border border-gray-800 px-3 py-1 rounded-full">
            ⏱ {countdown}
          </span>
        </div>

        {/* ── Total vote count ── */}
        <p className="relative text-center text-xs text-gray-500 pb-4 tracking-wide">
          {total.toLocaleString()} {total === 1 ? 'vote' : 'votes'} cast
        </p>

        {/* ── VS layout: Story A | VS glyph | Story B ── */}
        <div className="relative flex flex-col md:flex-row items-stretch gap-0 px-4 md:px-6 pb-6">

          {/* ── Story A card (left) ── */}
          {/* Clicking votes for Story A — button role with pointer cursor */}
          <button
            onClick={() => handleVote(battle.storyA.id)}
            disabled={!userId || voting}
            aria-label={`Vote for ${battle.storyA.title}`}
            className={[
              // Base card styles — dark background, tall aspect ratio
              'group relative flex-1 rounded-xl overflow-hidden border transition-all duration-300 cursor-pointer text-left',
              // Highlight the chosen side in red; dim the other side
              votedA
                ? 'border-red-500 shadow-[0_0_30px_rgba(220,38,38,0.45)] scale-[1.015]'
                : 'border-gray-800 hover:border-red-700/60 hover:shadow-[0_0_20px_rgba(220,38,38,0.2)]',
              // Guest and in-flight states disable pointer and reduce opacity
              !userId ? 'cursor-not-allowed opacity-80' : '',
            ].join(' ')}
          >
            {/* Cover image fills the card; dark gradient overlays the bottom for text legibility */}
            {battle.storyA.coverImage ? (
              <img
                src={battle.storyA.coverImage}
                alt={battle.storyA.title}
                className="w-full h-52 md:h-64 object-cover"
              />
            ) : (
              /* Fallback placeholder when no cover image is set */
              <div className="w-full h-52 md:h-64 bg-gray-800 flex items-center justify-center">
                <span className="text-5xl opacity-20">💀</span>
              </div>
            )}

            {/* Dark gradient overlay — makes white text readable over any image */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />

            {/* Voted indicator ribbon — shows when this is the user's pick */}
            {votedA && (
              <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-red-600 text-white text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full animate-pulse">
                ✔ Your vote
              </div>
            )}

            {/* Story info overlay — pinned to the bottom of the card */}
            <div className="absolute bottom-0 left-0 right-0 p-4">
              {/* Author username */}
              <p className="text-xs text-gray-400 mb-1">
                by{' '}
                <Link
                  href={`/user/${battle.storyA.author.username}`}
                  className="text-red-400 hover:text-red-300"
                  onClick={(e) => e.stopPropagation()} // prevent triggering the vote on author click
                >
                  {battle.storyA.author.username}
                </Link>
              </p>

              {/* Story title — large bold font */}
              <Link
                href={`/story/${battle.storyA.slug}`}
                className="text-white font-extrabold text-lg leading-tight line-clamp-2 hover:text-red-300 transition"
                onClick={(e) => e.stopPropagation()} // prevent vote when navigating to story
              >
                {battle.storyA.title}
              </Link>

              {/* Vote count badge */}
              <p className="mt-2 text-sm text-red-400 font-bold">
                {aVotes.toLocaleString()} {aVotes === 1 ? 'vote' : 'votes'}
              </p>

              {/* Percentage bar — width is driven by aPct, animates smoothly */}
              <div className="mt-2 h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-red-700 to-red-400 rounded-full transition-all duration-700"
                  style={{ width: `${aPct}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] text-gray-500">{aPct}%</p>
            </div>
          </button>

          {/* ── Centre VS divider ── */}
          <div className="flex items-center justify-center md:flex-col py-4 md:py-0 md:px-4 z-10 flex-shrink-0">
            {/* Glowing VS glyph — the centrepiece of the battle layout */}
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-gray-950 border-2 border-red-600 shadow-[0_0_24px_rgba(220,38,38,0.7)]">
              <span className="text-red-500 font-black text-lg tracking-tight leading-none select-none">
                VS
              </span>
            </div>
          </div>

          {/* ── Story B card (right) — mirrors Story A layout ── */}
          <button
            onClick={() => handleVote(battle.storyB.id)}
            disabled={!userId || voting}
            aria-label={`Vote for ${battle.storyB.title}`}
            className={[
              'group relative flex-1 rounded-xl overflow-hidden border transition-all duration-300 cursor-pointer text-left',
              votedB
                ? 'border-red-500 shadow-[0_0_30px_rgba(220,38,38,0.45)] scale-[1.015]'
                : 'border-gray-800 hover:border-red-700/60 hover:shadow-[0_0_20px_rgba(220,38,38,0.2)]',
              !userId ? 'cursor-not-allowed opacity-80' : '',
            ].join(' ')}
          >
            {battle.storyB.coverImage ? (
              <img
                src={battle.storyB.coverImage}
                alt={battle.storyB.title}
                className="w-full h-52 md:h-64 object-cover"
              />
            ) : (
              <div className="w-full h-52 md:h-64 bg-gray-800 flex items-center justify-center">
                <span className="text-5xl opacity-20">💀</span>
              </div>
            )}

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />

            {/* Voted ribbon */}
            {votedB && (
              <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-red-600 text-white text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full animate-pulse">
                ✔ Your vote
              </div>
            )}

            {/* Story info overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <p className="text-xs text-gray-400 mb-1">
                by{' '}
                <Link
                  href={`/user/${battle.storyB.author.username}`}
                  className="text-red-400 hover:text-red-300"
                  onClick={(e) => e.stopPropagation()}
                >
                  {battle.storyB.author.username}
                </Link>
              </p>

              <Link
                href={`/story/${battle.storyB.slug}`}
                className="text-white font-extrabold text-lg leading-tight line-clamp-2 hover:text-red-300 transition"
                onClick={(e) => e.stopPropagation()}
              >
                {battle.storyB.title}
              </Link>

              <p className="mt-2 text-sm text-red-400 font-bold">
                {bVotes.toLocaleString()} {bVotes === 1 ? 'vote' : 'votes'}
              </p>

              {/* Percentage bar for Story B */}
              <div className="mt-2 h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-red-700 to-red-400 rounded-full transition-all duration-700"
                  style={{ width: `${bPct}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] text-gray-500">{bPct}%</p>
            </div>
          </button>
        </div>

        {/* ── Call to action / login nudge ── */}
        <div className="relative pb-5 text-center">
          {!userId ? (
            /* Guest prompt — encourage sign-in to participate */
            <p className="text-sm text-gray-500">
              <Link href="/auth/login" className="text-red-400 hover:text-red-300 font-semibold underline underline-offset-2">
                Log in
              </Link>{' '}
              to cast your vote in the showdown.
            </p>
          ) : userVote ? (
            /* Already voted — let the user know they can change their pick */
            <p className="text-xs text-gray-600">
              Vote registered. Click the other story to change your pick.
            </p>
          ) : (
            /* Hasn't voted yet — prompt them to choose a side */
            <p className="text-sm text-gray-400 font-semibold tracking-wide">
              Which story is scarier? <span className="text-red-500">Click to cast your vote.</span>
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
