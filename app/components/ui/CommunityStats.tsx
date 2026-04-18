// This file builds the slim "community stats" strip on the homepage.
// It runs on the server because all of the numbers come from the database.

import { prisma } from '@/lib/prisma';

// This small helper component renders one stat box.
// Each box has an icon, a value, and a label.
function StatCell({
  icon,
  value,
  label,
}: {
  icon: string;
  value: string | number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 px-6 py-4 min-w-0">
      {/* Large icon on the left */}
      <span className="text-2xl shrink-0">{icon}</span>

      {/* Text block on the right */}
      <div className="min-w-0">
        <p className="text-lg font-black text-white leading-none tabular-nums">
          {value}
        </p>
        <p className="text-xs text-gray-500 mt-0.5 leading-none truncate">
          {label}
        </p>
      </div>
    </div>
  );
}

// This helper formats numbers with commas.
// Example: 1200 becomes "1,200".
function fmt(n: number) {
  return n.toLocaleString('en-US');
}

// Main stats-strip component.
export default async function CommunityStats() {
  // Run all count queries at the same time for better performance.
  const [storyCount, memberCount, categoryCount, todayCount] = await Promise.all([
    // Count all published stories.
    prisma.story.count({ where: { status: 'PUBLISHED' } }).catch(() => 0),

    // Count all registered users.
    prisma.user.count().catch(() => 0),

    // Count all categories.
    prisma.category.count().catch(() => 0),

    // Count stories created in the last 24 hours.
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
          <StatCell
            icon="ðŸ—‚ï¸"
            value={fmt(categoryCount)}
            label="Horror categories"
          />

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
            <p className="text-xs text-gray-600 italic">
              Real stories. Real fear. Share yours.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
