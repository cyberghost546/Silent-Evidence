/**
 * app/mood/[mood]/page.tsx
 *
 * WHAT THIS FILE DOES:
 * A dynamic route that renders a filtered story listing for a specific horror
 * "mood" — e.g. /mood/epic, /mood/dark, /mood/romantic. Each mood has its own
 * label, description, and Tailwind colour class defined in MOOD_META, plus an
 * icon from the shared lib/moodIcons map.
 *
 * DYNAMIC ROUTE:
 * The folder name `[mood]` tells Next.js this segment is dynamic. At request
 * time, Next.js resolves the actual slug (e.g. "dark") and passes it via the
 * `params` prop as a Promise (Next.js 14 async params pattern).
 *
 * MOOD_META LOOKUP TABLE PATTERN:
 * Instead of a long if/else or switch chain, we use a `Record<string, {...}>`
 * object as a constant lookup table. `MOOD_META[moodKey]` returns the display
 * data in a single expression. If the key doesn't exist → `undefined` → 404.
 * This is easy to extend: just add a new entry to MOOD_META and the navigation
 * pills, empty states, and colour classes all update automatically.
 *
 * URL → DB ENUM NORMALISATION:
 * URLs are lowercase ("dark") but the Prisma enum and DB store uppercase ("DARK").
 * `mood.toUpperCase()` handles the conversion before querying, avoiding a mismatch.
 *
 * DATA FETCHING:
 * This is an async Server Component — it queries Prisma directly on the server.
 * No API route is needed; the DB call happens during the server render.
 *
 * ALL-MOODS NAVIGATION:
 * `Object.entries(MOOD_META)` iterates every key/value pair so we can render
 * pill links for every mood without manually listing them twice.
 *
 * HOW TO ADD A NEW MOOD:
 * 1. Add a new entry to MOOD_META below.
 * 2. Add the matching value to the Mood enum in schema.prisma.
 * 3. Run `prisma migrate dev`.
 * That's it — the nav pills, story grid, and hero all update automatically.
 */

import { notFound } from 'next/navigation';
import Link         from 'next/link';
import { prisma }   from '@/lib/prisma';
import Header       from '@/app/components/ui/Header';
import Footer       from '@/app/components/ui/Footer';
import { readingTime } from '@/lib/readingTime';
import { createElement } from 'react';
import { moodIcon } from '@/lib/moodIcons';

// ── TypeScript: dynamic route params ──────────────────────────────────────────
// In Next.js 14, params are a Promise — we must `await` them inside the component.
type Props = { params: Promise<{ mood: string }> };

// ── Mood metadata lookup table ─────────────────────────────────────────────────
// Keys match the Prisma enum values exactly (uppercase).
// The `color` string bundles three Tailwind classes:
//   1. text-*      → pill label colour
//   2. border-*    → pill border colour
//   3. bg-*        → pill background tint
// All three are applied together to the active pill.
const MOOD_META: Record<string, { label: string; description: string; color: string }> = {
  EPIC:         { label: 'Epic',         description: 'Grand battles and heroic moments.',   color: 'text-orange-400 border-orange-500/30 bg-orange-500/10' },
  HEARTWARMING: { label: 'Heartwarming', description: 'Stories that touch the soul.',        color: 'text-pink-400 border-pink-500/30 bg-pink-500/10' },
  MYSTERIOUS:   { label: 'Mysterious',   description: 'Puzzles, secrets, and intrigue.',     color: 'text-green-400 border-green-500/30 bg-green-500/10' },
  ACTION:       { label: 'Action',       description: 'Non-stop fights and adrenaline.',     color: 'text-red-400 border-red-500/30 bg-red-500/10' },
  ROMANTIC:     { label: 'Romantic',     description: 'Love stories and tender moments.',    color: 'text-rose-400 border-rose-500/30 bg-rose-500/10' },
  COMEDIC:      { label: 'Comedic',      description: 'Laughs, gags, and fun chaos.',        color: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10' },
  DRAMATIC:     { label: 'Dramatic',     description: 'Intense emotions and plot twists.',   color: 'text-blue-400 border-blue-500/30 bg-blue-500/10' },
  DARK:         { label: 'Dark',         description: 'Grim themes and moral ambiguity.',    color: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10' },
};

// ── Page component ─────────────────────────────────────────────────────────────
// `async` because we need to await params and run DB queries server-side.
export default async function MoodPage({ params }: Props) {
  // Await the params Promise — Next.js 14 requirement for dynamic routes
  const { mood } = await params;

  // Normalise the URL segment to uppercase to match the Prisma Mood enum.
  // e.g. "dark" → "DARK"
  const moodKey = mood.toUpperCase();

  // Validate against our lookup table.
  // If moodKey isn't defined (e.g. /mood/nonexistent), meta is undefined
  // and we trigger a 404 rather than crashing or showing an empty page.
  const meta = MOOD_META[moodKey];
  if (!meta) return notFound();


  // ── Prisma query ──────────────────────────────────────────────────────────
  // Fetch all PUBLISHED stories with this mood, newest-first.
  // `moodKey as any` is a pragmatic cast: Prisma's generated Mood enum type
  // doesn't accept a plain string even though the runtime value is valid.
  // The alternatives (importing the Prisma Mood enum) add more complexity
  // than the cast is worth.
  // `include` joins related tables in a single query rather than N+1 selects:
  //   - author.username for the "by @username" line
  //   - category.name/slug for the category badge
  //   - _count.likes/_count.comments for the engagement numbers
  const stories = await prisma.story.findMany({
    where:    { mood: moodKey as any, status: 'PUBLISHED' },
    orderBy:  { createdAt: 'desc' },
    include: {
      author:   { select: { username: true } },
      category: { select: { name: true, slug: true } },
      _count:   { select: { likes: true, comments: true } },
    },
  });

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <Header />

      {/* ── Hero / breadcrumb section ──────────────────────────────────────── */}
      {/* bg-gray-800 + border-b creates a subtle raised panel effect */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-6xl mx-auto px-4 py-12">

          {/* Breadcrumb trail: Home → Mood → {label} */}
          <div className="flex items-center gap-3 mb-2">
            <Link href="/" className="text-xs text-gray-500 hover:text-gray-400">Home</Link>
            <span className="text-gray-600">/</span>
            <span className="text-xs text-gray-400">Mood</span>
            <span className="text-gray-600">/</span>
            {/* Current mood label — no link, it's where we are */}
            <span className="text-xs text-gray-300">{meta.label}</span>
          </div>

          {/* Icon + heading + description */}
          <div className="flex items-center gap-4 mt-4">
            {/* Large icon acts as the page icon for this mood */}
            {createElement(moodIcon(moodKey), {
              className: "w-12 h-12 shrink-0 text-gray-400",
              strokeWidth: 1.25,
              "aria-hidden": "true",
            })}
            <div>
              <h1 className="text-3xl font-bold text-white">{meta.label}</h1>
              <p className="text-gray-400 mt-1">{meta.description}</p>
            </div>
          </div>

          {/* Story count — plural-aware (singular "story" vs "stories") */}
          <div className="mt-4 text-sm text-gray-500">
            {stories.length} {stories.length === 1 ? 'story' : 'stories'}
          </div>
        </div>
      </div>

      {/* ── All moods navigation + story grid ──────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* ── All-moods pill navigation ────────────────────────────────────── */}
        {/*
          Object.entries(MOOD_META) gives [[key, meta], ...] pairs.
          We map over them to render a pill link for every defined mood.
          The active mood (key === moodKey) gets its own colour from meta.color;
          inactive moods get a neutral gray style with hover states.
          The href lowercases the key again to match the URL convention.
        */}
        <div className="flex flex-wrap gap-2 mb-8">
          {Object.entries(MOOD_META).map(([key, m]) => (
            <Link
              key={key}
              href={`/mood/${key.toLowerCase()}`}
              // Conditional class: active pill uses theme colour, others use neutral gray
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition ${
                key === moodKey
                  ? m.color  // active: coloured pill from lookup table
                  : 'text-gray-500 border-gray-700 hover:border-gray-500 hover:text-gray-300'
              }`}
            >
              {createElement(moodIcon(key), { className: "w-3.5 h-3.5", strokeWidth: 1.75, "aria-hidden": "true" })}
              {m.label}
            </Link>
          ))}
        </div>

        {/* ── Conditional render: empty state OR story grid ────────────────── */}
        {stories.length === 0 ? (
          // Empty state — no stories match this mood yet
          <div className="text-center py-20 text-gray-500">
            No {meta.label.toLowerCase()} stories yet.
          </div>
        ) : (
          // Responsive grid:
          //   mobile (default): 1 column
          //   sm (≥640px):      2 columns
          //   lg (≥1024px):     3 columns
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {stories.map(story => (
              // Each card is a Link — the whole card is clickable
              // group class enables child hover effects (scale, colour) keyed off the parent hover
              <Link
                key={story.id}
                href={`/story/${story.slug}`}
                className="group bg-gray-800 border border-gray-700 hover:border-green-600/60 rounded-xl overflow-hidden transition-all duration-200 flex flex-col"
              >
                {/* ── Cover image area (fixed height) ───────────────────────── */}
                <div className="h-44 overflow-hidden relative">
                  {story.coverImage ? (
                    // group-hover:scale-105 creates a subtle zoom on the image when the card is hovered.
                    // transition-transform duration-500 makes it smooth.
                    <img
                      src={story.coverImage}
                      alt={story.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    // Fallback: gradient placeholder with the mood's icon centred
                    <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                      {createElement(moodIcon(moodKey), {
                        className: "w-10 h-10 text-gray-600",
                        strokeWidth: 1.25,
                        "aria-hidden": "true",
                      })}
                    </div>
                  )}

                  {/* Dark gradient overlay so the category badge text is legible */}
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-800/80 to-transparent" />

                  {/* Category badge — absolute positioned at the bottom-left of the image */}
                  <span className="absolute bottom-3 left-4 text-xs font-bold uppercase tracking-wider text-green-400">
                    {story.category.name}
                  </span>
                </div>

                {/* ── Card body ─────────────────────────────────────────────── */}
                {/* flex flex-col gap-2 flex-1 stretches the body to fill the card height */}
                <div className="p-4 flex flex-col gap-2 flex-1">

                  {/* Story title — group-hover:text-green-300 uses parent hover state */}
                  {/* line-clamp-2 caps the title at 2 lines, preventing layout variation */}
                  <h3 className="text-sm font-semibold text-white group-hover:text-green-300 transition-colors line-clamp-2">
                    {story.title}
                  </h3>

                  {/* Optional excerpt — only rendered when present */}
                  {story.excerpt && (
                    <p className="text-xs text-gray-500 line-clamp-2">{story.excerpt}</p>
                  )}

                  {/* ── Meta row (author, reading time, likes) ─────────────── */}
                  {/* mt-auto pushes this to the bottom of the card for alignment */}
                  <div className="flex items-center gap-3 mt-auto pt-2 text-xs text-gray-600">
                    <span>{story.author.username}</span>
                    <span>·</span>
                    {/* readingTime() calculates estimated reading time from raw content string */}
                    <span>{readingTime(story.content)}</span>
                    {/* ml-auto pushes the like count to the far right */}
                    <span className="ml-auto flex items-center gap-1">{story._count.likes}</span>
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
