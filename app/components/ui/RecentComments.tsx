/**
 * RecentComments.tsx
 *
 * WHAT THIS FILE DOES:
 * A server component (no 'use client' directive) that fetches the 6 most
 * recent comments from the database and renders them as a grid of cards.
 * Each card shows the commenter's avatar, username, relative timestamp
 * (via LiveTimer), a short excerpt of their comment, and a link back to
 * the story they commented on.
 *
 * Because it runs on the server, there is no loading state — Next.js
 * renders the data directly into the HTML before sending it to the browser.
 *
 * HOW TO REUSE IN A FUTURE PROJECT:
 * 1. Swap prisma.comment for your own data model.
 * 2. Change the `take: 6` to however many you want to show.
 * 3. Place <RecentComments /> anywhere on your homepage or sidebar.
 *    Wrap it in a <Suspense> boundary if you want a skeleton while it loads.
 *
 * Example usage (in a Next.js Server Component page):
 *   <RecentComments />
 */

import { prisma } from '@/lib/prisma';
import LiveTimer from './LiveTimer';

// RecentComments — async server component.
// No props needed; all data comes from the database.
export default async function RecentComments() {
  // Fetch the 6 newest comments, newest first.
  // `include` pulls in related data (author info + story title/slug)
  // in a single efficient JOIN query so we don't need separate fetches.
  const comments = await prisma.comment.findMany({
    take: 6,
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { username: true, profile: { select: { avatar: true } } } },
      story: { select: { title: true, slug: true } },
    },
  });

  // If there are no comments in the DB yet, render nothing at all.
  // This prevents an empty section from showing on a fresh install.
  if (comments.length === 0) return null;

  return (
    // Full-width dark section — sits at the bottom of the homepage
    <section className="bg-gray-900 border-t border-gray-800 py-14">
      <div className="max-w-6xl mx-auto px-4">
        {/* Section header — red accent bar + title */}
        <div className="flex items-center gap-3 mb-8">
          <span className="w-1 h-6 bg-red-600 rounded-full" />
          <h2 className="text-2xl font-bold text-white">Recent Comments</h2>
        </div>

        {/* Responsive grid: 1 col on mobile → 2 on sm → 3 on lg.
            Each comment is rendered by the CommentCard component below. */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {comments.map((comment) => (
            <CommentCard key={comment.id} comment={comment} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ── CommentWithRelations type ────────────────────────────────────────────────
// Describes the shape of the data returned by the Prisma query above.
// Defining this type separately makes CommentCard easy to understand on its own.
type CommentWithRelations = {
  id: number;
  content: string;
  createdAt: Date;
  // `profile` is optional — users might not have set a profile photo
  user: { username: string; profile: { avatar: string | null } | null };
  story: { title: string; slug: string };
};

// ── CommentCard ──────────────────────────────────────────────────────────────
// Renders a single comment card.
// Extracted into its own component to keep the parent cleaner and to make
// the card easy to reuse elsewhere (e.g. a user profile page).
function CommentCard({ comment }: { comment: CommentWithRelations }) {
  // If the user has no avatar, fall back to a generated one from ui-avatars.com.
  // The generated avatar uses the username initials so each one looks unique.
  const avatar =
    comment.user.profile?.avatar ??
    `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.user.username)}&background=7f1d1d&color=fff&size=64`;

  // LiveTimer expects an ISO 8601 string — convert the Date object here.
  const iso = comment.createdAt.toISOString();

  return (
    // Card container — hover lifts the red glow shadow for a depth effect.
    <div className="bg-gray-800 border border-gray-700 hover:border-red-600/50 rounded-xl p-4 flex flex-col gap-3 transition-all duration-300 shadow-[0_4px_20px_rgba(220,38,38,0.15)] hover:shadow-[0_8px_30px_rgba(220,38,38,0.4)]">
      {/* Top row: avatar image + username + relative timestamp */}
      <div className="flex items-center gap-3">
        <img
          src={avatar}
          alt={comment.user.username}
          className="w-9 h-9 rounded-full object-cover flex-shrink-0 border border-gray-700"
        />
        <div>
          <p className="text-sm font-semibold text-white leading-tight">{comment.user.username}</p>
          {/* LiveTimer renders the relative time ("5m ago", "2h ago") and
              updates it live in the browser without a full re-render */}
          <LiveTimer iso={iso} />
        </div>
      </div>

      {/* Comment text — line-clamp-3 cuts off at 3 lines to keep cards a uniform height.
          flex-1 pushes the story link to the bottom even on shorter comments. */}
      <p className="text-sm text-gray-400 line-clamp-3 flex-1 leading-relaxed">{comment.content}</p>

      {/* Story link — sits at the bottom of every card, separated by a thin border.
          Links to the story page where this comment was left. */}
      <a
        href={`/story/${comment.story.slug}`}
        className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition border-t border-gray-700/60 pt-3 truncate"
      >
        {/* Book SVG icon — flex-shrink-0 stops it from being squashed when the title is long */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-3 h-3 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
        </svg>
        {/* truncate cuts the story title with "…" if it's too long for one line */}
        <span className="truncate">{comment.story.title}</span>
      </a>
    </div>
  );
}
