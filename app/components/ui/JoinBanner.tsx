// =============================================================================
// JoinBanner.tsx
// =============================================================================
// Purpose:
//   A purely static call-to-action (CTA) section shown on the home page that
//   invites visitors to register for an account or go directly to the story
//   writing editor.
//
// Usage:
//   <JoinBanner />
//   Drop this anywhere on a page layout — it takes no props.
//
// Architecture notes:
//   - This is a React Server Component (RSC) by default because it has no
//     'use client' directive. It renders only HTML with zero JavaScript sent
//     to the browser, which keeps the home page bundle small.
//   - No state, no data fetching, no interactivity — just markup. If you ever
//     need an animated counter or user-specific text here, add 'use client' and
//     convert it to a client component.
//   - Uses Next.js <Link> for the CTA buttons so navigation is client-side and
//     prefetched. Avoid plain <a> tags for internal links.
// =============================================================================

import Link from 'next/link';

export default function JoinBanner() {
  return (
    // ── Outer section ─────────────────────────────────────────────────────────
    // position: relative → required so that the two absolute glow divs (below)
    //   are clipped to this section's bounding box.
    // overflow-hidden → prevents the radial gradient glows from bleeding into
    //   adjacent page sections on screens where the gradient spills out.
    // bg-gray-900 + border-y → gives the section its own visual "lane" distinct
    //   from the rest of the dark page.
    // py-16 → generous top/bottom padding so the section breathes on all screens.
    <section className="relative overflow-hidden bg-gray-900 border-y border-gray-800 py-16">
      {/* ── Decorative background glow effects ──────────────────────────────── */}
      {/*
        These two divs paint soft red elliptical glows behind the content using
        Tailwind's arbitrary-value CSS syntax for radial-gradient backgrounds.

        Why two separate divs?
          One glow sits on the left edge, the other on the right. Together they
          create a subtle "warm light leaking in from both sides" effect without
          using a third-party animation library.

        inset-0 → stretches each div to fill the entire section (top/right/bottom/left: 0).
        They sit at z-index auto (below the relative content div), so they never
        block pointer events or text selection.
      */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_left,_rgba(220,38,38,0.12)_0%,_transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_right,_rgba(220,38,38,0.08)_0%,_transparent_60%)]" />

      {/* ── Content container ─────────────────────────────────────────────── */}
      {/*
        max-w-4xl mx-auto → centers the content block and limits its width so
          the text doesn't stretch uncomfortably wide on large monitors.
        px-4 → horizontal padding on small screens so text doesn't touch the edge.
        text-center → all children are center-aligned by default.
        relative → needed to stack this above the absolute glow divs (z-index
          creates a new stacking context only when explicitly set, but positioning
          this as "relative" ensures it renders on top of the non-positioned glow
          divs in normal document flow).
      */}
      <div className="max-w-4xl mx-auto px-4 text-center relative">
        {/* ── Pencil icon badge ────────────────────────────────────────────── */}
        {/*
          A small square badge with a pencil icon used as a visual "hook" that
          draws the reader's eye before they read the headline.

          inline-flex items-center justify-center → centers the SVG icon both
            horizontally and vertically inside the badge box.
          w-14 h-14 → 56 × 56px square.
          bg-red-600/10 → 10% opacity red fill — subtle tint.
          border border-red-600/20 → 20% opacity red border.
          rounded-2xl → heavy corner radius for a "chip" feel.
          mb-6 → 24px gap between the badge and the headline.

          The SVG is the Heroicons v2 "pencil" icon (MIT licensed).
          stroke="currentColor" → inherits text-red-500 from the parent className.
          strokeWidth={1.5} → thinner stroke than the default 2, matching
            Heroicons' "outline" style.
        */}
        <div className="inline-flex items-center justify-center w-14 h-14 bg-red-600/10 border border-red-600/20 rounded-2xl mb-6">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-7 h-7 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931zm0 0L19.5 7.125"
            />
          </svg>
        </div>

        {/* ── Main headline ────────────────────────────────────────────────── */}
        {/*
          text-3xl md:text-4xl → scales up on medium+ screens.
          font-bold text-white → maximum contrast on dark backgrounds.
          leading-tight → tighter line-height for multi-word headlines so the
            two lines of text feel like one visual unit.
          mb-4 → gap to the sub-copy paragraph.
        */}
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
          Do you have a story to tell?
        </h2>

        {/* ── Sub-copy / pitch paragraph ───────────────────────────────────── */}
        {/*
          text-gray-400 → muted color so it doesn't compete with the headline.
          text-lg → slightly larger than base to remain readable at center.
          max-w-2xl mx-auto → limits line length for comfortable reading even
            when the outer container is wider.
          leading-relaxed → looser line-height for a paragraph of copy.
        */}
        <p className="text-gray-400 text-lg mb-8 max-w-2xl mx-auto leading-relaxed">
          An epic adventure. A heartfelt romance. A world only you can imagine. Silent Evidence is
          the place to share it.
        </p>

        {/* ── CTA button row ───────────────────────────────────────────────── */}
        {/*
          flex-col sm:flex-row → stacks buttons vertically on mobile (easiest to
            tap with a thumb), then places them side by side at sm breakpoint
            (≥ 640px).
          items-center justify-center → centers the group horizontally on all
            screen sizes.
          gap-4 → 16px gap between the two buttons.
        */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {/* Primary CTA — green button leading to the registration page.
              w-full sm:w-auto → full-width on mobile (easier tap target),
                auto-width on sm+ so the button sizes to its text.
              px-8 py-3.5 → generous padding for a prominent click target.
              rounded-xl → consistent pill-adjacent rounding.
              transition → smooth hover color change. */}
          <Link
            href="/register"
            className="w-full sm:w-auto px-8 py-3.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition text-sm"
          >
            Create a free account
          </Link>

          {/* Secondary CTA — takes the visitor to the story writing editor.
              If the user is not authenticated, /write will redirect them to
              /login automatically (handled in the /write page's server-side
              auth guard).
              bg-gray-800 + border → "ghost" style — visually lighter than the
                primary CTA so there's a clear hierarchy between the two actions. */}
          <Link
            href="/write"
            className="w-full sm:w-auto px-8 py-3.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white font-semibold rounded-xl transition text-sm"
          >
            Start writing now
          </Link>
        </div>

        {/* ── Social proof micro-copy ──────────────────────────────────────── */}
        {/*
          A single line that pre-empts the three most common objections a visitor
          might have before signing up (cost, ads, content ownership).
          text-xs text-gray-600 → very small and very muted so it reads as a
            footnote and does NOT compete visually with the CTA buttons above.
          mt-8 → pushes it below the button row with breathing room.
        */}
        <p className="mt-8 text-xs text-gray-600">
          Free to join · No ads · Your stories, your rights
        </p>
      </div>
    </section>
  );
}
