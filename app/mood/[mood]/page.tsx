/**
 * app/mood/[mood]/page.tsx
 *
 * WHAT THIS FILE DOES:
 * A filtered story listing page for a specific horror mood — e.g. /mood/creepy,
 * /mood/paranoid, /mood/gore. Each mood has its own label, emoji, description,
 * and colour scheme defined in the MOOD_META lookup table.
 *
 * MOOD_META PATTERN:
 * Instead of a long if/else chain, we use a Record<string, ...> object as a
 * lookup table. `MOOD_META[moodKey]` gives us all the display data for that mood
 * in one line. If the key doesn't exist in the table we call notFound().
 *
 * URL → DB value:
 * The URL uses lowercase (e.g. "creepy") but the DB stores uppercase ("CREEPY").
 * `mood.toUpperCase()` converts the URL segment before querying.
 *
 * ALL MOODS NAV:
 * Object.entries(MOOD_META) iterates over every mood so we can render the
 * navigation pills. The currently active mood gets its own colour class from
 * MOOD_META; the others get a neutral grey style.
 *
 * HOW TO REUSE:
 * This "lookup table + dynamic route" pattern is great for any taxonomy page
 * (genres, tags, ratings). Define your metadata object, validate the param
 * against it, and query the DB with the validated key.
 */
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import { readingTime } from '@/lib/readingTime';

type Props = { params: Promise<{ mood: string }> };

// Lookup table: mood key → display metadata
// Using a Record<string, ...> means we can do MOOD_META[key] instead of a big if/else chain
const MOOD_META: Record<string, { label: string; emoji: string; description: string; color: string }> = {
  EPIC:          { label: 'Epic',          emoji: '⚔️',  description: 'Grand battles and heroic moments.',                    color: 'text-orange-400 border-orange-500/30 bg-orange-500/10' },
  HEARTWARMING:  { label: 'Heartwarming',  emoji: '💖',  description: 'Stories that touch the soul.',                         color: 'text-pink-400 border-pink-500/30 bg-pink-500/10' },
  MYSTERIOUS:    { label: 'Mysterious',    emoji: '🔮',  description: 'Puzzles, secrets, and intrigue.',                      color: 'text-green-400 border-green-500/30 bg-green-500/10' },
  ACTION:        { label: 'Action',        emoji: '💥',  description: 'Non-stop fights and adrenaline.',                      color: 'text-red-400 border-red-500/30 bg-red-500/10' },
  ROMANTIC:      { label: 'Romantic',      emoji: '🌸',  description: 'Love stories and tender moments.',                     color: 'text-rose-400 border-rose-500/30 bg-rose-500/10' },
  COMEDIC:       { label: 'Comedic',       emoji: '😂',  description: 'Laughs, gags, and fun chaos.',                         color: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10' },
  DRAMATIC:      { label: 'Dramatic',      emoji: '🎭',  description: 'Intense emotions and plot twists.',                    color: 'text-blue-400 border-blue-500/30 bg-blue-500/10' },
  DARK:          { label: 'Dark',          emoji: '🌑',  description: 'Grim themes and moral ambiguity.',                     color: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10' },
};

export default async function MoodPage({ params }: Props) {
  const { mood } = await params;
  // URL uses lowercase ("creepy") but the DB enum is uppercase ("CREEPY")
  const moodKey = mood.toUpperCase();
  // Validate: if this mood doesn't exist in our table, show a 404
  const meta = MOOD_META[moodKey];
  if (!meta) return notFound();

  // Fetch all published stories with this mood, newest first
  // `moodKey as any` is needed because Prisma's generated enum type doesn't
  // automatically accept a plain string — the cast tells TypeScript to trust us
  const stories = await prisma.story.findMany({
    where: { mood: moodKey as any, status: 'PUBLISHED' },
    orderBy: { createdAt: 'desc' },
    include: {
      author:   { select: { username: true } },
      category: { select: { name: true, slug: true } },
      _count:   { select: { likes: true, comments: true } },
    },
  });

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <Header />

      {/* Hero */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="flex items-center gap-3 mb-2">
            <Link href="/" className="text-xs text-gray-500 hover:text-gray-400">Home</Link>
            <span className="text-gray-600">/</span>
            <span className="text-xs text-gray-400">Mood</span>
            <span className="text-gray-600">/</span>
            <span className="text-xs text-gray-300">{meta.label}</span>
          </div>
          <div className="flex items-center gap-4 mt-4">
            <span className="text-5xl">{meta.emoji}</span>
            <div>
              <h1 className="text-3xl font-bold text-white">{meta.label}</h1>
              <p className="text-gray-400 mt-1">{meta.description}</p>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-500">{stories.length} {stories.length === 1 ? 'story' : 'stories'}</div>
        </div>
      </div>

      {/* All moods nav */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-wrap gap-2 mb-8">
          {Object.entries(MOOD_META).map(([key, m]) => (
            <Link
              key={key}
              href={`/mood/${key.toLowerCase()}`}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition ${
                key === moodKey ? m.color : 'text-gray-500 border-gray-700 hover:border-gray-500 hover:text-gray-300'
              }`}
            >
              {m.emoji} {m.label}
            </Link>
          ))}
        </div>

        {stories.length === 0 ? (
          <div className="text-center py-20 text-gray-500">No {meta.label.toLowerCase()} stories yet.</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {stories.map(story => (
              <Link
                key={story.id}
                href={`/story/${story.slug}`}
                className="group bg-gray-800 border border-gray-700 hover:border-green-600/60 rounded-xl overflow-hidden transition-all duration-200 flex flex-col"
              >
                <div className="h-44 overflow-hidden relative">
                  {story.coverImage ? (
                    <img src={story.coverImage} alt={story.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-4xl">{meta.emoji}</div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-800/80 to-transparent" />
                  <span className="absolute bottom-3 left-4 text-xs font-bold uppercase tracking-wider text-green-400">{story.category.name}</span>
                </div>
                <div className="p-4 flex flex-col gap-2 flex-1">
                  <h3 className="text-sm font-semibold text-white group-hover:text-green-300 transition-colors line-clamp-2">{story.title}</h3>
                  {story.excerpt && <p className="text-xs text-gray-500 line-clamp-2">{story.excerpt}</p>}
                  <div className="flex items-center gap-3 mt-auto pt-2 text-xs text-gray-600">
                    <span>{story.author.username}</span>
                    <span>·</span>
                    <span>{readingTime(story.content)}</span>
                    <span className="ml-auto flex items-center gap-1">♥ {story._count.likes}</span>
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
