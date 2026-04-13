'use client';
/**
 * SlideshowClient.tsx
 *
 * WHAT THIS FILE DOES:
 * Renders a full-width hero slideshow (carousel) at the top of the homepage.
 * Each slide has a background image, title, optional subtitle, and an optional
 * call-to-action link. Slides auto-advance every 5 seconds. Dot indicators
 * at the bottom let users jump to any slide; left/right arrows allow manual
 * navigation.
 *
 * If an image fails to load (e.g. a broken URL) it is quietly hidden and the
 * slide falls back to the dark gradient background. If there are no slides at
 * all, the HeroFallback component is shown instead.
 *
 * HOW TO REUSE IN A FUTURE PROJECT:
 * 1. Feed it an array of slide objects from your database or CMS.
 * 2. Change the auto-advance interval (currently 5000 ms) to taste.
 * 3. Update HeroFallback's copy and buttons for your brand.
 * 4. The component is entirely self-contained — just drop it in.
 *
 * Example usage (in a Server Component parent):
 *   const slides = await db.slides.findMany({ where: { active: true } });
 *   <SlideshowClient slides={slides} />
 */

import { useState, useEffect, useCallback } from 'react';

// Slide — the shape of each item in the slides array.
type Slide = {
  id: number;
  title: string;
  subtitle: string | null;  // optional tagline shown below the title
  image: string;            // URL of the background image
  linkUrl: string | null;   // optional href for the "Read Story" button
};

export default function SlideshowClient({ slides }: { slides: Slide[] }) {
  // current — the index (0-based) of the slide currently shown
  const [current, setCurrent] = useState(0);

  // imgErrors — tracks which slide IDs have failed to load their image.
  // Using a Record (object) lets us look up any slide's error status in O(1).
  const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({});

  // next — advances to the next slide, wrapping back to 0 after the last slide.
  // Wrapped in useCallback so the function reference is stable between renders
  // (otherwise the useEffect below would re-run on every render).
  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % slides.length);
  }, [slides.length]);

  // ── Auto-advance timer ────────────────────────────────────────────────────
  // setInterval fires `next` every 5 seconds. The cleanup function (returned
  // from useEffect) clears the interval when the component unmounts or when
  // the dependencies change, preventing memory leaks.
  useEffect(() => {
    if (slides.length <= 1) return; // no need to advance if only one slide
    const id = setInterval(next, 5000);
    return () => clearInterval(id);
  }, [next, slides.length]);

  // ── Fallback: no slides in the database ──────────────────────────────────
  if (slides.length === 0) {
    return <HeroFallback />;
  }

  // The currently active slide object
  const slide = slides[current];

  // imageOk — false if this slide's image previously threw an onError event
  const imageOk = !imgErrors[slide.id];

  return (
    // Outer container: full width, fixed height (520px), clips overflowing image edges
    <div className="relative w-full h-[620px] overflow-hidden bg-gray-950">

      {/* Background image — only rendered when imageOk is true.
          key={slide.id} forces React to remount the <img> element when the
          slide changes, which triggers a fresh load and fade-in animation. */}
      {imageOk && (
        <img
          key={slide.id}
          src={slide.image}
          alt={slide.title}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
          // If the image URL is broken, mark it as errored so the fallback background shows
          onError={() => setImgErrors((prev) => ({ ...prev, [slide.id]: true }))}
        />
      )}

      {/* Atmospheric overlays — layered on top of the image:
          1. Dark gradient fades the image to black at the bottom (makes text readable)
          2. Subtle red radial glow at the top for a horror atmosphere */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/30" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(220,38,38,0.08)_0%,transparent_60%)]" />

      {/* Thin red accent line along the very top edge — purely decorative */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-600/30 to-transparent" />

      {/* Slide text content — pinned to the bottom-left of the hero.
          text-on-image is a global CSS class that forces white text regardless of theme. */}
      <div className="absolute inset-0 flex flex-col justify-end px-8 pb-14 max-w-4xl text-on-image">

        {/* "Featured Story" label — small uppercase pill above the title */}
        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-red-400 mb-4">
          <span className="w-4 h-px bg-red-500" />
          Featured Story
        </span>

        {/* Main slide title */}
        <h2 className="text-3xl md:text-5xl font-extrabold text-white leading-tight mb-3 drop-shadow-lg">
          {slide.title}
        </h2>

        {/* Optional subtitle / tagline */}
        {slide.subtitle && (
          <p className="text-gray-300 text-base md:text-lg mb-6 max-w-xl leading-relaxed">
            {slide.subtitle}
          </p>
        )}

        {/* Optional CTA button — only shown if the slide has a linkUrl */}
        {slide.linkUrl && (
          <a
            href={slide.linkUrl}
            className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition text-sm w-fit"
          >
            Read Story
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </a>
        )}
      </div>

      {/* ── Dot indicators ── */}
      {/* One dot per slide. The active dot is wider (w-6) and red; others are small circles.
          Clicking a dot jumps directly to that slide. */}
      {slides.length > 1 && (
        <div className="absolute bottom-5 right-8 flex items-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-1 rounded-full transition-all duration-300 ${
                i === current ? 'w-6 bg-red-500' : 'w-2 bg-gray-600 hover:bg-gray-400'
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* ── Previous / Next arrow buttons ── */}
      {/* Only shown when there are multiple slides to navigate between */}
      {slides.length > 1 && (
        <>
          {/* Previous button — (c - 1 + length) % length wraps around to the last slide */}
          <button
            onClick={() => setCurrent((c) => (c - 1 + slides.length) % slides.length)}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/70 border border-white/10 text-white transition"
            aria-label="Previous slide"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Next button — uses the memoised `next` function defined above */}
          <button
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/70 border border-white/10 text-white transition"
            aria-label="Next slide"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}
    </div>
  );
}

// ── HeroFallback ──────────────────────────────────────────────────────────────
// Shown when there are no slides in the database yet (e.g. a fresh install).
// It renders a branded static hero with two CTA buttons instead.
function HeroFallback() {
  return (
    <div className="relative w-full h-[520px] overflow-hidden bg-gray-950">
      {/* Layered radial glows create depth without needing an actual image */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(220,38,38,0.12)_0%,_transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(220,38,38,0.08)_0%,_transparent_50%)]" />
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-600/30 to-transparent" />

      {/* Centred text content over the dark gradient */}
      {/* text-on-image keeps all text white in light mode — this sits over a dark background */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8 text-on-image">
        {/* Decorative label with flanking lines */}
        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-red-400 mb-6">
          <span className="w-4 h-px bg-red-500" />
          True Accounts · Unexplained Events
          <span className="w-4 h-px bg-red-500" />
        </span>

        {/* Site name */}
        <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight mb-4">
          Silent Evidence
        </h1>

        {/* Tagline */}
        <p className="text-gray-400 text-lg max-w-xl leading-relaxed mb-8">
          Stories that can&apos;t be explained. Accounts that were never meant to be found.
          This is where the truth hides.
        </p>

        {/* Two CTA buttons */}
        <div className="flex gap-4">
          <a href="/search" className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition text-sm">
            Browse Stories
          </a>
          <a href="/register" className="px-6 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white font-semibold rounded-xl transition text-sm">
            Share Yours
          </a>
        </div>
      </div>
    </div>
  );
}
