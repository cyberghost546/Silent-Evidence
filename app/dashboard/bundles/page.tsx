// app/dashboard/bundles/page.tsx
// Author Pro — build and manage your own story bundles.
//
// Bundles were previously creatable only by admins through /api/admin/bundles,
// which produced site-wide bundles owned by nobody. This page creates
// author-owned bundles (StoryBundle.authorId), and an author may only ever
// include their own stories.
//
// Server component: the Author Pro check and the author's story list are
// resolved here, so a non-subscriber receives an upsell rather than the tool.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Package, Lock } from 'lucide-react';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import { prisma } from '@/lib/prisma';
import { getAuthorProContext } from '@/lib/authorPro';
import BundleManager from './BundleManager';

export const metadata = {
  title: 'Your Bundles',
  description: 'Package your stories together and sell them as a collection.',
};

export default async function AuthorBundlesPage() {
  const { userId, isAuthorPro } = await getAuthorProContext();

  if (!userId) redirect('/login?next=/dashboard/bundles');

  // ── Free-tier upsell ──────────────────────────────────────────────────────
  // Returns before any bundle or story data is loaded.
  if (!isAuthorPro) {
    return (
      <main className="min-h-screen bg-gray-950 text-white">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-24 text-center">
          <div className="inline-flex w-14 h-14 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30 mb-6">
            <Lock className="w-6 h-6 text-amber-400" strokeWidth={1.75} aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-bold mb-3">Bundles are an Author Pro feature</h1>
          <p className="text-gray-400 mb-8">
            Package several of your stories into one collection and sell it at a single price —
            readers who buy get permanent access to all of them.
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

  // The author's own stories, for the picker. Archived stories are excluded —
  // selling a collection that includes work the author has pulled from the site
  // would leave buyers with a dead link.
  const [stories, bundles] = await Promise.all([
    prisma.story.findMany({
      where: { authorId: userId, status: { in: ['PUBLISHED', 'DRAFT'] } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, status: true },
    }),
    prisma.storyBundle.findMany({
      where: { authorId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: { include: { story: { select: { id: true, title: true, slug: true } } } },
        _count: { select: { purchases: true } },
      },
    }),
  ]);

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />

      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-2">
          <span className="w-1 h-6 bg-amber-500 rounded-full" />
          <h1 className="text-2xl font-bold">Your Bundles</h1>
          <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
            Pro
          </span>
        </div>
        <p className="text-sm text-gray-500 mb-8 flex items-center gap-1.5">
          <Package className="w-3.5 h-3.5" strokeWidth={1.75} aria-hidden="true" />
          Group your stories into a collection and sell them at one price.
        </p>

        <BundleManager
          stories={stories}
          bundles={bundles.map((b) => ({
            id: b.id,
            title: b.title,
            slug: b.slug,
            price: b.price,
            active: b.active,
            items: b.items.map((i) => ({ story: i.story })),
            _count: b._count,
          }))}
        />
      </div>

      <Footer />
    </main>
  );
}
