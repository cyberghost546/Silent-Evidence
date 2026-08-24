// app/components/ui/ReadNext.tsx
// The single "read this next" card shown when a reader finishes a story.
//
// One story, one link, one reason. It sits above the recommendation grids
// because its whole job is to be decided-upon before the reader reaches them —
// a decisive suggestion converts far better than a wall of thumbnails, and the
// grids remain underneath for people who genuinely want to browse.
//
// The label is driven by why the story was picked, so the card always tells the
// truth about itself: "next in this series" is a much stronger promise than
// "popular right now", and blurring the two would train readers to ignore it.

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, BookOpen, Layers, RotateCcw, Flame } from 'lucide-react';
import type { NextStory } from '@/lib/nextStory';

const REASON_META = {
  series: {
    icon: Layers,
    label: 'Next in this series',
    accent: 'text-purple-300',
    border: 'border-purple-500/30',
    glow: 'from-purple-950/40',
  },
  resume: {
    icon: RotateCcw,
    label: 'Pick up where you left off',
    accent: 'text-emerald-300',
    border: 'border-emerald-500/30',
    glow: 'from-emerald-950/40',
  },
  similar: {
    icon: BookOpen,
    label: 'Because of what you read',
    accent: 'text-red-300',
    border: 'border-red-500/30',
    glow: 'from-red-950/40',
  },
  trending: {
    icon: Flame,
    label: 'Popular right now',
    accent: 'text-orange-300',
    border: 'border-orange-500/30',
    glow: 'from-orange-950/40',
  },
} as const;

export default function ReadNext({ story }: { story: NextStory }) {
  const meta = REASON_META[story.reason];

  return (
    <section className="mt-10" aria-labelledby="read-next-heading">
      <div className="flex items-center gap-2 mb-3">
        <meta.icon className={`w-4 h-4 ${meta.accent}`} strokeWidth={1.75} aria-hidden="true" />
        <h2 id="read-next-heading" className={`text-xs font-bold uppercase tracking-widest ${meta.accent}`}>
          {meta.label}
        </h2>
      </div>

      <Link
        href={`/story/${story.slug}`}
        className={`group block rounded-2xl border ${meta.border} bg-gradient-to-br ${meta.glow} to-gray-950 overflow-hidden hover:border-opacity-80 transition`}
      >
        <div className="flex flex-col sm:flex-row">
          {story.coverImage && (
            <div className="relative w-full sm:w-48 h-40 sm:h-auto shrink-0 bg-gray-900">
              <Image
                src={story.coverImage}
                alt=""
                fill
                sizes="(max-width: 640px) 100vw, 192px"
                className="object-cover opacity-80 group-hover:opacity-100 transition-opacity"
              />
            </div>
          )}

          <div className="flex-1 min-w-0 p-5 flex flex-col justify-center">
            <h3 className="text-xl font-bold text-white leading-tight group-hover:text-gray-200 transition">
              {story.title}
            </h3>

            {(story.authorUsername || story.categoryName) && (
              <p className="text-xs text-gray-500 mt-1.5">
                {story.authorUsername && <>by @{story.authorUsername}</>}
                {story.authorUsername && story.categoryName && ' · '}
                {story.categoryName}
              </p>
            )}

            {story.excerpt && (
              <p className="text-sm text-gray-400 mt-2.5 line-clamp-2">{story.excerpt}</p>
            )}

            {/* Progress bar, resume only — showing someone they are 60% through
                is a far stronger nudge than the title alone. */}
            {story.reason === 'resume' && story.progress !== undefined && (
              <div className="mt-3">
                <div
                  className="w-full h-1 bg-gray-800 rounded-full overflow-hidden"
                  role="progressbar"
                  aria-valuenow={story.progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${story.progress}% read`}
                >
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${story.progress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-600 mt-1.5">{story.progress}% read</p>
              </div>
            )}

            <span className={`inline-flex items-center gap-1.5 text-sm font-semibold mt-4 ${meta.accent}`}>
              {story.reason === 'resume' ? 'Continue reading' : 'Read it now'}
              <ArrowRight
                className="w-4 h-4 group-hover:translate-x-0.5 transition-transform"
                strokeWidth={2}
                aria-hidden="true"
              />
            </span>
          </div>
        </div>
      </Link>
    </section>
  );
}
