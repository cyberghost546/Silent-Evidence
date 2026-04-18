// app/dashboard/page.tsx
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
  const c = await cookies();
  const userId = Number(c.get('userId')?.value ?? 0);
  if (!userId) redirect('/login');

  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { username: true },
  });

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
        <DashboardClient />
      </div>

      <Footer />
    </main>
  );
}
