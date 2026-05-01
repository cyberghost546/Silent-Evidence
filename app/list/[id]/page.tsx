/**
 * app/list/[id]/page.tsx
 *
 * WHAT THIS FILE DOES:
 * Public page for a single reading list (e.g. /list/7).
 * Anyone with the URL can view it, but only if the list is marked isPublic.
 * Private lists return a 404 — we don't reveal that the list even exists.
 *
 * DATA SHAPE:
 * A StoryList has many ListItems, each of which points to one Story.
 * We sort items by their `order` column (set by the user when curating the list)
 * and render them as a numbered playlist-style list.
 *
 * GUARD: if (!list || !list.isPublic) return notFound();
 * Handles two cases:
 *   1. The ID doesn't exist in the DB → list is null
 *   2. The list is private → list.isPublic is false
 * Both cases show a 404 rather than an error, which also prevents leaking IDs.
 *
 * HOW TO REUSE:
 * This "numbered ordered list" layout works great for playlists, ranked lists,
 * reading queues, or any ordered collection of items. Replace StoryList with
 * your model and adjust the card content.
 */
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '@/lib/prisma';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import { readingTime } from '@/lib/readingTime';

type Props = { params: Promise<{ id: string }> };

export default async function ListPage({ params }: Props) {
  // The [id] segment from the URL is always a string, so we convert to Number for Prisma
  const { id } = await params;

  // Fetch the list with its owner and all items in order
  const list = await prisma.storyList.findUnique({
    where: { id: Number(id) },
    include: {
      user: { select: { username: true } },
      items: {
        orderBy: { order: 'asc' }, // respect the user's custom ordering
        include: {
          story: {
            select: {
              id: true, title: true, slug: true, coverImage: true,
              excerpt: true, content: true, createdAt: true,
              author:   { select: { username: true } },
              category: { select: { name: true, slug: true } },
              _count:   { select: { likes: true, comments: true } },
            },
          },
        },
      },
    },
  });

  // Return 404 if the list doesn't exist OR is set to private
  // — we treat both as "not found" to avoid revealing private list IDs
  if (!list || !list.isPublic) return notFound();

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <Header />

      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold uppercase tracking-widest text-red-400">Reading List</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">{list.name}</h1>
          {list.description && <p className="text-gray-400">{list.description}</p>}
          <p className="text-sm text-gray-500 mt-3">
            By <Link href={`/user/${list.user.username}`} className="text-gray-300 hover:text-white transition">{list.user.username}</Link>
            {' · '}{list.items.length} {list.items.length === 1 ? 'story' : 'stories'}
          </p>
        </div>

        {list.items.length === 0 ? (
          <p className="text-gray-500 text-center py-16">This list is empty.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {list.items.map(({ story }, i) => (
              <Link key={story.id} href={`/story/${story.slug}`}
                className="group flex gap-4 bg-gray-800 border border-gray-700 hover:border-red-600/50 rounded-xl overflow-hidden transition-all duration-200">
                <div className="w-12 flex-shrink-0 bg-gray-900 flex items-center justify-center">
                  <span className="text-lg font-bold text-gray-700 group-hover:text-red-500 transition">{i + 1}</span>
                </div>
                {story.coverImage && (
                  <div className="relative w-20 flex-shrink-0 overflow-hidden">
                    <Image src={story.coverImage} alt={story.title} fill sizes="80px" className="object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                )}
                <div className="flex-1 py-3 pr-4 flex flex-col justify-center gap-1 min-w-0">
                  <span className="text-xs text-red-400 font-bold uppercase tracking-wide">{story.category.name}</span>
                  <h3 className="text-sm font-semibold text-white group-hover:text-red-300 transition-colors line-clamp-2">{story.title}</h3>
                  <div className="flex items-center gap-2 text-xs text-gray-600 mt-0.5">
                    <span>{story.author.username}</span>
                    <span>·</span>
                    <span>{readingTime(story.content)}</span>
                    <span className="ml-auto">♥ {story._count.likes}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </main>
  );
}
