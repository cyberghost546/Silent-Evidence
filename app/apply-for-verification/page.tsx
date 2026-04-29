// app/apply-for-verification/page.tsx
// Page where users submit an application to get a verified badge on their profile.
// The form logic lives in ApplyFormClient (client component) — this server page
// just wraps it with the site header and footer.
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
