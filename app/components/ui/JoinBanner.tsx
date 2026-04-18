// JoinBanner.tsx
// A purely static (no state, no data fetching) call-to-action section shown
// on the home page to invite visitors to register or start writing.
//
// This component is a Server Component by default — it renders only HTML with
// no JavaScript sent to the browser. It's kept intentionally simple because
// no interactivity is needed here.
//
// Two buttons are provided:
//   1. "Create a free account" → /register  (primary, red)
//   2. "Start writing now"     → /write     (secondary, gray)

import Link from 'next/link';

export default function JoinBanner() {
  return (
    // The outer section is positioned as "relative" so that the decorative
    // background glow divs (which are "absolute") are contained inside it.
    // overflow-hidden clips the glow so it doesn't bleed into adjacent sections.
    <section className="relative overflow-hidden bg-gray-900 border-y border-gray-800 py-16">

      {/* ── Decorative background glow effects ────────────────────────────── */}
      {/* These two divs create soft red glows on the left and right edges
          using CSS radial gradients. They're purely visual and pointer-events-none
          is not needed here because they sit behind all content (z-index default). */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_left,_rgba(220,38,38,0.12)_0%,_transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_right,_rgba(220,38,38,0.08)_0%,_transparent_60%)]" />

      {/* ── Content container ─────────────────────────────────────────────── */}
      {/* max-w-4xl centers and limits the width on large screens.
          "relative" ensures this sits above the absolute glow divs. */}
      <div className="max-w-4xl mx-auto px-4 text-center relative">

        {/* ── Pencil icon badge ──────────────────────────────────────────── */}
        {/* A small rounded icon box with a faint red background to draw the
            eye before the heading. The SVG is the Heroicons "pencil" icon. */}
        <div className="inline-flex items-center justify-center w-14 h-14 bg-red-600/10 border border-red-600/20 rounded-2xl mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
          </svg>
        </div>

        {/* ── Main heading ───────────────────────────────────────────────── */}
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
          Do you have a story to tell?
        </h2>

        {/* ── Subheading / pitch copy ────────────────────────────────────── */}
        <p className="text-gray-400 text-lg mb-8 max-w-2xl mx-auto leading-relaxed">
          An epic adventure. A heartfelt romance. A world only you can imagine.
          Silent Evidence is the place to share it.
        </p>

        {/* ── CTA button row ─────────────────────────────────────────────── */}
        {/* Stacks vertically on mobile (flex-col), side by side on sm+ (flex-row).
            Both buttons are full-width on mobile, auto-width on larger screens. */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">

          {/* Primary CTA — takes the visitor to the registration page */}
          <Link
            href="/register"
            className="w-full sm:w-auto px-8 py-3.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition text-sm"
          >
            Create a free account
          </Link>

          {/* Secondary CTA — takes the visitor straight to the story editor.
              If they are not logged in, the /write page will redirect to /login. */}
          <Link
            href="/write"
            className="w-full sm:w-auto px-8 py-3.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white font-semibold rounded-xl transition text-sm"
          >
            Start writing now
          </Link>
        </div>

        {/* ── Social proof micro-copy ────────────────────────────────────── */}
        {/* A one-liner to address common objections (cost, ads, ownership).
            Very small and muted so it doesn't compete with the CTAs. */}
        <p className="mt-8 text-xs text-gray-600">
          Free to join · No ads · Your stories, your rights
        </p>
      </div>
    </section>
  );
}
