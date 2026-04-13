'use client';
// app/components/ui/SaveOfflineButton.tsx
// Client component — lets the user save (or unsave) a story for offline reading.
//
// Behaviour:
//  1. Calls POST /api/offline-saves to save, or DELETE to remove.
//  2. Uses optimistic UI so the button flips state immediately before the server responds.
//  3. After a successful save, uses the Cache API to add the story's page to the
//     'se-offline-stories' cache so the service worker can serve it without internet.
//  4. Only renders if the browser supports Service Workers — on environments that
//     don't have SW support the button still calls the API (bookmarking the save in DB)
//     but the Cache API step is skipped gracefully.

import { useState } from 'react';

// ── Props ─────────────────────────────────────────────────────────────────────
interface SaveOfflineButtonProps {
  storyId:      number;   // DB id used for the API call
  storySlug:    string;   // URL slug used to build the cache path /story/[slug]
  initialSaved: boolean;  // whether the current user already has this story saved
}

export default function SaveOfflineButton({
  storyId,
  storySlug,
  initialSaved,
}: SaveOfflineButtonProps) {
  // ── Service Worker check ───────────────────────────────────────────────────
  // Hide the button entirely on environments without SW support (most desktop
  // browsers do have it, but this guards against older/restricted contexts).
  // We derive this once at render time — it never changes for a given page load.
  const hasSW = typeof window !== 'undefined' && 'serviceWorker' in navigator;

  // ── Local state ───────────────────────────────────────────────────────────
  const [saved,   setSaved]   = useState(initialSaved); // current saved/unsaved state
  const [loading, setLoading] = useState(false);         // prevents double-clicks

  // ── Toggle handler ────────────────────────────────────────────────────────
  const handleToggle = async () => {
    if (loading) return; // guard against rapid taps
    setLoading(true);

    // Optimistic UI: flip the state immediately so the button responds instantly
    const nextSaved = !saved;
    setSaved(nextSaved);

    try {
      if (nextSaved) {
        // ── Save ──────────────────────────────────────────────────────────
        const res = await fetch('/api/offline-saves', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ storyId }),
        });

        if (!res.ok) {
          // Server rejected the save — revert the optimistic flip
          setSaved(false);
        } else {
          // Server confirmed the save — also add the story page to the Cache API
          // so the service worker can serve it when the device is offline.
          // We wrap in try/catch because caches.open() can fail in some browsers
          // even when 'serviceWorker' is in navigator (e.g. private mode in Safari).
          try {
            const cache = await caches.open('se-offline-stories');
            // cache.add() fetches the URL and stores the response atomically
            await cache.add(`/story/${storySlug}`);
          } catch (cacheErr) {
            // Cache API failed — the DB save still went through so the story
            // will be shown in the library, just not served from cache offline.
            console.warn('[SaveOfflineButton] Cache API unavailable:', cacheErr);
          }
        }
      } else {
        // ── Unsave ────────────────────────────────────────────────────────
        const res = await fetch('/api/offline-saves', {
          method:  'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ storyId }),
        });

        if (!res.ok) {
          // Server rejected the delete — revert the optimistic flip
          setSaved(true);
        } else {
          // Also evict the story from the Cache API so stale content is removed
          try {
            const cache = await caches.open('se-offline-stories');
            await cache.delete(`/story/${storySlug}`);
          } catch (cacheErr) {
            console.warn('[SaveOfflineButton] Cache API unavailable:', cacheErr);
          }
        }
      }
    } catch (err) {
      // Network error — revert optimistic state so the user knows it failed
      console.error('[SaveOfflineButton] Request failed:', err);
      setSaved(!nextSaved); // revert to the state before the click
    } finally {
      setLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  // Don't render anything if the browser has no Service Worker support
  if (!hasSW) return null;

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      suppressHydrationWarning
      aria-label={saved ? 'Remove from offline library' : 'Save for offline reading'}
      className={[
        // Base styles — compact pill button
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium',
        'transition-colors duration-150 select-none',
        // Saved state: green tint; unsaved state: dark ghost button
        saved
          ? 'bg-green-900/40 text-green-400 border border-green-700 hover:bg-green-900/60'
          : 'bg-gray-800 text-gray-300 border border-gray-600 hover:bg-gray-700',
        // Dim while the API call is in-flight
        loading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
      ].join(' ')}
    >
      {/* Icon changes to a checkmark when the story is saved */}
      <span aria-hidden="true">{saved ? '✓' : '📥'}</span>
      <span>{saved ? 'Saved Offline' : 'Save Offline'}</span>
    </button>
  );
}
