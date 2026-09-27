'use client';
// app/components/ui/Skeleton.tsx
// Reusable skeleton loader components — shown while content is loading.
// Skeletons prevent layout shift and give users visual feedback that content is on the way.
// All skeletons use a pulse animation (Tailwind's animate-pulse) to indicate loading.

// ── Base Skeleton ─────────────────────────────────────────────────────────────
// A single pulsing block — the building block for all other skeletons.
interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    // animate-pulse slowly fades in/out to signal loading state
    <div className={`animate-pulse bg-gray-700/60 rounded ${className}`} />
  );
}

// ── Story Card Skeleton ───────────────────────────────────────────────────────
// Matches the layout of a typical story card (cover image + title + meta).
export function StoryCardSkeleton() {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
      {/* Cover image placeholder */}
      <Skeleton className="w-full h-48" />
      <div className="p-4 flex flex-col gap-2">
        {/* Category label */}
        <Skeleton className="h-3 w-20" />
        {/* Title — two lines */}
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-3/4" />
        {/* Author + read time */}
        <div className="flex gap-2 mt-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
    </div>
  );
}

// ── Story Grid Skeleton ───────────────────────────────────────────────────────
// A full grid of story card skeletons — use as a Suspense fallback for story listings.
export function StoryGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <StoryCardSkeleton key={i} />
      ))}
    </div>
  );
}

// ── Comment Skeleton ──────────────────────────────────────────────────────────
// Matches a single comment row (avatar + username + text body).
export function CommentSkeleton() {
  return (
    <div className="flex gap-3">
      {/* Avatar */}
      <Skeleton className="w-9 h-9 rounded-full flex-shrink-0" />
      <div className="flex-1 flex flex-col gap-2">
        {/* Username */}
        <Skeleton className="h-3 w-24" />
        {/* Comment body — 2-3 lines */}
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

// ── Profile Skeleton ──────────────────────────────────────────────────────────
// Matches the user profile header (avatar, username, bio, stats).
export function ProfileSkeleton() {
  return (
    <div className="flex flex-col items-center gap-4 py-8">
      {/* Avatar */}
      <Skeleton className="w-24 h-24 rounded-full" />
      {/* Username */}
      <Skeleton className="h-6 w-40" />
      {/* Bio */}
      <Skeleton className="h-4 w-64" />
      <Skeleton className="h-4 w-48" />
      {/* Stats row */}
      <div className="flex gap-8 mt-2">
        <Skeleton className="h-10 w-16" />
        <Skeleton className="h-10 w-16" />
        <Skeleton className="h-10 w-16" />
      </div>
    </div>
  );
}

// ── Notification Skeleton ─────────────────────────────────────────────────────
// Matches a notification row in the notification bell dropdown.
export function NotificationSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-3 items-start">
          <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
          <div className="flex-1 flex flex-col gap-1.5">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Trending Row Skeleton ─────────────────────────────────────────────────────
// Matches a trending story row (rank number + thumbnail + title/meta).
export function TrendingRowSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 bg-gray-800 border border-gray-700 rounded-xl p-4"
        >
          {/* Rank number */}
          <Skeleton className="w-8 h-8 rounded" />
          {/* Thumbnail */}
          <Skeleton className="w-14 h-14 rounded-lg flex-shrink-0" />
          <div className="flex-1 flex flex-col gap-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}
