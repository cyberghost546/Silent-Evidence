// app/bundles/success/page.tsx
// Shown after a successful Stripe Checkout for a bundle purchase.

import Link from 'next/link';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import { PartyPopper } from 'lucide-react';

export const metadata = { title: 'Bundle Purchased — Silent Evidence' };

export default function BundleSuccessPage() {
  return (
    <main className="min-h-screen bg-gray-900 text-white flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="max-w-sm w-full text-center">
          <PartyPopper className="w-12 h-12 mx-auto mb-5 text-yellow-400" />
          <h1 className="text-2xl font-bold text-white mb-2">Bundle unlocked!</h1>
          <p className="text-gray-400 text-sm mb-8">
            Your purchase was successful. All stories in the bundle are now available to read.
          </p>
          <Link href="/bundles" className="inline-block px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition text-sm">
            Browse more bundles
          </Link>
          <div className="mt-4">
            <Link href="/" className="text-xs text-gray-600 hover:text-gray-400 transition">← Back to home</Link>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
