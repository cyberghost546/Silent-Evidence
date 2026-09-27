'use client';
// app/components/ui/StoryViewToggle.tsx
// Reusable list/grid view switcher used on category, search, and tag pages.
// Renders the same set of story cards in either a 3-column grid or a compact
// horizontal-thumbnail list layout.  The user's preference is persisted in
// localStorage under the key 'story_view' so it survives page navigations.

import { useState } from 'react'; // useState — tracks which layout ('grid' | 'list') is active
import Link from 'next/link'; // Link — wraps each story card for client-side navigation
import Image from 'next/image';
import { readingTime } from '@/lib/readingTime'; // readingTime — converts raw content string to "X min read" label

// ── Exported type ─────────────────────────────────────────────────────────────
// StoryCard — the normalised shape every caller must provide.
// It is exported so sibling pages (category, tag, search) can type their data.
export type StoryCard = {
  id: number; // Unique story database ID — used as React key
  slug: string; // URL-safe slug used to build the /story/<slug> href
  title: string; // Story headline
  excerpt: string | null; // Short description shown beneath the title
  coverImage: string | null; // Absolute URL to the cover image (null = show gradient placeholder)
  content: string; // Raw story HTML — passed to readingTime() to estimate minutes
  createdAt: string; // ISO date string — formatted for display
  views?: number; // Optional view count — only shown in list view when present
  author: {
    username: string; // Author handle
    profile?: { avatar: string | null } | null; // Optional profile with avatar URL
  };
  category: { name: string; slug: string }; // Category display name and slug
  _count: { likes: number; comments: number }; // Aggregated like and comment totals
};

// Props accepted by StoryViewToggle
type Props = {
  stories: StoryCard[]; // Array of story data objects to render
  // Optional slot rendered below the story list — typically a Pagination component
  footer?: React.ReactNode;
};

// ── Icon components ──────────────────────────────────────────────────────────
// Tiny SVG icons used inside the toggle buttons.  Kept as separate components
// to avoid cluttering the main render function.

// ListIcon — three horizontal lines representing the list layout
function ListIcon() {
  return (
    // Inline SVG — no external image dependency
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      {/* Three horizontal strokes of equal width */}
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

// GridIcon — four squares arranged 2×2 representing the grid layout
function GridIcon() {
  return (
    // Inline SVG — matches the visual language of ListIcon above
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      {/* Four equal squares described as a single path */}
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5zm10 0a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V5zM4 15a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-4zm10 0a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-4z"
      />
    </svg>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function StoryViewToggle({ stories, footer }: Props) {
  // view — which layout is currently active ('grid' or 'list').
  // The initialiser function runs only on the first render:
  //   • On the server (SSR) window is undefined, so we default to 'grid'
  //   • On the client we check localStorage for a saved preference
  const [view, setView] = useState<'grid' | 'list'>(() => {
    if (typeof window === 'undefined') return 'grid'; // SSR guard — no localStorage on server
    const saved = window.localStorage.getItem('story_view'); // retrieve saved preference
    // Accept only the two known values; fall back to 'grid' for any other / missing value
    return saved === 'list' || saved === 'grid' ? saved : 'grid';
  });

  // switchView — updates both React state and localStorage whenever the user
  // clicks one of the toggle buttons
  const switchView = (v: 'grid' | 'list') => {
    setView(v); // trigger re-render with new layout
    localStorage.setItem('story_view', v); // persist preference for future page loads
  };

  return (
    // Outer wrapper — provides flow context for the toggle row and the story list
    <div>
      {/* ── Toggle buttons ────────────────────────────────────────────────── */}
      {/* Right-aligned pill containing the grid and list buttons */}
      <div className="flex justify-end mb-5">
        {/* Button group background pill */}
        <div className="flex items-center gap-1 bg-gray-800 border border-gray-700 rounded-lg p-1">
          {/* Grid view button — highlighted in green when grid is active */}
          <button
            onClick={() => switchView('grid')} // switch to grid layout on click
            title="Grid view" // tooltip shown on hover
            className={`p-1.5 rounded-md transition ${view === 'grid' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            <GridIcon /> {/* 2×2 squares icon */}
          </button>

          {/* List view button — highlighted in green when list is active */}
          <button
            onClick={() => switchView('list')} // switch to list layout on click
            title="List view" // tooltip shown on hover
            className={`p-1.5 rounded-md transition ${view === 'list' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            <ListIcon /> {/* Three horizontal lines icon */}
          </button>
        </div>
      </div>

      {/* ── GRID VIEW ─────────────────────────────────────────────────────── */}
      {/* Rendered only when view === 'grid' */}
      {view === 'grid' && (
        // Responsive 3-column grid — 1 col on mobile, 2 on sm, 3 on lg
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Iterate over every story and render a card */}
          {stories.map((story) => {
            // Compute the author's avatar URL.
            // If they have no uploaded avatar, fall back to the ui-avatars.com service
            // which generates an initials-based placeholder image.
            const authorAvatar =
              story.author.profile?.avatar ??
              `https://ui-avatars.com/api/?name=${encodeURIComponent(story.author.username)}&background=dc2626&color=fff&size=64`;

            return (
              // The whole card is a Next.js Link so the entire tile is clickable
              <Link
                key={story.id} // unique key required by React for list rendering
                href={`/story/${story.slug}`} // navigate to the story page on click
                className="group flex flex-col bg-gray-800 border border-gray-700/60 hover:border-red-600/50 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_8px_32px_rgba(220,38,38,0.25)] hover:-translate-y-0.5"
              >
                {/* ── Cover image area ────────────────────────────────────── */}
                <div className="relative h-52 overflow-hidden flex-shrink-0">
                  {/* Show the actual cover image if one exists */}
                  {story.coverImage ? (
                    <Image
                      src={story.coverImage} // external or uploaded image URL
                      alt={story.title} // alt text for screen readers
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  ) : (
                    // Fallback placeholder gradient with a faint skull emoji
                    <div className="w-full h-full bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900 flex items-center justify-center"></div>
                  )}

                  {/* Dark gradient overlay at the bottom so the reading time pill is legible */}
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/20 to-transparent" />

                  {/* Reading time pill — bottom-left corner of the image */}
                  <span className="absolute bottom-3 left-3 text-[10px] font-medium text-gray-300 bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-full">
                    {readingTime(story.content)} {/* e.g. "4 min read" */}
                  </span>
                </div>

                {/* ── Card body ────────────────────────────────────────────── */}
                <div className="flex flex-col gap-2 p-5 flex-1">
                  {/* Category label — small uppercase text in green */}
                  <span className="text-xs font-bold uppercase tracking-widest text-red-400">
                    {story.category.name}
                  </span>

                  {/* Story title — truncated to 2 lines with CSS line-clamp */}
                  <h3 className="text-base font-bold text-white group-hover:text-red-300 transition leading-snug line-clamp-2">
                    {story.title}
                  </h3>

                  {/* Excerpt — only rendered when present, capped to 2 lines */}
                  {story.excerpt && (
                    <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                      {story.excerpt}
                    </p>
                  )}

                  {/* ── Author + stats row ──────────────────────────────────── */}
                  {/* Pushed to the bottom of the card with mt-auto */}
                  <div className="flex items-center gap-2 mt-auto pt-3 border-t border-gray-700/60">
                    {/* Tiny author avatar */}
                    <Image
                      src={authorAvatar} // resolved avatar URL (real or generated)
                      alt={story.author.username} // alt text for screen readers
                      width={24}
                      height={24}
                      className="rounded-full object-cover border border-gray-600 flex-shrink-0"
                    />

                    {/* Author username — truncated so it doesn't overflow */}
                    <span className="text-xs text-gray-400 font-medium truncate flex-1">
                      {story.author.username}
                    </span>

                    {/* Publication date — short format: "Jan 3" */}
                    <span className="text-xs text-gray-600">
                      {new Date(story.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>

                    {/* Like count */}
                    <span className="text-xs text-gray-600">{story._count.likes}</span>

                    {/* Comment count */}
                    <span className="text-xs text-gray-600">{story._count.comments}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* ── LIST VIEW ─────────────────────────────────────────────────────── */}
      {/* Rendered only when view === 'list' */}
      {view === 'list' && (
        // Vertical stack of horizontal cards — one story per row
        <div className="flex flex-col gap-4">
          {stories.map((story) => {
            // Same avatar fallback logic as the grid view above
            const authorAvatar =
              story.author.profile?.avatar ??
              `https://ui-avatars.com/api/?name=${encodeURIComponent(story.author.username)}&background=dc2626&color=fff&size=64`;

            return (
              // Horizontal card — thumbnail on left, text on right
              <Link
                key={story.id} // unique React key
                href={`/story/${story.slug}`} // navigate to story page
                className="group flex gap-4 bg-gray-800 border border-gray-700 hover:border-red-600/50 rounded-xl overflow-hidden transition-all duration-200 hover:shadow-lg hover:shadow-red-900/10"
              >
                {/* ── Thumbnail strip ─────────────────────────────────────── */}
                {/* Fixed width on the left; scales on sm breakpoint */}
                <div className="relative w-32 sm:w-40 flex-shrink-0 h-28 overflow-hidden">
                  {story.coverImage ? (
                    // Actual cover image — zooms slightly on hover for depth
                    <Image
                      src={story.coverImage}
                      alt={story.title}
                      fill
                      sizes="160px"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    // Gradient placeholder when no cover image exists
                    <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center"></div>
                  )}
                </div>

                {/* ── Text info panel ─────────────────────────────────────── */}
                {/* Takes remaining horizontal space; min-w-0 prevents text overflow */}
                <div className="flex-1 py-4 pr-5 flex flex-col justify-center gap-1.5 min-w-0">
                  {/* Category badge row */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-red-400">
                      {story.category.name}
                    </span>
                  </div>

                  {/* Story title — capped to 2 lines */}
                  <h3 className="text-sm font-semibold text-white group-hover:text-red-300 transition leading-snug line-clamp-2">
                    {story.title}
                  </h3>

                  {/* Excerpt — single line in list view to save vertical space */}
                  {story.excerpt && (
                    <p className="text-xs text-gray-500 line-clamp-1">{story.excerpt}</p>
                  )}

                  {/* ── Metadata row ─────────────────────────────────────── */}
                  {/* Tiny avatar + author + reading time + likes + comments + optional views + date */}
                  <div className="flex items-center gap-3 text-xs text-gray-600 mt-auto flex-wrap">
                    {/* Tiny author avatar */}
                    <Image
                      src={authorAvatar}
                      alt={story.author.username}
                      width={16}
                      height={16}
                      className="rounded-full object-cover shrink-0"
                    />
                    {/* Author username */}
                    <span>{story.author.username}</span>
                    <span>·</span> {/* Separator dot */}
                    {/* Estimated reading time */}
                    <span>{readingTime(story.content)}</span>
                    <span>·</span> {/* Separator dot */}
                    {/* Like count */}
                    <span>{story._count.likes}</span>
                    {/* Comment count */}
                    <span>{story._count.comments}</span>
                    {/* View count — only shown if the story object includes it */}
                    {story.views !== undefined && (
                      <>
                        <span>·</span>
                        <span>{story.views.toLocaleString()}</span>
                      </>
                    )}
                    {/* Publication date — pushed to the right with ml-auto; longer format in list view */}
                    <span className="ml-auto">
                      {new Date(story.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* ── Footer slot ───────────────────────────────────────────────────── */}
      {/* Only rendered when a footer prop was passed (typically a Pagination component) */}
      {footer && <div className="mt-8">{footer}</div>}
    </div>
  );
}
