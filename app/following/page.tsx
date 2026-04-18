// app/following/page.tsx — server component wrapper
import { cookies } from 'next/headers';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import FollowingFeedClient from '@/app/components/ui/FollowingFeedClient';

export const metadata = { title: 'Following — Silent Evidence' };

export default async function FollowingPage() {
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0) || null;

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <Header />
      <FollowingFeedClient isLoggedIn={!!userId} />
      <Footer />
    </main>
  );
}
