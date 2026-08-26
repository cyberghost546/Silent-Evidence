// app/dashboard/earnings/page.tsx
//
// Author earnings dashboard. Server component handles auth; EarningsClient loads
// the live figures from /api/author/earnings and owns the Stripe Connect and
// withdraw interactions.

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import EarningsClient from './EarningsClient';

export const metadata = { title: 'Earnings — Silent Evidence' };

export default async function EarningsPage() {
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0) || null;
  if (!userId) redirect('/login?from=/dashboard/earnings');

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Earnings</h1>
          <p className="text-gray-500 text-sm mt-1">
            Tips and sales of your stories, chapters, and bundles.
          </p>
        </div>
        <EarningsClient />
      </div>
      <Footer />
    </main>
  );
}
