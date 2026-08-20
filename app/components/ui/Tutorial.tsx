'use client';
// app/components/ui/Tutorial.tsx
//
// A first-visit tutorial overlay that walks new users through the site's key features.
//
// HOW IT WORKS:
//   - On first visit, the tutorial auto-opens (tracked in localStorage).
//   - Users can skip at any time or step through all 8 slides.
//   - After completing or skipping, a small "?" help button stays in the
//     bottom-right corner so users can reopen the tutorial at any time.
//   - No server interaction — everything is stored in localStorage.

import { useState, useEffect } from 'react';
import { Skull, BookOpen, Search, PenLine, Bell, MessageSquare, SunMoon, Swords } from 'lucide-react';

// ── Tutorial step data ────────────────────────────────────────────────────────
// Each step has an icon, title, description, and an optional tip.
// To add a new step, add an object to this array.
const STEPS = [
  {
    icon: Skull,
    title: 'Welcome to Silent Evidence',
    desc: 'A community for real horror stories — true crime, paranormal encounters, unexplained disappearances, and campfire tales from people who were actually there.',
    tip: 'Use the arrow buttons below to navigate through this tutorial.',
  },
  {
    icon: BookOpen,
    title: 'Read Stories',
    desc: 'Browse the homepage to find Featured Stories, Story of the Day, Trending, and more. Click any story card to start reading.',
    tip: 'Use the Categories menu in the header to find stories by type — True Crime, Paranormal, Haunted Locations, and more.',
  },
  {
    icon: Search,
    title: 'Search & Discover',
    desc: 'Click the search icon in the top-right header to search by title, author, or keyword. Use "Discover" in the Explore menu to browse stories one at a time.',
    tip: 'Try searching for a location near you — you might find a local story.',
  },
  {
    icon: PenLine,
    title: 'Share Your Story',
    desc: 'Have something that happened to you? Click "Write a Story" in the navigation. Pick a template to get started quickly, or start from a blank page.',
    tip: 'Your story is saved as a Draft automatically — you can publish it whenever you\'re ready.',
  },
  {
    icon: Bell,
    title: 'Notifications',
    desc: 'The bell icon in the header shows your notifications — likes, comments, replies, and new followers. A red badge appears when you have unread ones.',
    tip: 'You can also enable Push Notifications in your settings to get alerts even when the site is closed.',
  },
  {
    icon: MessageSquare,
    title: 'Chat & Messages',
    desc: 'The message icon in the header takes you to your direct messages. You can send private messages to any member of the community.',
    tip: 'Follow authors you enjoy — their new stories will appear in your personal feed.',
  },
  {
    icon: SunMoon,
    title: 'Dark & Light Mode',
    desc: 'Click the moon/sun icon in the header to switch between dark mode and light mode. Your preference is saved automatically.',
    tip: 'Dark mode is recommended for the full horror atmosphere.',
  },
  {
    icon: Swords,
    title: 'Challenges & Community',
    desc: 'Join writing challenges, explore the Horror Map to find stories by location, take the trivia quiz, and join or create Horror Squads with other fans.',
    tip: 'Check the Explore menu in the header to find all community features.',
  },
];

export default function Tutorial() {
  // Whether the tutorial overlay is currently visible
  const [open, setOpen] = useState(false);
  // Which step (0-based) the user is on
  const [step, setStep] = useState(0);
  // Whether to show the help button (always shown after first visit)
  const [showHelp, setShowHelp] = useState(false);

  // On mount — check localStorage to decide whether to auto-open
  useEffect(() => {
    const seen = localStorage.getItem('se_tutorial_seen');
    if (!seen) {
      // First visit — open automatically after a short delay
      // so the page has time to render before the overlay appears
      setTimeout(() => setOpen(true), 800);
    }
    // Always show the help button after component mounts
    setShowHelp(true);
  }, []);

  // Mark tutorial as seen and close the overlay
  const close = () => {
    localStorage.setItem('se_tutorial_seen', '1');
    setOpen(false);
    setStep(0);
  };

  // Advance to the next step, or close if on the last step
  const next = () => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      close();
    }
  };

  // Go back one step
  const prev = () => setStep(s => Math.max(0, s - 1));

  // Reopen the tutorial from the help button
  const reopen = () => {
    setStep(0);
    setOpen(true);
  };

  const current = STEPS[step];
  const isLast  = step === STEPS.length - 1;

  return (
    <>
      {/* ── Tutorial overlay ───────────────────────────────────────────────── */}
      {open && (
        // Full-screen backdrop — clicking it does nothing (user must use buttons)
        // so they don't accidentally dismiss mid-tutorial
        <div className="fixed inset-0 z-200 flex items-center justify-center p-4">

          {/* Semi-transparent dark backdrop */}
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

          {/* Tutorial card */}
          <div className="relative w-full max-w-md bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">

            {/* Red top accent bar */}
            <div className="h-1 bg-linear-to-r from-red-700 via-red-500 to-red-700" />

            {/* Header row — step counter + skip button */}
            <div className="flex items-center justify-between px-6 pt-5 pb-2">
              <span className="text-xs text-gray-500 font-mono">
                Step {step + 1} of {STEPS.length}
              </span>
              {/* Skip button — closes immediately without marking all steps seen */}
              <button
                type="button"
                onClick={close}
                className="text-xs text-gray-600 hover:text-gray-400 transition"
              >
                Skip tutorial ✕
              </button>
            </div>

            {/* Progress bar — fills as the user advances through steps.
                Each step fills an equal fraction of the bar width using a grid trick:
                we render STEPS.length columns and colour only the first (step+1) ones. */}
            <div className="mx-6 h-1 bg-gray-800 rounded-full overflow-hidden flex">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 h-full transition-all duration-300 ${
                    i <= step ? 'bg-red-600' : 'bg-transparent'
                  }`}
                />
              ))}
            </div>

            {/* Step content */}
            <div className="px-6 py-8 text-center">
              {/* Large emoji icon for the step */}
              <div className="flex justify-center mb-5"><current.icon className="w-14 h-14 text-gray-400" strokeWidth={1} aria-hidden="true" /></div>

              {/* Step title */}
              <h2 className="text-xl font-bold text-white mb-3">{current.title}</h2>

              {/* Step description */}
              <p className="text-gray-400 text-sm leading-relaxed mb-5">
                {current.desc}
              </p>

              {/* Tip box — highlighted hint shown below the description */}
              {current.tip && (
                <div className="bg-red-600/10 border border-red-600/20 rounded-xl px-4 py-3 text-left">
                  <p className="text-xs text-red-400">
                    <span className="font-bold">Tip: </span>
                    {current.tip}
                  </p>
                </div>
              )}
            </div>

            {/* Navigation buttons — Previous / Next (or Finish on last step) */}
            <div className="px-6 pb-6 flex items-center justify-between gap-3">

              {/* Previous button — hidden on first step */}
              <button
                type="button"
                onClick={prev}
                disabled={step === 0}
                className="px-4 py-2 text-sm text-gray-500 hover:text-white disabled:opacity-0 transition"
              >
                ← Previous
              </button>

              {/* Dot indicators — one dot per step, active dot is red */}
              <div className="flex items-center gap-1.5">
                {STEPS.map((_, i) => (
                  <button
                    type="button"
                    key={i}
                    onClick={() => setStep(i)}
                    className={`rounded-full transition-all duration-200 ${
                      i === step
                        ? 'w-4 h-2 bg-red-500'   // active step — wider pill
                        : 'w-2 h-2 bg-gray-700 hover:bg-gray-500'  // inactive
                    }`}
                    aria-label={`Go to step ${i + 1}`}
                  />
                ))}
              </div>

              {/* Next / Finish button */}
              <button
                type="button"
                onClick={next}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition"
              >
                {isLast ? 'Let\'s go!' : 'Next →'}
              </button>

            </div>
          </div>
        </div>
      )}

      {/* ── Floating help button ───────────────────────────────────────────── */}
      {/* Always visible in bottom-right corner so users can reopen the tutorial.
          Hidden while the tutorial is open to avoid overlap. */}
      {showHelp && !open && (
        <button
          type="button"
          onClick={reopen}
          title="Open tutorial"
          className="fixed bottom-24 right-6 z-100 w-11 h-11 rounded-full bg-gray-800 border border-gray-700 hover:border-red-600 hover:bg-gray-700 text-white text-lg shadow-lg transition-all duration-200 flex items-center justify-center"
        >
          ?
        </button>
      )}
    </>
  );
}
