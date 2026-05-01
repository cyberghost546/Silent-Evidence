// app/series/new/page.tsx
//
// Server Component — auth-gated shell for the "Create a Series" form.
//
// PURPOSE:
//   A series is an ordered collection of related stories (e.g. "The Haunting of
//   Blackmoor — Parts 1–5"). Authors create a series here, then attach individual
//   stories to it from the story edit page or the series detail page.
//
// AUTH:
//   Only logged-in users can create series. We read the `userId` cookie and
//   redirect to /login immediately if it's missing (no DB lookup needed — the
//   presence of the cookie is enough to determine that the user is authenticated).
//   The actual form submission will validate the session server-side via the API.
//
// SERVER/CLIENT SPLIT:
//   This Server Component renders the page shell (Header, Footer, title/description).
//   NewSeriesForm is a Client Component because form submission and the subsequent
//   redirect after creation require browser-side logic (fetch + router.push).
//
// `metadata` is the Next.js way to set <title> and <meta description> in the
//   <head> from a Server Component — it's picked up by the RSC renderer automatically.

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
