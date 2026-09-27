/**
 * app/monsters/page.tsx
 *
 * WHAT THIS FILE DOES:
 * Renders the Monster Encyclopedia page — a browsable, searchable bestiary
 * of horror monsters, creatures, and entities.
 *
 * ARCHITECTURE DECISION — thin shell pattern:
 * This page component is intentionally minimal. All the real logic (data
 * fetching, filtering by type, search input state) lives inside the
 * MonsterEncyclopedia component. This keeps this file readable and lets
 * Next.js handle metadata at the page level while keeping interactivity
 * isolated to the child component.
 *
 * SERVER COMPONENT (default in App Router):
 * No "use client" directive means this runs on the server. It exports
 * `metadata` (only possible in Server Components) and renders the static
 * hero section without any JS overhead on the client.
 *
 * METADATA:
 * The `metadata` export is a Next.js 14 convention. Next.js reads it at
 * build/request time and injects the values into the <head> as <title>
 * and <meta name="description"> tags — no manual <Head> component needed.
 *
 * LAYOUT:
 * - `min-h-screen`        → page always fills the full viewport height
 * - `bg-gray-950`         → near-black background for horror aesthetic
 * - `py-12 px-4`          → vertical breathing room; horizontal padding
 *                            collapses on mobile via the px-4 base
 * - `max-w-5xl mx-auto`   → caps content width and centers it on wide screens
 */

import { Metadata } from 'next';
// MonsterEncyclopedia is a Client Component — it owns the search input state,
// category filter state, and data display logic.
import MonsterEncyclopedia from '@/app/components/ui/MonsterEncyclopedia';

// ── Page-level SEO metadata ────────────────────────────────────────────────────
// Only Server Components can export `metadata`. The object is typed by Next.js's
// built-in `Metadata` type so TypeScript catches invalid property names.
export const metadata: Metadata = {
  title: 'Monster Encyclopedia | Silent Evidence',
  description: 'A complete bestiary of horror monsters, creatures, and entities.',
};

// ── Page component ────────────────────────────────────────────────────────────
// This is a synchronous Server Component (no async needed — no DB calls here).
// It simply provides the page shell (title, emoji hero, wrapper divs) and
// delegates all data + interaction to <MonsterEncyclopedia />.
export default function MonstersPage() {
  return (
    // `main` is the correct semantic landmark for the primary page content.
    // bg-gray-950 is one step darker than bg-gray-900, giving a deep-space feel.
    <main className="min-h-screen bg-gray-950 py-12 px-4">
      {/* Centered content wrapper — max-w-5xl limits line length on ultrawide screens */}
      <div className="max-w-5xl mx-auto">
        {/* ── Hero header ───────────────────────────────────────────────────── */}
        {/* text-center aligns the emoji, heading, and sub-copy as a block */}
        <div className="text-center mb-10">
          {/* Large emoji serves as the page's visual icon — no extra image needed */}

          {/* Primary heading — text-4xl is intentionally large for impact */}
          <h1 className="text-4xl font-bold text-white mb-3">Monster Encyclopedia</h1>

          {/* Sub-copy: text-gray-400 keeps it secondary without disappearing */}
          <p className="text-gray-400 text-lg">
            Know your enemy. Every horror creature, beast, and entity — catalogued.
          </p>
        </div>

        {/* ── Monster grid / search / filter ────────────────────────────────── */}
        {/*
          MonsterEncyclopedia is a 'use client' component that:
          - Holds search query state with useState
          - Holds selected type filter state with useState
          - Fetches monster data (either statically imported or via an API route)
          - Renders the searchable, filterable grid of monster cards
          Keeping it as a separate component means this Server Component stays
          fast and cache-friendly.
        */}
        <MonsterEncyclopedia />
      </div>
    </main>
  );
}
