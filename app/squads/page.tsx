// app/squads/page.tsx
// Horror Squads page — users can create private groups and share stories with friends.
// Reads the userId cookie server-side and passes it to the client component.

import { cookies } from 'next/headers';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import HorrorSquads from '@/app/components/ui/HorrorSquads';

export const metadata = {
  title: 'Horror Squads — Silent Evidence',
  description: 'Create a private horror squad and share horror stories with your friends.',
};

export default async function SquadsPage() {
  // Read userId from cookie — null means guest (not logged in)
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0) || null;

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Page heading */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">🩸 Horror Squads</h1>
          <p className="text-gray-400">
            Create a private group with your friends. Share stories, discuss your fears, stay scared together.
          </p>
        </div>
        {/* Main squad UI — handles create, join, and feed */}
        <HorrorSquads userId={userId} />
      </div>
      <Footer />
    </main>
  );
}
