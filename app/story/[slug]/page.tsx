// app/story/[slug]/page.tsx
// The main story reader page — renders a single published story at /story/:slug.
//
// This is a Next.js server component that:
//   1. Generates Open Graph / Twitter Card meta tags for social sharing previews
//   2. Fetches the story and all related data (author, tags, chapters, comments, reactions)
//   3. Increments the view counter (fire-and-forget — we don't wait for it)
//   4. Checks if the reader has hit the free monthly reading limit (paywall)
//   5. Checks if the story is premium-only and if the user is subscribed
//   6. Assembles the full page layout including the reading toolbar, interactions, and recommendations

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import StoryInteractions from '@/app/components/ui/StoryInteractions';
import StoryContent from '@/app/components/ui/StoryContent';
import ReadingProgress from '@/app/components/ui/ReadingProgress';
import ReadingTracker from '@/app/components/ui/ReadingTracker';
import StoryActionsDropdown from '@/app/components/ui/StoryActionsDropdown';
import RelatedStories from '@/app/components/ui/RelatedStories';
import ReactionBar from '@/app/components/ui/ReactionBar';
import ScareOMeter from '@/app/components/ui/ScareOMeter';
import GhostModeToggle from '@/app/components/ui/GhostMode';
import SeriesNav from '@/app/components/ui/SeriesNav';
import MoreLikeThis from '@/app/components/ui/MoreLikeThis';
import YouMightAlsoFear from '@/app/components/ui/YouMightAlsoFear';
import { getLang } from '@/lib/languages';
import { readingTime } from '@/lib/readingTime';
import StoryWarningModal from '@/app/components/ui/StoryWarningModal';
import ReadingRoom from '@/app/components/ui/ReadingRoom';
import TipButton from '@/app/components/ui/TipButton';
import VerifiedBadge from '@/app/components/ui/VerifiedBadge';
import LiveReaderCount from '@/app/components/ui/LiveReaderCount';
import AudioPlayer from '@/app/components/ui/AudioPlayer';
import VideoEmbed from '@/app/components/ui/VideoEmbed';
import StoryAnalytics from '@/app/components/ui/StoryAnalytics';
import TipGoalWidget from '@/app/components/ui/TipGoalWidget';
import StoryMilestones from '@/app/components/ui/StoryMilestones';
import AgeGate from '@/app/components/ui/AgeGate';
import ReadAloudButton from '@/app/components/ui/ReadAloudButton';
import WordCountBadge from '@/app/components/ui/WordCountBadge';
import ScareScoreBadge from '@/app/components/ui/ScareScoreBadge';
import type { Metadata } from 'next';
import { checkReadingLimit, FREE_MONTHLY_LIMIT } from '@/lib/readingLimit';
import ReadingPaywall from '@/app/components/ui/ReadingPaywall';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://silentevidence.com';

type Props = { params: Promise<{ slug: string }> };

// generateMetadata runs on the server before the page renders.
// Next.js uses whatever this returns to set <title>, <meta description>, and
// Open Graph / Twitter Card tags — the things that control how the link looks
// when shared on Facebook, Twitter, iMessage, etc.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const story = await prisma.story.findUnique({
    where: { slug, status: 'PUBLISHED' },
    select: {
      title: true,
      excerpt: true,
      coverImage: true,
      author: { select: { username: true } },
    },
  });
  if (!story) return { title: 'Story Not Found' };

  const description = story.excerpt ?? `A horror story by ${story.author.username} on Silent Evidence.`;
  // Use the dynamic OG image generator which creates a branded horror-themed card,
  // falling back to the story's cover image or a static default
  const ogImage = `${BASE_URL}/api/og?slug=${encodeURIComponent(slug)}`;
  const image = story.coverImage ?? ogImage;
  const url = `${BASE_URL}/story/${slug}`;

  return {
    title: `${story.title} — Silent Evidence`,
    description,
    openGraph: {
      title: story.title,
      description,
      url,
      siteName: 'Silent Evidence',
      // Include both the cover image and the branded OG card as options
      // Social platforms will pick the first one, but having both improves compatibility
      images: [
        { url: image, width: 1200, height: 630, alt: story.title },
        ...(story.coverImage ? [{ url: ogImage, width: 1200, height: 630, alt: story.title }] : []),
      ],
      type: 'article',
      authors: [story.author.username],
    },
    twitter: {
      card: 'summary_large_image',
      title: story.title,
      description,
      images: [image],
      creator: `@${story.author.username}`,
    },
    alternates: { canonical: url },
  };
}

export default async function StoryPage({ params }: Props) {
  const { slug } = await params;

  // Read the userId cookie so we know who is viewing this page.
  // null means the visitor is logged out — many features are gated on this.
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0) || null;

  // Fetch the story by its URL slug. We only look for PUBLISHED stories so that
  // draft or archived stories can't be accessed by guessing the URL.
  const story = await prisma.story.findUnique({
    where: { slug, status: 'PUBLISHED' },
    include: {
      author: { select: { id: true, username: true, isVerified: true, profile: { select: { avatar: true } } } },
      category: { select: { name: true, slug: true } },
      tags: { select: { id: true, name: true, slug: true } },
      _count: { select: { likes: true, comments: true } },
    },
  });

  if (!story) return notFound();

  // Increment view count (fire and forget)
  prisma.story.update({ where: { id: story.id }, data: { views: { increment: 1 } } }).catch(() => {});

  // Fetch accepted co-authors — shown in the byline next to the primary author
  const coAuthors = await prisma.storyCollaborator.findMany({
    where: { storyId: story.id, accepted: true },
    select: { user: { select: { username: true, profile: { select: { avatar: true } } } } },
  });

  // If the story is chaptered, fetch the chapter list for the table of contents
  const chapters = story.isChaptered
    ? await prisma.storyChapter.findMany({
        where: { storyId: story.id },
        orderBy: { order: 'asc' },
        select: { id: true, title: true, order: true },
      })
    : [];

  // Check if this user has an active premium subscription (for premium-only stories)
  const userSubscription = userId
    ? await prisma.subscription.findUnique({ where: { userId }, select: { status: true } })
    : null;
  const hasPremium = userSubscription?.status === 'active';

  // Free tier reading limit check — non-premium users get FREE_MONTHLY_LIMIT stories/month
  const readingLimit = await checkReadingLimit(userId, story.id);

  // Run all these database queries in parallel using Promise.all so the page loads faster.
  // Instead of waiting for each query one by one, they all start at the same time.
  const [userLike, userBookmark, userOfflineSave, comments, currentUser, storyReactions, userReactionsList] = await Promise.all([
    userId ? prisma.like.findUnique({ where: { userId_storyId: { userId, storyId: story.id } } }) : null,
    userId ? prisma.bookmark.findUnique({ where: { userId_storyId: { userId, storyId: story.id } } }) : null,
    // Check if the user has already saved this story for offline reading
    userId ? prisma.offlineSave.findUnique({ where: { userId_storyId: { userId, storyId: story.id } } }) : null,
    prisma.comment.findMany({
      where: { storyId: story.id, parentId: null },
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }], // pinned comment always first
      include: {
        user: { select: { username: true, profile: { select: { avatar: true } } } },
        replies: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: { select: { username: true, profile: { select: { avatar: true } } } },
            replies: {
              orderBy: { createdAt: 'asc' },
              include: {
                user: { select: { username: true, profile: { select: { avatar: true } } } },
                replies: true,
              },
            },
          },
        },
      },
    }),
    // Also fetch ageGroup so AgeGate can enforce content rating rules
    userId ? prisma.user.findUnique({ where: { id: userId }, select: { username: true, ageGroup: true } }) : null,
    prisma.reaction.groupBy({ by: ['type'], where: { storyId: story.id }, _count: { type: true } }),
    userId ? prisma.reaction.findMany({ where: { storyId: story.id, userId }, select: { type: true } }) : [],
  ]);

  // Convert the grouped reaction results into a simple { SCARED: 5, LOVE: 3, ... } object
  // so the ReactionBar component can easily look up counts by type.
  const reactionCounts = Object.fromEntries(storyReactions.map(r => [r.type, r._count.type]));

  // Pull out just the reaction type strings the current user has used (e.g. ["SCARED", "LOVE"])
  // so the ReactionBar can show which buttons are already "active" for this user.
  const userReactionTypes = (userReactionsList ?? []).map((r: { type: string }) => r.type);

  // Build the author avatar URL. If they haven't uploaded a photo, fall back to
  // ui-avatars.com which generates a red initials avatar on the fly.
  const authorAvatar =
    story.author.profile?.avatar ??
    `https://ui-avatars.com/api/?name=${encodeURIComponent(story.author.username)}&background=22c55e&color=fff&size=64`;

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <ReadingProgress storyId={story.id} />
      {userId && <ReadingTracker storyId={story.id} />}
      <Header />

      {/* Free tier paywall — shown when user has exceeded monthly reading limit */}
      {readingLimit.blocked && (
        <ReadingPaywall readThisMonth={readingLimit.readThisMonth} limit={FREE_MONTHLY_LIMIT} />
      )}

      {/* Cover image — max height capped so tall images don't dominate */}
      {story.coverImage && (
        <div className="w-full relative flex justify-center bg-gray-950">
          <img src={story.coverImage} alt={story.title} className="max-h-[500px] w-auto object-contain block" />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent" />
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 py-10">

        {/* Category breadcrumb */}
        <Link href={`/category/${story.category.slug}`} className="text-xs font-semibold uppercase tracking-widest text-red-500 hover:text-red-400 transition">
          {story.category.name}
        </Link>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold text-white mt-3 leading-tight">{story.title}</h1>

        {/* Language badge */}
        {story.language && story.language !== 'en' && (() => {
          const lang = getLang(story.language);
          return (
            <span className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium px-2.5 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-400">
              {lang.flag} Written in {lang.label} ({lang.nativeLabel})
            </span>
          );
        })()}

        {/* Author + meta row */}
        <div className="flex items-center gap-3 mt-5">
          <img src={authorAvatar} alt={story.author.username} className="w-10 h-10 rounded-full object-cover border-2 border-gray-700" />
          <div className="flex-1">
            <Link href={`/user/${story.author.username}`} className="text-sm font-semibold text-white hover:text-red-400 transition inline-flex items-center gap-1">
              {story.author.username}
              {/* Blue checkmark next to verified author names */}
              {story.author.isVerified && <VerifiedBadge />}
            </Link>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mt-0.5">
              <span>{new Date(story.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              <span>·</span>
              <span>{readingTime(story.content)}</span>
              <span>·</span>
              {/* Word count and estimated reading time */}
              <WordCountBadge content={story.content} />
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                {story.views.toLocaleString()} views
              </span>
              {/* Live reader count — polls every 30s, shows pulsing green dot */}
              <LiveReaderCount storyId={story.id} />
            </div>
          </div>

          {/* Action buttons — collapsed into a dropdown */}
          <div className="flex items-center gap-2">
            <StoryActionsDropdown
              storyId={story.id}
              storySlug={story.slug}
              storyTitle={story.title}
              initialBookmarked={!!userBookmark}
              isLoggedIn={!!userId}
              initialSaved={!!userOfflineSave}
              isAuthor={userId === story.author.id}
            />
          </div>
        </div>

        {/* Co-author credits — shown when accepted collaborators exist */}
        {coAuthors.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="text-xs text-gray-600">with</span>
            {coAuthors.map(c => {
              const coAvatar = c.user.profile?.avatar ??
                `https://ui-avatars.com/api/?name=${encodeURIComponent(c.user.username)}&background=22c55e&color=fff&size=32`;
              return (
                <Link
                  key={c.user.username}
                  href={`/user/${c.user.username}`}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition"
                >
                  <img src={coAvatar} alt={c.user.username} className="w-5 h-5 rounded-full object-cover" />
                  {c.user.username}
                </Link>
              );
            })}
          </div>
        )}

        {/* Tip the author — only shown to readers who are NOT the author */}
        {userId && userId !== story.author.id && (
          <div className="mt-5">
            <TipButton
              toUserId={story.author.id}
              toUsername={story.author.username}
              fromUserId={userId}
            />
          </div>
        )}

        {/* Content warnings */}
        {story.warnings && (() => {
          try {
            const w: string[] = JSON.parse(story.warnings);
            if (w.length > 0) return (
              <div className="flex flex-wrap gap-2 mt-4">
                <span className="text-xs text-gray-500 font-medium self-center">⚠️ Warnings:</span>
                {w.map(warning => (
                  <span key={warning} className="text-xs px-2.5 py-1 bg-red-500/10 border border-red-500/30 text-red-400 rounded-full">{warning}</span>
                ))}
              </div>
            );
          } catch { return null; }
        })()}

        {/* Mood badge */}
        {story.mood && (
          <div className="mt-3">
            <a href={`/mood/${story.mood.toLowerCase()}`} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 bg-gray-800 border border-gray-700 hover:border-gray-500 text-gray-400 rounded-full transition">
              {{CREEPY:'🕷️',PARANOID:'👁️',DISTURBING:'😱',ATMOSPHERIC:'🌫️',PSYCHOLOGICAL:'🧠',SUPERNATURAL:'👻',GORE:'🩸',JUMPSCARE:'⚡'}[story.mood] ?? ''}
              {' '}{story.mood.charAt(0) + story.mood.slice(1).toLowerCase()}
            </a>
          </div>
        )}

        {/* Tags */}
        {story.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-5">
            {story.tags.map((tag) => (
              <Link
                key={tag.id}
                href={`/tag/${tag.slug}`}
                className="text-xs px-2.5 py-1 bg-gray-800 border border-gray-700 hover:border-red-600/50 hover:text-red-400 text-gray-400 rounded-full transition"
              >
                #{tag.name}
              </Link>
            ))}
          </div>
        )}

        {/* Premium paywall — shown when story is premium-only and the viewer is not subscribed */}
        {story.isPremiumOnly && !hasPremium && userId !== story.author.id ? (
          <div className="mt-10 rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-8 text-center">
            <p className="text-3xl mb-3">🔒</p>
            <h3 className="text-lg font-bold text-white mb-2">Premium Members Only</h3>
            <p className="text-sm text-gray-400 mb-6">This story is exclusive to premium subscribers. Upgrade to read it and unlock all premium content.</p>
            <a
              href="/subscribe"
              className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-xl transition text-sm"
            >
              ✨ Become a Member
            </a>
          </div>
        ) : story.isChaptered && chapters.length > 0 ? (
          /* Chaptered story — show a table of contents instead of full content */
          <div className="mt-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-1 h-5 bg-red-600 rounded-full" />
              <h2 className="text-lg font-bold text-white">Table of Contents</h2>
              <span className="text-xs text-gray-500">{chapters.length} chapters</span>
            </div>
            <div className="space-y-2">
              {chapters.map((ch, i) => (
                <a
                  key={ch.id}
                  href={`/story/${story.slug}/chapter/${ch.order}`}
                  className="flex items-center gap-4 px-4 py-3 bg-gray-800 border border-gray-700 hover:border-red-600/50 rounded-xl transition group"
                >
                  <span className="text-sm font-bold text-gray-600 w-6 flex-shrink-0">{i + 1}</span>
                  <span className="flex-1 text-sm text-white group-hover:text-red-300 transition truncate">{ch.title}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-600 group-hover:text-red-400 transition flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              ))}
            </div>
            {/* Start reading CTA */}
            <a
              href={`/story/${story.slug}/chapter/${chapters[0].order}`}
              className="mt-6 flex items-center justify-center gap-2 w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition text-sm"
            >
              Start Reading → Chapter 1
            </a>
          </div>
        ) : (
          /* Regular story — wrapped in age gate for content rating enforcement */
          <AgeGate
            contentRating={(story.contentRating ?? 'ALL') as 'ALL' | 'TEEN' | 'MATURE'}
            ageGroup={(currentUser?.ageGroup ?? null) as 'UNDER_13' | 'TEEN' | 'ADULT' | null}
            warnings={story.warnings ? (() => { try { return JSON.parse(story.warnings!); } catch { return []; } })() : []}
          >
            {story.warnings ? (
              <StoryWarningModal warnings={story.warnings}>
                <StoryContent content={story.content} excerpt={story.excerpt} storyLang={story.language ?? 'en'} />
              </StoryWarningModal>
            ) : (
              <StoryContent content={story.content} excerpt={story.excerpt} storyLang={story.language ?? 'en'} />
            )}
          </AgeGate>
        )}

        {/* Reading Room — lets logged-in users read together with friends */}
        <ReadingRoom storyId={story.id} isLoggedIn={!!userId} />

        {/* Scare-o-meter + Ghost Mode */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <ScareOMeter storyId={story.id} isLoggedIn={!!userId} />
          <GhostModeToggle />
        </div>

        {/* AI scare score — skull rating shown to everyone, author can generate/refresh it */}
        <ScareScoreBadge
          storyId={story.id}
          isAuthor={userId === story.author.id}
          initialScore={story.scareScore ?? null}
        />

        {/* Tip goal — visible to everyone; edit controls shown to author only */}
        <TipGoalWidget storyId={story.id} isAuthor={userId === story.author.id} />

        {/* Analytics + milestones — only visible to the story author */}
        {userId === story.author.id && (
          <>
            <StoryMilestones storyId={story.id} />
            <StoryAnalytics storyId={story.id} />
          </>
        )}

        {/* Reactions */}
        <div className="mt-6 mb-2">
          <ReactionBar storyId={story.id} initialCounts={reactionCounts} userReactions={userReactionTypes} />
        </div>

        <div className="my-10 border-t border-gray-800" />

        {/* Likes + Comments */}
        <StoryInteractions
          storyId={story.id}
          storyAuthorId={story.author.id}
          initialLiked={!!userLike}
          initialLikeCount={story._count.likes}
          initialComments={JSON.parse(JSON.stringify(comments))}
          currentUserId={userId}
          currentUsername={currentUser?.username ?? null}
        />

        {/* Series navigation */}
        {story.seriesId && story.seriesOrder && (
          <SeriesNav storyId={story.id} seriesId={story.seriesId} seriesOrder={story.seriesOrder} />
        )}

        {/* Personalised picks — "You Might Also Fear" */}
        <YouMightAlsoFear
          currentStoryId={story.id}
          mood={story.mood}
          categoryId={story.categoryId}
        />

        {/* More like this */}
        <MoreLikeThis storyId={story.id} categoryId={story.categoryId} mood={story.mood} />

        {/* Related stories */}
        <RelatedStories categoryId={story.categoryId} currentStoryId={story.id} />
      </div>
      {/* Video — embedded YouTube or direct video attached to this story */}
      {story.videoUrl && <VideoEmbed videoUrl={story.videoUrl} />}
      {/* Sticky audio player — only shown when the story has an audio narration */}
      {story.audioUrl && <AudioPlayer audioUrl={story.audioUrl} title={story.title} />}
      {/* Read aloud — browser TTS, sticky bottom bar, only shown when active */}
      <ReadAloudButton content={story.content} />
      <Footer />
    </main>
  );
}
