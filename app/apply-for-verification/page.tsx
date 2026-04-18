import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import ApplyFormClient from './ApplyFormClient';

export const metadata = { title: 'Apply for Verification — Silent Evidence' };

export default function ApplyForVerificationPage() {
  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <Header />
      <ApplyFormClient />
      <Footer />
    </main>
  );
}
