// =============================================================================
// app/user/[username]/page.tsx  —  SERVER COMPONENT  (dynamic route)
// =============================================================================
// Public user profile page — shows a user's bio, stats (followers, following,
// stories, total likes), earned badges, writing streak, and their published
// stories.  The page checks whether the logged-in viewer is already following
// this user so the FollowButton starts in the correct state.
// Returns notFound() if the username doesn't exist.
//
// KEY CONCEPTS EXPLAINED:
//
// Dynamic route:
//   The folder is named [username] — the square brackets tell Next.js this is
//   a dynamic segment.  The actual value (e.g. "johnsmith") is available via
//   the `params` prop as params.username.  Because Next.js 14 makes params a
//   Promise, we await it before accessing the value.
//
// generateMetadata:
//   Runs before the page component and produces <title>, Open Graph, and
//   Twitter card tags.  It's async so it can query the database for the user's
//   bio and avatar — these become the og:description and og:image.
//   If the user doesn't exist we return a minimal fallback object.
//
// Auth check (cookie-based):
//   We read the httpOnly `userId` cookie set at login to identify the viewer.
//   This doesn't use NextAuth — it's a lightweight custom approach where the
//   session is just a signed-in user's numeric ID.
//   `Number(…) || null` converts "0" / undefined / NaN to null.
//
// Private profile guard:
//   `canSeeStories` combines three conditions:
//     1. The profile is public (isPrivate === false)
//     2. The viewer IS the profile owner
//     3. The viewer is an approved follower
//   Only when one of these is true do we run the stories query.
//
// Pinned story:
//   If the user has set a pinned story (user.pinnedStoryId !== null) we run an
//   extra query to fetch that specific story.  It's rendered separately at the
//   top of the story list with a pin badge.
//
// Data serialisation:
//   Prisma Date objects aren't serialisable across the server→client boundary
//   (they're class instances, not plain JSON).  We call .toISOString() on dates
//   before passing them to client components like ProfileStoriesGrid.
//
// readingTime utility:
//   Called server-side so the client component doesn't need to import a library
//   just to display "5 min read".  Pre-computing it here keeps the client bundle
//   smaller.
// =============================================================================

import { notFound } from 'next/navigation';
import { Crown } from 'lucide-react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import FollowButton from '@/app/components/ui/FollowButton';
import FollowListModal from '@/app/components/ui/FollowListModal';
import { BADGE_META, type BadgeType } from '@/lib/badges';
import { readingTime } from '@/lib/readingTime';
import { requireAdmin } from '@/lib/session';
import WritingStreakBadge from '@/app/components/ui/WritingStreakBadge';
import VerifiedBadge from '@/app/components/ui/VerifiedBadge';
import ProfileStoriesGrid from '@/app/components/ui/ProfileStoriesGrid';
import AdSlot from '@/app/components/ui/AdSlot';
import ReadingStreakBadge from '@/app/components/ui/ReadingStreakBadge';
import ReadingGoalWidget from '@/app/components/ui/ReadingGoalWidget';
import ComplimentButton from '@/app/components/ui/ComplimentButton';
import type { Metadata } from 'next';

// ---------------------------------------------------------------------------
// Site base URL — used to build canonical URLs and Open Graph image paths.
// Falls back to the production URL if the env var isn't set.
// ---------------------------------------------------------------------------
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://silentevidence.com';

// ---------------------------------------------------------------------------
// Props type — params is a Promise in Next.js 14 App Router.
// We await it inside both generateMetadata and the page component.
// ---------------------------------------------------------------------------
type Props = { params: Promise<{ username: string }> };

// =============================================================================
// generateMetadata — runs on the server before the page component renders.
// Produces <head> tags for SEO and social sharing.
// =============================================================================
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // Await params to get the resolved dynamic route segment value
  const { username } = await params;

  // Minimal DB fetch — only the fields needed for meta tags
  const user = await prisma.user.findUnique({
    where: { username },
    select: { username: true, profile: { select: { bio: true, avatar: true } } },
  });

  // Unknown user — return a simple fallback so the page title still makes sense
  if (!user) return { title: 'User Not Found' };

  // Build the og:description from the user's bio or a generic fallback
  const description = user.profile?.bio ?? `${username}'s horror stories on Silent Evidence.`;
  // og:image uses the user's avatar or the site's default OG image
  const image = user.profile?.avatar ?? `${BASE_URL}/og-default.png`;
  const url = `${BASE_URL}/user/${username}`;

  return {
    title: `${username} — Silent Evidence`,
    description,
    openGraph: {
      title: `${username} on Silent Evidence`,
      description,
      url,
      siteName: 'Silent Evidence',
      // width/height hints help social crawlers size the image correctly
      images: [{ url: image, width: 400, height: 400, alt: username }],
      type: 'profile', // tells Facebook/LinkedIn this is a person profile
    },
    twitter: {
      card: 'summary',           // square image card (not large image)
      title: `${username} — Silent Evidence`,
      description,
      images: [image],
    },
    // canonical prevents duplicate-content penalties when the same user can be
    // reached via multiple paths (e.g. case-insensitive username variations)
    alternates: { canonical: url },
  };
}

// =============================================================================
// UserProfilePage — the main Server Component
// =============================================================================
export default async function UserProfilePage({ params }: Props) {
  // Await the dynamic route segment
  const { username } = await params;

  // ── Auth check (cookie-based) ─────────────────────────────────────────────
  // We read the httpOnly `userId` cookie to identify the currently logged-in
  // visitor.  If the cookie is missing or invalid, viewerId is null and we show
  // a read-only view of the profile (no Follow/Message buttons).
  const cookieStore = await cookies();
  const viewerId = Number(cookieStore.get('userId')?.value ?? 0) || null;

  // ── Primary user query ───────────────────────────────────────────────────
  // Fetch the profile owner with related data needed for the hero section:
  //  - profile (bio, avatar, website)
  //  - _count aggregates (stories, followers, following)
  //  - writingStreak / readingStreak (separate one-to-one relations)
  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      profile: true,
      _count: { select: { stories: true, followers: true, following: true } },
      writingStreak: true,
      readingStreak: true,
    },
  });

  // notFound() triggers Next.js to render the app/not-found.tsx page and
  // returns a 404 HTTP status.  Calling it is like throwing — execution stops.
  if (!user) return notFound();

  // ── Is the viewer already following this user? ───────────────────────────
  // findUnique on the compound unique key followerId_followingId is O(1).
  // We short-circuit to false when viewerId is null (not logged in).
  const isFollowing = viewerId
    ? !!(await prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: viewerId, followingId: user.id } },
      }))
    : false;

  // ── Private profile guard ─────────────────────────────────────────────────
  // isOwner — viewer is the profile owner (can always see everything)
  // canSeeStories — true when profile is public OR viewer is owner OR following
  const isOwner = viewerId === user.id;

  // Is the viewer an admin? The publication map link below is admin-only, so
  // non-admins never see it advertised. This is presentation only — the map
  // page enforces the same rule itself, which is what actually protects it.
  const viewerIsAdmin = !!(await requireAdmin());
  const canSeeStories = !user.isPrivate || isOwner || isFollowing;

  // ── Published stories (conditional) ─────────────────────────────────────
  // Only execute this query when the viewer has permission.  For private
  // profiles we skip the query entirely and return an empty array — saves
  // a DB round-trip and avoids leaking story titles via timing attacks.
  const stories = canSeeStories ? await prisma.story.findMany({
    where: { authorId: user.id, status: 'PUBLISHED' },
    orderBy: { createdAt: 'desc' },
    include: {
      category: { select: { name: true, slug: true } },
      _count: { select: { likes: true, comments: true } },
    },
  }) : [];

  // ── Derived stats ─────────────────────────────────────────────────────────
  // Aggregate view/like counts from the story list (already in memory).
  // reduce() visits each story once — O(n), avoids extra DB queries.
  const totalViews = stories.reduce((sum, s) => sum + s.views, 0);
  const totalLikes = stories.reduce((sum, s) => sum + s._count.likes, 0);

  // ── Earned badges ────────────────────────────────────────────────────────
  // UserBadge rows are created by background jobs (e.g. cron tasks that check
  // milestones).  We sort by awardedAt ascending so the oldest badge appears
  // first — like a timeline of achievements.
  const badgeRows = await prisma.userBadge.findMany({
    where: { userId: user.id },
    orderBy: { awardedAt: 'asc' },
  });

  // ── Pinned story ─────────────────────────────────────────────────────────
  // Users can pin one story to the top of their profile from their dashboard.
  // We only fetch it if pinnedStoryId is set — conditional query pattern.
  // Also requiring status: 'PUBLISHED' prevents showing a draft story if the
  // user un-published it after pinning.
  const pinnedStory = user.pinnedStoryId
    ? await prisma.story.findUnique({
        where: { id: user.pinnedStoryId, status: 'PUBLISHED' },
        include: {
          category: { select: { name: true, slug: true } },
          _count: { select: { likes: true, comments: true } },
        },
      })
    : null;

  // ── Avatar fallback ───────────────────────────────────────────────────────
  // ui-avatars.com generates an initial-based avatar on the fly when the user
  // hasn't uploaded a photo.  The red background (#dc2626) matches our theme.
  const avatar =
    user.profile?.avatar ??
    `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=dc2626&color=fff&size=128`;

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <Header />

      {/* ── Hero banner ────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        {/* Multi-layer atmospheric background:
            Layer 1 — solid dark base fills the whole area
            Layer 2 — radial red glow at the top (horror atmosphere)
            Layer 3 — secondary softer glow at the bottom-left
            Layer 4 — SVG noise texture overlay for film-grain effect
            All layers use `absolute inset-0` so they stack behind the content.
            `pointer-events-none` on the texture prevents it blocking clicks. */}
        <div className="absolute inset-0 bg-gray-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(220,38,38,0.18)_0%,transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_40%_at_20%_80%,rgba(220,38,38,0.06)_0%,transparent_60%)]" />
        {/* Inline base64 SVG noise — opacity-[0.03] makes it nearly invisible
            but adds a subtle texture to break up the flat dark background */}
        <div className="absolute inset-0 opacity-[0.03] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iLjY1IiBudW1PY3RhdmVzPSIzIiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIzMDAiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iMSIvPjwvc3ZnPg==')]" />

        {/* Content — `relative` lifts it above the absolutely-positioned layers */}
        <div className="relative max-w-4xl mx-auto px-4 pt-14 pb-10">

          {/* Avatar + name row
              flex-col on mobile (avatar stacked above name), flex-row on sm+
              items-end aligns both to the bottom edge so the name sits at
              the same baseline as the bottom of the avatar. */}
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6">

            {/* ── Avatar ───────────────────────────────────────────────── */}
            <div className="relative flex-shrink-0">
              {/* Glowing red ring behind the avatar — positioned with -inset-1
                  so it extends 4px past the avatar edge on all sides */}
              <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-red-600 to-red-900 opacity-70 blur-sm" />
              <img
                src={avatar}
                alt={user.username}
                className="relative w-28 h-28 rounded-full object-cover border-4 border-gray-900 shadow-xl"
              />
              {/* Crown badge — only rendered for the "Writer of the Month" winner.
                  Positioned in the top-right corner of the avatar using absolute
                  with negative offsets (-top-2 -right-1). */}
              {user.writerOfMonth && (
                <span className="absolute -top-2 -right-1 text-yellow-500" title="Writer of the Month">
                  <Crown className="w-5 h-5" strokeWidth={1.75} aria-hidden="true" />
                </span>
              )}
            </div>

            {/* ── Name + actions ──────────────────────────────────────────── */}
            <div className="flex-1 text-center sm:text-left">

              {/* Name row — flex-wrap allows the action buttons to wrap to a new
                  line on very small screens without overflowing. */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                <h1 className="text-3xl font-bold text-white tracking-tight">
                  {user.username}
                </h1>

                {/* Blue checkmark badge — only rendered when isVerified is true.
                    Conditional rendering: {condition && <Component />} */}
                {user.isVerified && <VerifiedBadge size="md" />}

                {/* Verification CTA — shown to the owner only when not yet verified.
                    viewerId === user.id confirms this is the owner's own profile. */}
                {viewerId === user.id && !user.isVerified && (
                  <Link
                    href="/apply-for-verification"
                    className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition"
                  >
                    {/* Inline SVG checkmark icon — avoids importing an icon library */}
                    <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Apply for verification
                  </Link>
                )}

                {/* Follow / Message / Compliment buttons — only shown to OTHER
                    logged-in users, not to the profile owner or guests.
                    viewerId && viewerId !== user.id ensures both conditions:
                    - viewerId truthy  → user is logged in
                    - !== user.id     → not the owner viewing their own profile */}
                {viewerId && viewerId !== user.id && (
                  <div className="flex items-center gap-2">
                    {/* FollowButton is a client component — it manages toggle state
                        and fires the follow/unfollow API route on click.
                        `initialFollowing` seeds the button's initial visual state
                        based on the server-computed isFollowing check above. */}
                    <FollowButton targetUserId={user.id} initialFollowing={isFollowing} />
                    <Link
                      href={`/messages/${user.username}`}
                      className="px-3 py-1.5 text-xs font-semibold bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-white rounded-lg transition"
                    >
                      Message
                    </Link>
                    {/* ComplimentButton — sends an anonymous compliment.
                        Rate-limited to one compliment per 24 hours per sender. */}
                    <ComplimentButton toUserId={user.id} toUsername={user.username} fromUserId={viewerId} />
                  </div>
                )}
              </div>

              {/* Bio — conditional: only rendered if the user has filled it in.
                  Optional chaining (?.) safely returns undefined if profile is null. */}
              {user.profile?.bio && (
                <p className="text-gray-400 mt-2 max-w-lg leading-relaxed">{user.profile.bio}</p>
              )}

              {/* Website link — strips the protocol prefix for a cleaner display.
                  rel="noopener noreferrer" prevents the opened tab from accessing
                  this page via window.opener (security best practice for external links). */}
              {user.profile?.website && (
                <a
                  href={user.profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300 transition mt-1.5"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  {/* Replace strips https:// / http:// for a cleaner display URL */}
                  {user.profile.website.replace(/^https?:\/\//, '')}
                </a>
              )}

              {/* Streak badges — only rendered when at least one streak relation
                  exists.  WritingStreak tracks consecutive days of published stories;
                  ReadingStreak tracks consecutive days of reading.
                  We additionally guard ReadingStreakBadge with currentStreak > 0
                  to avoid showing a badge for a streak that has broken (streak = 0). */}
              {(user.writingStreak || user.readingStreak) && (
                <div className="mt-3 flex flex-wrap justify-center sm:justify-start gap-2">
                  {user.writingStreak && (
                    <WritingStreakBadge
                      currentStreak={user.writingStreak.currentStreak}
                      longestStreak={user.writingStreak.longestStreak}
                    />
                  )}
                  {user.readingStreak && user.readingStreak.currentStreak > 0 && (
                    <ReadingStreakBadge
                      currentStreak={user.readingStreak.currentStreak}
                      longestStreak={user.readingStreak.longestStreak}
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Stats bar ────────────────────────────────────────────────────
              grid-cols-2 on mobile stacks the five stats into 2 columns.
              sm:grid-cols-5 on small tablets and above puts all five in one row.
              gap-3 provides consistent gutters between each stat tile.
          ─────────────────────────────────────────────────────────────────── */}
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-5 gap-3">
            {/* Stories count — we use stories.length (already in memory) rather
                than user._count.stories which includes drafts. */}
            <div className="bg-gray-900/70 border border-gray-800 rounded-xl px-4 py-3 text-center">
              <p className="text-2xl font-bold text-white">{stories.length}</p>
              <p className="text-xs text-gray-500 mt-0.5">Stories</p>
            </div>

            {/* Followers — the [&_button] Tailwind arbitrary variant applies
                styles to the FollowListModal's internal <button> element without
                needing to add className props to the component itself. */}
            <div className="bg-gray-900/70 border border-gray-800 rounded-xl px-4 py-3 text-center [&_button]:flex [&_button]:flex-col [&_button]:items-center [&_button]:gap-0.5 [&_button_span:first-child]:text-2xl [&_button_span:first-child]:font-bold [&_button_span:last-child]:text-xs [&_button_span:last-child]:text-gray-500">
              <FollowListModal username={user.username} type="followers" count={user._count.followers} />
            </div>

            {/* Following — same pattern as Followers above */}
            <div className="bg-gray-900/70 border border-gray-800 rounded-xl px-4 py-3 text-center [&_button]:flex [&_button]:flex-col [&_button]:items-center [&_button]:gap-0.5 [&_button_span:first-child]:text-2xl [&_button_span:first-child]:font-bold [&_button_span:last-child]:text-xs [&_button_span:last-child]:text-gray-500">
              <FollowListModal username={user.username} type="following" count={user._count.following} />
            </div>

            {/* Total views — toLocaleString() adds thousand separators (e.g. 1,234) */}
            <div className="bg-gray-900/70 border border-gray-800 rounded-xl px-4 py-3 text-center">
              <p className="text-2xl font-bold text-white">{totalViews.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-0.5">Views</p>
            </div>

            {/* Total likes — text-red-400 gives the number a red tint to match
                the heart/like colour used elsewhere on the site */}
            <div className="bg-gray-900/70 border border-gray-800 rounded-xl px-4 py-3 text-center">
              <p className="text-2xl font-bold text-red-400">{totalLikes.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-0.5">Likes</p>
            </div>
          </div>

          {/* ── Badges row ───────────────────────────────────────────────────
              Only rendered when the user has at least one earned badge.
              BADGE_META is a lookup map from badge type string → { emoji, label,
              description }.  We skip any badge types not in the map (future-proof
              against badge types added to the DB before the front-end is updated).
          ─────────────────────────────────────────────────────────────────── */}
          {badgeRows.length > 0 && (
            <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-5">
              {badgeRows.map((b) => {
                // Cast b.type to the BadgeType union type — guarantees type safety
                // when indexing into BADGE_META.
                const meta = BADGE_META[b.type as BadgeType];
                // Skip unknown badge types rather than crashing
                if (!meta) return null;
                const BadgeIcon = meta.icon;
                return (
                  // title attribute shows the full description on hover as a tooltip
                  <span
                    key={b.type}
                    title={meta.description}
                    className="inline-flex items-center gap-1.5 bg-gray-800/80 border border-gray-700 hover:border-red-600/40 rounded-full px-3 py-1 text-xs text-gray-300 transition cursor-default"
                  >
                    <BadgeIcon className="w-3.5 h-3.5 text-red-500/80" strokeWidth={1.75} aria-hidden="true" />
                    <span>{meta.label}</span>
                  </span>
                );
              })}
            </div>
          )}

          {/* Reading goal widget — only visible to the profile owner.
              Other visitors don't see your personal reading target. */}
          {isOwner && (
            <div className="mt-5 max-w-sm mx-auto sm:mx-0">
              <ReadingGoalWidget />
            </div>
          )}
        </div>
      </div>

      {/* ── Ad banner ────────────────────────────────────────────────────────
          Placed between the hero and the story list — a standard leaderboard
          placement.  max-w-4xl and px-4 keep it aligned with the content below.
          AdSlot renders nothing for premium members, so the "No ads" perk on
          /premium applies here automatically. */}
      {/* Admin-only. Readers have no use for another author’s view counts,
          and the map page enforces the same rule itself — this just avoids
          advertising a link that would 404 for them. */}
      {viewerIsAdmin && (
        <div className="max-w-4xl mx-auto px-4 pt-8">
          <Link
            href={`/user/${user.username}/map`}
            className="flex items-center justify-between gap-4 rounded-xl border border-gray-800 bg-gray-900 px-5 py-4 hover:border-red-500/40 transition group"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white group-hover:text-red-200 transition">
                Publication map
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Every published story, grouped by category.
              </p>
            </div>
            <span className="shrink-0 text-xs text-gray-600 group-hover:text-gray-400 transition">View →</span>
          </Link>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 pt-8">
        <AdSlot slot="leaderboard" />
      </div>

      {/* ── Story list ────────────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Section heading with a decorative red accent bar */}
        <div className="flex items-center gap-3 mb-6">
          <span className="w-1 h-5 bg-red-600 rounded-full" />
          <h2 className="text-xl font-bold text-white">Stories by {user.username}</h2>
        </div>

        {/* ── Pinned story ─────────────────────────────────────────────────
            Rendered above the story grid with a distinct yellow/gold border
            and a 📌 label.  Only shown if pinnedStory is non-null AND the
            viewer has permission to see stories (private profile guard).
            coverImage is optional — we show a placeholder when absent. */}
        {pinnedStory && (
          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-widest text-yellow-500 mb-2 flex items-center gap-1.5">
               Pinned
            </p>
            <Link
              href={`/story/${pinnedStory.slug}`}
              className="group flex gap-4 bg-yellow-500/5 border border-yellow-500/25 hover:border-yellow-500/50 rounded-2xl p-4 transition-all"
            >
              {pinnedStory.coverImage ? (
                <img
                  src={pinnedStory.coverImage}
                  alt={pinnedStory.title}
                  className="w-32 h-24 object-cover rounded-xl flex-shrink-0"
                />
              ) : (
                // Placeholder thumbnail when no cover image is set
                <div className="w-32 h-24 bg-gray-800 rounded-xl flex-shrink-0 flex items-center justify-center">
                </div>
              )}
              <div className="flex flex-col justify-between flex-1 min-w-0">
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest text-red-400">{pinnedStory.category.name}</span>
                  {/* group-hover:text-red-300 — changes title colour when the whole
                      card is hovered (group is set on the parent Link element) */}
                  <h3 className="text-base font-semibold text-white group-hover:text-red-300 transition mt-0.5 line-clamp-1">{pinnedStory.title}</h3>
                  {/* line-clamp-2 truncates the excerpt to two lines with an ellipsis */}
                  {pinnedStory.excerpt && <p className="text-sm text-gray-500 line-clamp-2 mt-1 leading-relaxed">{pinnedStory.excerpt}</p>}
                </div>
                {/* Metadata row — date, views, likes, comments */}
                <div className="flex items-center gap-4 text-xs text-gray-600 mt-2">
                  <span>{new Date(pinnedStory.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  <span>{pinnedStory.views.toLocaleString()}</span>
                  <span>{pinnedStory._count.likes}</span>
                  <span>{pinnedStory._count.comments}</span>
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* ── Private account notice ───────────────────────────────────────
            Shown instead of stories when canSeeStories is false. */}
        {!canSeeStories && (
          <div className="text-center py-20 border border-gray-800 rounded-2xl">
            <p className="text-white font-semibold text-lg">This account is private</p>
            <p className="text-gray-500 text-sm mt-1">Follow this user to see their stories.</p>
          </div>
        )}

        {/* ── Empty state ──────────────────────────────────────────────────
            Shown when the viewer can see stories but there aren't any yet. */}
        {canSeeStories && stories.length === 0 && (
          <div className="text-center py-20 border border-gray-800 rounded-2xl text-gray-500">
            No published stories yet.
          </div>
        )}

        {/* ── Story grid / list ────────────────────────────────────────────
            ProfileStoriesGrid is a client component that manages the list vs
            grid toggle state internally.  We pass plain serialisable data:
              - Date → ISO string (toISOString)
              - readingTime computed server-side to keep the client bundle lean
              - isOwner controls whether edit/pin action buttons are shown
              - pinnedStoryId lets the grid mark the pinned card differently
        ─────────────────────────────────────────────────────────────────── */}
        {canSeeStories && stories.length > 0 && (
          <ProfileStoriesGrid
            stories={stories.map(s => ({
              id:         s.id,
              title:      s.title,
              slug:       s.slug,
              coverImage: s.coverImage,
              excerpt:    s.excerpt,
              views:      s.views,
              // Convert Date to ISO string so it survives the server→client boundary
              createdAt:  s.createdAt.toISOString(),
              // Pre-compute reading time on the server to keep the client bundle light
              readTime:   readingTime(s.content),
              category:   s.category,
              _count:     s._count,
            }))}
            isOwner={isOwner}
            pinnedStoryId={user.pinnedStoryId}
            username={user.username}
          />
        )}
      </div>

      <Footer />
    </main>
  );
}
