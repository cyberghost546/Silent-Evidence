'use client';
// app/components/ui/FocusMode.tsx
//
// Distraction-free "Focus Reading" mode. A toggle in the story toolbar opens a
// full-viewport overlay containing only the story text on a near-black ground
// with a soft vignette — no header, footer, sidebar, comments, or chrome. It is
// the immersive counterpart to the reading-preferences panel: it changes what
// surrounds the words, not the words themselves.
//
// DESIGN DECISIONS
//   - Overlay, not a layout change. Rendering a fixed inset-0 layer on top of the
//     page hides all the surrounding chrome for free, without this deep component
//     needing to reach up and mutate the header/footer it doesn't own.
//   - Reuses the reader's own settings. The text uses the same --reading-* CSS
//     custom properties that ReadingPreferences writes, so font, size, spacing and
//     column width carry straight into focus mode.
//   - Respects reduced motion. The vignette breathes very gently for atmosphere,
//     but only when the reader has not asked for reduced motion.
//   - Escape and a close button both exit; body scroll is locked while open so the
//     page behind cannot scroll away underneath.

import { useEffect, useState } from 'react';

export default function FocusMode({ title, contentHtml }: { title: string; contentHtml: string }) {
  const [open, setOpen] = useState(false);

  // Close on Escape, and lock the background from scrolling while focused.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Focus reading mode"
        className="flex items-center gap-1.5 rounded-lg border border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-400 transition hover:border-gray-500 hover:text-white"
      >
        {/* Expand / fullscreen glyph */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4"
          />
        </svg>
        <span className="hidden sm:inline">Focus</span>
      </button>

      {open && (
        <div
          className="focus-overlay fixed inset-0 z-[90] overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Focused reading view"
        >
          {/* Close control — fixed so it stays reachable while scrolling. */}
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Exit focus mode (Esc)"
            className="fixed right-4 top-4 z-10 rounded-full border border-white/10 bg-black/40 px-3 py-2 text-xs font-medium text-gray-400 backdrop-blur transition hover:text-white"
          >
            Exit ✕
          </button>

          <article className="focus-reader mx-auto px-6 py-16 sm:py-24">
            <h1 className="mb-8 text-center text-2xl font-bold text-gray-100 sm:text-3xl">
              {title}
            </h1>
            <div
              className="prose prose-invert prose-lg max-w-none leading-relaxed"
              style={{
                fontFamily: 'var(--reading-font, inherit)',
                fontSize: 'var(--reading-size, inherit)',
                lineHeight: 'var(--reading-leading, inherit)',
              }}
              // Same trusted, sanitised story HTML the page already renders.
              dangerouslySetInnerHTML={{ __html: contentHtml }}
            />
            <p className="mt-16 text-center text-xs text-gray-600">Press Esc to leave focus mode</p>
          </article>

          {/* Scoped styles: the near-black ground, the breathing vignette, and the
              reading column width (honours the reader's --reading-width). */}
          <style>{`
            .focus-overlay {
              background:
                radial-gradient(120% 90% at 50% 0%, #0b0b0d 0%, #060607 55%, #000 100%);
            }
            .focus-overlay::before {
              content: '';
              position: fixed;
              inset: 0;
              pointer-events: none;
              box-shadow: inset 0 0 220px 80px rgba(0,0,0,0.9);
              animation: focusFlicker 7s ease-in-out infinite;
            }
            .focus-reader { max-width: var(--reading-width, 68ch); }
            @keyframes focusFlicker {
              0%, 100% { opacity: 0.9; }
              50% { opacity: 1; }
            }
            @media (prefers-reduced-motion: reduce) {
              .focus-overlay::before { animation: none; }
            }
          `}</style>
        </div>
      )}
    </>
  );
}
