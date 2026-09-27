'use client';
// app/components/ui/SwipeDiscovery.tsx
// Tinder-style swipe card UI for discovering horror stories.
//
// Gesture behaviour:
//   Swipe RIGHT (or click ❤️) → bookmark the story via POST /api/bookmarks
//   Swipe LEFT  (or click ✕)  → skip to the next card
//
// Implementation notes:
//   • Pointer events (not mouse/touch separately) are used so the same handler
//     works on both mobile and desktop.
//   • Card transform (translateX + rotate) is applied directly to the DOM node
//     during dragging to bypass React's render cycle and keep the animation smooth.
//   • setPointerCapture() ensures we receive pointermove/pointerup events even
//     when the pointer leaves the card boundary mid-drag.
//   • SWIPE_THRESHOLD and MAX_ROTATION are tunable constants at the top of the file.

import { useRef, useState, useCallback } from 'react'; // React hooks for state and performance
import Image from 'next/image'; // Image — Next.js optimised image with fill layout for the card cover
import Link from 'next/link'; // Link — client-side navigation to the full story page

// ── Types ─────────────────────────────────────────────────────────────────────

// Story — the shape of each story object passed in from the server
interface Story {
  id: number; // Unique database ID — used when calling the bookmarks API
  title: string; // Story headline shown in the card
  slug: string; // URL slug for the /story/<slug> link
  excerpt: string | null; // Short description text (optional)
  coverImage: string | null; // Absolute URL for the cover photo (null = gradient fallback)
  mood: string | null; // Mood enum value — used to pick a gradient colour
  author: { username: string }; // Author handle shown below the title
  _count: { likes: number; comments: number }; // Aggregate like + comment counts
}

// Props — only the initial list of stories is required
interface Props {
  initialStories: Story[]; // Server-side pre-fetched stories to swipe through
}

// ── Constants ─────────────────────────────────────────────────────────────────

// SWIPE_THRESHOLD — minimum horizontal drag distance (px) to commit a swipe
const SWIPE_THRESHOLD = 120;

// MAX_ROTATION — maximum tilt angle (degrees) at the full swipe threshold distance
const MAX_ROTATION = 18;

// MOOD_GRADIENTS — maps each Mood enum value to a Tailwind gradient class pair.
// Used as the background when a story has no cover image.
const MOOD_GRADIENTS: Record<string, string> = {
  CREEPY: 'from-gray-800 to-green-950',
  PARANOID: 'from-gray-900 to-yellow-950',
  DISTURBING: 'from-red-950 to-gray-900',
  ATMOSPHERIC: 'from-indigo-950 to-gray-900',
  PSYCHOLOGICAL: 'from-green-950 to-gray-900',
  SUPERNATURAL: 'from-blue-950 to-gray-900',
  GORE: 'from-red-900 to-gray-900',
  JUMPSCARE: 'from-orange-950 to-gray-900',
};

// MOOD_LABELS — human-readable mood labels with emoji for the badge in the card footer
const MOOD_LABELS: Record<string, string> = {
  CREEPY: 'Creepy',
  PARANOID: 'Paranoid',
  DISTURBING: 'Disturbing',
  ATMOSPHERIC: 'Atmospheric',
  PSYCHOLOGICAL: 'Psychological',
  SUPERNATURAL: 'Supernatural',
  GORE: 'Gore',
  JUMPSCARE: 'Jumpscare',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

// saveBookmark — POSTs to /api/bookmarks to save the story.
// Silently no-ops if the request fails (unauthenticated users, network errors, etc.)
// so a failed save never breaks the swipe animation.
async function saveBookmark(storyId: number): Promise<void> {
  try {
    await fetch('/api/bookmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // The bookmarks route expects { storyId } in the request body
      body: JSON.stringify({ storyId }),
    });
  } catch {
    // Swipe UX must not break if the network call fails — swallow the error silently
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SwipeDiscovery({ initialStories }: Props) {
  // currentIndex — the index of the card currently at the top of the stack
  const [currentIndex, setCurrentIndex] = useState(0);

  // badge — which badge overlay is visible: 'save' (right), 'skip' (left), or null (neither)
  const [badge, setBadge] = useState<'save' | 'skip' | null>(null);

  // isFlying — true while the card is animating off the screen after a committed swipe
  const [isFlying, setIsFlying] = useState(false);

  // flyDir — the direction the card flies: 1 = right, -1 = left
  const [flyDir, setFlyDir] = useState<1 | -1>(1);

  // ── Pointer tracking refs ────────────────────────────────────────────────────
  // These are refs (not state) so updating them during drag does NOT trigger re-renders,
  // which keeps the 60fps drag animation smooth.

  // startXRef — the X coordinate where the pointer first went down
  const startXRef = useRef(0);

  // currentXRef — the most recent X coordinate during the active drag
  const currentXRef = useRef(0);

  // isDraggingRef — whether a drag gesture is currently in progress
  const isDraggingRef = useRef(false);

  // cardRef — direct reference to the card DOM element.
  // Transform and opacity are applied directly (style mutation) to avoid re-renders.
  const cardRef = useRef<HTMLDivElement>(null);

  // ── Derived values ───────────────────────────────────────────────────────────

  // story — the currently visible story (null when all cards have been swiped)
  const story = initialStories[currentIndex] ?? null;

  // remaining — how many cards are left (including the current one)
  const remaining = initialStories.length - currentIndex;

  // ── Pointer event handlers ───────────────────────────────────────────────────

  // handlePointerDown — called when the user presses down on the card
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (isFlying) return; // ignore new touches while card is already animating away

      isDraggingRef.current = true; // mark drag as active
      startXRef.current = e.clientX; // record where the drag started
      currentXRef.current = e.clientX; // initialise current position

      // setPointerCapture so we keep receiving move/up events even if the pointer
      // leaves the card element mid-drag (common on fast flicks)
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [isFlying]
  );

  // handlePointerMove — called on every frame while the pointer is held down
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current) return; // ignore moves that started outside the card

    currentXRef.current = e.clientX; // update current drag position

    // delta — how far the card has been dragged from where the press started
    const delta = currentXRef.current - startXRef.current;

    // Clamp rotation so the card never tilts more than MAX_ROTATION degrees
    const rotation = Math.max(
      -MAX_ROTATION,
      Math.min(MAX_ROTATION, (delta / SWIPE_THRESHOLD) * MAX_ROTATION)
    );

    // Apply the transform directly to the DOM node — bypasses React state and re-renders
    if (cardRef.current) {
      cardRef.current.style.transform = `translateX(${delta}px) rotate(${rotation}deg)`;
    }

    // Show the appropriate badge once the drag passes half the threshold
    const half = SWIPE_THRESHOLD / 2;
    if (delta > half) {
      setBadge('save'); // dragging right → SAVE badge
    } else if (delta < -half) {
      setBadge('skip'); // dragging left → SKIP badge
    } else {
      setBadge(null); // not far enough — hide both badges
    }
  }, []);

  // handlePointerUp — called when the user releases the pointer
  const handlePointerUp = useCallback(() => {
    if (!isDraggingRef.current) return; // guard: no active drag to finish
    isDraggingRef.current = false; // mark drag as complete

    // delta — total horizontal distance the card was dragged
    const delta = currentXRef.current - startXRef.current;

    if (Math.abs(delta) >= SWIPE_THRESHOLD) {
      // ── Committed swipe: drag exceeded the threshold — fly the card off ──────
      const dir = delta > 0 ? 1 : -1; // positive delta = right (+1), negative = left (-1)
      commit(dir);
    } else {
      // ── Cancelled swipe: not far enough — snap the card back to centre ───────
      if (cardRef.current) {
        cardRef.current.style.transition = 'transform 0.3s ease'; // smooth spring-back
        cardRef.current.style.transform = 'translateX(0) rotate(0deg)'; // reset position
        // Remove the transition property after the animation finishes so future
        // drags aren't slowed down by easing
        setTimeout(() => {
          if (cardRef.current) cardRef.current.style.transition = '';
        }, 300);
      }
      setBadge(null); // hide whichever badge was showing
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── commit — finalise a swipe in the given direction ────────────────────────

  const commit = useCallback(
    (dir: 1 | -1) => {
      if (!story) return; // safety guard: should never happen but avoids a crash

      // flyX — how far the card needs to travel to leave the viewport entirely
      const flyX = dir * (window.innerWidth + 300);

      setFlyDir(dir); // record direction (used for badge display)
      setIsFlying(true); // block new pointer events during the animation

      // Animate the card flying off the screen
      if (cardRef.current) {
        cardRef.current.style.transition = 'transform 0.4s ease, opacity 0.4s ease';
        cardRef.current.style.transform = `translateX(${flyX}px) rotate(${dir * MAX_ROTATION}deg)`;
        cardRef.current.style.opacity = '0'; // fade out as it flies away
      }

      // If swiped right, save the story as a bookmark (fire-and-forget)
      if (dir === 1) {
        saveBookmark(story.id);
      }

      // After the fly-off animation finishes, advance to the next card
      setTimeout(() => {
        setCurrentIndex((i) => i + 1); // show the next story
        setIsFlying(false); // allow new pointer events again
        setBadge(null); // hide any visible badge

        // Reset all inline styles on the card element so the next story's card
        // starts from a clean, untransformed state
        if (cardRef.current) {
          cardRef.current.style.transition = '';
          cardRef.current.style.transform = '';
          cardRef.current.style.opacity = '';
        }
      }, 420); // 420ms matches the CSS transition duration above
    },
    [story]
  );

  // ── Button handlers (desktop alternative to swiping) ────────────────────────

  // handleSave — briefly flash the SAVE badge then commit a right-swipe
  const handleSave = () => {
    setBadge('save');
    setTimeout(() => commit(1), 80); // 80ms delay so the badge is visible before the card flies
  };

  // handleSkip — briefly flash the SKIP badge then commit a left-swipe
  const handleSkip = () => {
    setBadge('skip');
    setTimeout(() => commit(-1), 80); // same 80ms delay pattern
  };

  // handleRefresh — resets the deck back to the first card
  const handleRefresh = () => {
    setCurrentIndex(0); // jump back to the start of the list
    setBadge(null); // clear any leftover badge state
  };

  // ── Empty state ───────────────────────────────────────────────────────────────
  // When currentIndex has advanced past the last story, show a "you've seen it all" screen

  if (!story) {
    return (
      // Centred column with a ghost emoji, message, and a "Start Over" button
      <div className="flex flex-col items-center justify-center gap-6 py-24 text-center">
        <h2 className="text-2xl font-bold text-white">You&apos;ve seen everything!</h2>
        <p className="text-gray-400">You&apos;ve swiped through all the stories for now.</p>
        {/* Start Over resets currentIndex to 0 so the user can swipe the deck again */}
        <button
          onClick={handleRefresh}
          className="mt-2 px-6 py-3 rounded-xl bg-red-700 hover:bg-red-600 text-white font-semibold transition"
        >
          Start Over
        </button>
      </div>
    );
  }

  // ── Gradient fallback ─────────────────────────────────────────────────────────
  // When the story has no cover image, use the mood-specific gradient;
  // fall back to a neutral dark gradient if the mood isn't in the map.
  const gradientClass =
    story.mood && MOOD_GRADIENTS[story.mood]
      ? MOOD_GRADIENTS[story.mood]
      : 'from-gray-800 to-gray-950';

  // ── Main render ───────────────────────────────────────────────────────────────

  return (
    // Outer column: centres everything and prevents text selection during drag
    <div className="flex flex-col items-center gap-6 py-8 select-none">
      {/* Cards-remaining counter — gives the user a sense of how many are left */}
      <p className="text-sm text-gray-500 font-medium tracking-wide">
        {remaining} {remaining === 1 ? 'story' : 'stories'} left
      </p>

      {/* ── Swipeable card ────────────────────────────────────────────────── */}
      <div
        ref={cardRef} // direct DOM ref so we can mutate transform without React state
        // touch-none: tells the browser to hand ALL pointer events to JS — prevents
        // scroll hijacking on mobile which would break the swipe gesture
        className="relative max-w-sm w-full rounded-2xl shadow-2xl bg-gray-900 border border-gray-800 cursor-grab active:cursor-grabbing touch-none overflow-hidden"
        onPointerDown={handlePointerDown} // start drag tracking
        onPointerMove={handlePointerMove} // update card transform during drag
        onPointerUp={handlePointerUp} // evaluate and resolve the drag
        // Also handle pointer cancel (e.g. interrupted by an incoming call on mobile)
        // using the same logic as pointer up — snaps back or commits based on delta
        onPointerCancel={handlePointerUp}
        suppressHydrationWarning // prevents hydration mismatch warnings from inline styles
      >
        {/* ── SAVE badge (right-swipe feedback) ────────────────────────── */}
        {/* Fades in when the user drags past half the swipe threshold to the right */}
        <div
          className={`absolute top-6 left-4 z-10 px-4 py-1.5 rounded-full border-2 border-green-500 text-green-400 font-extrabold text-lg uppercase tracking-widest rotate-[-20deg] transition-opacity duration-200 ${
            badge === 'save' ? 'opacity-100' : 'opacity-0'
          }`}
          suppressHydrationWarning // suppress hydration warnings on dynamic opacity
        >
          SAVE
        </div>

        {/* ── SKIP badge (left-swipe feedback) ─────────────────────────── */}
        {/* Fades in when the user drags past half the swipe threshold to the left */}
        <div
          className={`absolute top-6 right-4 z-10 px-4 py-1.5 rounded-full border-2 border-red-500 text-red-400 font-extrabold text-lg uppercase tracking-widest rotate-[20deg] transition-opacity duration-200 ${
            badge === 'skip' ? 'opacity-100' : 'opacity-0'
          }`}
          suppressHydrationWarning // suppress hydration warnings on dynamic opacity
        >
          SKIP
        </div>

        {/* ── Cover image or mood-gradient placeholder ──────────────────── */}
        {story.coverImage ? (
          // Aspect-ratio container keeps the image at 16:9
          <div className="aspect-video relative w-full overflow-hidden">
            <Image
              src={story.coverImage} // absolute URL of the cover image
              alt={story.title} // alt text for screen readers
              fill // fills the parent container (next/image fill mode)
              className="object-cover pointer-events-none"
              // draggable={false} prevents the browser's native image drag from
              // stealing pointer capture away from our swipe handler
              draggable={false}
              sizes="(max-width: 640px) 100vw, 384px" // responsive sizing hint for the browser
            />
            {/* Gradient overlay at the bottom improves text readability below the image */}
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 to-transparent" />
          </div>
        ) : (
          // Mood-coloured gradient shown when there is no cover image
          <div
            className={`aspect-video w-full bg-gradient-to-br ${gradientClass} flex items-center justify-center`}
          >
            {/* Faint book emoji as a visual placeholder */}
          </div>
        )}

        {/* ── Card body ─────────────────────────────────────────────────── */}
        <div className="p-5 space-y-3">
          {/* Story title — capped to 2 lines */}
          <h2 className="text-xl font-bold text-white leading-snug line-clamp-2">{story.title}</h2>

          {/* Author attribution */}
          <p className="text-sm text-gray-500">
            by <span className="text-gray-300 font-medium">@{story.author.username}</span>
          </p>

          {/* Excerpt — three-line clamp keeps all cards the same height */}
          {story.excerpt && (
            <p className="text-sm text-gray-400 leading-relaxed line-clamp-3">{story.excerpt}</p>
          )}

          {/* ── Footer row: mood badge + stats ─────────────────────────── */}
          <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
            {/* Mood badge — only rendered when the story has a recognised mood */}
            {story.mood && MOOD_LABELS[story.mood] && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-800 text-gray-300 border border-gray-700">
                {MOOD_LABELS[story.mood]} {/* e.g. "Supernatural" */}
              </span>
            )}

            {/* Like and comment counts — right-aligned with ml-auto */}
            <div className="flex items-center gap-3 text-xs text-gray-500 ml-auto">
              <span>{story._count.likes}</span>
              <span>{story._count.comments}</span>
            </div>
          </div>

          {/* ── Read Story link ────────────────────────────────────────── */}
          {/* Uses onPointerDown + stopPropagation so clicking the link doesn't
              accidentally start a drag gesture on the card */}
          <Link
            href={`/story/${story.slug}`} // full story page URL
            onPointerDown={(e) => e.stopPropagation()} // stop drag handler from firing
            className="block w-full text-center mt-2 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-sm font-medium transition"
          >
            Read Story →
          </Link>
        </div>
      </div>

      {/* ── Desktop action buttons ────────────────────────────────────────── */}
      {/* Gives mouse users a click-based alternative to drag-swiping the card */}
      <div className="flex items-center gap-8 mt-2">
        {/* Skip button — triggers a left-swipe animation */}
        <button
          onClick={handleSkip} // commit a left-swipe
          disabled={isFlying} // disabled while a card is already animating
          aria-label="Skip story"
          className="w-14 h-14 rounded-full flex items-center justify-center text-2xl bg-gray-800 border border-gray-700 hover:border-red-500 hover:bg-red-950 transition disabled:opacity-40 shadow-lg"
        >
          ✕
        </button>

        {/* Save (bookmark) button — triggers a right-swipe animation */}
        <button
          onClick={handleSave} // commit a right-swipe and bookmark
          disabled={isFlying} // disabled while a card is already animating
          aria-label="Save story to bookmarks"
          className="w-14 h-14 rounded-full flex items-center justify-center text-2xl bg-gray-800 border border-gray-700 hover:border-green-500 hover:bg-green-950 transition disabled:opacity-40 shadow-lg"
        ></button>
      </div>

      {/* Hint for new users explaining both interaction methods */}
      <p className="text-xs text-gray-600 -mt-2">Swipe or tap the buttons above</p>
    </div>
  );
}
