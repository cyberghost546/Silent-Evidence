// app/category/[slug]/page.tsx
// Dynamic category page — e.g. /category/ghost-stories or /category/creepypasta.
// The [slug] folder name is Next.js's way of saying "this segment is a variable".
// When someone visits /category/supernatural, slug = "supernatural".
// This page fetches all published stories in that category with pagination and sorting.

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import Pagination from '@/app/components/ui/Pagination';
import CategoryStories from './CategoryStories';
import type { Metadata } from 'next';
import { BookOpen, Ghost, Brain, Droplet, Eye, MapPin, Monitor, Rocket, Flame, Skull, type LucideIcon } from 'lucide-react';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://silentevidence.com';

// How many stories to show per page
const PAGE_SIZE = 12;

// Props shape — Next.js passes params and searchParams as Promises in the App Router
type Props = {
  params: Promise<{ slug: string }>;           // URL segment, e.g. "ghost-stories"
  searchParams: Promise<{ page?: string; sort?: string }>; // Query string params, e.g. ?page=2&sort=popular
};

// Map category slugs to a matching emoji icon
const CATEGORY_ICONS: Record<string, string> = {
  'true-stories': '📖',
  'supernatural': '👻',
  'psychological': '🧠',
  'gore': '🩸',
  'paranormal': '👁️',
  'urban-legends': '🌆',
  'creepypasta': '💻',
  'sci-fi': '🛸',
  'occult': '🕯️',
};

// generateMetadata — Next.js calls this automatically to set the page <title> and
// Open Graph tags (used by social media previews when sharing a link).
// It runs on the server before the page renders.
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const category = await prisma.category.findUnique({ where: { slug }, select: { name: true, description: true } });
  if (!category) return { title: 'Category Not Found' };

  const description = category.description ?? `Browse horror stories in the ${category.name} category on Silent Evidence.`;
  const url = `${BASE_URL}/category/${slug}`;

  return {
    title: `${category.name} horror stories — Silent Evidence`,
    description,
    // openGraph tags control how this page looks when shared on Facebook, Discord, etc.
    openGraph: {
      title: `${category.name} — Silent Evidence`,
      description,
      url,
      siteName: 'Silent Evidence',
      type: 'website',
    },
    twitter: { card: 'summary', title: `${category.name} horror stories`, description },
    alternates: { canonical: url },
  };
}

// CategoryPage — the main page component.
// Runs entirely on the server — it fetches data and returns HTML.
export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  // Default to page 1 and sort by newest if no query params are provided
  const { page: pageParam, sort = 'newest' } = await searchParams;
  // Ensure page is never less than 1 (guards against ?page=0 or ?page=-5)
  const page = Math.max(1, Number(pageParam ?? 1));

  // Fetch the category record — includes a count of all its stories for the stats row
  const category = await prisma.category.findUnique({
    where: { slug },
    include: { _count: { select: { stories: true } } },
  });
  // If no category exists for this slug, show Next.js's built-in 404 page
  if (!category) return notFound();

  // Count only published stories (drafts and moderated stories are hidden)
  const total = await prisma.story.count({ where: { status: 'PUBLISHED', categoryId: category.id } });
  const totalPages = Math.ceil(total / PAGE_SIZE);
  // Clamp currentPage so it never exceeds the last page (e.g. if stories were deleted)
  const currentPage = Math.min(page, Math.max(1, totalPages));

  // Build the Prisma orderBy clause based on the sort query param
  // "popular" = most liked, anything else = most recently published
  const orderBy = sort === 'popular'
    ? { likes: { _count: 'desc' as const } }
    : { createdAt: 'desc' as const };

  // Fetch one page of stories with author info and engagement counts
  const stories = await prisma.story.findMany({
    where: { status: 'PUBLISHED', categoryId: category.id },
    orderBy,
    skip: (currentPage - 1) * PAGE_SIZE, // Skip past stories on previous pages
    take: PAGE_SIZE,
    include: {
      author: { select: { username: true, profile: { select: { avatar: true } } } },
      // category is needed by StoryViewToggle for the category label on each card
      category: { select: { name: true, slug: true } },
      _count: { select: { likes: true, comments: true } },
    },
  });

  // Look up the icon for this category slug, fall back to Skull if not in the map
  const CategoryIcon = CATEGORY_ICONS[slug] ?? Skull;

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <Header />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      {/* Dark hero section with a subtle red radial glow behind the category name */}
      <div className="relative bg-gray-950 overflow-hidden">
        {/* Layered radial glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,_rgba(34,197,94,0.18)_0%,_transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_40%_at_80%_80%,_rgba(34,197,94,0.06)_0%,_transparent_70%)]" />

        <div className="max-w-6xl mx-auto px-4 pt-12 pb-14 relative">

          {/* Breadcrumb navigation — "Home / Ghost Stories" */}
          <div className="flex items-center gap-2 text-xs text-gray-600 mb-8">
            <Link href="/" className="hover:text-gray-400 transition">Home</Link>
            <span>/</span>
            <span className="text-gray-400">{category.name}</span>
          </div>

          {/* Category icon + name + description */}
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-red-600/10 border border-red-600/20 flex items-center justify-center text-3xl flex-shrink-0">
              {icon}
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">
                {category.name}
              </h1>
              {/* Category description is optional — only shown if set in the database */}
              {category.description && (
                <p className="text-gray-400 mt-1 max-w-xl text-sm md:text-base leading-relaxed">
                  {category.description}
                </p>
              )}
            </div>
          </div>

          {/* Stats row — story count on the left, sort toggle on the right */}
          <div className="flex items-center gap-6 mt-6">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <span className="text-sm text-gray-400">
                <span className="text-white font-semibold">{total}</span>{' '}
                {total === 1 ? 'story' : 'stories'}
              </span>
            </div>

            {/* Sort toggle — uses Links (not buttons) so the sort state is bookmarkable via URL */}
            <div className="flex items-center gap-1 ml-auto bg-gray-900 border border-gray-800 rounded-lg p-1">
              <Link
                href={`/category/${slug}?sort=newest`}
                // Active state: red background when this sort is selected
                className={`px-3 py-1 text-xs rounded-md font-medium transition ${
                  sort !== 'popular'
                    ? 'bg-red-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Newest
              </Link>
              <Link
                href={`/category/${slug}?sort=popular`}
                className={`px-3 py-1 text-xs rounded-md font-medium transition ${
                  sort === 'popular'
                    ? 'bg-red-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Popular
              </Link>
            </div>
          </div>
        </div>

        {/* Gradient fade at the bottom of the hero so it blends into the story grid */}
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-gray-900 to-transparent" />
      </div>

      {/* ── Story grid ───────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {stories.length === 0 ? (
          // Empty state — shown if no published stories exist in this category yet
          <div className="text-center py-24 text-gray-500">
            <Ghost className="w-12 h-12 mx-auto mb-4 text-gray-600" />
            <p className="text-lg font-semibold text-gray-400">No stories here yet.</p>
            <p className="text-sm mt-1">Be the first to write one.</p>
            <Link
              href="/write"
              className="inline-block mt-6 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition"
            >
              Write a Story
            </Link>
          </div>
        ) : (
          // CategoryStories handles rendering the grid/list view toggle.
          // JSON.parse(JSON.stringify(stories)) serialises Prisma's Date objects to plain
          // strings so they can be safely passed as props to a client component.
          // paginationNode is passed as a slot so pagination renders in the right place
          // regardless of whether grid or list view is active.
          <CategoryStories
            stories={JSON.parse(JSON.stringify(stories))}
            paginationNode={
              <Pagination
                page={currentPage}
                totalPages={totalPages}
                // buildHref generates the URL for each page number button,
                // preserving the current sort order in the query string
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
