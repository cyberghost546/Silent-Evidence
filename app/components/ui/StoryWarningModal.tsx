'use client';
// app/components/ui/StoryWarningModal.tsx
// Full-screen content-warning gate shown before a reader can access a story
// that contains potentially sensitive material (e.g. "Gore, Disturbing imagery").
//
// Behaviour:
//   • The actual story content is rendered but blurred and made non-interactive
//     behind the modal so the page doesn't reflow when the user accepts.
//   • The user must click "I Accept — Read Story" to dismiss the overlay.
//   • Clicking "← Go Back" calls window.history.back() to return to the previous page.
//   • Once accepted, the modal unmounts and the unblurred children are shown directly.

import { useState } from 'react'; // useState — controls whether the warning has been accepted

// ── Props ─────────────────────────────────────────────────────────────────────

type Props = {
  warnings: string; // Comma-separated warning tags from the story record
  // e.g. "Gore, Disturbing imagery, Violence"
  children: React.ReactNode; // The full rendered story content shown after acceptance
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function StoryWarningModal({ warnings, children }: Props) {
  // accepted — false until the user clicks "I Accept"; flipping to true removes the overlay
  const [accepted, setAccepted] = useState(false);

  // Early return: once the user has accepted, render the story content directly
  // with no wrapper at all — the overlay and blurred preview are gone
  if (accepted) return <>{children}</>;

  // ── Render: overlay + blurred preview ────────────────────────────────────────

  return (
    // Fragment so we can render two sibling top-level elements:
    // 1. The blurred story preview underneath
    // 2. The fixed-position modal overlay on top
    <>
      {/* ── Blurred story preview ────────────────────────────────────────── */}
      {/* Renders the story content but blurs it so readers get a sense of the
          page layout without being able to read any text.
          pointer-events-none and select-none prevent interaction with blurred content. */}
      <div className="filter blur-sm pointer-events-none select-none opacity-30">
        {children} {/* The real story HTML — blurred and non-interactive */}
      </div>

      {/* ── Warning overlay ──────────────────────────────────────────────── */}
      {/* Fixed overlay covering the entire viewport; sits above all page content */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
        {/* Modal card — centered, with a red glow border */}
        <div className="relative max-w-md w-full bg-gray-900 border border-red-800/60 rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(220,38,38,0.3)]">
          {/* Decorative red glow blob — sits behind the skull icon at the top */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-red-600/20 blur-3xl rounded-full pointer-events-none" />

          {/* Content area — all text and buttons are relative so they sit above the glow */}
          <div className="relative p-8 text-center">
            {/* Pulsing skull emoji — draws attention and reinforces the horror theme */}

            {/* Modal title */}
            <h2 className="text-2xl font-extrabold text-red-400 mb-1 tracking-tight">
              Content Warning
            </h2>

            {/* Subtitle — sets the tone in smaller uppercase text */}
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-5">
              This story contains sensitive material
            </p>

            {/* ── Warning tag badges ───────────────────────────────────── */}
            {/* Split the warnings string on commas, trim whitespace,
                remove empty strings, then render each as its own badge */}
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {warnings
                .split(',')
                .map((w) => w.trim())
                .filter(Boolean)
                .map((tag) => (
                  // Each warning tag gets its own red badge with a warning emoji prefix
                  <span
                    key={tag} // tag text used as key — warnings are unique by definition
                    className="px-3 py-1 text-xs font-semibold rounded-full bg-red-950 border border-red-700/50 text-red-300"
                  >
                    {tag}
                  </span>
                ))}
            </div>

            {/* Age / comfort confirmation paragraph */}
            <p className="text-sm text-gray-400 mb-8 leading-relaxed">
              By continuing you confirm you are comfortable with the above themes and are of
              appropriate age to read this content.
            </p>

            {/* ── Action buttons ──────────────────────────────────────── */}
            {/* Stack vertically on mobile, side-by-side on sm+ screens */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Go Back button — navigates the browser back one history entry */}
              <button
                onClick={() => window.history.back()} // uses the browser History API to go back
                className="flex-1 px-5 py-3 rounded-xl border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 text-sm font-semibold transition"
              >
                ← Go Back
              </button>

              {/* Accept button — sets accepted to true which unmounts this modal */}
              <button
                onClick={() => setAccepted(true)} // dismiss the overlay and show the story
                className="flex-1 px-5 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition shadow-lg shadow-red-900/40"
              >
                I Accept — Read Story
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
