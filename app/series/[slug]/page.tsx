// app/series/[slug]/page.tsx
// Series detail page — shows a named series with all its published stories
// listed in reading order (seriesOrder asc). Each story card shows the
// estimated reading time. Returns notFound() if the slug doesn't match a series.
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import { readingTime } from '@/lib/readingTime';

type Props = { params: Promise<{ slug: string }> };

export default async function SeriesPage({ params }: Props) {
  const { slug } = await params;

  const series = await prisma.series.findUnique({
    where: { slug },
    include: {
      author: { select: { username: true, profile: { select: { avatar: true } } } },
      stories: {
        where: { status: 'PUBLISHED' },
        orderBy: { seriesOrder: 'asc' },
        include: {
          _count: { select: { likes: true, comments: true } },
        },
      },
    },
  });

  if (!series) return notFound();

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <Header />

      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Series header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold uppercase tracking-widest text-green-400">Story Series</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">{series.name}</h1>
          {series.description && <p className="text-gray-400">{series.description}</p>}
          <div className="flex items-center gap-3 mt-4 text-sm text-gray-500">
            <span>By <Link href={`/user/${series.author.username}`} className="text-gray-300 hover:text-white transition">{series.author.username}</Link></span>
            <span>·</span>
            <span>{series.stories.length} {series.stories.length === 1 ? 'story' : 'stories'}</span>
          </div>
        </div>

        {/* Stories list */}
        <div className="flex flex-col gap-4">
          {series.stories.map((story, i) => (
            <Link key={story.id} href={`/story/${story.slug}`}
              className="group flex gap-4 bg-gray-800 border border-gray-700 hover:border-green-600/50 rounded-xl overflow-hidden transition-all duration-200">
              {/* Part number */}
              <div className="w-16 flex-shrink-0 bg-gray-900 flex items-center justify-center">
                <span className="text-2xl font-bold text-gray-700 group-hover:text-green-500 transition">{story.seriesOrder ?? i + 1}</span>
              </div>

              {/* Cover */}
              {story.coverImage && (
                <div className="w-24 flex-shrink-0 overflow-hidden">
                  <img src={story.coverImage} alt={story.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
              )}

              {/* Info */}
              <div className="flex-1 py-4 pr-4 flex flex-col justify-center gap-1.5 min-w-0">
                <h3 className="text-sm font-semibold text-white group-hover:text-green-300 transition-colors line-clamp-2">{story.title}</h3>
                {story.excerpt && <p className="text-xs text-gray-500 line-clamp-2">{story.excerpt}</p>}
                <div className="flex items-center gap-3 text-xs text-gray-600 mt-1">
                  <span>{readingTime(story.content)}</span>
                  <span>·</span>
                  <span>♥ {story._count.likes}</span>
                  <span>·</span>
                  <span>💬 {story._count.comments}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <Footer />
    </main>
  );
}
