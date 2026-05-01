// =============================================================================
// app/recipes/[slug]/page.tsx — Individual Horror Recipe Detail Page
// =============================================================================
//
// PURPOSE:
//   Renders the full detail view for a single horror recipe at /recipes/[slug].
//   Shows the recipe's cover image (or an emoji fallback), metadata badges,
//   ingredient list, and step-by-step instructions.
//
// SERVER COMPONENT (no 'use client' directive):
//   This file runs entirely on the server. It can:
//     • Call prisma directly (no API route needed)
//     • Await async operations at the top level
//     • Return notFound() to show Next.js's built-in 404 page
//   It cannot use useState, useEffect, or browser APIs (window, document).
//
// DYNAMIC ROUTE:
//   The folder name [slug] creates a dynamic segment. Next.js passes whatever
//   URL segment appears there as `params.slug`. For example:
//     /recipes/blood-pudding  →  params.slug = 'blood-pudding'
//
// SEO:
//   generateMetadata runs before the page component. It fetches the recipe and
//   sets the <title> tag so search engines and social share previews see the
//   recipe name rather than a generic title.
//
// DATA SHAPE:
//   ingredients and steps are stored as JSON strings in the database
//   (e.g. '["1 cup blood","2 tbsp salt"]'). JSON.parse converts them to real
//   arrays so we can .map() over them in JSX.
// =============================================================================

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';

// Props type — params is a Promise in Next.js 14+ App Router.
// Every dynamic page receives params as a Promise<{ [key]: string }> where
// the key matches the folder name in brackets, e.g. [slug] → { slug: string }.
interface Props { params: Promise<{ slug: string }> }

// -----------------------------------------------------------------------------
// generateMetadata — runs server-side before the page renders
// -----------------------------------------------------------------------------
// Next.js calls this function to build the <head> section of the HTML.
// Returning { title } sets the browser tab title AND the OG title for sharing.
// Returning { title: 'Not Found' } is intentional: if the recipe doesn't exist,
// we won't hit a crash — the page component will call notFound() instead.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // Await params — required in Next.js 14+ because params is now a Promise
  const { slug } = await params;

  // Minimal Prisma query — we only need the title for SEO, so no `include` needed
  const recipe = await prisma.horrorRecipe.findUnique({ where: { slug } });
  if (!recipe) return { title: 'Not Found' };

  // Pipe-separated title follows the pattern: "[Page] | [Section] | [Site]"
  return { title: `${recipe.title} | Horror Recipes | Silent Evidence` };
}

// -----------------------------------------------------------------------------
// RecipeDetailPage — the main page component
// -----------------------------------------------------------------------------
export default async function RecipeDetailPage({ params }: Props) {
  // Destructure the dynamic route param from the awaited Promise
  const { slug } = await params;

  // Fetch the recipe with its author's username.
  // `include` performs a SQL JOIN on the related User table.
  // `select` inside `include` limits what Prisma fetches — we only need username.
  // This avoids sending the user's hashed password or email to the client.
  const raw = await prisma.horrorRecipe.findUnique({
    where: { slug },
    include: { author: { select: { username: true } } },
  });

  // notFound() throws a special Next.js error that renders the nearest not-found.tsx.
  // This also correctly returns a 404 HTTP status to crawlers.
  if (!raw) notFound();

  // Parse JSON-encoded arrays stored in the database.
  // The DB stores these as plain strings (e.g. '["item1","item2"]') because SQL
  // doesn't have a native array type for this schema. JSON.parse brings them
  // back to real JavaScript arrays that we can iterate with .map().
  const ingredients: string[] = raw.ingredients ? JSON.parse(raw.ingredients) : [];
  const steps: string[]       = raw.steps ? JSON.parse(raw.steps) : [];

  // Map each recipe type string to a decorative emoji displayed in the UI.
  // Record<string, string> means: keys are strings, values are strings.
  // Using `?? '🍽️'` provides a safe fallback for any type not in the map.
  const TYPE_ICON: Record<string, string> = { food: '🍖', drink: '🍷', ritual: '🕯️' };

  return (
    // min-h-screen ensures the dark background fills short-content pages
    // py-12 = 48px top/bottom padding; px-4 = 16px horizontal padding on mobile
    <main className="min-h-screen bg-gray-950 py-12 px-4">

      {/* max-w-2xl constrains the readable column width (~672px) for long-form content */}
      <div className="max-w-2xl mx-auto">

        {/* ── Cover image or emoji placeholder ───────────────────────────────
            Conditional rendering pattern: show <img> if image exists, otherwise
            show a large emoji placeholder that fills the same visual space.
            The `{raw.image && ...}` guard prevents rendering a broken <img> tag
            when the field is null.
            eslint-disable-line: next/next/no-img-element — we use <img> instead of
            Next.js <Image> here because recipe images come from user-uploaded URLs
            that may not be on a configured hostname in next.config. */}
        {raw.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={raw.image}
            alt={raw.title}
            // w-full = 100% width; h-56 = 224px fixed height; object-cover crops to fill
            // rounded-2xl = 16px border radius; mb-6 = 24px bottom margin
            className="w-full h-56 object-cover rounded-2xl mb-6"
          />
        )}
        {!raw.image && (
          // Placeholder card when no image has been set. flex+justify-center+items-center
          // centres the emoji both horizontally and vertically inside the fixed-height box.
          <div className="w-full h-40 bg-gray-800 rounded-2xl flex items-center justify-center text-6xl text-gray-700 mb-6">
            {/* TYPE_ICON lookup with nullish coalescing — falls back to generic plate emoji */}
            {TYPE_ICON[raw.type] ?? '🍽️'}
          </div>
        )}

        {/* ── Recipe header — badges, title, description, author ─────────── */}
        <div className="mb-8">

          {/* Metadata badge row — flex-wrap lets badges wrap to the next line on mobile */}
          <div className="flex gap-2 mb-3 flex-wrap">

            {/* Type badge (food / drink / ritual) — `capitalize` makes e.g. "food" → "Food" */}
            <span className="text-sm px-3 py-1 bg-gray-800 border border-gray-700 rounded-full text-gray-400 capitalize">
              {TYPE_ICON[raw.type]} {raw.type}
            </span>

            {/* Difficulty badge */}
            <span className="text-sm px-3 py-1 bg-gray-800 border border-gray-700 rounded-full text-gray-400 capitalize">
              {raw.difficulty}
            </span>

            {/* Prep time — only shown when the field is non-null.
                Optional fields in Prisma schema use Int? which maps to number | null in TS. */}
            {raw.prepMins && (
              <span className="text-sm px-3 py-1 bg-gray-800 border border-gray-700 rounded-full text-gray-400">
                ⏱ {raw.prepMins} min
              </span>
            )}

            {/* Servings — same optional-field conditional pattern */}
            {raw.servings && (
              <span className="text-sm px-3 py-1 bg-gray-800 border border-gray-700 rounded-full text-gray-400">
                🍽 Serves {raw.servings}
              </span>
            )}
          </div>

          {/* Recipe title — text-3xl = 30px; font-black = heaviest weight (900) */}
          <h1 className="text-3xl font-black text-white mb-3">{raw.title}</h1>

          {/* Short description paragraph — leading-relaxed = 1.625 line-height for readability */}
          <p className="text-gray-400 leading-relaxed">{raw.description}</p>

          {/* Author attribution — text-gray-600 keeps it visually de-emphasised */}
          <p className="text-gray-600 text-sm mt-2">by {raw.author.username}</p>
        </div>

        {/* ── Ingredients card ────────────────────────────────────────────── */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
          <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
            <span>🧪</span> Ingredients
          </h2>

          {/* Unordered list — space-y-2 adds 8px between each item */}
          <ul className="space-y-2">
            {/* .map() over the parsed string[] array. `i` is the array index used as React key.
                Using the index as key is acceptable here because the list is never reordered. */}
            {ingredients.map((ing, i) => (
              <li key={i} className="flex items-start gap-2 text-gray-300 text-sm">
                {/* Red bullet point — mt-0.5 nudges it down to align with the first line of text */}
                <span className="text-red-700 mt-0.5">•</span>
                {ing}
              </li>
            ))}
          </ul>
        </div>

        {/* ── Instructions card ───────────────────────────────────────────── */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
            <span>📜</span>
            {/* Conditional label — ritual steps feel more dramatic as "The Ritual" */}
            {raw.type === 'ritual' ? 'The Ritual' : 'Instructions'}
          </h2>

          {/* Ordered list — numbered steps look better than bullets for sequential actions */}
          <ol className="space-y-4">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-4">
                {/* Step number badge — flex-shrink-0 prevents the circle from squishing
                    when the step text is long. w-7 h-7 = 28px fixed circle. */}
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-red-900/40 border border-red-800 flex items-center justify-center text-red-400 text-xs font-bold">
                  {/* i is zero-based so +1 gives human-readable 1, 2, 3 … */}
                  {i + 1}
                </span>
                {/* pt-0.5 = 2px top padding aligns the first line with the centre of the badge */}
                <p className="text-gray-300 text-sm leading-relaxed pt-0.5">{step}</p>
              </li>
            ))}
          </ol>
        </div>

      </div>
    </main>
  );
}
