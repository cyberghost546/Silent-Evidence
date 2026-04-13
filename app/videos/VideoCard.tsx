'use client';
import { useState } from 'react';
import Link from 'next/link';

// Converts a YouTube watch/short/youtu.be URL to an embed URL.
function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === 'youtu.be') {
      const id = u.pathname.slice(1);
      if (id) return `https://www.youtube-nocookie.com/embed/${id}`;
    }
    if (u.hostname === 'www.youtube.com' || u.hostname === 'youtube.com') {
      if (u.pathname === '/watch') {
        const id = u.searchParams.get('v');
        if (id) return `https://www.youtube-nocookie.com/embed/${id}`;
      }
      const shorts = u.pathname.match(/^\/shorts\/([^/]+)/);
      if (shorts) return `https://www.youtube-nocookie.com/embed/${shorts[1]}`;
      if (u.pathname.startsWith('/embed/')) return url;
    }
  } catch { /* invalid url */ }
  return null;
}

function getYouTubeThumbnail(url: string): string | null {
  try {
    const u = new URL(url);
    let id: string | null = null;
    if (u.hostname === 'youtu.be') id = u.pathname.slice(1);
    else if (u.hostname === 'www.youtube.com' || u.hostname === 'youtube.com') {
      if (u.pathname === '/watch') id = u.searchParams.get('v');
      const shorts = u.pathname.match(/^\/shorts\/([^/]+)/);
      if (shorts) id = shorts[1];
    }
    return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
  } catch { return null; }
}

function isDirectVideo(url: string) {
  return /\.(mp4|webm|ogg)(\?.*)?$/i.test(url);
}

type Props = {
  story: {
    id: number;
    title: string;
    slug: string;
    videoUrl: string;
    views: number;
    createdAt: Date;
    author: { username: string };
    category: { name: string; slug: string };
    _count: { likes: number; comments: number };
  };
};

export default function VideoCard({ story }: Props) {
  const [playing, setPlaying] = useState(false);
  const embedUrl   = getYouTubeEmbedUrl(story.videoUrl);
  const thumbUrl   = getYouTubeThumbnail(story.videoUrl);
  const isDirect   = isDirectVideo(story.videoUrl);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-gray-700 transition group">

      {/* Video area */}
      <div className="relative w-full bg-black" style={{ paddingTop: '56.25%' }}>
        {playing && embedUrl ? (
          <iframe
            src={`${embedUrl}?autoplay=1`}
            title={story.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        ) : playing && isDirect ? (
          <video
            src={story.videoUrl}
            autoPlay
            controls
            className="absolute inset-0 w-full h-full object-contain"
          />
        ) : (
          /* Thumbnail / play button */
          <button
            onClick={() => setPlaying(true)}
            className="absolute inset-0 w-full h-full flex items-center justify-center group/play"
          >
            {thumbUrl ? (
              <img src={thumbUrl} alt={story.title} className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 bg-gray-800" />
            )}
            {/* Dark overlay */}
            <div className="absolute inset-0 bg-black/40 group-hover/play:bg-black/30 transition" />
            {/* Play circle */}
            <div className="relative z-10 flex items-center justify-center w-16 h-16 rounded-full bg-red-600/90 group-hover/play:bg-red-600 group-hover/play:scale-110 transition-all shadow-lg">
              <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </button>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <Link href={`/story/${story.slug}`} className="block">
          <h3 className="text-white font-semibold text-sm leading-snug group-hover:text-red-400 transition line-clamp-2 mb-1">
            {story.title}
          </h3>
        </Link>
        <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap mt-2">
          <Link href={`/user/${story.author.username}`} className="hover:text-gray-300 transition font-medium">
            @{story.author.username}
          </Link>
          <span>·</span>
          <Link href={`/category/${story.category.slug}`} className="hover:text-red-400 transition">
            {story.category.name}
          </Link>
          <span>·</span>
          <span>{story.views.toLocaleString()} views</span>
          <span>·</span>
          <span>❤️ {story._count.likes}</span>
        </div>
        <Link
          href={`/story/${story.slug}`}
          className="mt-3 inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition font-medium"
        >
          Read story →
        </Link>
      </div>
    </div>
  );
}
