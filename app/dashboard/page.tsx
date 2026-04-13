// app/dashboard/page.tsx
// Author dashboard page — requires login; shows writing stats and quick actions.

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import DashboardClient from './DashboardClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Author Dashboard — Silent Evidence',
};

export default async function DashboardPage() {
  // Guard: must be logged in
  const c = await cookies();
  const userId = Number(c.get('userId')?.value ?? 0);
  if (!userId) redirect('/login');

  // Fetch the author's display name for the greeting
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { username: true },
  });

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <Header />

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <div className="relative bg-gray-950 border-b border-gray-800 py-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(220,38,38,0.12)_0%,transparent_70%)]" />
        <div className="max-w-4xl mx-auto px-4 relative">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-3xl">📊</span>
            <h1 className="text-3xl font-extrabold text-white">Author Dashboard</h1>
          </div>
          <p className="text-gray-400 text-sm">
            Welcome back, <span className="text-white font-semibold">{user?.username}</span>. Here's how your stories are doing.
          </p>
        </div>
      </div>

      {/* ── Dashboard content ─────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 py-10">
        <DashboardClient />
      </div>

      <Footer />
    </main>
  );
}
