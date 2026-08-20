// CategoriesShowcase.tsx
// Server component — fetches all categories from the database and renders
// them as a visual grid on the homepage. Each tile shows an icon, the
// category name, and a story count, and links to /category/[slug].
//
// This is an async Server Component — it runs only on the server and sends
// plain HTML to the browser (no client-side JavaScript for this component).
// Data is fetched fresh on every request so story counts are always current.
//
// Icons are matched by category slug (the URL-friendly name).
// Colours cycle through a fixed palette so the grid always looks varied.

import Link from 'next/link';
import { prisma } from '@/lib/prisma';

// A fixed list of Tailwind gradient + border + text colour combinations.
// Categories are assigned a colour by their position in the list
// (index % ACCENTS.length), so the pattern repeats for large category sets.
const ACCENTS = [
  'from-red-900/40 border-red-800/50 text-red-400',
  'from-purple-900/40 border-purple-800/50 text-purple-400',
  'from-blue-900/40 border-blue-800/50 text-blue-400',
  'from-orange-900/40 border-orange-800/50 text-orange-400',
  'from-rose-900/40 border-rose-800/50 text-rose-400',
  'from-pink-900/40 border-pink-800/50 text-pink-400',
  'from-yellow-900/40 border-yellow-800/50 text-yellow-400',
  'from-teal-900/40 border-teal-800/50 text-teal-400',
  'from-indigo-900/40 border-indigo-800/50 text-indigo-400',
  'from-amber-900/40 border-amber-800/50 text-amber-400',
];

// Shown when a category's slug has no entry in ICONS below, so a newly added
// category always renders an icon instead of an empty gap in the tile.
const DEFAULT_ICON = '🕯️';

// A mapping of category slug → emoji icon.
// NOTE: keys are SLUGS (lowercase, hyphenated — as stored in Category.slug),
// not display names. A key like 'Analog Horror' would never match anything.
const ICONS: Record<string, string> = {
  'ghost-stories':      '👻',
  'psychological':      '🧠',
  'supernatural':       '✨',
  'paranormal':         '👁️',
  'slasher-horror':     '🔪',
  'cosmic-horror':      '🌌',
  'body-horror':        '🩸',
  'urban-legends':      '🏙️',
  'true-crime':         '🔍',
  'tech-horror':        '💻',
  'survival-horror':    '🪓',
  'occult-witchcraft':  '🔮',
  'monsters-creatures': '🦇',
  'dark-fantasy':       '🐉',
  'found-footage':      '📹',
  'folk-horror':        '🌾',
  'dark-romance':       '🥀',
  'post-apocalyptic':   '☢️',
  'haunted-places':     '🏚️',
  'sci-fi-horror':      '🛸',

  // Sub-genres not yet seeded in the database. Harmless until a Category row
  // with the matching slug exists — at which point the tile picks up its icon
  // automatically with no code change.
  'analog-horror':            '📼',
  'analog-technology-horror': '🔌',
  'psychological-thriller':   '🌀',
  'haunted-objects':          '🪆',
  'demonic-possession':       '😈',
  'religious-horror':         '✝️',
  'cult-horror':              '🕯️',
  'ritual-horror':            '🗿',
  'sleep-paralysis-horror':   '🛏️',
  'dream-nightmare-horror':   '💤',
  'time-loop-horror':         '⏳',
  'isolation-horror':         '🏝️',
  'arctic-ocean-horror':      '🧊',
  'jungle-horror':            '🌴',
  'pandemic-horror':          '😷',
  'infection-horror':         '🦠',
  'mutation-horror':          '🧬',
  'ai-horror':                '🤖',
  'cyber-horror':             '🖥️',
  'internet-horror':          '🌐',
  'lost-media-horror':        '🎞️',
  'backrooms-liminal-spaces': '🚪',
  'vhs-retro-horror':         '📺',
  'experimental-horror':      '🎭',
  'gore-extreme-horror':      '🥩',
  'torture-horror':           '⛓️',
  'revenge-horror':           '🗡️',
  'home-invasion-horror':     '🏠',
  'stalker-horror':           '🕵️',
  'psychological-breakdown':  '🫥',
  'doppelganger-horror':      '👥',
  'possessed-technology':     '📱',
  'haunted-games':            '🎮',
  'school-horror':            '🏫',
  'childhood-trauma-horror':  '🧸',
};

export default async function CategoriesShowcase() {
  // Fetch all categories alphabetically.
  // _count.stories gives us the total number of stories in each category
  // so we can display it on the tile without a separate query.
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { stories: { where: { status: 'PUBLISHED' } } } } },
  });

  return (
    <section className="bg-gray-900 border-y border-gray-800 py-14">
      <div className="max-w-6xl mx-auto px-4">

        {/* ── Section heading ──────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-8">
          {/* Red accent bar — a visual design element used throughout the site */}
          <span className="w-1 h-6 bg-red-600 rounded-full" />
          <h2 className="text-2xl font-bold text-white">Browse by Category</h2>
          {/* Total category count shown as a muted label next to the heading */}
          <span className="text-xs text-gray-600 ml-1">{categories.length} categories</span>
        </div>

        {/* ── Category grid ─────────────────────────────────────────────────── */}
        {/* Responsive columns: 2 on mobile → 3 on sm → 6 on lg */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {categories.map((cat, i) => {
            // Pick a colour accent by cycling through the ACCENTS array.
            // The modulo (%) wraps back to index 0 once we exceed the array length.
            const accent = ACCENTS[i % ACCENTS.length];
            // Look up the icon for this category's slug, falling back to a
            // neutral one so an unmapped category still renders a full tile.
            const icon = ICONS[cat.slug] ?? DEFAULT_ICON;
            return (
              // Each tile is a Next.js Link so the whole card is clickable.
              // `group` on the Link lets child elements respond to hover state
              // via the `group-hover:` Tailwind prefix.
              <Link
                key={cat.id}
                href={`/category/${cat.slug}`}
                className={`group bg-gradient-to-b ${accent} border rounded-xl p-4 flex flex-col items-center gap-2 text-center hover:scale-105 transition-transform duration-200`}
              >
                {/* Emoji icon — slightly faded at rest, fully visible and scaled up on hover */}
                {icon && (
                  <span className="text-2xl opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all duration-200 inline-block">
                    {icon}
                  </span>
                )}
                {/* Category display name */}
                <p className="text-xs font-semibold text-white leading-tight">{cat.name}</p>
                {/* Story count — pluralises "story" / "stories" correctly */}
                <p className="text-xs text-gray-600">{cat._count.stories} {cat._count.stories === 1 ? 'story' : 'stories'}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
