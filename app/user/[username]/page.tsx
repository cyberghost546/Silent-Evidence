import { notFound } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import FollowButton from '@/app/components/ui/FollowButton';
import FollowListModal from '@/app/components/ui/FollowListModal';
import { BADGE_META, type BadgeType } from '@/lib/badges';
import { readingTime } from '@/lib/readingTime';
import WritingStreakBadge from '@/app/components/ui/WritingStreakBadge';
import VerifiedBadge from '@/app/components/ui/VerifiedBadge';
import ProfileStoriesGrid from '@/app/components/ui/ProfileStoriesGrid';
import AdBanner from '@/app/components/ui/AdBanner';
import ReadingStreakBadge from '@/app/components/ui/ReadingStreakBadge';
import ReadingGoalWidget from '@/app/components/ui/ReadingGoalWidget';
import ComplimentButton from '@/app/components/ui/ComplimentButton';
import type { Metadata } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://silentevidence.com';

type Props = { params: Promise<{ username: string }> };

// Open Graph meta tags for user profile pages
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const user = await prisma.user.findUnique({
    where: { username },
    select: { username: true, profile: { select: { bio: true, avatar: true } } },
  });
  if (!user) return { title: 'User Not Found' };

  const description = user.profile?.bio ?? `${username}'s horror stories on Silent Evidence.`;
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
      images: [{ url: image, width: 400, height: 400, alt: username }],
      type: 'profile',
    },
    twitter: {
      card: 'summary',
      title: `${username} — Silent Evidence`,
      description,
      images: [image],
    },
    alternates: { canonical: url },
  };
}

export default async function UserProfilePage({ params }: Props) {
  const { username } = await params;

  const cookieStore = await cookies();
  const viewerId = Number(cookieStore.get('userId')?.value ?? 0) || null;

  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      profile: true,
      _count: { select: { stories: true, followers: true, following: true } },
      writingStreak: true,
      readingStreak: true,
    },
  });
  if (!user) return notFound();

  const isFollowing = viewerId
    ? !!(await prisma.follow.findUnique({ where: { followerId_followingId: { followerId: viewerId, followingId: user.id } } }))
    : false;

  // Private profile — hide stories from non-followers (owner always sees everything)
  const isOwner = viewerId === user.id;
  const canSeeStories = !user.isPrivate || isOwner || isFollowing;

  const stories = canSeeStories ? await prisma.story.findMany({
    where: { authorId: user.id, status: 'PUBLISHED' },
    orderBy: { createdAt: 'desc' },
    include: {
      category: { select: { name: true, slug: true } },
      _count: { select: { likes: true, comments: true } },
    },
  }) : [];

  const totalViews = stories.reduce((sum, s) => sum + s.views, 0);
  const totalLikes = stories.reduce((sum, s) => sum + s._count.likes, 0);

  // Fetch earned badges for this user
  const badgeRows = await prisma.userBadge.findMany({
    where: { userId: user.id },
    orderBy: { awardedAt: 'asc' },
  });

  // Fetch pinned story if set — shown at the top of the profile story list
  const pinnedStory = user.pinnedStoryId
    ? await prisma.story.findUnique({
        where: { id: user.pinnedStoryId, status: 'PUBLISHED' },
        include: {
          category: { select: { name: true, slug: true } },
          _count: { select: { likes: true, comments: true } },
        },
      })
    : null;

  const avatar =
    user.profile?.avatar ??
    `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=dc2626&color=fff&size=128`;

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <Header />

      {/* ── Hero banner ────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        {/* Atmospheric background — layered gradients for a horror feel */}
        <div className="absolute inset-0 bg-gray-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(220,38,38,0.18)_0%,transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_40%_at_20%_80%,rgba(220,38,38,0.06)_0%,transparent_60%)]" />
        {/* Subtle noise texture overlay */}
        <div className="absolute inset-0 opacity-[0.03] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iLjY1IiBudW1PY3RhdmVzPSIzIiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIzMDAiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iMSIvPjwvc3ZnPg==')]" />

        <div className="relative max-w-4xl mx-auto px-4 pt-14 pb-10">
          {/* Avatar + name row */}
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6">
            {/* Avatar with red glow ring */}
            <div className="relative flex-shrink-0">
              <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-red-600 to-red-900 opacity-70 blur-sm" />
              <img
                src={avatar}
                alt={user.username}
                className="relative w-28 h-28 rounded-full object-cover border-4 border-gray-900 shadow-xl"
              />
              {/* Writer of the month crown */}
              {user.writerOfMonth && (
                <span className="absolute -top-2 -right-1 text-xl" title="Writer of the Month">👑</span>
              )}
            </div>

            {/* Name + actions */}
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                <h1 className="text-3xl font-bold text-white tracking-tight">
                  {user.username}
                </h1>
                {/* Blue checkmark for verified authors */}
                {user.isVerified && <VerifiedBadge size="md" />}

                {/* Apply for verification — only shown to the profile owner when not yet verified */}
                {viewerId === user.id && !user.isVerified && (
                  <Link
                    href="/apply-for-verification"
                    className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Apply for verification
                  </Link>
                )}

                {/* Action buttons — only shown to other logged-in users */}
                {viewerId && viewerId !== user.id && (
                  <div className="flex items-center gap-2">
                    <FollowButton targetUserId={user.id} initialFollowing={isFollowing} />
                    <Link
                      href={`/messages/${user.username}`}
                      className="px-3 py-1.5 text-xs font-semibold bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-white rounded-lg transition"
                    >
                      Message
                    </Link>
                    {/* Send an anonymous compliment — one per 24 hours */}
                    <ComplimentButton toUserId={user.id} toUsername={user.username} fromUserId={viewerId} />
                  </div>
                )}
              </div>

              {/* Bio */}
              {user.profile?.bio && (
                <p className="text-gray-400 mt-2 max-w-lg leading-relaxed">{user.profile.bio}</p>
              )}

              {/* Website */}
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
                  {user.profile.website.replace(/^https?:\/\//, '')}
                </a>
              )}

              {/* Streak badges */}
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

          {/* ── Stats bar ──────────────────────────────────────────────────── */}
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-5 gap-3">
            {/* Stories */}
            <div className="bg-gray-900/70 border border-gray-800 rounded-xl px-4 py-3 text-center">
              <p className="text-2xl font-bold text-white">{stories.length}</p>
              <p className="text-xs text-gray-500 mt-0.5">Stories</p>
            </div>
            {/* Followers — tapping the number opens the followers modal */}
            <div className="bg-gray-900/70 border border-gray-800 rounded-xl px-4 py-3 text-center [&_button]:flex [&_button]:flex-col [&_button]:items-center [&_button]:gap-0.5 [&_button_span:first-child]:text-2xl [&_button_span:first-child]:font-bold [&_button_span:last-child]:text-xs [&_button_span:last-child]:text-gray-500">
              <FollowListModal username={user.username} type="followers" count={user._count.followers} />
            </div>
            {/* Following — tapping the number opens the following modal */}
            <div className="bg-gray-900/70 border border-gray-800 rounded-xl px-4 py-3 text-center [&_button]:flex [&_button]:flex-col [&_button]:items-center [&_button]:gap-0.5 [&_button_span:first-child]:text-2xl [&_button_span:first-child]:font-bold [&_button_span:last-child]:text-xs [&_button_span:last-child]:text-gray-500">
              <FollowListModal username={user.username} type="following" count={user._count.following} />
            </div>
            {/* Total views */}
            <div className="bg-gray-900/70 border border-gray-800 rounded-xl px-4 py-3 text-center">
              <p className="text-2xl font-bold text-white">{totalViews.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-0.5">Views</p>
            </div>
            {/* Total likes */}
            <div className="bg-gray-900/70 border border-gray-800 rounded-xl px-4 py-3 text-center">
              <p className="text-2xl font-bold text-red-400">{totalLikes.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-0.5">Likes</p>
            </div>
          </div>

          {/* ── Badges row ─────────────────────────────────────────────────── */}
          {badgeRows.length > 0 && (
            <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-5">
              {badgeRows.map((b) => {
                const meta = BADGE_META[b.type as BadgeType];
                if (!meta) return null;
                return (
                  <span
                    key={b.type}
                    title={meta.description}
                    className="inline-flex items-center gap-1.5 bg-gray-800/80 border border-gray-700 hover:border-red-600/40 rounded-full px-3 py-1 text-xs text-gray-300 transition cursor-default"
                  >
                    <span>{meta.emoji}</span>
                    <span>{meta.label}</span>
                  </span>
                );
              })}
            </div>
          )}

          {/* Reading goal — only visible to profile owner */}
          {isOwner && (
            <div className="mt-5 max-w-sm mx-auto sm:mx-0">
              <ReadingGoalWidget />
            </div>
          )}
        </div>
      </div>

      {/* ── Ad banner — leaderboard between hero and stories ──────────────── */}
      <div className="max-w-4xl mx-auto px-4 pt-8">
        <AdBanner slot="leaderboard" />
      </div>

      {/* ── Story list ─────────────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-6">
          <span className="w-1 h-5 bg-red-600 rounded-full" />
          <h2 className="text-xl font-bold text-white">Stories by {user.username}</h2>
        </div>

        {/* Pinned story — highlighted at the top */}
        {pinnedStory && (
          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-widest text-yellow-500 mb-2 flex items-center gap-1.5">
              <span>📌</span> Pinned
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
                // Placeholder when no cover
                <div className="w-32 h-24 bg-gray-800 rounded-xl flex-shrink-0 flex items-center justify-center">
                  <span className="text-2xl opacity-30">📖</span>
                </div>
              )}
              <div className="flex flex-col justify-between flex-1 min-w-0">
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest text-red-400">{pinnedStory.category.name}</span>
                  <h3 className="text-base font-semibold text-white group-hover:text-red-300 transition mt-0.5 line-clamp-1">{pinnedStory.title}</h3>
                  {pinnedStory.excerpt && <p className="text-sm text-gray-500 line-clamp-2 mt-1 leading-relaxed">{pinnedStory.excerpt}</p>}
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-600 mt-2">
                  <span>{new Date(pinnedStory.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  <span>👁 {pinnedStory.views.toLocaleString()}</span>
                  <span>♥ {pinnedStory._count.likes}</span>
                  <span>💬 {pinnedStory._count.comments}</span>
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* Private account notice */}
        {!canSeeStories && (
          <div className="text-center py-20 border border-gray-800 rounded-2xl">
            <p className="text-5xl mb-4">🔒</p>
            <p className="text-white font-semibold text-lg">This account is private</p>
            <p className="text-gray-500 text-sm mt-1">Follow this user to see their stories.</p>
          </div>
        )}

        {/* Empty state */}
        {canSeeStories && stories.length === 0 && (
          <div className="text-center py-20 border border-gray-800 rounded-2xl text-gray-500">
            No published stories yet.
          </div>
        )}

        {/* Story cards with list/grid toggle — client component handles view state */}
        {canSeeStories && stories.length > 0 && (
          <ProfileStoriesGrid
            stories={stories.map(s => ({
              id:         s.id,
              title:      s.title,
              slug:       s.slug,
              coverImage: s.coverImage,
              excerpt:    s.excerpt,
              views:      s.views,
              // Serialise date so it survives the server→client boundary
              createdAt:  s.createdAt.toISOString(),
              // Pre-compute reading time on the server to keep the client component light
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
