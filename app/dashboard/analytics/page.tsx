// app/dashboard/analytics/page.tsx
// Author Pro — advanced analytics for the logged-in writer.
//
// Server component: the Author Pro check and every figure are resolved on the
// server, so a non-subscriber never receives another author's numbers in the
// page payload. Free authors get an upsell panel instead of the data.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  BarChart3,
  Eye,
  Heart,
  MessageSquare,
  Bookmark,
  DollarSign,
  Coins,
  Lock,
} from 'lucide-react';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import { getAuthorProContext } from '@/lib/authorPro';
import { getAuthorAnalytics } from '@/lib/authorAnalytics';

export const metadata = {
  title: 'Author Analytics',
  description: 'Detailed performance data for your stories.',
};

/** Formats a cent amount as a dollar string. */
function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default async function AuthorAnalyticsPage() {
  const { userId, isAuthorPro } = await getAuthorProContext();

  // Not logged in at all — send them to log in rather than showing an upsell
  if (!userId) redirect('/login?next=/dashboard/analytics');

  // ── Free-tier upsell ──────────────────────────────────────────────────────
  // Deliberately returns BEFORE getAuthorAnalytics runs, so we neither compute
  // nor transmit any of the numbers to a non-subscriber.
  if (!isAuthorPro) {
    return (
      <main className="min-h-screen bg-gray-950 text-white">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-24 text-center">
          <div className="inline-flex w-14 h-14 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30 mb-6">
            <Lock className="w-6 h-6 text-amber-400" strokeWidth={1.75} aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-bold mb-3">Analytics is an Author Pro feature</h1>
          <p className="text-gray-400 mb-8">
            See exactly how each story performs — views, reads over time, engagement rate, sales and
            tips — and find out what your readers actually finish.
          </p>
          <Link
            href="/author-pro"
            className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition text-sm"
          >
            See Author Pro plans
          </Link>
        </div>
        <Footer />
      </main>
    );
  }

  const data = await getAuthorAnalytics(userId);

  // Scale the trend chart to its own busiest day. Guard against 0 so a brand-new
  // author with no reads yet divides by 1 instead of producing NaN heights.
  const peak = Math.max(1, ...data.readsByDay.map((d) => d.reads));

  const TILES = [
    { icon: Eye, label: 'Views', value: data.totals.views.toLocaleString() },
    { icon: Heart, label: 'Likes', value: data.totals.likes.toLocaleString() },
    { icon: MessageSquare, label: 'Comments', value: data.totals.comments.toLocaleString() },
    { icon: Bookmark, label: 'Bookmarks', value: data.totals.bookmarks.toLocaleString() },
    { icon: DollarSign, label: 'Sales', value: money(data.totals.salesCents) },
    { icon: Coins, label: 'Tips', value: money(data.totals.tipsCents) },
  ];

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />

      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* ── Heading ─────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-2">
          <span className="w-1 h-6 bg-amber-500 rounded-full" />
          <h1 className="text-2xl font-bold">Author Analytics</h1>
          <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
            Pro
          </span>
        </div>
        <p className="text-sm text-gray-500 mb-8">
          {data.totals.published} published of {data.totals.stories} total{' '}
          {data.totals.stories === 1 ? 'story' : 'stories'}.
        </p>

        {/* ── Totals ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-10">
          {TILES.map((tile) => (
            <div key={tile.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <tile.icon
                className="w-4 h-4 text-gray-600 mb-2"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <p className="text-xl font-bold leading-none">{tile.value}</p>
              <p className="text-xs text-gray-500 mt-1.5">{tile.label}</p>
            </div>
          ))}
        </div>

        {/* ── Reads trend ─────────────────────────────────────────────────── */}
        <section className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-10">
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 className="w-4 h-4 text-amber-400" strokeWidth={1.75} aria-hidden="true" />
            <h2 className="text-sm font-semibold">Reads — last 30 days</h2>
          </div>

          {/* Bars scroll horizontally on narrow screens rather than squashing
              into unreadable slivers or forcing the page to scroll sideways. */}
          <div className="overflow-x-auto">
            <div className="flex items-end gap-1 h-32 min-w-[480px]">
              {data.readsByDay.map((d) => (
                <div
                  key={d.date}
                  className="flex-1 flex flex-col justify-end h-full group relative"
                >
                  <div
                    className="w-full bg-amber-500/40 group-hover:bg-amber-400 rounded-sm transition-colors"
                    // Percentage of the busiest day. min-height keeps zero-read
                    // days as a visible baseline tick rather than nothing at all.
                    style={{ height: `${(d.reads / peak) * 100}%`, minHeight: '2px' }}
                  />
                  {/* Hover tooltip — title attr keeps it accessible without JS */}
                  <span className="sr-only">
                    {d.date}: {d.reads} reads
                  </span>
                  <span
                    aria-hidden="true"
                    title={`${d.date}: ${d.reads} reads`}
                    className="absolute inset-0"
                  />
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-gray-600 mt-3">
            Peak day: {peak} {peak === 1 ? 'read' : 'reads'}
          </p>
        </section>

        {/* ── Per-story table ─────────────────────────────────────────────── */}
        <section>
          <h2 className="text-sm font-semibold mb-4">Every story</h2>

          {data.stories.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-10 text-center">
              <p className="text-sm text-gray-500 mb-4">You haven&apos;t written anything yet.</p>
              <Link
                href="/write"
                className="text-sm text-amber-400 hover:text-amber-300 transition"
              >
                Write your first story →
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-gray-800">
              <table className="w-full text-sm min-w-[640px]">
                <thead className="bg-gray-900">
                  <tr className="text-left text-xs uppercase tracking-wider text-gray-500">
                    <th className="px-4 py-3 font-medium">Story</th>
                    <th className="px-4 py-3 font-medium text-right">Views</th>
                    <th className="px-4 py-3 font-medium text-right">Reads</th>
                    <th className="px-4 py-3 font-medium text-right">Likes</th>
                    <th className="px-4 py-3 font-medium text-right">Comments</th>
                    <th className="px-4 py-3 font-medium text-right">Engagement</th>
                    <th className="px-4 py-3 font-medium text-right">Sales</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800 bg-gray-950">
                  {data.stories.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-900/60 transition">
                      <td className="px-4 py-3">
                        <Link
                          href={`/story/${s.slug}`}
                          className="text-white hover:text-amber-300 transition"
                        >
                          {s.title}
                        </Link>
                        {s.status !== 'PUBLISHED' && (
                          <span className="ml-2 text-[10px] uppercase tracking-wider text-gray-600">
                            {s.status.toLowerCase()}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-400">
                        {s.views.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-400">
                        {s.reads.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-400">
                        {s.likes.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-400">
                        {s.comments.toLocaleString()}
                      </td>
                      {/* Null (no views yet) shows a dash — 0% would imply readers
                          saw it and didn't care, which isn't what happened. */}
                      <td className="px-4 py-3 text-right text-gray-400">
                        {s.engagementRate === null ? '—' : `${s.engagementRate}%`}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-400">
                        {s.salesCents > 0 ? money(s.salesCents) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <Footer />
    </main>
  );
}
