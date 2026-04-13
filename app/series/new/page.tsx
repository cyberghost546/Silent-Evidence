// app/series/new/page.tsx
// Page for creating a new story series.
// Only logged-in users can access this — redirects to /login if not authenticated.
// A series groups related stories together (e.g. a multi-part anime saga).

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import NewSeriesForm from './NewSeriesForm';

export const metadata = {
  title: 'Create a Series — Silent Evidence',
  description: 'Start a new multi-part horror story series.',
};

export default async function NewSeriesPage() {
  // Auth check — only logged-in users can create series
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0);
  if (!userId) redirect('/login');

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />

      <div className="max-w-xl mx-auto px-4 py-12">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Create a Series</h1>
          <p className="text-gray-500 text-sm mt-1">
            Group your stories into a multi-part series — readers can follow along in order.
          </p>
          <div className="mt-4 h-px bg-gradient-to-r from-red-600/50 to-transparent" />
        </div>

        {/* The form is a client component so it can handle submission and redirect */}
        <NewSeriesForm />
      </div>

      <Footer />
    </main>
  );
}
