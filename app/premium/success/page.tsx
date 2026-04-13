// app/premium/success/page.tsx
// Server component — shown after Stripe redirects the user back on successful payment.
// Stripe appends ?session_id=xxx to the URL but we don't need to verify it here;
// the webhook handler (api/stripe/webhook) already fulfilled the subscription in the DB.
// This page is purely celebratory UI.

import Link from 'next/link';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import PremiumBadge from '@/app/components/ui/PremiumBadge';
import Confetti from './Confetti'; // Client component for the particle animation

export default function PremiumSuccessPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col">
      <Header />

      {/* Confetti particle animation runs client-side over the whole viewport */}
      <Confetti />

      {/* ── Hero success card ──────────────────────────────────────────────── */}
      <section className="flex-1 flex items-center justify-center px-4 py-20 relative">

        {/* Decorative background glows */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          {/* Central gold bloom */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-yellow-500/10 blur-[100px]" />
          {/* Red accent at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-red-900/20 to-transparent" />
        </div>

        <div className="relative z-10 max-w-lg w-full text-center">

          {/* ── Animated badge ──────────────────────────────────────────────
              Wrapped in a scale + pulse animation via Tailwind animate classes */}
          <div className="flex justify-center mb-6 animate-bounce">
            <span className="text-7xl leading-none drop-shadow-[0_0_30px_rgba(251,191,36,0.8)]">⚡</span>
          </div>

          {/* Main heading */}
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-3 leading-tight">
            Welcome to{' '}
            <span className="bg-gradient-to-r from-yellow-400 to-amber-300 bg-clip-text text-transparent">
              Anime Elite!
            </span>
          </h1>

          {/* Badge preview */}
          <div className="flex justify-center mt-3 mb-6">
            <PremiumBadge size="md" />
          </div>

          {/* Sub-copy */}
          <p className="text-gray-400 text-base mb-10 leading-relaxed">
            Your subscription is now active. The darkest stories on the web are
            yours to devour. Your elite badge will appear on your profile shortly.
          </p>

          {/* Divider with skulls */}
          <div className="flex items-center gap-3 justify-center mb-8 text-gray-700 text-lg select-none" aria-hidden="true">
            <span>💀</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent" />
            <span>💀</span>
          </div>

          {/* ── Perks reminder ─────────────────────────────────────────────── */}
          <ul className="text-left space-y-3 mb-10 max-w-xs mx-auto">
            {[
              { icon: '⚡', text: 'Anime Elite badge is now showing on your profile' },
              { icon: '🔓', text: 'All premium stories are unlocked' },
              { icon: '👑', text: 'You have priority in leaderboards' },
              { icon: '🩸', text: 'Exclusive blood theme available in settings' },
            ].map((perk) => (
              <li key={perk.text} className="flex items-start gap-3 text-sm text-gray-300">
                <span className="shrink-0 w-6 h-6 flex items-center justify-center bg-gray-800 rounded-full text-sm leading-none">
                  {perk.icon}
                </span>
                {perk.text}
              </li>
            ))}
          </ul>

          {/* ── CTA ─────────────────────────────────────────────────────────── */}
          <Link
            href="/"
            className="
              inline-block px-8 py-3 rounded-xl font-bold text-base
              bg-gradient-to-r from-red-600 to-red-700
              hover:from-red-500 hover:to-red-600
              text-white border border-red-500
              shadow-[0_0_20px_rgba(220,38,38,0.4)]
              transition
            "
          >
            Go to Homepage 💀
          </Link>

          {/* Bottom decorative skulls */}
          <p className="mt-12 text-3xl opacity-10 select-none" aria-hidden="true">
            💀 ⚡ 💀
          </p>
        </div>
      </section>

      <Footer />
    </main>
  );
}
