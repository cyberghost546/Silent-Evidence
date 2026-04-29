// app/tag/[slug]/page.tsx
// Tag browsing page — shows all published stories that have been tagged with
// a specific tag. The TagFollowButton lets logged-in users follow the tag
// so its stories appear in their personalised feed. TagStories handles
// client-side pagination of the story list.
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import TagStories from './TagStories';
import TagFollowButton from '@/app/components/ui/TagFollowButton';

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

  const stories = await prisma.story.findMany({
    where: { status: 'PUBLISHED', tags: { some: { slug } } },
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
          <p className="text-sm text-gray-600 mt-2">{tag._count.stories} {tag._count.stories === 1 ? 'story' : 'stories'}</p>
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
