// app/components/ui/CommunityStats.tsx
// Slim stats strip shown on the homepage below the header.
// Displays total published stories, total members, total categories,
// and (if > 0) how many stories were published in the last 24 hours.
// This is a server component — all four counts come from the DB via Promise.all
// so they run in parallel rather than sequentially.
// To add a new stat, add another prisma count to the Promise.all and a <StatCell /> below.

import { prisma } from '@/lib/prisma';

// StatCell — renders one icon + number + label tile in the strip.
// Reusable: pass any emoji as icon, any number or string as value.
function StatCell({ icon, value, label }: { icon: string; value: string | number; label: string }) {
  return (
    <div className="flex items-center gap-3 px-6 py-4 min-w-0">
      {/* Large icon on the left */}
      <span className="text-2xl shrink-0">{icon}</span>

      {/* Text block on the right */}
      <div className="min-w-0">
        <p className="text-lg font-black text-white leading-none tabular-nums">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5 leading-none truncate">{label}</p>
      </div>
    </div>
  );
}

// fmt — formats a number with locale-appropriate commas, e.g. 1200 → "1,200"
function fmt(n: number) {
  return n.toLocaleString('en-US');
}

export default async function CommunityStats() {
  // Run all four counts in parallel — Promise.all fires all queries simultaneously
  // so total wait time = slowest query, not sum of all queries.
  // Each query falls back to 0 via .catch() so a DB error never crashes the page.
  const [storyCount, memberCount, categoryCount, todayCount] = await Promise.all([
    prisma.story.count({ where: { status: 'PUBLISHED' } }).catch(() => 0),
    prisma.user.count().catch(() => 0),
    prisma.category.count().catch(() => 0),
    prisma.story
      .count({
        where: {
          status: 'PUBLISHED',
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      })
      .catch(() => 0),
  ]);

  return (
    <div className="bg-gray-900 border-b border-gray-800 border-t border-t-red-900/40">
      <div className="max-w-6xl mx-auto">
        {/* Horizontal row that can scroll on smaller screens. */}
        <div className="flex items-stretch overflow-x-auto divide-x divide-gray-800 scrollbar-none">
          {/* Total published stories */}
          <StatCell icon="ðŸ“–" value={fmt(storyCount)} label="Stories published" />

          {/* Total users */}
          <StatCell icon="ðŸ‘¥" value={fmt(memberCount)} label="Community members" />

          {/* Total categories */}
          <StatCell icon="ðŸ—‚ï¸" value={fmt(categoryCount)} label="Horror categories" />

          {/* Only show the "today" stat if there is at least one new story. */}
          {todayCount > 0 && (
            <StatCell
              icon="ðŸ”´"
              value={`+${fmt(todayCount)} today`}
              label="New stories in 24 hrs"
            />
          )}

          {/* Extra right-side message only visible on larger screens. */}
          <div className="hidden lg:flex items-center justify-end flex-1 px-6 py-4">
            <p className="text-xs text-gray-600 italic">Real stories. Real fear. Share yours.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
