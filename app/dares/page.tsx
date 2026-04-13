// app/dares/page.tsx
// Dares Inbox page — shows all incoming story dares the logged-in user has received.
// Redirects guests to login since dares are personal.

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import DaresInbox from '@/app/components/ui/DaresInbox';

export const metadata = {
  title: 'Dare Inbox — Silent Evidence',
  description: 'See who dared you to read a horror story.',
};

export default async function DaresPage() {
  // Read userId from cookie — redirect guests to login
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0) || null;

  if (!userId) redirect('/login');

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <Header />
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Page heading */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">👻 Your Dare Inbox</h1>
          <p className="text-gray-400">
            Someone dared you to read something terrifying. Do you have the courage?
          </p>
        </div>
        {/* Inbox component — fetches and displays all incoming dares */}
        <DaresInbox userId={userId} />
      </div>
      <Footer />
    </main>
  );
}
