// =============================================================================
// app/bundles/page.tsx
// =============================================================================
//
// PURPOSE:
//   The bundles listing page at /bundles. Displays every active story bundle as
//   a card in a responsive grid. Each card links to the bundle's detail page.
//
// ACCESS:
//   Public — no authentication required to browse bundles.
//
// DATA FETCHED:
//   - prisma.storyBundle: all active bundles, ordered newest-first.
//     Each bundle includes up to 3 story covers (for the collage thumbnail),
//     total story count, and total purchase count.
//
// SERVER COMPONENT:
//   No 'use client' — this runs entirely on the server. Prisma queries are
//   made directly (no API round-trip needed). The rendered HTML is sent to
//   the browser with zero client JavaScript for this component.
// =============================================================================

import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '@/lib/prisma';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import { Package, BookOpen, Users } from 'lucide-react';

// Static metadata — Next.js reads this and injects it into the <head> tag.
// Unlike generateMetadata(), this plain object is fine when the title doesn't
// depend on any runtime data.
export const metadata = { title: 'Story Bundles — Silent Evidence' };

export default async function BundlesPage() {
  // ── DB query ──────────────────────────────────────────────────────────────
  // Fetch all bundles where active = true (drafts and archived bundles are hidden).
  // orderBy: { createdAt: 'desc' } puts newest bundles first.
  //
  // `include` performs SQL JOINs:
  //   items (take: 3) — the first 3 bundle items to build the cover collage.
  //     story.coverImage and title are the only fields needed for the thumbnail.
  //   _count — Prisma aggregation: counts items (total story count) and
  //     purchases (social proof number) without loading every row.
  const bundles = await prisma.storyBundle.findMany({
    where: { active: true },
    orderBy: { createdAt: 'desc' },
    include: {
      items: {
        take: 3, // Only load 3 items max — we just need covers for the collage
        include: { story: { select: { coverImage: true, title: true } } },
      },
      _count: { select: { items: true, purchases: true } },
    },
  });

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <Header />

      {/* ── Hero section ─────────────────────────────────────────────────── */}
      {/* Dark background with a faint red radial glow for horror atmosphere */}
      <div className="relative bg-gray-950 border-b border-gray-800 py-14">
        {/* Decorative radial gradient — Tailwind arbitrary value with brackets */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(220,38,38,0.08)_0%,_transparent_60%)]" />
        <div className="max-w-4xl mx-auto px-4 relative text-center">
          {/* Small eyebrow text above the main heading */}
          <p className="text-xs font-bold uppercase tracking-widest text-red-500 mb-3">
            Curated Collections
          </p>
          <h1 className="text-4xl font-black text-white mb-3">Story Bundles</h1>
          <p className="text-gray-400 max-w-lg mx-auto">
            Hand-picked collections of the finest horror stories. Buy a bundle and get everything
            inside.
          </p>
        </div>
      </div>

      {/* ── Bundle grid ──────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 py-12">
        {bundles.length === 0 ? (
          // ── Empty state ────────────────────────────────────────────────
          // Shown when no active bundles exist yet. The Package icon is from
          // the Lucide icon library — just a visual hint for the empty state.
          <div className="text-center py-24 text-gray-600">
            <Package className="w-10 h-10 mx-auto mb-3 text-gray-600" />
            <p>No bundles available yet.</p>
          </div>
        ) : (
          // ── Responsive grid ────────────────────────────────────────────
          // sm:grid-cols-2   → 2 columns on small screens (≥640px)
          // lg:grid-cols-3   → 3 columns on large screens (≥1024px)
          // On mobile (<640px) the grid collapses to a single column by default.
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {bundles.map((bundle) => (
              // The entire card is a <Link> so clicking anywhere navigates.
              // group class enables group-hover:* utilities on children.
              <Link
                key={bundle.id}
                href={`/bundle/${bundle.slug}`}
                className="group bg-gray-800 border border-gray-700 hover:border-red-600/50 rounded-2xl overflow-hidden transition-all"
              >
                {/* ── Cover image area ──────────────────────────────────── */}
                {/* Fixed height of 160px with overflow-hidden clips tall images */}
                <div className="h-40 relative overflow-hidden bg-gray-900">
                  {bundle.coverImage ? (
                    // If the bundle has a dedicated cover image, use it.
                    // group-hover:scale-105 is a Ken Burns zoom effect on hover.
                    <Image
                      src={bundle.coverImage}
                      alt={bundle.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    // Fallback: a collage of up to 3 story cover images side-by-side.
                    // Each item takes flex-1 width, so 3 items each get ~33% width.
                    <div className="flex h-full">
                      {bundle.items.slice(0, 3).map((item, i) => (
                        <div key={i} className="relative flex-1 overflow-hidden">
                          {item.story.coverImage ? (
                            <Image
                              src={item.story.coverImage}
                              alt=""
                              fill
                              sizes="(max-width: 640px) 33vw, 20vw"
                              className="object-cover"
                            />
                          ) : (
                            // Gradient placeholder when a story also has no cover
                            <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Dark gradient overlay on the bottom half for legibility */}
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-800/80 to-transparent" />

                  {/* ── Price badge ──────────────────────────────────────── */}
                  {/* Positioned top-right. bundle.price is in cents → /100 for dollars */}
                  <span className="absolute top-3 right-3 bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                    {bundle.price === 0 ? 'Free' : `$${(bundle.price / 100).toFixed(2)}`}
                  </span>
                </div>

                {/* ── Card body ─────────────────────────────────────────── */}
                <div className="p-5">
                  {/* Bundle title — turns red on hover via the parent group class */}
                  <h2 className="text-base font-bold text-white group-hover:text-red-300 transition mb-1">
                    {bundle.title}
                  </h2>
                  {/* Stats: story count and purchase count from _count aggregation */}
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      {bundle._count.items} stories
                    </span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {bundle._count.purchases} purchased
                    </span>
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
