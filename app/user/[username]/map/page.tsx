// app/user/[username]/map/page.tsx
// An author's publication map — how much they have written, and how it clusters.
//
// ADMIN ONLY. The figures here (view counts, draft counts, per-category output)
// are editorial insight rather than reader-facing content, so the page is gated
// to admins. The gate lives in the page body and runs before any query, because
// middleware only fast-paths /admin/* — this route sits under /user/ and would
// otherwise be reachable by anyone who guessed the URL.

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { BookOpen, FileText, Tags, Eye, Heart } from 'lucide-react';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import StoryGraph from '@/app/components/ui/StoryGraph';
import { getStoryGraph } from '@/lib/storyGraph';
import { prisma } from '@/lib/prisma';
import { getSessionUserId, requireAdmin } from '@/lib/session';
import type { Metadata } from 'next';

type Props = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;

  // Confirm the author exists before naming them in the title. Without this an
  // unknown username still yields "@whoever's Publication Map" — a fabricated
  // title on a page that renders not-found, which is bad for sharing and worse
  // for search engines. Mirrors the same guard in the profile page's metadata.
  const user = await prisma.user.findUnique({
    where: { username },
    select: { username: true },
  });
  if (!user) return { title: 'User Not Found' };

  return {
    title: `@${user.username}'s Publication Map`,
    description: `Every story @${user.username} has published, mapped by category.`,
  };
}

export default async function StoryMapPage({ params }: Props) {
  const { username } = await params;

  // ── Admin only ────────────────────────────────────────────────────────────
  // Checked BEFORE any data is loaded, so a non-admin never causes the author's
  // figures to be queried, let alone sent to their browser.
  //
  // Two different outcomes on purpose:
  //   - logged out        → send them to log in and come back. An admin
  //                         following a bookmark should get a login prompt, not
  //                         a dead end.
  //   - logged in, not an admin → 404. Redirecting home would confirm the page
  //                         exists; a not-found does not disclose it at all.
  const sessionUserId = await getSessionUserId();
  if (!sessionUserId) redirect(`/login?from=/user/${username}/map`);

  const admin = await requireAdmin();
  if (!admin) return notFound();

  const graph = await getStoryGraph(username);
  if (!graph) return notFound();

  const { totals } = graph;

  // Drafts are shown only when there are any — a permanent "0 drafts" tile is
  // noise, and for an author viewing someone else's map it is meaningless.
  const TILES = [
    { icon: BookOpen, label: 'Published', value: totals.published.toLocaleString() },
    ...(totals.drafts > 0
      ? [{ icon: FileText, label: 'Drafts', value: totals.drafts.toLocaleString() }]
      : []),
    { icon: Tags, label: 'Categories', value: totals.categories.toLocaleString() },
    { icon: Eye, label: 'Views', value: totals.views.toLocaleString() },
    { icon: Heart, label: 'Likes', value: totals.likes.toLocaleString() },
  ];

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />

      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-1">
          <span className="w-1 h-6 bg-red-600 rounded-full" />
          <h1 className="text-2xl font-bold">Publication Map</h1>
        </div>
        <p className="text-sm text-gray-500 mb-8">
          Everything{' '}
          <Link
            href={`/user/${graph.username}`}
            className="text-gray-300 hover:text-white underline underline-offset-2"
          >
            @{graph.username}
          </Link>{' '}
          has published, grouped by category. Bigger nodes have more views.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
          {TILES.map((t) => (
            <div key={t.label} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
              <t.icon
                className="w-4 h-4 text-gray-600 mb-2"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <p className="text-2xl font-extrabold leading-none">{t.value}</p>
              <p className="text-xs text-gray-500 mt-1.5">{t.label}</p>
            </div>
          ))}
        </div>

        <StoryGraph data={graph} />

        <p className="text-xs text-gray-700 mt-4">
          Click any node to open it. Published stories only — drafts are counted above but never
          plotted, so the map matches what readers can actually see.
        </p>
      </div>

      <Footer />
    </main>
  );
}
