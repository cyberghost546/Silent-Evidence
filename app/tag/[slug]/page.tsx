// app/tag/[slug]/page.tsx
//
// Server Component — tag detail / browsing page.
//
// PURPOSE:
//   Shows all published stories that carry a specific tag.
//   Tags are reader-discoverable labels (e.g. #werewolf, #haunted-house) that
//   authors add to their stories. Following a tag adds its stories to the reader's
//   personalised "For You" feed.
//
// DATA:
//   Three sequential queries (order matters — we need the tag ID first):
//   1. `tag.findUnique` — get the tag + follower/story counts via `_count`
//   2. `tagFollow.findUnique` — check if this user already follows the tag
//      (compound key `userId_tagId` = Prisma's name for the composite unique index)
//      Skipped entirely when `userId` is null (guest visitors can't follow)
//   3. `story.findMany` — all published stories tagged with this slug, newest first
//
//   `tags: { some: { slug } }` is Prisma's M:N filter syntax — it matches stories
//   where at least ONE of the story's tags has the given slug. Equivalent SQL:
//   WHERE EXISTS (SELECT 1 FROM _StoryToTag WHERE tagSlug = ?)
//
// `userFollows` is a boolean gate: if the TagFollow record exists, the user follows
//   the tag. `!!userFollows` converts the record/null to a true/false prop.
//
// TagStories is a Client Component that paginates the full story list client-side
// (no extra API calls needed since we load all stories in one query).
//
// `notFound()` returns a 404 response if the slug doesn't match any tag.
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import TagStories from './TagStories';
import TagFollowButton from '@/app/components/ui/TagFollowButton';
import { viewerRatings, ratingFilter } from '@/lib/ageGate';

type Props = { params: Promise<{ slug: string }> };

export default async function TagPage({ params }: Props) {
  const { slug } = await params;

  // Read the logged-in user's id from the session cookie
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0) || null;

  const tag = await prisma.tag.findUnique({
    where: { slug },
    include: { _count: { select: { stories: true, followers: true } } },
  });
  if (!tag) return notFound();

  // Check whether the current user already follows this tag
  const userFollows = userId
    ? await prisma.tagFollow.findUnique({ where: { userId_tagId: { userId, tagId: tag.id } } })
    : null;

  // Restrict to the ratings this viewer is old enough to see. Without it a minor
  // browsing a tag saw MATURE stories listed — title, excerpt and cover — even
  // though opening one is blocked. Shared with /search and /category: the
  // mapping lives in lib/ageGate.ts.
  const allowedRatings = await viewerRatings();

  const stories = await prisma.story.findMany({
    where: {
      status: 'PUBLISHED',
      tags: { some: { slug } },
      ...ratingFilter(allowedRatings),
    },
    orderBy: { createdAt: 'desc' },
    include: {
      author: { select: { username: true, profile: { select: { avatar: true } } } },
      category: { select: { name: true, slug: true } },
      _count: { select: { likes: true, comments: true } },
    },
  });

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <Header />

      <div className="relative bg-gray-950 border-b border-gray-800 py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-xs text-gray-500 mb-4">
            <Link href="/" className="hover:text-gray-300 transition">Home</Link>
            <span className="mx-2 text-gray-700">/</span>
            <span className="text-gray-400">#{tag.name}</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-2xl">#</span>
            <h1 className="text-3xl font-extrabold text-white">{tag.name}</h1>
            {/* Follow this tag to get it in your For You feed */}
            {userId && (
              <TagFollowButton
                tagSlug={tag.slug}
                tagName={tag.name}
                initialFollowing={!!userFollows}
                initialCount={tag._count.followers}
              />
            )}
          </div>
          {/* Count the stories actually listed below, not tag._count.stories —
              that relation count includes drafts and stories this viewer is not
              old enough to see, so it read higher than the list it labelled. */}
          <p className="text-sm text-gray-600 mt-2">{stories.length} {stories.length === 1 ? 'story' : 'stories'}</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {stories.length === 0 ? (
          <div className="text-center py-20 text-gray-500">No stories with this tag yet.</div>
        ) : (
          <TagStories stories={JSON.parse(JSON.stringify(stories))} />
        )}
      </div>
      <Footer />
    </main>
  );
}
