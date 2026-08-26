// app/dashboard/page.tsx
//
// Server Component — the author's personal dashboard at /dashboard.
//
// PURPOSE:
//   Shows the logged-in author their story performance stats, comment activity,
//   and quick links to write or edit stories.
//
// WHY SPLIT INTO SERVER + CLIENT?
//   This page (server) only handles the auth check and renders the shell layout
//   (header, greeting, footer). The actual data-heavy dashboard content is in
//   DashboardClient ('use client') which fetches story stats from the API on mount.
//   This split lets the page structure appear immediately while stats load.
//
// AUTH:
//   Requires a valid `userId` cookie. Missing cookie → redirect to /login.
//   The user's username is fetched here (on the server) for the greeting heading
//   so it's visible in the initial HTML — no loading flash on the title.

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import DashboardClient from './DashboardClient';
import AuthorProgress from '@/app/components/ui/AuthorProgress';
import { getAuthorProgress } from '@/lib/authorStatus';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Author Dashboard — Silent Evidence',
};

export default async function DashboardPage() {
  // Read the session cookie — missing or 0 means not logged in
  const c = await cookies();
  const userId = Number(c.get('userId')?.value ?? 0);
  if (!userId) redirect('/login');

  // Fetched together — the dashboard needs both and neither depends on the other.
  const [user, authorProgress] = await Promise.all([
    prisma.user.findUnique({
      where:  { id: userId },
      select: { username: true },
    }),
    getAuthorProgress(userId),
  ]);

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />

      {/* Page header */}
      <div className="border-b border-gray-800 bg-gray-950">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-red-500 mb-1">Author Dashboard</p>
          <h1 className="text-2xl font-bold text-white">
            Welcome back, <span className="text-red-400">{user?.username}</span>
          </h1>
          <p className="text-gray-500 text-sm mt-1">Here's how your stories are performing.</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Author status — placed above the charts because it is the one number
            here a writer can act on, rather than just observe. */}
        <div className="mb-6">
          <AuthorProgress progress={authorProgress} />
        </div>

        <DashboardClient />
      </div>

      <Footer />
    </main>
  );
}
