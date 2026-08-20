// HomepageVideos.tsx
// Server component — fetches the latest stories with a video and renders
// a preview row on the homepage. Clicking a card plays the video inline.

import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import VideoCard from '@/app/videos/VideoCard';

export default async function HomepageVideos() {
  const stories = await prisma.story.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id:        true,
      title:     true,
      slug:      true,
      excerpt:   true,
      videoUrl:  true,
      views:     true,
      createdAt: true,
      author:    { select: { username: true } },
      category:  { select: { name: true, slug: true } },
      _count:    { select: { likes: true, comments: true } },
    },
  });

  const videos = stories.filter(
    (s): s is typeof s & { videoUrl: string } => !!s.videoUrl
  ).slice(0, 3);

  if (videos.length === 0) return null;

  return (
    <section className="max-w-6xl mx-auto px-4 py-10">
      {/* Heading */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="w-1 h-6 bg-red-600 rounded-full" />
          <h2 className="text-2xl font-bold text-white">Videos</h2>
        </div>
        <Link
          href="/videos"
          className="text-sm text-red-400 hover:text-red-300 transition font-medium"
        >
          View all →
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.map(v => (
          <VideoCard key={v.id} story={v} />
        ))}
      </div>
    </section>
  );
}
