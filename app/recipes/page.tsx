// =============================================================================
// app/recipes/page.tsx — Horror Recipes & Rituals Index Page
// =============================================================================
//
// PURPOSE:
//   The landing page for the /recipes route. Displays a themed header and then
//   renders the RecipesFeed client component which handles filtering, reactions,
//   and the full recipe card list.
//
// SERVER COMPONENT (no 'use client' directive):
//   This file is a React Server Component. It:
//     • Exports static metadata for SEO (no DB query needed here)
//     • Renders a layout shell (header copy, decorative emoji)
//     • Delegates all dynamic data fetching and interactivity to RecipesFeed
//
//   Keeping the page component thin (layout-only) and pushing data logic into
//   child components is the recommended Next.js App Router pattern. It lets
//   each component opt in to 'use client' only when it needs to — here we keep
//   the outer shell as a Server Component for fast HTML streaming.
//
// STATIC METADATA:
//   Because this export is a plain object (not a function), Next.js bakes it
//   into the HTML at build time. No database call is needed for the title or
//   description — they never change.
//
// COMPONENT DELEGATION:
//   RecipesFeed is a separate file (app/components/ui/RecipesFeed.tsx) that
//   handles fetching and rendering the actual recipe cards. Splitting the page
//   into a Server shell + Client feed component keeps the component tree clean
//   and allows the feed to have its own loading, error, and filter state.
// =============================================================================

import { Metadata } from 'next';
import RecipesFeed from '@/app/components/ui/RecipesFeed';

// Static metadata — exported as a plain object for pages with fixed SEO values.
// Next.js merges this with the root layout's metadata object.
// `title` → browser tab + OG title
// `description` → <meta name="description"> used by Google for the search snippet
export const metadata: Metadata = {
  title: 'Horror Recipes & Rituals | Silent Evidence',
  description: 'Cursed foods, blood cocktails, and dark rituals. Cook at your own risk.',
};

export default function RecipesPage() {
  return (
    // min-h-screen ensures a dark background even on short pages
    // py-12 = 48px top/bottom padding; px-4 = 16px horizontal gutter (mobile)
    <main className="min-h-screen bg-gray-950 py-12 px-4">

      {/* max-w-4xl centres a 896px column — wider than recipe detail because
          the feed shows a grid of cards rather than long-form text */}
      <div className="max-w-4xl mx-auto">

        {/* ── Page header — decorative hero section above the feed ────────── */}
        {/* text-center centres all children including the emoji and headings */}
        <div className="text-center mb-10">

          {/* Decorative large emoji — text-5xl = 48px; mb-4 = 16px bottom margin */}

          {/* Page title — &amp; renders the & entity safely in JSX */}
          <h1 className="text-4xl font-bold text-white mb-3">Horror Recipes &amp; Rituals</h1>

          {/* Subtitle — text-lg = 18px; <br /> creates a line break inside the paragraph */}
          <p className="text-gray-400 text-lg">
            Cursed foods. Blood cocktails. Dark rituals.<br />
            Cook at your own risk.
          </p>
        </div>

        {/* ── Recipe feed ─────────────────────────────────────────────────────
            RecipesFeed is a 'use client' component that:
              • Fetches recipes from the API (GET /api/recipes)
              • Renders filter pills (type: food / drink / ritual)
              • Shows recipe cards with emoji reactions
              • Handles loading and empty states internally
            Passing no props here — RecipesFeed manages its own data fetching.
            This is the recommended pattern when the client component owns its state. */}
        <RecipesFeed />

      </div>
    </main>
  );
}
