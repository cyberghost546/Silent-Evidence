// =============================================================================
// app/activity/page.tsx — Activity Feed Page (Server Component)
// =============================================================================
//
// PURPOSE:
//   Renders a personalised activity feed showing recent events (stories, likes,
//   comments) from authors the currently logged-in user follows.
//
// ACCESS CONTROL:
//   Authentication required. If the `userId` cookie is absent or 0, the user is
//   redirected to /login before any database work is performed.
//
// DATA SOURCES:
//   The actual feed data is fetched inside the <ActivityFeed /> client component
//   via its own API call, keeping this server component lean — it only handles
//   auth gating and static layout (Hero header + shell).
//
// SERVER vs CLIENT:
//   This file is a Next.js Server Component (no 'use client' directive), so it
//   runs exclusively on the server. It can read cookies directly and is never
//   bundled into the browser JavaScript. <ActivityFeed /> is a separate Client
//   Component that handles its own data fetching and interactivity.
// =============================================================================

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import ActivityFeed from './ActivityFeed';
import type { Metadata } from 'next';
import { ScrollText } from 'lucide-react';

// Static metadata — Next.js injects these into the <head> at build/request time.
// No auth check needed here because metadata is always public-safe copy.
export const metadata: Metadata = {
  title: 'Activity Feed — Silent Evidence',
  description: 'See what the authors you follow have been up to.',
};

export default async function ActivityPage() {
  // ── Auth guard ────────────────────────────────────────────────────────────
  // `cookies()` from 'next/headers' reads the HTTP cookie header on the server.
  // We await it because Next.js 14 made the cookies() API async so it can work
  // inside streaming/partial-prerendering contexts.
  const c = await cookies();

  // `c.get('userId')?.value` uses optional chaining: if the cookie doesn't exist,
  // `.value` is never accessed and we fall back to '0' via `?? 0`.
  // `Number(...)` converts the string cookie value to an integer for comparison.
  const userId = Number(c.get('userId')?.value ?? 0);

  // Falsy check: userId === 0 means the cookie was missing or invalid.
  // `redirect()` from 'next/navigation' throws a special Next.js error that
  // immediately halts rendering and sends a 307 redirect response — no further
  // code in this function executes after this call.
  if (!userId) redirect('/login');

  // ── Layout ────────────────────────────────────────────────────────────────
  return (
    // `min-h-screen` ensures the dark background fills the full viewport even
    // when the feed is short. `text-white` sets the default text colour for all
    // children so we don't have to repeat it on every element.
    <main className="min-h-screen bg-gray-900 text-white">
      <Header />

      {/* ── Hero ──────────────────────────────────────────────────── */}
      {/*
        `relative` on the outer div creates a positioning context so the
        absolutely-positioned gradient overlay sits behind the content.
      */}
      <div className="relative bg-gray-950 border-b border-gray-800 py-10">
        {/* Subtle radial red glow behind the header — purely decorative.
            The gradient uses `ellipse_60%_50%_at_50%_-10%` to push the glow
            centre above the top of the div, giving a soft bloom effect without
            a hard-edged circle. `transparent_70%` fades it out smoothly. */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(220,38,38,0.12)_0%,transparent_70%)]" />

        {/* `relative` here ensures the text sits on top of the overlay div */}
        <div className="max-w-2xl mx-auto px-4 relative">
          <div className="flex items-center gap-3 mb-1">
            {/* Lucide icon — rendered as an inline SVG at 32×32px */}
            <ScrollText className="w-8 h-8 text-red-400" />
            <h1 className="text-3xl font-extrabold text-white">Activity Feed</h1>
          </div>
          <p className="text-gray-400 text-sm">
            Recent stories, likes, and comments from authors you follow.
          </p>
        </div>
      </div>

      {/* ── Feed ──────────────────────────────────────────────────── */}
      {/*
        `max-w-2xl mx-auto` centres the feed in a readable column width (672 px).
        The actual data fetching happens inside <ActivityFeed />, a Client
        Component that uses SWR or fetch() in a useEffect. By doing it there
        rather than here, we avoid blocking the server render on the feed query,
        and the user sees the shell/header instantly while the feed loads.
      */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <ActivityFeed />
      </div>

      <Footer />
    </main>
  );
}
