// =============================================================================
// app/category/[slug]/page.tsx
// =============================================================================
//
// PURPOSE:
//   Dynamic category page — renders a browseable list of published stories
//   belonging to one category. URLs look like /category/ghost-stories or
//   /category/creepypasta.
//
// HOW DYNAMIC ROUTING WORKS:
//   The [slug] folder name tells Next.js this URL segment is a variable.
//   When someone visits /category/supernatural, Next.js extracts the string
//   "supernatural" and makes it available as params.slug. This single file
//   handles every category without needing a separate file for each one.
//
// ACCESS:
//   Public — no login required.
//
// DATA FETCHED:
//   - prisma.category    → category record + story count
//   - prisma.story.count → total published stories (for pagination maths)
//   - prisma.story.findMany → one page of stories with author, category, counts
//
// FEATURES:
//   - Server-side pagination (?page=N)
//   - Sortable by newest or popular (?sort=popular)
//   - SEO metadata including Open Graph tags
//   - Delegates grid/list toggle to the CategoryStories client component
// =============================================================================

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import Pagination from '@/app/components/ui/Pagination';
import CategoryStories from './CategoryStories';
import type { Metadata } from 'next';
import {
  BookOpen, Ghost, Brain, Droplet, Eye,
  MapPin, Monitor, Rocket, Flame, Skull,
  type LucideIcon,
} from 'lucide-react';

// Base URL used for generating canonical and Open Graph URLs.
// Falls back to the production domain if the env var isn't set.
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://silentevidence.com';

// ---------------------------------------------------------------------------
// Pagination constant
// ---------------------------------------------------------------------------
// How many stories to display per page. Changing this single constant
// automatically adjusts skip/take in the DB query and total page maths below.
const PAGE_SIZE = 12;

// ---------------------------------------------------------------------------
// Props type
// ---------------------------------------------------------------------------
// Next.js 14 App Router delivers params and searchParams as Promises.
// We must await them before accessing the values — TypeScript enforces this.
//
//   params.slug        → e.g. "ghost-stories"
//   searchParams.page  → e.g. "2" (string from URL query)
//   searchParams.sort  → "newest" | "popular"
type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; sort?: string }>;
};

// ---------------------------------------------------------------------------
// Category icon map
// ---------------------------------------------------------------------------
// Maps a category slug to a decorative emoji shown in the hero section.
// Falls back to Skull (a Lucide icon) for any category not in this map.
// This is a simple "data-driven UI" pattern — adding new categories only
// requires adding one entry here, no JSX changes needed.
const CATEGORY_ICONS: Record<string, string> = {
  'true-stories':  '📖',
  'supernatural':  '👻',
  'psychological': '🧠',
  'gore':          '🩸',
  'paranormal':    '👁️',
  'urban-legends': '🌆',
  'creepypasta':   '💻',
  'sci-fi':        '🛸',
  'occult':        '🕯️',
};

// ---------------------------------------------------------------------------
// generateMetadata — SEO + social sharing
// ---------------------------------------------------------------------------
// Next.js automatically calls this before rendering the page to populate
// <title>, <meta>, and Open Graph / Twitter card tags. It runs on the server.
// Doing a quick DB lookup here is fine — the result is cached by Next.js.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  // Lightweight query — only the two fields we need for metadata
  const category = await prisma.category.findUnique({
    where: { slug },
    select: { name: true, description: true },
  });

  // Return minimal metadata for 404 cases — Next.js still needs something
  if (!category) return { title: 'Category Not Found' };

  const description =
    category.description ??
    `Browse horror stories in the ${category.name} category on Silent Evidence.`;
  const url = `${BASE_URL}/category/${slug}`;

  return {
    title: `${category.name} horror stories — Silent Evidence`,
    description,
    // openGraph controls how this URL looks when pasted into Discord, Facebook, etc.
    openGraph: {
      title: `${category.name} — Silent Evidence`,
      description,
      url,
      siteName: 'Silent Evidence',
      type: 'website',
    },
    // Twitter card for Twitter/X previews
    twitter: {
      card: 'summary',
      title: `${category.name} horror stories`,
      description,
    },
    // canonical prevents duplicate-content SEO penalties when the same page
    // is accessible via multiple URLs (e.g. with and without query params)
    alternates: { canonical: url },
  };
}

// ---------------------------------------------------------------------------
// CategoryPage — the main Server Component
// ---------------------------------------------------------------------------
export default async function CategoryPage({ params, searchParams }: Props) {
  // Await the route params to get the slug string
  const { slug } = await params;

  // Await query-string params; provide safe defaults if not present
  const { page: pageParam, sort = 'newest' } = await searchParams;

  // Parse the page number and clamp to at least 1 (guards against ?page=0)
  const page = Math.max(1, Number(pageParam ?? 1));

  // ── Fetch the category ────────────────────────────────────────────────────
  // _count.stories gives the total story count for the stats row (not just
  // the paginated subset). This is a quick aggregation — Prisma doesn't load
  // the actual story records for this count.
  const category = await prisma.category.findUnique({
    where: { slug },
    include: { _count: { select: { stories: true } } },
  });

  // notFound() triggers Next.js's built-in 404 page + the correct HTTP 404
  // status code — important for SEO (bots should know the page doesn't exist).
  if (!category) return notFound();

  // ── Pagination maths ──────────────────────────────────────────────────────
  // Count only PUBLISHED stories — drafts and moderated content are excluded.
  const total = await prisma.story.count({
    where: { status: 'PUBLISHED', categoryId: category.id },
  });

  // How many pages exist? Math.ceil rounds up: 13 stories / 12 per page = 2 pages
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Clamp currentPage so it never exceeds the last page. This handles edge cases
  // where stories are deleted after the user bookmarks a deep page number.
  const currentPage = Math.min(page, Math.max(1, totalPages));

  // ── Sorting ───────────────────────────────────────────────────────────────
  // Build the Prisma orderBy object based on the ?sort= query param.
  // "popular" sorts by like count descending; anything else sorts by date.
  // `as const` narrows the type from string to the literal 'desc' | 'asc'
  // which Prisma's TypeScript types require.
  const orderBy =
    sort === 'popular'
      ? { likes: { _count: 'desc' as const } }
      : { createdAt: 'desc' as const };

  // ── Fetch one page of stories ─────────────────────────────────────────────
  // skip: offset (skip pages we've already seen)
  // take: limit (only load PAGE_SIZE records)
  // This is server-side pagination — no client state is needed.
  const stories = await prisma.story.findMany({
    where: { status: 'PUBLISHED', categoryId: category.id },
    orderBy,
    skip: (currentPage - 1) * PAGE_SIZE, // e.g. page 3 → skip 24
    take: PAGE_SIZE,
    include: {
      // Username + avatar for the author credit on each card
      author: {
        select: { username: true, profile: { select: { avatar: true } } },
      },
      // category is passed down to CategoryStories so it can label each card
      category: { select: { name: true, slug: true } },
      // Aggregate like + comment counts in a single query (no extra round-trips)
      _count: { select: { likes: true, comments: true } },
    },
  });

  // Look up the emoji icon for this category, fall back to Skull Lucide icon
  const CategoryIcon = CATEGORY_ICONS[slug] ?? Skull;

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <Header />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      {/* Dark background with layered radial gradients for depth */}
      <div className="relative bg-gray-950 overflow-hidden">
        {/* Primary glow — large ellipse centred above the content */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(220,38,38,0.16)_0%,transparent_70%)]" />
        {/* Secondary glow — smaller ellipse in the bottom-right corner */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_40%_at_80%_80%,rgba(220,38,38,0.06)_0%,transparent_70%)]" />

        <div className="max-w-6xl mx-auto px-4 pt-12 pb-14 relative">

          {/* ── Breadcrumb ─────────────────────────────────────────────── */}
          {/* Shows "Home / Ghost Stories" to orient the user in the site hierarchy */}
          <div className="flex items-center gap-2 text-xs text-gray-600 mb-8">
            <Link href="/" className="hover:text-gray-400 transition">Home</Link>
            <span>/</span>
            <span className="text-gray-400">{category.name}</span>
          </div>

          {/* ── Category icon + name ──────────────────────────────────── */}
          <div className="flex items-center gap-4 mb-4">
            {/* Icon box — emoji from CATEGORY_ICONS map or Lucide Skull fallback */}
            <div className="w-14 h-14 rounded-2xl bg-red-600/10 border border-red-600/20 flex items-center justify-center text-3xl shrink-0">
              {CategoryIcon}
            </div>
            <div>
              {/* Main heading — md:text-5xl applies on ≥768px screens */}
              <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">
                {category.name}
              </h1>
              {/* Description is optional — only rendered when it exists in the DB */}
              {category.description && (
                <p className="text-gray-400 mt-1 max-w-xl text-sm md:text-base leading-relaxed">
                  {category.description}
                </p>
              )}
            </div>
          </div>

          {/* ── Stats + sort row ───────────────────────────────────────── */}
          <div className="flex items-center gap-6 mt-6">
            {/* Story count — green dot provides a "live" feeling */}
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="text-sm text-gray-400">
                <span className="text-white font-semibold">{total}</span>{' '}
                {/* Proper singular/plural: "1 story" vs "12 stories" */}
                {total === 1 ? 'story' : 'stories'}
              </span>
            </div>

            {/* ── Sort toggle ─────────────────────────────────────────── */}
            {/* Uses <Link> components (not buttons) so sort state is
                encoded in the URL — bookmarkable and shareable. */}
            <div className="flex items-center gap-1 ml-auto bg-gray-900 border border-gray-800 rounded-lg p-1">
              <Link
                href={`/category/${slug}?sort=newest`}
                // Active style: green background when 'newest' is selected
                className={`px-3 py-1 text-xs rounded-md font-medium transition ${
                  sort !== 'popular'
                    ? 'bg-green-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Newest
              </Link>
              <Link
                href={`/category/${slug}?sort=popular`}
                className={`px-3 py-1 text-xs rounded-md font-medium transition ${
                  sort === 'popular'
                    ? 'bg-green-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Popular
              </Link>
            </div>
          </div>
        </div>

        {/* Gradient fade at the bottom of the hero — blends into the story grid */}
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-linear-to-t from-gray-900 to-transparent" />
      </div>

      {/* ── Story grid ───────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {stories.length === 0 ? (
          // ── Empty state ────────────────────────────────────────────────
          // Shown if no published stories exist in this category yet.
          // The "Write a Story" CTA turns an empty page into an engagement hook.
          <div className="text-center py-24 text-gray-500">
            <Ghost className="w-12 h-12 mx-auto mb-4 text-gray-600" />
            <p className="text-lg font-semibold text-gray-400">No stories here yet.</p>
            <p className="text-sm mt-1">Be the first to write one.</p>
            <Link
              href="/write"
              className="inline-block mt-6 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition"
            >
              Write a Story
            </Link>
          </div>
        ) : (
          // ── CategoryStories client component ───────────────────────────
          // CategoryStories is a Client Component ('use client') that handles the
          // grid/list view toggle interactivity.
          //
          // JSON.parse(JSON.stringify(stories)) is a common Next.js pattern to
          // serialise Prisma Date objects (JavaScript Date instances) into plain
          // ISO strings. Client Components can only receive serialisable props —
          // Date objects aren't JSON-serialisable so they must be converted first.
          //
          // paginationNode is passed as a React node "slot" (a render prop pattern)
          // so CategoryStories can place the <Pagination> in the right DOM position
          // regardless of whether grid or list view is active.
          <CategoryStories
            stories={JSON.parse(JSON.stringify(stories))}
            paginationNode={
              <Pagination
                page={currentPage}
                totalPages={totalPages}
                // buildHref receives a page number and returns the URL for that page.
                // We thread the current sort value through so switching pages doesn't
                // reset the sort back to the default.
                buildHref={(p) => `/category/${slug}?sort=${sort}&page=${p}`}
              />
            }
          />
        )}
      </div>

      <Footer />
    </main>
  );
}
