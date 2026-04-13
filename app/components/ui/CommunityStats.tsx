// app/components/ui/CommunityStats.tsx
// A slim stats strip shown on the homepage below the header.
// Fetches real numbers from the database so they reflect actual site activity.
// Server component — no client JavaScript needed.

import { prisma } from '@/lib/prisma';

// A single stat cell — icon, number, label
function StatCell({ icon, value, label }: { icon: string; value: string | number; label: string }) {
  return (
    <div className="flex items-center gap-3 px-6 py-4 min-w-0">
      <span className="text-2xl shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-lg font-black text-white leading-none tabular-nums">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5 leading-none truncate">{label}</p>
      </div>
    </div>
  );
}

// Format a number with commas (e.g. 1200 → "1,200")
function fmt(n: number) {
  return n.toLocaleString('en-US');
}

export default async function CommunityStats() {
  // Fetch all stats in parallel so the page doesn't wait for each one sequentially
  const [storyCount, memberCount, categoryCount, todayCount] = await Promise.all([
    // Total published stories
    prisma.story.count({ where: { status: 'PUBLISHED' } }).catch(() => 0),
    // Total registered members
    prisma.user.count().catch(() => 0),
    // Total categories
    prisma.category.count().catch(() => 0),
    // Stories published in the last 24 hours
    prisma.story.count({
      where: {
        status:    'PUBLISHED',
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }).catch(() => 0),
  ]);

  return (
    // Thin bar pinned below the header — dark bg with a subtle red top border
    <div className="bg-gray-900 border-b border-gray-800 border-t border-t-red-900/40">
      <div className="max-w-6xl mx-auto">
        {/* Scrollable on mobile so all stats fit without wrapping */}
        <div className="flex items-stretch overflow-x-auto divide-x divide-gray-800 scrollbar-none">

          <StatCell icon="📖" value={fmt(storyCount)}   label="Stories published" />
          <StatCell icon="👥" value={fmt(memberCount)}  label="Community members" />
          <StatCell icon="🗂️" value={fmt(categoryCount)} label="Horror categories" />

          {/* "New today" — only show if at least 1 story was posted in the last 24h */}
          {todayCount > 0 && (
            <StatCell
              icon="🔴"
              value={`+${fmt(todayCount)} today`}
              label="New stories in 24 hrs"
            />
          )}

          {/* Right side — tagline that fills remaining space on desktop */}
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
