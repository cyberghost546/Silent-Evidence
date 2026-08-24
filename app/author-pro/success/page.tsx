// app/author-pro/success/page.tsx
// Landing page after a successful Author Pro checkout.
//
// This page is a receipt, not a grant of access — the Stripe webhook is what
// writes the AuthorSubscription row. Because the webhook can land a moment after
// the browser redirect, we read the live status here and tell the writer plainly
// if it is still being confirmed rather than showing a success message that
// their account does not yet back up.

import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { PartyPopper, Clock } from 'lucide-react';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import { prisma } from '@/lib/prisma';
import { hasAuthorPro } from '@/lib/authorPro';

export const metadata = { title: 'Welcome to Author Pro' };

export default async function AuthorProSuccessPage() {
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0) || null;
  if (!userId) redirect('/login?next=/author-pro');

  const [isAuthorPro, sub] = await Promise.all([
    hasAuthorPro(userId),
    prisma.authorSubscription.findUnique({
      where: { userId }, select: { plan: true, currentPeriodEnd: true },
    }),
  ]);

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />

      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        {isAuthorPro ? (
          <>
            <div className="inline-flex w-14 h-14 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30 mb-6">
              <PartyPopper className="w-6 h-6 text-amber-400" strokeWidth={1.75} aria-hidden="true" />
            </div>
            <h1 className="text-3xl font-bold mb-3">You&apos;re an Author Pro</h1>
            <p className="text-gray-400 mb-2">
              Every writing tool is unlocked on your account.
            </p>
            {sub?.currentPeriodEnd && (
              <p className="text-xs text-gray-600 mb-8">
                {sub.plan === 'yearly' ? 'Yearly' : 'Monthly'} plan — renews{' '}
                {sub.currentPeriodEnd.toLocaleDateString('en-US', {
                  month: 'long', day: 'numeric', year: 'numeric',
                })}
              </p>
            )}
            <div className="flex flex-wrap gap-3 justify-center">
              <Link
                href="/write"
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-400 text-black transition"
              >
                Write something
              </Link>
              <Link
                href="/dashboard/analytics"
                className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-gray-800 border border-gray-700 text-gray-300 hover:text-white transition"
              >
                See your analytics
              </Link>
            </div>
          </>
        ) : (
          <>
            {/* Payment taken, webhook not yet processed. Say so honestly rather
                than claiming success we cannot verify. */}
            <div className="inline-flex w-14 h-14 items-center justify-center rounded-2xl bg-gray-800 border border-gray-700 mb-6">
              <Clock className="w-6 h-6 text-gray-400" strokeWidth={1.75} aria-hidden="true" />
            </div>
            <h1 className="text-3xl font-bold mb-3">Confirming your payment…</h1>
            <p className="text-gray-400 mb-8">
              Stripe has your payment and we&apos;re waiting for it to be confirmed.
              This usually takes a few seconds. Refresh this page in a moment — if
              it still hasn&apos;t come through after a few minutes, please get in
              touch and we&apos;ll sort it out.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link
                href="/author-pro/success"
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-gray-800 border border-gray-700 text-gray-200 hover:text-white transition"
              >
                Refresh
              </Link>
              <Link
                href="/contact"
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:text-white transition"
              >
                Contact support
              </Link>
            </div>
          </>
        )}
      </div>

      <Footer />
    </main>
  );
}
