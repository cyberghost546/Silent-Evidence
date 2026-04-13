// app/activity/page.tsx
// Activity feed page — shows recent events from users the current user follows.
// Requires authentication; redirects to login if not signed in.

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import ActivityFeed from './ActivityFeed';
import type { Metadata } from 'next';
import { ScrollText } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Activity Feed — Silent Evidence',
  description: 'See what the authors you follow have been up to.',
};

export default async function ActivityPage() {
  // Guard: only signed-in users can see their feed
  const c = await cookies();
  const userId = Number(c.get('userId')?.value ?? 0);
  if (!userId) redirect('/login');

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <Header />

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <div className="relative bg-gray-950 border-b border-gray-800 py-10">
        {/* Subtle radial red glow behind the header */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(220,38,38,0.12)_0%,transparent_70%)]" />
        <div className="max-w-2xl mx-auto px-4 relative">
          <div className="flex items-center gap-3 mb-1">
            <ScrollText className="w-8 h-8 text-red-400" />
            <h1 className="text-3xl font-extrabold text-white">Activity Feed</h1>
          </div>
          <p className="text-gray-400 text-sm">
            Recent stories, likes, and comments from authors you follow.
          </p>
        </div>
      </div>

      {/* ── Feed ──────────────────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <ActivityFeed />
      </div>

      <Footer />
    </main>
  );
}
