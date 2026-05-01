'use client';
// 'use client' tells Next.js this component runs in the browser, not on the
// server. This is required because it uses React hooks (useState, useEffect)
// and calls fetch() in response to user interactions — neither of which work
// in a Server Component.

/**
 * app/activity/ActivityFeed.tsx
 *
 * WHAT THIS FILE DOES:
 * This is the activity feed — a live, scrollable list of recent events on the
 * platform. Think of it like a Twitter/X timeline, but for horror stories.
 *
 * Three types of events are displayed:
 *   • "story"   — an author published a new story
 *   • "like"    — a user liked a story
 *   • "comment" — a user commented on a story
 *
 * HOW PAGINATION WORKS:
 * When the component mounts it fetches page 1 from /api/activity.
 * If the API says there are more events (hasMore: true), a "Load more" button
 * appears. Clicking it fetches the next page and appends the events to the list.
 *
 * HOW TO REUSE THIS IN A FUTURE PROJECT:
 * 1. Replace the fetch URL (/api/activity) with your own endpoint.
 * 2. Make your API return: { events: [...], hasMore: boolean }.
 * 3. Update the ActivityEvent union type to match your event shapes.
 * 4. Update EventRow to render each event type as you need.
 * The loading skeleton (animate-pulse) and "load more" pattern are generic and
 * work for any paginated list.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Skull, Heart, MessageCircle, Ghost } from 'lucide-react';

// ── TypeScript types ──────────────────────────────────────────────────────────
// Each event type is its own interface so TypeScript can narrow the `type`
// discriminant and give us type-safe access to `data` without casting.

// A story-published event — includes cover image and author avatar for the preview card
type StoryEvent = {
  type: 'story';
  date: string;
  data: {
    id: number;
    title: string;
    slug: string;
    coverImage: string | null;
    author: { username: string; profile: { avatar: string | null } | null };
  };
};

// A like event — only needs the username and the story that was liked
type LikeEvent = {
  type: 'like';
  date: string;
  data: {
    id: number;
    user: { username: string; profile: { avatar: string | null } | null };
    story: { title: string; slug: string };
  };
};

// A comment event — includes a content excerpt shown as a short italic quote
type CommentEvent = {
  type: 'comment';
  date: string;
  data: {
    id: number;
    content: string;
    user: { username: string; profile: { avatar: string | null } | null };
    story: { title: string; slug: string };
  };
};

// Union type — a variable of this type is exactly one of the three event shapes.
// TypeScript uses the `type` field to discriminate which branch you're in.
type ActivityEvent = StoryEvent | LikeEvent | CommentEvent;

// ── Helper functions ──────────────────────────────────────────────────────────

// Returns the URL for a user's avatar image.
// If the user has uploaded a custom avatar it is returned directly.
// Otherwise we fall back to ui-avatars.com which generates a coloured
// circle with the user's initials — no avatar upload required.
function avatarSrc(user: { username: string; profile: { avatar: string | null } | null }) {
  return (
    user.profile?.avatar ??
    `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=dc2626&color=fff&size=40`
  );
}

// Converts an ISO date string to a human-readable relative label.
// The ladder of comparisons (minutes → hours → days → date) means
// we return the most granular unit that fits without losing clarity.
function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime(); // milliseconds since event
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  // Older than 30 days — show an absolute date like "Jan 5"
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── EventRow ──────────────────────────────────────────────────────────────────
// Pure presentational component — given one activity event, renders the correct
// row layout. The `event.type` discriminant lets TypeScript know which fields
// are safe to access inside each `if` branch (no type casting needed).
function EventRow({ event }: { event: ActivityEvent }) {

  // ── Story row ──
  // Shows the author's avatar, an action sentence, and a clickable story card
  // with a thumbnail and the story title.
  if (event.type === 'story') {
    const s = event.data;
    return (
      <div className="flex items-start gap-3 py-4">
        {/* Author avatar — links to the author's profile page */}
        <Image
          src={avatarSrc(s.author)}
          alt={s.author.username}
          width={36}
          height={36}
          className="rounded-full object-cover flex-shrink-0 mt-0.5"
        />
        <div className="flex-1 min-w-0">
          {/* Action sentence: "[username] published a new story" */}
          <p className="text-sm text-gray-300">
            <Link href={`/user/${s.author.username}`} className="font-semibold text-white hover:text-red-300 transition">
              {s.author.username}
            </Link>
            {' '}published a new story
          </p>

          {/* Clickable story preview card — the whole card is a <Link> so
              anywhere the user clicks navigates to the story */}
          <Link
            href={`/story/${s.slug}`}
            className="mt-2 flex items-center gap-3 bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-red-600/40 rounded-xl p-3 transition group"
          >
            {/* Thumbnail — shows cover image if available, skull icon if not */}
            <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-700">
              {s.coverImage ? (
                <Image src={s.coverImage} alt={s.title} width={48} height={48} className="object-cover" />
              ) : (
                // Fallback icon when no cover image has been set
                <div className="w-full h-full flex items-center justify-center">
                  <Skull className="w-5 h-5 text-gray-500" />
                </div>
              )}
            </div>
            {/* `truncate` clips long titles with "…" to keep the row single-line */}
            <span className="text-sm font-medium text-white group-hover:text-red-300 transition truncate">
              {s.title}
            </span>
          </Link>

          <p className="text-xs text-gray-600 mt-1">{timeAgo(event.date)}</p>
        </div>
      </div>
    );
  }

  // ── Like row ──
  // Compact single-line sentence: "[username] ♥ liked [story title]"
  // The Heart icon is rendered inline inside the <p> tag.
  if (event.type === 'like') {
    const l = event.data;
    return (
      <div className="flex items-start gap-3 py-3">
        {/* User avatar */}
        <Image
          src={avatarSrc(l.user)}
          alt={l.user.username}
          width={36}
          height={36}
          className="rounded-full object-cover shrink-0 mt-0.5"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-300">
            <Link href={`/user/${l.user.username}`} className="font-semibold text-white hover:text-red-300 transition">
              {l.user.username}
            </Link>
            {/* Inline Heart icon — `inline` keeps it on the same text baseline */}
            {' '}<Heart className="w-4 h-4 inline text-red-400" />{' '}liked{' '}
            <Link href={`/story/${l.story.slug}`} className="text-red-400 hover:text-red-300 transition">
              {l.story.title}
            </Link>
          </p>
          <p className="text-xs text-gray-600 mt-0.5">{timeAgo(event.date)}</p>
        </div>
      </div>
    );
  }

  // ── Comment row ──
  // Falls through to here when type === 'comment' (TypeScript knows this
  // because the two `if` blocks above have already handled 'story' and 'like').
  const c = event.data;
  return (
    <div className="flex items-start gap-3 py-3">
      {/* User avatar */}
      <Image
        src={avatarSrc(c.user)}
        alt={c.user.username}
        width={36}
        height={36}
        className="rounded-full object-cover shrink-0 mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-300">
          <Link href={`/user/${c.user.username}`} className="font-semibold text-white hover:text-red-300 transition">
            {c.user.username}
          </Link>
          {/* Inline MessageCircle icon for visual context */}
          {' '}<MessageCircle className="w-4 h-4 inline text-gray-400" />{' '}commented on{' '}
          <Link href={`/story/${c.story.slug}`} className="text-red-400 hover:text-red-300 transition">
            {c.story.title}
          </Link>
        </p>
        {/* Comment excerpt — `line-clamp-1` truncates to one line with "…"
            so long comments don't push other events off screen */}
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1 italic">&quot;{c.content}&quot;</p>
        <p className="text-xs text-gray-600 mt-0.5">{timeAgo(event.date)}</p>
      </div>
    </div>
  );
}

// ── ActivityFeed (main export) ────────────────────────────────────────────────
// Manages fetching, pagination state, and renders the list of EventRow items.
export default function ActivityFeed() {
  // `events` holds all activity items fetched so far (grows as pages load)
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  // `page` tracks which page number to request next when "Load more" is clicked
  const [page, setPage] = useState(1);
  // `hasMore` mirrors the API's hasMore flag — controls whether "Load more" shows
  const [hasMore, setHasMore] = useState(false);
  // `loading` is true only during the very first fetch (shows the skeleton)
  const [loading, setLoading] = useState(true);
  // `loadingMore` is true while a subsequent page is fetching (disables the button)
  const [loadingMore, setLoadingMore] = useState(false);

  // Fetch page 1 on mount using a plain Promise chain inside the effect.
  // setState is only called inside the .then() callback (asynchronously), not
  // synchronously in the effect body, which satisfies the linter rule.
  // The `cancelled` flag prevents setState from firing if the component
  // unmounts before the fetch resolves (avoids "update on unmounted component").
  useEffect(() => {
    let cancelled = false;
    fetch('/api/activity?page=1')
      .then(r => r.ok ? r.json() : null)
      .then((data: { events: ActivityEvent[]; hasMore: boolean } | null) => {
        if (cancelled || !data) return;
        setEvents(data.events);
        setHasMore(data.hasMore);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []); // empty array — run once on mount only

  // Called when the user clicks "Load more".
  // This is a plain event handler (not called from an effect), so calling
  // setState here is fine and won't trigger the linter rule.
  const loadMore = async () => {
    const next = page + 1;
    setPage(next);
    setLoadingMore(true);
    const res = await fetch(`/api/activity?page=${next}`);
    if (res.ok) {
      const data = await res.json();
      // Spread the new page's events after the ones already in state
      setEvents(prev => [...prev, ...data.events]);
      setHasMore(data.hasMore);
    }
    setLoadingMore(false);
  };

  // ── Loading state: animated skeleton ──
  // Shown only during the initial page-1 fetch.
  // Array.from({ length: 5 }) creates 5 placeholder rows without needing real data.
  // `animate-pulse` makes the grey boxes fade in and out to signal loading.
  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 py-4 animate-pulse">
            {/* Circular avatar placeholder */}
            <div className="w-9 h-9 rounded-full bg-gray-800 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              {/* Two lines of varying width to mimic real text */}
              <div className="h-3 bg-gray-800 rounded w-2/3" />
              <div className="h-3 bg-gray-800 rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ── Empty state ──
  // Shown after the first fetch completes but there are no events to display.
  // Prompts the user to explore and follow authors so future visits show content.
  if (events.length === 0) {
    return (
      <div className="text-center py-20 text-gray-500">
        <Ghost className="w-12 h-12 mx-auto mb-4 text-gray-500" />
        <p className="font-semibold text-gray-400">Nothing here yet.</p>
        <p className="text-sm mt-1">Follow some authors to see their activity.</p>
        <a
          href="/explore"
          className="inline-block mt-5 px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition"
        >
          Find Authors
        </a>
      </div>
    );
  }

  // ── Normal state: list of events + optional "Load more" button ──
  return (
    <div>
      {/* `divide-y` draws a subtle horizontal rule between each EventRow
          without needing a <hr> in every row component */}
      <div className="divide-y divide-gray-800">
        {events.map((event, i) => (
          // Key combines type + id + index to stay unique even if the same
          // story/like/comment appears in multiple pages (edge case)
          <EventRow key={`${event.type}-${event.data.id}-${i}`} event={event} />
        ))}
      </div>

      {/* "Load more" button — only rendered when the API signals more pages exist.
          `disabled` when a fetch is in-flight to prevent double-clicking. */}
      {hasMore && (
        <div className="text-center mt-8">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white text-sm font-medium rounded-xl transition disabled:opacity-50"
          >
            {/* Button label changes while loading so the user knows it's working */}
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}
