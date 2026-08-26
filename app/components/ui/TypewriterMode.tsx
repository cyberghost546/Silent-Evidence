'use client';

// TypewriterMode.tsx — Story reading enhancement that "types out" the story text
// letter by letter, simulating an old typewriter effect.
//
// Props:
//   content — the raw HTML string of the story (e.g. from TipTap / the DB)
//
// Behaviour:
//   OFF  — renders the HTML content normally via dangerouslySetInnerHTML
//   ON   — strips all HTML tags from the content to get plain text, then
//          reveals one character every 30 ms using setInterval.
//          A blinking cursor sits at the insertion point.
//          A "Skip" button jumps instantly to the full text.
//          The viewport auto-scrolls to keep the cursor visible as text grows.

import { useEffect, useRef, useState, useCallback } from 'react';

// How many milliseconds to wait between revealing each character
const CHAR_DELAY_MS = 30;

// ─── Helper: strip HTML tags ───────────────────────────────────────────────────
// Converts an HTML string to plain text by creating a temporary DOM element,
// setting its innerHTML, then reading back the innerText.
// Falls back to a simple regex when running on the server (no DOM available).
function htmlToPlainText(html: string): string {
  if (typeof document !== 'undefined') {
    const el = document.createElement('div');
    el.innerHTML = html;
    // innerText respects block-level line breaks better than textContent
    return el.innerText || el.textContent || '';
  }
  // Server-side fallback: strip tags with a regex (not perfect but avoids crashes)
  return html.replace(/<[^>]+>/g, '');
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface TypewriterModeProps {
  /** Raw HTML string of the story body */
  content: string;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function TypewriterMode({ content }: TypewriterModeProps) {
  // Whether typewriter mode is currently enabled
  const [active, setActive] = useState(false);

  // How many characters of the plain-text story have been revealed so far
  const [revealed, setRevealed] = useState(0);

  // The full plain-text version of the story (computed once per content change)
  const [plainText, setPlainText] = useState('');

  // Ref for the interval so we can clear it from any context (toggle, skip, unmount)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Ref for the cursor span so we can scroll it into view
  const cursorRef = useRef<HTMLSpanElement | null>(null);

  // Ref for the output container — used for scrolling
  const outputRef = useRef<HTMLDivElement | null>(null);

  // ── Compute plain text whenever the source HTML changes ─────────────────────
  useEffect(() => {
    setPlainText(htmlToPlainText(content));
  }, [content]);

  // ── Clear the interval helper ────────────────────────────────────────────────
  const clearTypingInterval = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // ── Cleanup on unmount ───────────────────────────────────────────────────────
  useEffect(() => {
    return () => clearTypingInterval();
  }, [clearTypingInterval]);

  // ── Start the typewriter interval when active is toggled ON ─────────────────
  useEffect(() => {
    if (!active) {
      // When mode is turned off, clear any running interval and reset progress
      clearTypingInterval();
      setRevealed(0);
      return;
    }

    // Reset progress each time typewriter mode is activated
    setRevealed(0);

    // Advance the revealed character count by 1 every CHAR_DELAY_MS milliseconds
    intervalRef.current = setInterval(() => {
      setRevealed((prev) => {
        const next = prev + 1;

        // Stop the interval once we've revealed all characters
        if (next >= plainText.length) {
          clearTypingInterval();
        }

        return next;
      });
    }, CHAR_DELAY_MS);

    // Cleanup if effect re-runs (e.g. plainText changed while active)
    return () => clearTypingInterval();
  }, [active, plainText, clearTypingInterval]);

  // ── Auto-scroll: keep the blinking cursor visible as text grows ─────────────
  useEffect(() => {
    if (active && cursorRef.current) {
      // scrollIntoView with 'nearest' avoids jumping the whole page — only scrolls
      // enough to make the cursor visible at the bottom of the viewport
      cursorRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [revealed, active]);

  // ── Skip: jump instantly to the complete text ───────────────────────────────
  function handleSkip() {
    clearTypingInterval();
    setRevealed(plainText.length); // show everything at once
  }

  // ── Toggle typewriter mode on/off ───────────────────────────────────────────
  function handleToggle() {
    setActive((prev) => !prev);
  }

  // Whether all characters have been revealed (typing is complete)
  const isComplete = revealed >= plainText.length;

  return (
    <div className="w-full">
      {/* ── Toolbar: toggle button + skip button ── */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={handleToggle}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all duration-200 ${
            active
              ? 'bg-amber-950 border-amber-700 text-amber-300 hover:bg-amber-900'
              : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 hover:border-zinc-500'
          }`}
        >
          {/* Quill icon */}
          <span>{active ? 'Exit Typewriter Mode' : 'Typewriter Mode'}</span>

          {/* Small animated dot while typing is in progress */}
          {active && !isComplete && (
            <span className="ml-1 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          )}
        </button>

        {/* Skip button — only shown while typewriter is active and typing isn't finished */}
        {active && !isComplete && (
          <button
            onClick={handleSkip}
            className="px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-500 hover:text-zinc-300 hover:border-zinc-500 text-sm transition-colors"
          >
            Skip →
          </button>
        )}

        {/* "Done" badge when typing has completed */}
        {active && isComplete && <span className="text-xs text-zinc-600 italic">— typed</span>}
      </div>

      {/* ── Story content area ── */}
      {active ? (
        // ── Typewriter mode: renders plain text character by character ──────────
        <div
          ref={outputRef}
          className="prose prose-invert max-w-none font-mono text-zinc-300 leading-relaxed whitespace-pre-wrap"
        >
          {/* The revealed portion of the plain text */}
          {plainText.slice(0, revealed)}

          {/* Blinking cursor — hidden once typing is complete */}
          {!isComplete && (
            <span
              ref={cursorRef}
              className="inline-block w-[2px] h-[1.1em] bg-amber-400 ml-0.5 align-middle animate-pulse"
              aria-hidden="true"
            />
          )}
        </div>
      ) : (
        // ── Normal mode: renders HTML content as-is ───────────────────────────
        // dangerouslySetInnerHTML is intentional here — the content comes from
        // the app's own database/editor (TipTap), not from user-supplied raw input.
        <div
          className="prose prose-invert max-w-none text-zinc-300"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: content }}
        />
      )}
    </div>
  );
}
