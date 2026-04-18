'use client';
// StoryActionsDropdown.tsx
// A single "Actions" button on the story page that opens a dropdown menu.
// It groups all story actions (bookmark, share, edit, etc.) in one place
// instead of showing them all as separate buttons.

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import BookmarkButton from './BookmarkButton';
import AddToListButton from './AddToListButton';
import SaveOfflineButton from './SaveOfflineButton';

// ── Props ────────────────────────────────────────────────────────────────────
// Everything the dropdown needs is passed in from the story page (server component).
type Props = {
  storyId: number;          // Database ID of the story — used by bookmark/list/offline APIs
  storySlug: string;        // URL slug e.g. "the-haunted-house-abc12" — used for the edit link
  storyTitle: string;       // Story title — included in share text sent to X / WhatsApp / Reddit
  initialBookmarked: boolean; // Whether the current user has already bookmarked this story
  isLoggedIn: boolean;      // Whether there is a logged-in user — hides Save Offline if false
  initialSaved: boolean;    // Whether the current user has already saved this story for offline reading
  isAuthor: boolean;        // Whether the current user is the story author — shows Edit button if true
};

export default function StoryActionsDropdown({
  storyId, storySlug, storyTitle,
  initialBookmarked, isLoggedIn, initialSaved, isAuthor,
}: Props) {
  // open controls whether the dropdown panel is visible
  const [open, setOpen]     = useState(false);
  // copied tracks whether the "Copy link" action just ran so we can show "Copied!" feedback
  const [copied, setCopied] = useState(false);
  // reported tracks whether the user just submitted a report so we can show a thank-you
  const [reported, setReported]   = useState(false);
  const [reporting, setReporting] = useState(false);

  // ref wraps the whole component so we can detect clicks outside it
  const ref = useRef<HTMLDivElement>(null);

  // ── Close on outside click ───────────────────────────────────────────────
  // Attaches a global mousedown listener. If the click target is outside our
  // wrapper div we close the dropdown.
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handle);
    // Cleanup removes the listener when the component unmounts
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  // ── Copy link ────────────────────────────────────────────────────────────
  // Writes the current page URL to the clipboard, then briefly shows "Copied!"
  const copy = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000); // reset after 2 seconds
  };

  // ── Social share helpers ─────────────────────────────────────────────────
  // Each function builds the platform's share URL with the story title + page URL
  // and opens it in a new tab.

  // Share to X (formerly Twitter)
  const shareX = () =>
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(storyTitle)}&url=${encodeURIComponent(window.location.href)}`, '_blank');

  // Share to WhatsApp — sends title + URL as a message
  const shareWhatsApp = () =>
    window.open(`https://wa.me/?text=${encodeURIComponent(storyTitle + ' ' + window.location.href)}`, '_blank');

  // Share to Reddit — pre-fills the submit form with title + URL
  const shareReddit = () =>
    window.open(`https://reddit.com/submit?title=${encodeURIComponent(storyTitle)}&url=${encodeURIComponent(window.location.href)}`, '_blank');

  // Report — sends a moderation report and shows a confirmation thank-you message
  const report = async () => {
    if (reporting || reported) return;
    setReporting(true);
    try {
      await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId, reason: 'Reported by reader' }),
      });
    } catch { /* show feedback regardless of network error */ }
    setReporting(false);
    setReported(true);
  };

  return (
    // Wrapper div is position:relative so the dropdown panel positions itself below the button
    <div className="relative" ref={ref}>

      {/* ── Trigger button ──────────────────────────────────────────────── */}
      {/* Clicking toggles the dropdown open/closed. The chevron rotates 180° when open. */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-700 bg-gray-800 text-gray-300 hover:text-white hover:border-gray-500 text-sm font-medium transition"
      >
        Actions
        {/* Chevron icon — rotates when dropdown is open */}
        <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* ── Dropdown panel ──────────────────────────────────────────────── */}
      {/* Only rendered when open=true. Positioned absolutely below the trigger button. */}
      {open && (
        <div className="absolute left-0 top-full mt-2 z-50 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-2 flex flex-col gap-1 min-w-[200px]">

          {/* Bookmark — saves/unsaves the story for the logged-in user */}
          {/* The wrapper forces the inner button to stretch full width */}
          <div className="w-full [&>button]:w-full [&>button]:justify-start">
            <BookmarkButton storyId={storyId} initialBookmarked={initialBookmarked} />
          </div>

          {/* Add to List — lets the user add this story to a custom reading list */}
          <div className="w-full [&>button]:w-full [&>button]:justify-start">
            <AddToListButton storyId={storyId} isLoggedIn={isLoggedIn} />
          </div>

          {/* Save Offline — only shown to logged-in users, caches the story in the PWA */}
          {isLoggedIn && (
            <div className="w-full [&>button]:w-full [&>button]:justify-start">
              <SaveOfflineButton storyId={storyId} storySlug={storySlug} initialSaved={initialSaved} />
            </div>
          )}

          {/* Thin divider line separating story actions from share actions */}
          <div className="h-px bg-gray-800 my-1" />

          {/* Copy link — copies the current page URL to the clipboard */}
          <button
            onClick={copy}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition text-left"
          >
            {/* Swap icon + label to green "Copied!" feedback for 2 seconds after clicking */}
            {copied ? (
              <>
                <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-green-400">Copied!</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2m-6 12h8a2 2 0 0 1 2-2v-8a2 2 0 0 1-2-2h-8a2 2 0 0 1-2 2v8a2 2 0 0 1 2 2z" />
                </svg>
                Copy link
              </>
            )}
          </button>

          {/* Share on X — opens X's tweet composer with the story title + URL pre-filled */}
          <button
            onClick={shareX}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition text-left"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            Share on X
          </button>

          {/* Share on WhatsApp — opens WhatsApp with the story title + URL as a message */}
          <button
            onClick={shareWhatsApp}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-300 hover:text-[#25D366] hover:bg-gray-800 rounded-lg transition text-left"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.102.546 4.072 1.5 5.787L0 24l6.418-1.467A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.85 0-3.588-.5-5.082-1.373l-.364-.215-3.808.871.936-3.716-.236-.38A9.937 9.937 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
            </svg>
            Share on WhatsApp
          </button>

          {/* Share on Reddit — opens Reddit's submit page with the story title + URL pre-filled */}
          <button
            onClick={shareReddit}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-300 hover:text-[#ff4500] hover:bg-gray-800 rounded-lg transition text-left"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
            </svg>
            Share on Reddit
          </button>

          {/* Report — lets any logged-in reader flag the story for moderation */}
          {isLoggedIn && !isAuthor && (
            <>
              <div className="h-px bg-gray-800 my-1" />
              <button
                type="button"
                onClick={report}
                disabled={reporting || reported}
                className={`flex items-center gap-2.5 w-full px-3 py-2 text-sm rounded-lg transition text-left disabled:opacity-60 ${reported ? 'text-green-400' : 'text-red-400 hover:bg-gray-800'}`}
              >
                {reported ? (
                  <>
                    <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-green-400">Report received — thanks</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 21l9-18 9 18M9 13h6" />
                    </svg>
                    {reporting ? 'Reporting…' : 'Report story'}
                  </>
                )}
              </button>
            </>
          )}

          {/* Edit — only shown when the logged-in user is the story's author */}
          {isAuthor && (
            <>
              {/* Divider separating share actions from the author-only edit action */}
              <div className="h-px bg-gray-800 my-1" />
              <Link
                href={`/story/${storySlug}/edit`}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit story
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
