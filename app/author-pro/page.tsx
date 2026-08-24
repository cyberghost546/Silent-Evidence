// app/author-pro/page.tsx
// Pricing page for Author Pro — the paid plan for writers.
//
// Distinct from /premium, which sells the READER membership. The two are
// separate products a user may hold independently, so they get separate pages,
// separate Stripe prices, and separate copy. A writer arriving here should not
// be confused about whether it also unlocks other people's premium stories — it
// does not, and the page says so.

import Link from 'next/link';
import { cookies } from 'next/headers';
import {
  DollarSign, Package, Clock, Lock, Headphones, BarChart3, PenLine,
} from 'lucide-react';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import { hasAuthorPro } from '@/lib/authorPro';
import { prisma } from '@/lib/prisma';
import AuthorSubscribeButton from './AuthorSubscribeButton';

export const metadata = {
  title: 'Author Pro',
  description: 'Sell your stories, build bundles, and see exactly how they perform.',
};

const PLANS = [
  {
    id: 'monthly' as const,
    label: 'Monthly',
    price: '$9.99',
    period: '/month',
    badge: null,
    highlight: false,
    cta: 'Start Author Pro',
  },
  {
    id: 'yearly' as const,
    label: 'Yearly',
    price: '$79.99',
    period: '/year',
    badge: 'Save 33%',
    highlight: true,
    cta: 'Start Author Pro Yearly',
  },
];

// Every perk here is enforced server-side. If you add a line, add the gate.
const PERKS = [
  { icon: DollarSign, title: 'Charge for your stories',  text: 'Set a price on any story and keep selling it through Stripe.' },
  { icon: Package,    title: 'Build bundles',            text: 'Package your stories together and sell them as a collection.' },
  { icon: Lock,       title: 'Premium-only stories',     text: 'Publish work exclusively for paying members of the site.' },
  { icon: Clock,      title: 'Early access windows',     text: 'Give members a head start before a story opens to everyone.' },
  { icon: Headphones, title: 'Audio, video & soundtrack', text: 'Attach narration, video, and a Spotify playlist to a story.' },
  { icon: BarChart3,  title: 'Advanced analytics',       text: 'Per-story reads, engagement rate, sales and tips over time.' },
];

export default async function AuthorProPage() {
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0) || null;

  const isAuthorPro = await hasAuthorPro(userId);

  // Distinguish "already paying" from "grandfathered in". A grandfathered author
  // has full access without a subscription, and showing them an "Active plan"
  // button implying they are being billed would be untrue.
  const authorSub = userId
    ? await prisma.authorSubscription.findUnique({
        where: { userId }, select: { status: true },
      })
    : null;
  const isPaying = authorSub?.status === 'active' || authorSub?.status === 'trialing';

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative py-20 px-4 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none select-none" aria-hidden="true">
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-amber-800/20 blur-3xl" />
          <div className="absolute -top-16 -right-16 w-80 h-80 rounded-full bg-orange-600/10 blur-3xl" />
        </div>

        <div className="relative flex justify-center mb-5">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <PenLine className="w-3.5 h-3.5" strokeWidth={2} aria-hidden="true" />
            For writers
          </span>
        </div>

        <h1 className="relative text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
          Go{' '}
          <span className="bg-gradient-to-r from-amber-400 to-orange-300 bg-clip-text text-transparent">
            Author Pro
          </span>
        </h1>
        <p className="relative text-gray-400 text-lg max-w-xl mx-auto">
          Turn your writing into income. Sell stories and bundles, publish early
          to members, and finally see what your readers actually do.
        </p>
      </section>

      {/* ── Grandfathered notice ──────────────────────────────────────────── */}
      {isAuthorPro && !isPaying && (
        <section className="max-w-2xl mx-auto px-4 mb-10">
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 px-6 py-5">
            <p className="font-bold text-emerald-300">You already have Author Pro access</p>
            <p className="text-xs text-gray-400 mt-1">
              You were using these features before Author Pro launched, so your
              account keeps them free of charge. There is nothing to pay.
            </p>
          </div>
        </section>
      )}

      {/* ── Active plan banner ────────────────────────────────────────────── */}
      {isPaying && (
        <section className="max-w-2xl mx-auto px-4 mb-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-amber-500/40 bg-amber-400/10 px-6 py-5">
            <div>
              <p className="font-bold text-amber-300">Your Author Pro plan is active</p>
              <p className="text-xs text-gray-400">Every writing tool below is unlocked.</p>
            </div>
            <a
              href="/api/stripe/portal"
              className="shrink-0 px-4 py-2 rounded-lg text-sm font-semibold bg-gray-800 border border-gray-700 text-gray-300 hover:border-amber-500/50 hover:text-amber-400 transition"
            >
              Manage / Cancel
            </a>
          </div>
        </section>
      )}

      {/* ── Perks ─────────────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-4 pb-4">
        <div className="grid sm:grid-cols-2 gap-3 mb-12">
          {PERKS.map((perk) => (
            <div key={perk.title} className="flex gap-3 bg-gray-900 border border-gray-800 rounded-xl p-4">
              <span className="shrink-0 w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <perk.icon className="w-4 h-4 text-amber-400" strokeWidth={1.75} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">{perk.title}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{perk.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing cards ─────────────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-4 pb-20">
        <div className="grid sm:grid-cols-2 gap-6">
          {PLANS.map((plan) => (
            <div key={plan.id} className="relative flex flex-col">
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 px-3 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-black shadow-[0_0_10px_rgba(251,191,36,0.6)]">
                  {plan.badge}
                </div>
              )}

              <div className={`
                flex-1 flex flex-col rounded-2xl p-6 border
                ${plan.highlight
                  ? 'bg-gray-900 border-amber-500/40 shadow-[0_0_30px_rgba(251,191,36,0.12)]'
                  : 'bg-gray-900 border-gray-800'
                }
              `}>
                <p className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-2">
                  {plan.label}
                </p>
                <div className="flex items-end gap-1 mb-6">
                  <span className="text-4xl font-extrabold text-white">{plan.price}</span>
                  <span className="text-gray-500 pb-1">{plan.period}</span>
                </div>

                <div className="flex-1" />

                <AuthorSubscribeButton
                  plan={plan.id}
                  cta={plan.cta}
                  highlight={plan.highlight}
                  isLoggedIn={!!userId}
                  isAuthorPro={isAuthorPro}
                />
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-gray-600 mt-8">
          Cancel anytime. Payments processed securely by Stripe.
          Author Pro is a plan for writers — it does not include the reader
          membership. Looking to read premium stories instead?{' '}
          <Link href="/premium" className="text-gray-400 hover:text-white underline underline-offset-2">
            See Horror Elite
          </Link>
          .
        </p>
      </section>

      <Footer />
    </main>
  );
}
