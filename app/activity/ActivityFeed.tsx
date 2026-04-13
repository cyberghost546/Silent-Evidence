'use client';
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

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Skull, Heart, MessageCircle, Ghost } from 'lucide-react';

// Shape of a single activity event returned by /api/activity
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

type LikeEvent = {
  type: 'like';
  date: string;
  data: {
    id: number;
    user: { username: string; profile: { avatar: string | null } | null };
    story: { title: string; slug: string };
  };
};

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

type ActivityEvent = StoryEvent | LikeEvent | CommentEvent;

// Returns a user's avatar src, falling back to generated initials
function avatarSrc(user: { username: string; profile: { avatar: string | null } | null }) {
  return (
    user.profile?.avatar ??
    `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=22c55e&color=fff&size=40`
  );
}

// Human-readable relative time (e.g. "3h ago")
function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Renders a single activity event row based on its type
function EventRow({ event }: { event: ActivityEvent }) {
  if (event.type === 'story') {
    const s = event.data;
    return (
      <div className="flex items-start gap-3 py-4">
        {/* Author avatar */}
        <img
          src={avatarSrc(s.author)}
          alt={s.author.username}
          className="w-9 h-9 rounded-full object-cover flex-shrink-0 mt-0.5"
        />
        <div className="flex-1 min-w-0">
          {/* Action line */}
          <p className="text-sm text-gray-300">
            <Link href={`/user/${s.author.username}`} className="font-semibold text-white hover:text-red-300 transition">
              {s.author.username}
            </Link>
            {' '}published a new story
          </p>
          {/* Story preview card */}
          <Link
            href={`/story/${s.slug}`}
            className="mt-2 flex items-center gap-3 bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-red-600/40 rounded-xl p-3 transition group"
          >
            {/* Thumbnail */}
            <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-700">
              {s.coverImage ? (
                <img src={s.coverImage} alt={s.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><Skull className="w-5 h-5 text-gray-500" /></div>
              )}
            </div>
            <span className="text-sm font-medium text-white group-hover:text-red-300 transition truncate">
              {s.title}
            </span>
          </Link>
          <p className="text-xs text-gray-600 mt-1">{timeAgo(event.date)}</p>
        </div>
      </div>
    );
  }

  if (event.type === 'like') {
    const l = event.data;
    return (
      <div className="flex items-start gap-3 py-3">
        {/* User avatar */}
        <img
          src={avatarSrc(l.user)}
          alt={l.user.username}
          className="w-9 h-9 rounded-full object-cover flex-shrink-0 mt-0.5"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-300">
            <Link href={`/user/${l.user.username}`} className="font-semibold text-white hover:text-red-300 transition">
              {l.user.username}
            </Link>
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

  // type === 'comment'
  const c = event.data;
  return (
    <div className="flex items-start gap-3 py-3">
      {/* User avatar */}
      <img
        src={avatarSrc(c.user)}
        alt={c.user.username}
        className="w-9 h-9 rounded-full object-cover flex-shrink-0 mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-300">
          <Link href={`/user/${c.user.username}`} className="font-semibold text-white hover:text-red-300 transition">
            {c.user.username}
          </Link>
          {' '}<MessageCircle className="w-4 h-4 inline text-gray-400" />{' '}commented on{' '}
          <Link href={`/story/${c.story.slug}`} className="text-red-400 hover:text-red-300 transition">
            {c.story.title}
          </Link>
        </p>
        {/* Comment excerpt — truncated to keep rows compact */}
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1 italic">"{c.content}"</p>
        <p className="text-xs text-gray-600 mt-0.5">{timeAgo(event.date)}</p>
      </div>
    </div>
  );
}

export default function ActivityFeed() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Load the first page on mount
  const loadPage = useCallback(async (p: number, append: boolean) => {
    if (p === 1) setLoading(true);
    else setLoadingMore(true);

    const res = await fetch(`/api/activity?page=${p}`);
    if (res.ok) {
      const json = await res.json();
      setEvents((prev) => append ? [...prev, ...json.events] : json.events);
      setHasMore(json.hasMore);
    }

    setLoading(false);
    setLoadingMore(false);
  }, []);

  useEffect(() => {
    loadPage(1, false);
  }, [loadPage]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    loadPage(next, true);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {/* Skeleton rows while loading */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 py-4 animate-pulse">
            <div className="w-9 h-9 rounded-full bg-gray-800 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-gray-800 rounded w-2/3" />
              <div className="h-3 bg-gray-800 rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

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

  return (
    <div>
      <div className="divide-y divide-gray-800">
        {events.map((event, i) => (
          <EventRow key={`${event.type}-${event.data.id}-${i}`} event={event} />
        ))}
      </div>

      {/* Load more button */}
      {hasMore && (
        <div className="text-center mt-8">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white text-sm font-medium rounded-xl transition disabled:opacity-50"
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}
