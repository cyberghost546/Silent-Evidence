'use client';
// app/components/ui/TutorialGuide.tsx
// Floating step-by-step onboarding guide — mirrors the ChatBot widget style.
// Auto-opens on first visit (localStorage flag). Re-openable via the book
// icon fixed to the bottom-left corner on every page.

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

// ── Tutorial steps ────────────────────────────────────────────────────────────

const STEPS = [
  {
    emoji: '💀',
    title: 'Welcome to Silent Evidence',
    text: "You've entered the darkest corner of the web. This is a community for horror story readers and writers. Let me show you around — it only takes a minute.",
    tip: null,
    link: null,
  },
  {
    emoji: '📖',
    title: 'Finding Stories',
    text: 'Browse the homepage for the latest and featured stories. Use the Explore menu to filter by genre (Ghost Stories, Paranormal, Supernatural…) or by mood (Creepy, Disturbing, Psychological…).',
    tip: 'Try the Discover page for a swipe-style interface — swipe right to read, left to skip.',
    link: { href: '/discover', label: 'Open Discover →' },
  },
  {
    emoji: '🔍',
    title: 'Search & Your Feed',
    text: 'Use the Search icon to find any story by title, keyword, or tag. Follow authors you love and their new stories will appear in your personal Feed.',
    tip: 'The For You page uses AI to recommend stories based on your reading history.',
    link: { href: '/for-you', label: 'Open For You →' },
  },
  {
    emoji: '❤️',
    title: 'React & Engage',
    text: 'Like stories, leave emoji reactions, vote on the Scare-O-Meter, and drop comments. Bookmark stories to reading lists or save them for offline reading.',
    tip: 'Tap the speaker icon on any story to have it read aloud to you.',
    link: null,
  },
  {
    emoji: '🖊️',
    title: 'Write Your Own Story',
    text: "Got a dark tale to tell? Click Write in the nav bar to open the editor. Pick a genre template or start from scratch. Save as a draft and publish when you're ready.",
    tip: "Writing Sprints give you a timed challenge to beat writer's block.",
    link: { href: '/write', label: 'Open Editor →' },
  },
  {
    emoji: '🕸️',
    title: 'Community',
    text: 'Join the Forums to discuss horror, get writing feedback, or just chat. Create or join Groups around sub-genres you love. Send Direct Messages to other members.',
    tip: 'Post your favourite horror quotes in the Last Words feed on the homepage.',
    link: { href: '/forums', label: 'Open Forums →' },
  },
  {
    emoji: '🏆',
    title: 'Challenges & Competitions',
    text: 'Enter Writing Challenges — a prompt and a deadline — for a chance to be featured. Test your knowledge with the Horror Quiz and climb the Leaderboard.',
    tip: 'Vote in Community Polls and dare your friends to read the scariest stories.',
    link: { href: '/challenges', label: 'View Challenges →' },
  },
  {
    emoji: '⚡',
    title: 'Horror Elite (Premium)',
    text: 'Upgrade to Horror Elite for a gold badge, access to every premium-only story, ad-free reading, and priority leaderboard placement. Monthly or yearly — cancel any time.',
    tip: null,
    link: { href: '/premium', label: 'View Premium →' },
  },
  {
    emoji: '🩸',
    title: "You're all set!",
    text: "That's everything you need to get started. Dive in, find something that chills you to the bone, and don't forget to leave the lights on.",
    tip: 'You can re-open this guide any time by clicking the book icon in the bottom-left.',
    link: null,
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function TutorialGuide() {
  const pathname = usePathname();
  const [open, setOpen]   = useState(false);
  const [step, setStep]   = useState(0);
  const [ready, setReady] = useState(false); // prevents SSR flash

  // On mount — auto-open for first-time visitors (skipped on admin pages)
  useEffect(() => {
    if (pathname.startsWith('/admin')) return;
    setReady(true);
    const seen = localStorage.getItem('se_tutorial_v2');
    if (!seen) {
      const t = setTimeout(() => setOpen(true), 1200);
      return () => clearTimeout(t);
    }
  }, [pathname]);

  // Listen for the dropdown "Site Guide" button event
  useEffect(() => {
    const handler = () => { setStep(0); setOpen(true); };
    window.addEventListener('open-tutorial', handler);
    return () => window.removeEventListener('open-tutorial', handler);
  }, []);

  function dismiss() {
    localStorage.setItem('se_tutorial_v2', '1');
    setOpen(false);
  }

  function next() {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      dismiss();
    }
  }

  function back() {
    setStep(s => Math.max(0, s - 1));
  }

  function reopen() {
    setStep(0);
    setOpen(true);
  }

  const current  = STEPS[step];
  const isLast   = step === STEPS.length - 1;
  const progress = Math.round(((step + 1) / STEPS.length) * 100);

  if (!ready || pathname.startsWith('/admin')) return null;

  return (
    <>
      {/* Floating button removed — open via the profile dropdown "Site Guide" */}

      {/* ── Step panel ── */}
      {open && (
        <div className="fixed bottom-24 left-6 z-50 w-80 sm:w-96 flex flex-col
                        bg-gray-900 border border-green-900/50 rounded-xl
                        shadow-2xl shadow-black/60 overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-green-900/40">
            <div className="flex items-center gap-2">
              <span className="text-lg">👻</span>
              <div>
                <p className="text-sm font-semibold text-green-400">Site Guide</p>
                <p className="text-xs text-gray-500">Step {step + 1} of {STEPS.length}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={dismiss}
              className="text-gray-600 hover:text-gray-400 transition text-xl leading-none"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>

          {/* Progress bar — width calculated from current step, works for any number of steps */}
          <div className="h-1 bg-gray-800">
            <div
              className="h-full bg-green-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Step content */}
          <div className="p-4">
            <div className="flex items-start gap-3">
              {/* Emoji avatar */}
              <div className="w-8 h-8 rounded-full bg-green-900/50 border border-green-800/60
                              flex items-center justify-center text-base shrink-0 mt-0.5">
                {current.emoji}
              </div>

              {/* Bubble */}
              <div className="bg-gray-800 border border-gray-700 rounded-xl rounded-tl-sm px-3 py-2.5 flex-1">
                <p className="text-xs font-bold text-green-400 mb-1">{current.title}</p>
                <p className="text-sm text-gray-300 leading-relaxed">{current.text}</p>

                {/* Tip */}
                {current.tip && (
                  <div className="mt-2.5 flex gap-2 bg-gray-900/60 border border-gray-700 rounded-lg px-2.5 py-2">
                    <span className="text-green-500 text-xs mt-0.5 shrink-0">💡</span>
                    <p className="text-xs text-gray-400 leading-relaxed">{current.tip}</p>
                  </div>
                )}

                {/* Quick-action link */}
                {current.link && (
                  <Link
                    href={current.link.href}
                    onClick={dismiss}
                    className="inline-block mt-2.5 text-xs font-semibold text-green-400 hover:text-green-300 transition"
                  >
                    {current.link.label}
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Navigation footer */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
            {/* Back */}
            <button
              type="button"
              onClick={back}
              disabled={step === 0}
              className="text-xs text-gray-500 hover:text-gray-300 disabled:opacity-0 disabled:pointer-events-none transition"
            >
              ← Back
            </button>

            {/* Step dots */}
            <div className="flex gap-1.5 items-center">
              {STEPS.map((_, i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() => setStep(i)}
                  aria-label={`Go to step ${i + 1}`}
                  className={`rounded-full transition-all duration-200 ${
                    i === step
                      ? 'bg-green-500 w-3 h-1.5'
                      : i < step
                      ? 'bg-green-800 w-1.5 h-1.5'
                      : 'bg-gray-700 w-1.5 h-1.5'
                  }`}
                />
              ))}
            </div>

            {/* Next / Finish */}
            <button
              type="button"
              onClick={next}
              className="text-xs font-semibold text-white bg-green-700 hover:bg-green-600 px-3 py-1.5 rounded-lg transition"
            >
              {isLast ? 'Finish 🩸' : 'Next →'}
            </button>
          </div>

          {/* Skip link */}
          {!isLast && (
            <div className="pb-3 text-center">
              <button
                type="button"
                onClick={dismiss}
                className="text-xs text-gray-700 hover:text-gray-500 transition"
              >
                Skip tutorial
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
