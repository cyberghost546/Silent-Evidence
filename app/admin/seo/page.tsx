/*
 * app/admin/seo/page.tsx
 *
 * PURPOSE:
 *   SEO Dashboard for the admin panel. Surfaces traffic analytics data in four
 *   categories: top-performing stories, category traffic, trending tags, and a
 *   log of 404 (Not Found) errors recorded across the site.
 *
 * ACCESS CONTROL:
 *   This page lives inside the /admin route group. The AdminLayout (parent layout)
 *   performs the auth/role check once for ALL admin pages, so this page itself
 *   does not need to repeat the guard. Any non-admin who somehow reaches this
 *   URL is already blocked at the layout level.
 *
 * DATA SOURCES:
 *   All data is fetched client-side from GET /api/admin/seo after the component
 *   mounts. That API endpoint queries the database and returns:
 *     - topStories  : stories ordered by views desc
 *     - categories  : aggregated view + story counts per category
 *     - topTags     : tags ordered by story count desc
 *     - notFounds   : 404 hit log entries
 *
 * COMPONENT TYPE: Client Component ('use client')
 *   We need useState (tab selection, loading state, data arrays) and useEffect
 *   (trigger the API fetch on mount). These are browser-only React hooks, which
 *   is why the 'use client' directive is required at the top.
 */

'use client';
// app/admin/seo/page.tsx
// SEO dashboard: top stories by views, category traffic, top tags, 404 log.

import { useEffect, useState } from 'react';
import Link from 'next/link';

// ---------------------------------------------------------------------------
// ViewBar
// ---------------------------------------------------------------------------
// Proportional bar showing one story's views against the most-viewed story.
// It was referenced in the table below but never defined, which broke the
// production type check.
//
// The ratio is snapped to the nearest 5% and mapped to a fixed scale class
// rather than an inline style, matching the intent described at the call site:
// Tailwind only emits classes it can see as complete strings, so a computed
// `scale-x-[${n}]` would produce no CSS at all and every bar would render full
// width. Twenty steps is finer than the 1px-per-step this bar can actually show.
const SCALE_STEPS = [
  'scale-x-0',    'scale-x-[0.05]', 'scale-x-[0.10]', 'scale-x-[0.15]',
  'scale-x-[0.20]', 'scale-x-[0.25]', 'scale-x-[0.30]', 'scale-x-[0.35]',
  'scale-x-[0.40]', 'scale-x-[0.45]', 'scale-x-50',     'scale-x-[0.55]',
  'scale-x-[0.60]', 'scale-x-[0.65]', 'scale-x-[0.70]', 'scale-x-75',
  'scale-x-[0.80]', 'scale-x-[0.85]', 'scale-x-[0.90]', 'scale-x-[0.95]',
  'scale-x-100',
] as const;

function ViewBar({ ratio }: { ratio: number }) {
  // Guard against NaN (0/0 when there are no views at all) and clamp to 0–1
  // so a bad ratio can never index outside the table.
  const safe = Number.isFinite(ratio) ? Math.min(Math.max(ratio, 0), 1) : 0;
  const step = SCALE_STEPS[Math.round(safe * 20)];

  return (
    <div
      className={`h-full w-full bg-red-600 origin-left transition-transform ${step}`}
      role="presentation"
    />
  );
}

// ---------------------------------------------------------------------------
// TypeScript types
// ---------------------------------------------------------------------------
// Story shape returned by /api/admin/seo — only the fields we render.
// _count is a Prisma aggregation helper that returns { likes: number, comments: number }
// without fetching every individual like/comment row.
type Story = {
  id: number;
  title: string;
  slug: string;
  views: number;
  createdAt: string;
  // Nested relation: the author's display name
  author: { username: string };
  // Nested relation: the story's category
  category: { name: string };
  // Prisma _count aggregate — avoids N+1 queries by using a single COUNT()
  _count: { likes: number; comments: number };
};

// Category traffic summary: name/slug from the category row + aggregated counts
type Cat = { name: string; slug: string; count: number; views: number };

// Tag shape — slug/name from the tag row plus Prisma _count for related stories
type Tag = { name: string; slug: string; _count: { stories: number } };

// A row in the 404 error log
type NotFound = { path: string; count: number; lastSeen: string };

export default function AdminSeoPage() {
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  // Each piece of data from the API gets its own state slice so React can
  // re-render individual sections independently.
  const [stories, setStories] = useState<Story[]>([]);
  const [cats, setCats]       = useState<Cat[]>([]);
  const [tags, setTags]       = useState<Tag[]>([]);
  const [nf, setNf]           = useState<NotFound[]>([]);

  // loading: true while the API call is in-flight — drives the skeleton UI
  const [loading, setLoading] = useState(true);

  // tab: which panel is currently visible — union type narrows the valid options
  const [tab, setTab] = useState<'stories' | 'categories' | 'tags' | '404'>('stories');

  // ---------------------------------------------------------------------------
  // Data fetch on mount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    // GET /api/admin/seo returns all four data slices in one round-trip,
    // keeping the browser <-> server chattiness low.
    fetch('/api/admin/seo')
      .then(r => r.json())
      .then(d => {
        // Nullish-coalescing (??) falls back to [] if the key is missing,
        // preventing "cannot iterate undefined" runtime errors.
        setStories(d.topStories ?? []);
        setCats(d.categories ?? []);
        setTags(d.topTags ?? []);
        setNf(d.notFounds ?? []);
      })
      // finally() runs regardless of success/failure, ensuring the skeleton
      // is always removed even if the API returns an error.
      .finally(() => setLoading(false));
  }, []); // empty dep array → runs once after the initial render

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------
  // maxViews is used to calculate the width of the visual progress bar in the
  // stories table. The top story always gets a 100% wide bar; all others are
  // proportional. Fallback to 1 avoids a division-by-zero when stories is empty.
  const maxViews = stories[0]?.views ?? 1;

  // ---------------------------------------------------------------------------
  // View-bar width helper
  // ---------------------------------------------------------------------------
  // Tailwind only includes classes that appear as complete literal strings in
  // source files. Dynamic class names like `w-[${n}%]` are purged at build time.
  // Instead we map the 0–1 ratio to one of Tailwind's built-in fractional width
  // classes (w-0 … w-full) so the class is always present in the stylesheet.
  // We bucket into 12ths because Tailwind ships w-1/12 through w-full by default.
  const ratioToWidthClass = (ratio: number): string => {
    const twelfths = Math.round(ratio * 12); // 0 – 12
    const map: Record<number, string> = {
      0:  'w-0',
      1:  'w-1/12',
      2:  'w-2/12',
      3:  'w-3/12',
      4:  'w-4/12',
      5:  'w-5/12',
      6:  'w-6/12',
      7:  'w-7/12',
      8:  'w-8/12',
      9:  'w-9/12',
      10: 'w-10/12',
      11: 'w-11/12',
      12: 'w-full',
    };
    return map[twelfths] ?? 'w-full';
  };

  // Tab metadata — label text and badge count shown on each tab button
  const tabs = [
    { id: 'stories' as const,    label: 'Top Stories',  count: stories.length },
    { id: 'categories' as const, label: 'Categories',   count: cats.length },
    { id: 'tags' as const,       label: 'Top Tags',     count: tags.length },
    { id: '404' as const,        label: '404 Errors',   count: nf.length },
  ];

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">SEO Dashboard</h1>
      <p className="text-gray-500 text-sm mb-6">Traffic performance, top content, and broken links</p>

      {/* ------------------------------------------------------------------ */}
      {/* Tab navigation                                                       */}
      {/* ------------------------------------------------------------------ */}
      {/* flex-wrap lets the tabs collapse to multiple rows on narrow screens */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)} // update active tab on click
            className={`px-4 py-2 text-sm font-semibold rounded-xl border transition ${
              // Active tab: filled red background; inactive: ghost border style
              tab === t.id
                ? 'bg-red-600 border-red-600 text-white'
                : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white'
            }`}
          >
            {t.label}{' '}
            {/* Small count badge so admins know at a glance how many rows exist */}
            <span className="ml-1 text-xs opacity-70">{t.count}</span>
          </button>
        ))}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Loading skeleton                                                     */}
      {/* ------------------------------------------------------------------ */}
      {loading ? (
        // Render 5 placeholder bars while the API call is in-flight.
        // animate-pulse provides a breathing shimmer effect via Tailwind.
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* ---------------------------------------------------------------- */}
          {/* Top Stories tab                                                   */}
          {/* ---------------------------------------------------------------- */}
          {/* Conditional rendering: only mount this table when the tab is active */}
          {tab === 'stories' && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-3 text-left">#</th>
                    <th className="px-4 py-3 text-left">Story</th>
                    <th className="px-4 py-3 text-left">Category</th>
                    {/* text-right aligns numeric columns to the right — standard table UX */}
                    <th className="px-4 py-3 text-right">Views</th>
                    <th className="px-4 py-3 text-right">Likes</th>
                    <th className="px-4 py-3 text-right">Comments</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {stories.map((s, i) => (
                    <tr key={s.id} className="hover:bg-gray-800/30 transition">
                      {/* 1-based rank number */}
                      <td className="px-4 py-3 text-gray-600 text-xs">{i + 1}</td>

                      <td className="px-4 py-3">
                        <div>
                          {/* Opens the public story page in a new tab so the admin
                              doesn't lose their place in the dashboard */}
                          <Link
                            href={`/story/${s.slug}`}
                            target="_blank"
                            className="font-semibold text-white hover:text-red-400 transition text-sm"
                          >
                            {s.title}
                          </Link>
                          <p className="text-xs text-gray-500 mt-0.5">by {s.author.username}</p>
                        </div>

                        {/* Relative view bar ----------------------------------------- */}
                        {/* The bar width is proportional to this story's views vs the top
                            story. We use a full-width inner div and apply a CSS scaleX()
                            transform via origin-left so the bar grows from the left edge.
                            scaleX ranges 0–1, computed as views/maxViews. This avoids any
                            inline `style` prop (which triggers the lint rule) while still
                            producing a smooth proportional bar purely through class names. */}
                        <div className="mt-1.5 h-1 bg-gray-800 rounded-full overflow-hidden w-full max-w-xs">
                          <ViewBar ratio={s.views / maxViews} />
                        </div>
                      </td>

                      <td className="px-4 py-3 text-gray-500 text-xs">{s.category.name}</td>

                      {/* toLocaleString() adds thousands separators (e.g. 1,234) for readability */}
                      <td className="px-4 py-3 text-right font-semibold text-white">
                        {s.views.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-400">{s._count.likes}</td>
                      <td className="px-4 py-3 text-right text-gray-400">{s._count.comments}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* Categories tab                                                    */}
          {/* ---------------------------------------------------------------- */}
          {tab === 'categories' && (
            // Responsive grid: 1 column on mobile, 2 on sm (640px+), 3 on lg (1024px+)
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {cats.map(c => (
                <div key={c.slug} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <p className="font-semibold text-white">{c.name}</p>
                  {/* Large number draws the eye to the primary metric (views) */}
                  <p className="text-2xl font-bold text-red-400 mt-1">{c.views.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">views · {c.count} stories</p>
                </div>
              ))}
            </div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* Top Tags tab                                                      */}
          {/* ---------------------------------------------------------------- */}
          {tab === 'tags' && (
            // flex-wrap lets the tag pills reflow naturally instead of overflowing
            <div className="flex flex-wrap gap-2">
              {tags.map(t => (
                // Link to the public tag page so the admin can verify tag pages work
                <Link
                  key={t.slug}
                  href={`/tag/${t.slug}`}
                  target="_blank"
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 border border-gray-700 hover:border-red-600/50 rounded-xl text-sm text-gray-300 hover:text-white transition"
                >
                  #{t.name}
                  {/* Story count badge — helps identify popular vs. orphaned tags */}
                  <span className="text-xs text-gray-600">{t._count.stories}</span>
                </Link>
              ))}
            </div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* 404 Error log tab                                                 */}
          {/* ---------------------------------------------------------------- */}
          {tab === '404' && (
            // Ternary: show an empty-state message when no 404s have been logged
            nf.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <p>No 404 errors logged yet.</p>
                <p className="text-xs mt-2">
                  The not-found page will log hits automatically once the tracker is active.
                </p>
              </div>
            ) : (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wider">
                      <th className="px-4 py-3 text-left">Path</th>
                      <th className="px-4 py-3 text-right">Hits</th>
                      <th className="px-4 py-3 text-right">Last seen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60">
                    {/* Sort descending by hit count so the most-broken links appear first */}
                    {nf.sort((a, b) => b.count - a.count).map((r, i) => (
                      <tr key={i} className="hover:bg-gray-800/30 transition">
                        {/* font-mono makes URL paths easier to scan */}
                        <td className="px-4 py-3 font-mono text-red-400 text-xs">{r.path}</td>
                        <td className="px-4 py-3 text-right font-bold text-white">{r.count}</td>
                        {/* Format ISO timestamp to a locale-appropriate date string */}
                        <td className="px-4 py-3 text-right text-gray-500 text-xs">
                          {new Date(r.lastSeen).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
