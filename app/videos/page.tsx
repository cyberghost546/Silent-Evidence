// app/videos/page.tsx
// Shows all published stories that have a video attached.
// Users can watch the video inline or click through to the full story.

import { prisma } from '@/lib/prisma';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import VideoCard from './VideoCard';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Videos — Silent Evidence',
  description: 'Watch horror story videos shared by the Silent Evidence community.',
};

export default async function VideosPage() {
  const stories = await prisma.story.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { createdAt: 'desc' },
    select: {
      id:        true,
      title:     true,
      slug:      true,
      videoUrl:  true,
      views:     true,
      createdAt: true,
      author:    { select: { username: true } },
      category:  { select: { name: true, slug: true } },
      _count:    { select: { likes: true, comments: true } },
    },
  });

  // Filter out stories with no video after fetching
  const videos = stories.filter((s): s is typeof s & { videoUrl: string } => !!s.videoUrl);

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />

      {/* Hero */}
      <div className="relative bg-gray-950 border-b border-gray-800 py-12">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(220,38,38,0.15)_0%,transparent_70%)]" />
        <div className="max-w-6xl mx-auto px-4 relative">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">🎬</span>
            <h1 className="text-4xl font-extrabold text-white">Videos</h1>
          </div>
          <p className="text-gray-400 text-sm">
            Horror story videos from the Silent Evidence community.
          </p>
          <div className="mt-4 h-px bg-gradient-to-r from-red-600/60 to-transparent" />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10">
        {videos.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-5xl mb-4">🎥</p>
            <h2 className="text-xl font-bold text-white mb-2">No videos yet</h2>
            <p className="text-gray-500 text-sm">
              Authors can add a YouTube link when writing or editing a story.
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-600 mb-6">{videos.length} video{videos.length !== 1 ? 's' : ''}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {videos.map(v => (
                <VideoCard key={v.id} story={v} />
              ))}
            </div>
          </>
        )}
      </div>

      <Footer />
    </main>
  );
}
