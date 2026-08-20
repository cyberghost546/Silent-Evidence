'use client';
/**
 * SaveOfflineButton.tsx
 *
 * PURPOSE:
 * A compact pill button that lets a logged-in reader save (or unsave) a horror story
 * for offline reading. It combines two complementary storage strategies:
 *
 *   1. DATABASE (server-side): POST /api/offline-saves persists the save relationship
 *      in the database so the user's offline library is consistent across devices.
 *
 *   2. BROWSER CACHE API (client-side): After a successful save, the story page URL
 *      is added to the 'se-offline-stories' cache so the PWA's service worker can
 *      serve it without a network connection. On unsave, the cache entry is evicted.
 *
 * USAGE:
 *   <SaveOfflineButton
 *     storyId={story.id}
 *     storySlug={story.slug}
 *     initialSaved={userHasSavedThisStory}
 *   />
 *
 * NOTES:
 *   - Returns null on environments without Service Worker support (e.g. very old browsers),
 *     because the offline experience would be meaningless without SW caching.
 *   - Uses optimistic UI: the button flips instantly before the API responds, then
 *     reverts if the request fails, giving immediate feedback without jank.
 *   - suppressHydrationWarning is needed because hasSW (derived from navigator) differs
 *     between server (always false) and client (potentially true).
 */

import { useState } from 'react';
import { Check, Download } from 'lucide-react';

// ── Props ─────────────────────────────────────────────────────────────────────
interface SaveOfflineButtonProps {
  storyId:      number;   // DB id used for the API call body
  storySlug:    string;   // URL slug used to build the cache path: /story/[slug]
  initialSaved: boolean;  // whether the current user already has this story saved (from server)
}

export default function SaveOfflineButton({
  storyId,
  storySlug,
  initialSaved,
}: SaveOfflineButtonProps) {

  // ── Service Worker availability check ─────────────────────────────────────
  // `typeof window !== 'undefined'` is the SSR guard — window doesn't exist on the server.
  // `'serviceWorker' in navigator` checks the browser actually supports SWs.
  // This is computed once at render time; it never changes for the lifetime of the page.
  // If the check fails, the button is hidden entirely (return null below).
  const hasSW = typeof window !== 'undefined' && 'serviceWorker' in navigator;

  // ── Local state ───────────────────────────────────────────────────────────
  // saved — mirrors the current saved/unsaved state. Starts from the prop value
  // (server-rendered truth) and is updated optimistically on each click.
  const [saved,   setSaved]   = useState(initialSaved);

  // loading — true while an API request is in-flight.
  // Prevents rapid double-clicks from sending two conflicting requests.
  const [loading, setLoading] = useState(false);

  // ── Toggle handler ────────────────────────────────────────────────────────
  const handleToggle = async () => {
    // Guard: if already mid-request, do nothing to prevent race conditions.
    if (loading) return;
    setLoading(true);

    // Optimistic UI: flip the saved state immediately so the button responds
    // before the server has replied. If the request fails, we revert below.
    const nextSaved = !saved;
    setSaved(nextSaved);

    try {
      if (nextSaved) {
        // ── SAVE path ────────────────────────────────────────────────────
        // Tell the server to persist the save relationship in the database.
        const res = await fetch('/api/offline-saves', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ storyId }),
        });

        if (!res.ok) {
          // Server rejected the save (e.g. not authenticated, duplicate) —
          // revert the optimistic state so the button returns to "Save Offline".
          setSaved(false);
        } else {
          // Server confirmed — also add the story's page to the browser Cache API
          // so the service worker can serve /story/[slug] when the device is offline.
          // We wrap in its own try/catch because caches.open() can fail in some
          // contexts (private mode Safari, storage quota exceeded, etc.) even when
          // 'serviceWorker' is in navigator, and a cache failure should not undo the DB save.
          try {
            const cache = await caches.open('se-offline-stories');
            // cache.add() fetches the URL and stores the full HTTP response atomically.
            await cache.add(`/story/${storySlug}`);
          } catch (cacheErr) {
            // Cache API unavailable — the DB save still went through, so the story
            // appears in the user's library, it just won't work offline without internet.
            console.warn('[SaveOfflineButton] Cache API unavailable:', cacheErr);
          }
        }
      } else {
        // ── UNSAVE path ──────────────────────────────────────────────────
        // Ask the server to remove the save relationship from the database.
        const res = await fetch('/api/offline-saves', {
          method:  'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ storyId }),
        });

        if (!res.ok) {
          // Server rejected the delete — revert back to "Saved Offline".
          setSaved(true);
        } else {
          // Server confirmed deletion — also evict the cached page from the
          // Cache API so stale content doesn't persist after the user removes the save.
          try {
            const cache = await caches.open('se-offline-stories');
            // cache.delete() removes the specific URL's cached response.
            await cache.delete(`/story/${storySlug}`);
          } catch (cacheErr) {
            console.warn('[SaveOfflineButton] Cache API unavailable:', cacheErr);
          }
        }
      }
    } catch (err) {
      // Network error (fetch itself failed) — revert the optimistic flip so
      // the UI accurately reflects the actual server state.
      console.error('[SaveOfflineButton] Request failed:', err);
      setSaved(!nextSaved); // !nextSaved = original state before this click
    } finally {
      // Always re-enable the button, whether the request succeeded or failed.
      setLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  // Return nothing if the browser cannot support offline caching at all.
  // Avoids showing a button that would create a confusing no-op experience.
  if (!hasSW) return null;

  return (
    <button
      onClick={handleToggle}
      // Prevents clicking while a request is in-flight (visual + functional guard).
      disabled={loading}
      // suppressHydrationWarning: hasSW is always false on the server (no navigator),
      // so the initial render differs from the client hydration — this silences React's warning.
      suppressHydrationWarning
      // Descriptive aria-label tells screen reader users exactly what will happen.
      aria-label={saved ? 'Remove from offline library' : 'Save for offline reading'}
      className={[
        // ── Base styles ──────────────────────────────────────────────────
        // inline-flex + items-center: aligns icon and text on the same baseline.
        // gap-1.5: small space between the icon and label.
        // px-3 py-1.5: comfortable tap target without being oversized.
        // rounded-full: pill shape consistent with other tag/badge elements.
        // text-sm font-medium: readable but compact.
        // select-none: prevents text from being highlighted during rapid clicks.
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium',
        'transition-colors duration-150 select-none',

        // ── State-dependent colours ──────────────────────────────────────
        // saved: green tint signals "this is stored locally" (matches success convention).
        // unsaved: neutral dark ghost button blends with the story page action bar.
        saved
          ? 'bg-green-900/40 text-green-400 border border-green-700 hover:bg-green-900/60'
          : 'bg-gray-800 text-gray-300 border border-gray-600 hover:bg-gray-700',

        // ── Loading state ────────────────────────────────────────────────
        // Dim the button and change cursor while the API call is in-flight.
        // cursor-not-allowed signals to the user that the button is temporarily unavailable.
        loading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
      ].join(' ')}
    >
      {/* Icon — checkmark confirms the story is saved; inbox tray prompts saving */}
      {saved
        ? <Check className="w-4 h-4" strokeWidth={2.5} aria-hidden="true" />
        : <Download className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />}

      {/* Label text — toggled with the icon */}
      <span>{saved ? 'Saved Offline' : 'Save Offline'}</span>
    </button>
  );
}
