// app/premium/page.tsx
// Server component — renders the Horror Elite subscription pricing page.
// Reads the current userId from the cookie to personalise the CTA buttons.
// All subscription checkout calls happen client-side inside the embedded
// SubscribeButton component (defined at the bottom of this file) to keep
// this file as one cohesive unit without extra files.

import { cookies } from 'next/headers';
import { Zap, Unlock, Ban, Crown, Palette, Clock, Headphones, Download, Sparkles } from 'lucide-react';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import PremiumBadge from '@/app/components/ui/PremiumBadge';
import { prisma } from '@/lib/prisma';
import SubscribeButtons from './SubscribeButtons';
import { recordFunnelEvent } from '@/lib/funnel';

// ── Plan data ─────────────────────────────────────────────────────────────────

// Centralised plan config keeps pricing in one place
const PLANS = [
  {
    id: 'monthly',
    label: 'Monthly',
    price: '$4.99',
    period: '/month',
    badge: null,              // No extra badge for monthly
    highlight: false,
    cta: 'Subscribe Monthly',
  },
  {
    id: 'yearly',
    label: 'Yearly',
    price: '$39.99',
    period: '/year',
    badge: 'Save 33%',       // Shown as a red callout above the card
    highlight: true,          // Yearly gets a glowing border to draw attention
    cta: 'Subscribe Yearly',
  },
] as const;

// Perks shared by both plans — rendered as a checklist inside each card.
// Keep this honest: every line here is enforced server-side somewhere in the
// codebase. If you add a line, add the gate with it.
const PERKS = [
  { icon: Zap,        text: 'Horror Elite badge on your profile' },
  { icon: Unlock,     text: 'Access all premium-only stories' },
  { icon: Sparkles,   text: 'Your Year in Horror — your personal reading recap' },
  { icon: Clock,      text: 'Early access to new stories before free readers' },
  { icon: Headphones, text: 'Listen to audio narrations' },
  { icon: Download,   text: 'Download stories for offline reading' },
  { icon: Ban,        text: 'No ads, anywhere on the site' },
  { icon: Crown,      text: 'Priority placement in leaderboards' },
  { icon: Palette,    text: 'Exclusive blood theme customization' },
];

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function PremiumPage() {
  // Read the session cookie — userId is 0 when the visitor is not logged in
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0);

  // Check whether this user already has an active premium subscription
  // so we can swap the CTA to a "you're already subscribed" state.
  let isSubscribed = false;
  if (userId) {
    const sub = await prisma.subscription.findFirst({
      where: { userId, status: 'active' },
    });
    isSubscribed = !!sub;
  }

  // Funnel stage 2. Existing subscribers are skipped — they are not in the
  // funnel, and counting them would flatter the conversion rate. Not awaited:
  // instrumentation never delays the page.
  if (userId && !isSubscribed) {
    recordFunnelEvent('premium_viewed', userId).catch(() => {});
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />

      {/* ── Hero section ──────────────────────────────────────────────────── */}
      <section className="relative py-20 px-4 text-center overflow-hidden">

        {/* Decorative skull + glow blobs in the background */}
        <div className="absolute inset-0 pointer-events-none select-none" aria-hidden="true">
          {/* Soft red glow top-left */}
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-red-800/20 blur-3xl" />
          {/* Soft gold glow top-right */}
          <div className="absolute -top-16 -right-16 w-80 h-80 rounded-full bg-yellow-600/10 blur-3xl" />
          {/* Large skull watermark — purely decorative */}
          <span className="absolute top-6 left-1/2 -translate-x-1/2 text-[120px] opacity-5 leading-none">
          </span>
        </div>

        {/* Badge preview */}
        <div className="relative flex justify-center mb-5">
          <PremiumBadge size="md" />
        </div>

        <h1 className="relative text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
          Become a{' '}
          <span className="bg-gradient-to-r from-yellow-400 to-amber-300 bg-clip-text text-transparent">
            Horror Elite
          </span>
        </h1>
        <p className="relative text-gray-400 text-lg max-w-xl mx-auto">
          Support the darkest storytellers on the web. Unlock every chilling tale,
          earn your elite badge, and terrorise the leaderboards.
        </p>
      </section>

      {/* ── Already subscribed banner ──────────────────────────────────────── */}
      {isSubscribed && (
        <section className="max-w-2xl mx-auto px-4 mb-10">
          <div className="
            flex flex-col sm:flex-row items-center justify-between gap-4
            bg-yellow-400/10 border border-yellow-500/40
            rounded-2xl px-6 py-5
            shadow-[0_0_20px_rgba(251,191,36,0.15)]
          ">
            <div className="flex items-center gap-3">
              {/* Gold lightning bolt to mirror the badge */}
              <div>
                <p className="font-bold text-yellow-300">You&apos;re a Horror Elite member!</p>
                <p className="text-xs text-gray-400">All premium perks are unlocked for your account.</p>
              </div>
            </div>
            {/* The cancel flow is handled via the Stripe customer portal.
                We send the user there rather than doing anything server-side here. */}
            <a
              href="/api/stripe/portal"
              className="
                shrink-0 px-4 py-2 rounded-lg text-sm font-semibold
                bg-gray-800 border border-gray-700 text-gray-300
                hover:border-red-500/50 hover:text-red-400 transition
              "
            >
              Manage / Cancel
            </a>
          </div>
        </section>
      )}

      {/* ── Pricing cards ─────────────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-4 pb-20">
        <div className="grid sm:grid-cols-2 gap-6">
          {PLANS.map((plan) => (
            <div key={plan.id} className="relative flex flex-col">

              {/* "Save X%" callout floats above the yearly card */}
              {plan.badge && (
                <div className="
                  absolute -top-3 left-1/2 -translate-x-1/2 z-10
                  px-3 py-0.5 rounded-full text-xs font-bold
                  bg-red-600 text-white shadow-[0_0_10px_rgba(220,38,38,0.6)]
                ">
                  {plan.badge}
                </div>
              )}

              {/* Card shell — highlighted plan gets a glowing gold border */}
              <div className={`
                flex-1 flex flex-col rounded-2xl p-6 border
                ${plan.highlight
                  ? 'bg-gray-900 border-yellow-500/40 shadow-[0_0_30px_rgba(251,191,36,0.12)]'
                  : 'bg-gray-900 border-gray-800'
                }
              `}>

                {/* Plan name */}
                <p className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-2">
                  {plan.label}
                </p>

                {/* Price display */}
                <div className="flex items-end gap-1 mb-6">
                  <span className="text-4xl font-extrabold text-white">{plan.price}</span>
                  <span className="text-gray-500 pb-1">{plan.period}</span>
                </div>

                {/* Perks list — identical for both plans */}
                <ul className="space-y-3 mb-8 flex-1">
                  {PERKS.map((perk) => (
                    <li key={perk.text} className="flex items-start gap-3 text-sm text-gray-300">
                      {/* Icon sits in a small dark pill so it's visually distinct */}
                      <span className="
                        shrink-0 w-6 h-6 flex items-center justify-center
                        bg-gray-800 rounded-full text-base leading-none
                      ">
                        <perk.icon className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
                      </span>
                      {perk.text}
                    </li>
                  ))}
                </ul>

                {/* CTA — delegated to the client component below */}
                <SubscribeButtons
                  plan={plan.id}
                  cta={plan.cta}
                  highlight={plan.highlight}
                  userId={userId || null}
                  isSubscribed={isSubscribed}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Fine print */}
        <p className="text-center text-xs text-gray-600 mt-8">
          Cancel anytime. Payments processed securely by Stripe.
          No refunds on partial periods.
        </p>

        {/* Bottom skull decoration */}
        <div className="text-center mt-10 text-4xl opacity-10 select-none" aria-hidden="true">
        </div>
      </section>

      <Footer />
    </main>
  );
}
