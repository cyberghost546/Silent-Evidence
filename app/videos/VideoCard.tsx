'use client';
// app/videos/VideoCard.tsx
//
// Renders a single video story in two layouts:
//   FeaturedCard — full-width landscape split (video left, info right) for the hero slot
//   GridCard     — compact portrait card for the 3-column grid
//
// VIDEO RENDERING STRATEGY:
//   Three possible video sources are handled:
//     1. YouTube (youtu.be / youtube.com /watch or /shorts)
//        → converts to a privacy-enhanced youtube-nocookie.com embed iframe
//        → thumbnail is fetched from img.youtube.com/vi/<id>/maxresdefault.jpg
//     2. Direct video file (.mp4, .webm, .ogg)
//        → rendered with a native <video autoPlay controls> element
//     3. Neither → no thumbnail, plain grey background fallback
//
// PLAY-ON-CLICK PATTERN:
//   `playing` state starts false (show thumbnail + play button overlay).
//   Clicking the button sets playing=true, which swaps the thumbnail out for
//   the iframe/video. This avoids embedding iframes on page load (faster, no
//   autoplay blocked errors) and lets YouTube preload only when needed.
//
// EXPORTED DEFAULT:
//   `VideoCard` is a thin router — `featured` prop picks FeaturedCard vs GridCard.

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

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
  } catch {
    /* invalid url */
  }
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
    return id ? `https://img.youtube.com/vi/${id}/maxresdefault.jpg` : null;
  } catch {
    return null;
  }
}

function isDirectVideo(url: string) {
  return /\.(mp4|webm|ogg)(\?.*)?$/i.test(url);
}

type StoryData = {
  id: number;
  title: string;
  slug: string;
  videoUrl: string;
  excerpt: string | null;
  views: number;
  createdAt: Date;
  author: { username: string };
  category: { name: string; slug: string };
  _count: { likes: number; comments: number };
};

function PlayButton({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const dim = size === 'lg' ? 'w-20 h-20' : 'w-14 h-14';
  const icon = size === 'lg' ? 'w-8 h-8' : 'w-6 h-6';
  return (
    <div
      className={`relative z-10 flex items-center justify-center ${dim} rounded-full bg-red-600/90 group-hover/play:bg-red-600 group-hover/play:scale-110 transition-all shadow-2xl ring-4 ring-red-600/30`}
    >
      <svg className={`${icon} text-white ml-1`} fill="currentColor" viewBox="0 0 24 24">
        <path d="M8 5v14l11-7z" />
      </svg>
    </div>
  );
}

// ── Featured card (full-width landscape layout) ──────────────────────────────
function FeaturedCard({ story }: { story: StoryData }) {
  const [playing, setPlaying] = useState(false);
  const embedUrl = getYouTubeEmbedUrl(story.videoUrl);
  const thumbUrl = getYouTubeThumbnail(story.videoUrl);
  const isDirect = isDirectVideo(story.videoUrl);

  return (
    <div className="rounded-2xl overflow-hidden border border-gray-800 hover:border-red-600/40 transition-all duration-300 shadow-lg hover:shadow-red-600/10 group bg-gray-900">
      <div className="grid md:grid-cols-2">
        {/* Video */}
        <div className="relative w-full bg-black aspect-video max-h-90">
          <div className="absolute inset-0">
            {playing && embedUrl ? (
              <iframe
                src={`${embedUrl}?autoplay=1`}
                title={story.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            ) : playing && isDirect ? (
              <video
                src={story.videoUrl}
                autoPlay
                controls
                className="w-full h-full object-contain"
              />
            ) : (
              <button
                type="button"
                onClick={() => setPlaying(true)}
                className="absolute inset-0 w-full h-full flex items-center justify-center group/play"
              >
                {thumbUrl ? (
                  <Image
                    src={thumbUrl}
                    alt={story.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gray-800" />
                )}
                <div className="absolute inset-0 bg-black/50 group-hover/play:bg-black/40 transition" />
                <PlayButton size="lg" />
              </button>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="flex flex-col justify-center p-8 gap-4">
          <Link
            href={`/category/${story.category.slug}`}
            className="text-xs text-red-400 font-bold uppercase tracking-widest hover:text-red-300 transition w-fit"
          >
            {story.category.name}
          </Link>
          <Link href={`/story/${story.slug}`}>
            <h2 className="text-2xl font-extrabold text-white leading-snug hover:text-red-400 transition line-clamp-3">
              {story.title}
            </h2>
          </Link>
          {story.excerpt && (
            <p className="text-gray-400 text-sm leading-relaxed line-clamp-3">{story.excerpt}</p>
          )}
          <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
            <Link
              href={`/user/${story.author.username}`}
              className="hover:text-white transition font-semibold"
            >
              @{story.author.username}
            </Link>
            <span>·</span>
            <span>{story.views.toLocaleString()}</span>
            <span>·</span>
            <span>{story._count.likes}</span>
            <span>·</span>
            <span>{story._count.comments}</span>
          </div>
          <Link
            href={`/story/${story.slug}`}
            className="mt-1 inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition w-fit"
          >
            Read full story →
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Regular grid card ─────────────────────────────────────────────────────────
function GridCard({ story }: { story: StoryData }) {
  const [playing, setPlaying] = useState(false);
  const embedUrl = getYouTubeEmbedUrl(story.videoUrl);
  const thumbUrl = getYouTubeThumbnail(story.videoUrl);
  const isDirect = isDirectVideo(story.videoUrl);
  const date = new Date(story.createdAt).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="bg-gray-900 border border-gray-800 hover:border-red-600/40 rounded-2xl overflow-hidden transition-all duration-300 shadow hover:shadow-red-600/10 hover:-translate-y-0.5 group flex flex-col">
      {/* Thumbnail / player */}
      <div className="relative w-full bg-black aspect-video">
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
          <button
            onClick={() => setPlaying(true)}
            className="absolute inset-0 w-full h-full flex items-center justify-center group/play"
          >
            {thumbUrl ? (
              <Image
                src={thumbUrl}
                alt={story.title}
                fill
                sizes="(max-width: 640px) 100vw, 33vw"
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-gray-800" />
            )}
            {/* Bottom gradient for readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-black/30 group-hover/play:bg-black/20 transition" />
            <PlayButton />
            {/* Category pill */}
            <span className="absolute bottom-3 left-3 text-xs font-semibold text-white bg-black/60 px-2.5 py-1 rounded-full">
              {story.category.name}
            </span>
          </button>
        )}
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col flex-1">
        <Link href={`/story/${story.slug}`}>
          <h3 className="text-white font-bold text-sm leading-snug group-hover:text-red-400 transition line-clamp-2 mb-2">
            {story.title}
          </h3>
        </Link>

        <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
          <Link
            href={`/user/${story.author.username}`}
            className="hover:text-gray-300 transition font-medium"
          >
            @{story.author.username}
          </Link>
          <span>·</span>
          <span>{date}</span>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 text-xs text-gray-600 mt-3 pt-3 border-t border-gray-800">
          <span className="flex items-center gap-1">{story.views.toLocaleString()}</span>
          <span className="flex items-center gap-1">{story._count.likes}</span>
          <span className="flex items-center gap-1">{story._count.comments}</span>
          <Link
            href={`/story/${story.slug}`}
            className="ml-auto text-red-500 hover:text-red-400 font-semibold transition"
          >
            Read →
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────
export default function VideoCard({
  story,
  featured = false,
}: {
  story: StoryData;
  featured?: boolean;
}) {
  return featured ? <FeaturedCard story={story} /> : <GridCard story={story} />;
}
