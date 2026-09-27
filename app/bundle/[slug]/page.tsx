// =============================================================================
// app/bundle/[slug]/page.tsx
// =============================================================================
//
// PURPOSE:
//   Detail page for a single story bundle, e.g. /bundle/ultimate-horror-pack.
//   A "bundle" is a curated collection of stories sold together for one price.
//   This page displays the bundle description, pricing, all included stories,
//   and a purchase / "already owned" call-to-action.
//
// ACCESS:
//   Public — anyone can view the detail page. The purchase button differs based
//   on whether the viewer is logged in and whether they already own the bundle.
//
// DATA FETCHED:
//   - prisma.storyBundle: the bundle record, its items (nested stories), and
//     the total purchase count.
//   - prisma.bundlePurchase: ownership check for the current user.
//
// SERVER COMPONENT:
//   This file has no 'use client' directive, so it is a React Server Component.
//   It runs on the server at request time, has direct Prisma access, and sends
//   fully rendered HTML to the browser — great for SEO.
// =============================================================================

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import BundlePurchaseButton from '@/app/components/ui/BundlePurchaseButton';
import { BookOpen, Users, Check, Eye, Heart } from 'lucide-react';

// ---------------------------------------------------------------------------
// Props type
// ---------------------------------------------------------------------------
// In Next.js 14 App Router, dynamic route params are delivered as a Promise.
// The [slug] folder creates a URL segment variable — /bundle/my-bundle means
// params.slug === "my-bundle".
type Props = { params: Promise<{ slug: string }> };

// ---------------------------------------------------------------------------
// generateMetadata
// ---------------------------------------------------------------------------
// Next.js calls this function automatically before rendering the page.
// It sets the browser <title> and any other meta tags (used by search engines
// and social-media link previews). We do a lightweight DB query here — only
// selecting `title` — to avoid over-fetching.
export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  // findUnique uses the unique `slug` field; `select` limits columns fetched.
  const bundle = await prisma.storyBundle.findUnique({
    where: { slug },
    select: { title: true },
  });
  // If the bundle doesn't exist return a sensible fallback title for 404 pages.
  return { title: bundle ? `${bundle.title} — Silent Evidence` : 'Bundle Not Found' };
}

// ---------------------------------------------------------------------------
// BundleDetailPage — the main Server Component
// ---------------------------------------------------------------------------
export default async function BundleDetailPage({ params }: Props) {
  // Await the params Promise to get the actual slug string.
  const { slug } = await params;

  // ── Auth check ────────────────────────────────────────────────────────────
  // cookies() is a Next.js Server API that reads the incoming HTTP request's
  // Cookie header. We store the logged-in user's ID in a plain cookie named
  // 'userId'. Converting to Number and falling back to null means unauthenticated
  // users get null rather than 0 or NaN.
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0) || null;

  // ── Primary DB query ──────────────────────────────────────────────────────
  // Fetch the bundle by its URL slug. We also filter `active: true` so
  // unpublished / hidden bundles return 404 even if the slug is guessed.
  //
  // `include` performs JOINs:
  //   items → each bundle–story relationship row
  //     story → the actual story record with author, category, and counts
  //   _count.purchases → how many users have bought this bundle (shown in the UI)
  const bundle = await prisma.storyBundle.findUnique({
    where: { slug, active: true },
    include: {
      items: {
        include: {
          story: {
            select: {
              id: true,
              title: true,
              slug: true,
              excerpt: true,
              coverImage: true,
              // Only the username is needed — no need to load the whole User row
              author: { select: { username: true } },
              category: { select: { name: true } },
              // Prisma _count aggregates without pulling every like/comment record
              _count: { select: { likes: true, comments: true } },
              views: true,
            },
          },
        },
      },
      // Count how many users have purchased this bundle (for social proof)
      _count: { select: { purchases: true } },
    },
  });

  // If no active bundle matches the slug, show Next.js's built-in 404 page.
  if (!bundle) return notFound();

  // ── Ownership check ───────────────────────────────────────────────────────
  // Determine whether the logged-in user has already purchased this bundle.
  // The BundlePurchase table has a composite unique key (userId, bundleId), so
  // findUnique is an efficient O(1) lookup rather than a full scan.
  // If userId is null (guest), we skip the query and set alreadyOwned = false.
  const alreadyOwned = userId
    ? !!(await prisma.bundlePurchase.findUnique({
        where: { userId_bundleId: { userId, bundleId: bundle.id } },
      }))
    : false;

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <Header />

      {/* ── Bundle hero ──────────────────────────────────────────────────── */}
      {/* Dark hero section with a subtle red radial gradient for atmosphere. */}
      <div className="relative bg-gray-950 border-b border-gray-800 py-14">
        {/* Radial gradient overlay — purely decorative, uses Tailwind's arbitrary value syntax */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(220,38,38,0.08)_0%,_transparent_60%)]" />

        {/* relative on the inner div ensures content sits above the gradient overlay */}
        <div className="max-w-3xl mx-auto px-4 relative">
          {/* Back link — lets users navigate up to the bundles listing */}
          <Link href="/bundles" className="text-xs text-gray-500 hover:text-red-400 transition">
            ← All bundles
          </Link>

          {/* Bundle title */}
          <h1 className="text-3xl font-black text-white mt-4 mb-3">{bundle.title}</h1>

          {/* Optional bundle description — only rendered if it exists in the DB */}
          {bundle.description && (
            <p className="text-gray-400 mb-4 max-w-xl">{bundle.description}</p>
          )}

          {/* Price + social proof row */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Price display — bundle.price is stored in cents, so divide by 100 */}
            <span className="text-2xl font-bold text-red-400">
              {bundle.price === 0 ? 'Free' : `$${(bundle.price / 100).toFixed(2)}`}
            </span>
            {/* Story count and purchase count provide social proof ("12 purchased") */}
            <span className="inline-flex items-center gap-2 text-xs text-gray-500">
              <BookOpen className="w-3 h-3" />
              {bundle.items.length} stories ·
              <Users className="w-3 h-3" />
              {bundle._count.purchases} purchased
            </span>
          </div>

          {/* ── Purchase / owned CTA ──────────────────────────────────────── */}
          <div className="mt-6">
            {alreadyOwned ? (
              // If the user already owns this bundle, show a green "owned" badge
              // instead of the buy button — avoids duplicate purchases.
              <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-500/10 border border-green-500/30 text-green-400 font-semibold rounded-xl text-sm">
                <Check className="w-4 h-4" /> You own this bundle
              </span>
            ) : (
              // BundlePurchaseButton is a Client Component ('use client').
              // It handles the Stripe Checkout redirect. We pass isLoggedIn so it
              // can prompt guests to log in before attempting a purchase.
              <BundlePurchaseButton slug={slug} price={bundle.price} isLoggedIn={!!userId} />
            )}
          </div>
        </div>
      </div>

      {/* ── Story list ───────────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Section header with a decorative red vertical bar */}
        <div className="flex items-center gap-3 mb-6">
          <span className="w-1 h-5 bg-red-600 rounded-full" />
          <h2 className="text-lg font-bold text-white">Stories in this bundle</h2>
        </div>

        {/* Each story is a full-width clickable card linking to /story/[slug] */}
        <div className="space-y-4">
          {bundle.items.map(({ story }) => (
            // group class on the Link enables group-hover:* utilities on children
            <Link
              key={story.id}
              href={`/story/${story.slug}`}
              className="group flex gap-4 bg-gray-800 border border-gray-700 hover:border-red-600/50 rounded-xl p-4 transition-all"
            >
              {/* Cover image — only rendered when the story has one */}
              {story.coverImage && (
                <img
                  src={story.coverImage}
                  alt={story.title}
                  className="w-24 h-16 object-cover rounded-lg flex-shrink-0"
                />
              )}

              {/* Story info — flex-1 + min-w-0 prevents text overflow */}
              <div className="flex flex-col justify-between flex-1 min-w-0">
                <div>
                  {/* Category label in red uppercase */}
                  <span className="text-xs font-bold uppercase tracking-widest text-red-400">
                    {story.category.name}
                  </span>
                  {/* Title — line-clamp-1 truncates with ellipsis after 1 line */}
                  <h3 className="text-sm font-semibold text-white group-hover:text-red-300 transition mt-0.5 line-clamp-1">
                    {story.title}
                  </h3>
                  {/* Excerpt — optional, truncated at 2 lines */}
                  {story.excerpt && (
                    <p className="text-xs text-gray-500 line-clamp-2 mt-1">{story.excerpt}</p>
                  )}
                </div>

                {/* Footer stats: author, view count, like count */}
                <div className="flex items-center gap-3 text-xs text-gray-600 mt-2">
                  <span>by {story.author.username}</span>
                  <span className="inline-flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {/* toLocaleString() formats numbers with commas: 12400 → "12,400" */}
                    {story.views.toLocaleString()}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Heart className="w-3 h-3" />
                    {story._count.likes}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <Footer />
    </main>
  );
}
