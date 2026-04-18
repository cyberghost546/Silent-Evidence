// app/videos/page.tsx
import { prisma } from '@/lib/prisma';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import VideoCard from './VideoCard';
import AddVideoButton from './AddVideoButton';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Videos — Silent Evidence',
  description: 'Watch horror story videos shared by the Silent Evidence community.',
};

export default async function VideosPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;

  const [stories, allCategories] = await Promise.all([
    prisma.story.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { createdAt: 'desc' },
      select: {
        id:        true,
        title:     true,
        slug:      true,
        videoUrl:  true,
        excerpt:   true,
        views:     true,
        createdAt: true,
        author:    { select: { username: true } },
        category:  { select: { name: true, slug: true } },
        _count:    { select: { likes: true, comments: true } },
      },
    }),
    prisma.category.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, slug: true } }),
  ]);

  const videos = stories.filter((s): s is typeof s & { videoUrl: string } => !!s.videoUrl);

  // Unique categories that actually have videos
  const videoCategories = Array.from(
    new Map(videos.map(v => [v.category.slug, v.category])).values()
  );

  const filtered = category ? videos.filter(v => v.category.slug === category) : videos;
  const [featured, ...rest] = filtered;

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />

      {/* ── Cinematic Hero ── */}
      <div className="relative overflow-hidden border-b border-gray-800 py-16">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(220,38,38,0.18)_0%,transparent_70%)]" />
        {/* Film strip top */}
        <div className="absolute top-0 left-0 right-0 h-6 flex gap-1 px-2 opacity-10">
          {Array.from({ length: 40 }).map((_, i) => (
            <div key={i} className="h-full w-8 shrink-0 bg-white rounded-sm" />
          ))}
        </div>
        {/* Film strip bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-6 flex gap-1 px-2 opacity-10">
          {Array.from({ length: 40 }).map((_, i) => (
            <div key={i} className="h-full w-8 shrink-0 bg-white rounded-sm" />
          ))}
        </div>

        <div className="max-w-6xl mx-auto px-4 relative text-center">
          <p className="text-red-500 text-xs font-bold uppercase tracking-[0.3em] mb-3">Silent Evidence</p>
          <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-3 tracking-tight">
            Horror <span className="text-red-500">Videos</span>
          </h1>
          <p className="text-gray-400 text-base max-w-md mx-auto mb-6">
            Watch the most chilling stories from our community — brought to life on screen.
          </p>

          {/* Add Video button */}
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <AddVideoButton categories={allCategories} />
            <span className="text-xs text-gray-600">
              {videos.length} video{videos.length !== 1 ? 's' : ''}
              {videoCategories.length > 0 && ` · ${videoCategories.length} categor${videoCategories.length !== 1 ? 'ies' : 'y'}`}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10">
        {videos.length === 0 ? (
          <div className="text-center py-32">
            <p className="text-6xl mb-4">🎥</p>
            <h2 className="text-2xl font-bold text-white mb-2">No videos yet</h2>
            <p className="text-gray-500 text-sm mb-6">Be the first to share a horror video with the community.</p>
            <AddVideoButton categories={allCategories} />
          </div>
        ) : (
          <>
            {/* Category filter */}
            {videoCategories.length > 1 && (
              <div className="flex gap-2 flex-wrap mb-8">
                <a href="/videos"
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold transition border ${!category ? 'bg-red-600 border-red-600 text-white' : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white'}`}>
                  All
                </a>
                {videoCategories.map(c => (
                  <a key={c.slug} href={`/videos?category=${c.slug}`}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold transition border ${category === c.slug ? 'bg-red-600 border-red-600 text-white' : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white'}`}>
                    {c.name}
                  </a>
                ))}
              </div>
            )}

            {/* Featured first video */}
            {featured && (
              <div className="mb-8">
                <p className="text-xs text-red-500 font-bold uppercase tracking-widest mb-3">Featured</p>
                <VideoCard story={featured} featured />
              </div>
            )}

            {/* Grid */}
            {rest.length > 0 && (
              <>
                <p className="text-xs text-gray-600 uppercase tracking-widest mb-4 mt-10">More videos</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {rest.map(v => (
                    <VideoCard key={v.id} story={v} />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      <Footer />
    </main>
  );
}
