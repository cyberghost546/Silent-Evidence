// app/acceptable-use/page.tsx
// Static Acceptable Use Policy / Community Guidelines. Referenced by the Terms of
// Service (app/terms/page.tsx) as an incorporated policy.
//
// This is the content-rules layer: what may and may not be posted, how mature
// content is handled, and what happens when the rules are broken. It is written
// to match how the Platform actually enforces — the report tool, automated
// moderation, ratings, and the copyright/illegal-content routes.
//
// Keep in step with: app/copyright/page.tsx, app/api/reports, lib/ageGate.ts,
// lib/toxicityCheck.ts, and the ReportReason enum in prisma/schema.prisma.

import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import Link from 'next/link';

export const metadata = {
  title: 'Acceptable Use Policy — Silent Evidence',
  description: 'What you may and may not post on Silent Evidence, and how we enforce it.',
};

export default function AcceptableUsePage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />
      <div className="max-w-3xl mx-auto px-4 py-14">
        <div className="mb-10">
          <p className="text-xs font-bold uppercase tracking-widest text-red-500 mb-2">Legal</p>
          <h1 className="text-4xl font-bold text-white">Acceptable Use Policy</h1>
          <p className="text-gray-500 text-sm mt-2">Last updated: 25 August 2026</p>
        </div>

        <div className="prose prose-invert prose-sm max-w-none space-y-8 text-gray-300 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-2">1. The Spirit of This Place</h2>
            <p>
              Silent Evidence is a home for horror fiction. Horror explores fear, violence, death,
              and the disturbing — that is welcome here, and this policy is not meant to sanitise
              it. What this policy draws a line around is content that is illegal, that targets or
              harms real people, or that abuses the Platform itself. This policy is part of our{' '}
              <Link
                href="/terms"
                className="text-red-400 hover:text-red-300 underline underline-offset-2"
              >
                Terms of Service
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">2. Fiction vs. Real Harm</h2>
            <p>
              The key distinction we draw is between <em>depicting</em> dark themes in a work of
              fiction and content that causes or promotes <em>real-world</em> harm. A story may
              contain a murderer; it may not be a genuine threat against a real person. A character
              may express hateful views; the work may not itself be hate propaganda aimed at a real
              group. When in doubt, we look at whether real people are being targeted, endangered,
              or degraded outside the frame of the fiction.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">3. Never Permitted</h2>
            <p>
              The following are prohibited regardless of framing, and may be reported to authorities
              where the law requires:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-400">
              <li>
                Any sexual content involving minors, real or fictional, including text. This is a
                zero-tolerance rule and results in immediate removal and a permanent ban.
              </li>
              <li>Content that sexualises a real, identifiable person without consent.</li>
              <li>
                Credible threats of violence against real people, or content that incites or
                coordinates real-world violence or terrorism.
              </li>
              <li>
                Content promoting or providing instructions for serious real-world harm (e.g.
                weapons of mass harm, or encouraging others toward suicide or self-harm).
              </li>
              <li>
                Hate propaganda that dehumanises real people based on race, ethnicity, religion,
                disability, sex, gender identity, or sexual orientation.
              </li>
              <li>Doxxing — publishing private information about a real person without consent.</li>
              <li>Content that is otherwise illegal in the jurisdictions where we operate.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">
              4. Not Allowed on the Platform
            </h2>
            <p>These are not criminal but break our community rules:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-400">
              <li>Harassment, bullying, or targeted abuse of other users.</li>
              <li>Hate speech or slurs directed at other users.</li>
              <li>Posting content that infringes someone else&apos;s copyright or trademark.</li>
              <li>Impersonating another person, author, or Silent Evidence staff.</li>
              <li>Spam, scams, chain messages, or unsolicited advertising and promotion.</li>
              <li>
                Deliberately mis-rating mature content to reach readers who should not see it (see
                section 5).
              </li>
              <li>
                Sharing another user&apos;s private information or communications without consent.
              </li>
              <li>
                Automated scraping, bulk downloading, or attempts to overload, probe, or circumvent
                the security of the Platform.
              </li>
              <li>Using another user&apos;s account, or creating accounts to evade a ban.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">
              5. Mature Content &amp; Ratings
            </h2>
            <p>
              Because horror is often intense, authors must rate their work honestly (ALL, TEEN, or
              MATURE) and add content warnings for material such as graphic gore, sexual violence,
              or self-harm. Readers only see content their age band permits. Rating mature work as
              suitable for younger readers, to widen its audience, is a serious breach and we may
              re-rate, restrict, or remove it and act against the account.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">6. Reporting</h2>
            <p>
              Every story, comment, and forum post has a <strong>Report</strong> option. Use it to
              flag content you believe breaks these rules — including copyright infringement and
              illegal content, which have dedicated options. For formal copyright or illegal-content
              notices, see our{' '}
              <Link
                href="/copyright"
                className="text-red-400 hover:text-red-300 underline underline-offset-2"
              >
                Copyright &amp; Illegal Content Policy
              </Link>
              . Reports are reviewed by a person; do not misuse reporting to harass authors.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">7. How We Enforce</h2>
            <p>
              New stories and comments pass an automated moderation check before publishing, and
              flagged content may be blocked. Beyond that, depending on severity and history, we
              may:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-400">
              <li>Remove or hide the content and notify you with a reason;</li>
              <li>Issue a warning;</li>
              <li>Restrict features, or temporarily suspend the account;</li>
              <li>Permanently ban the account for serious or repeated breaches.</li>
            </ul>
            <p className="mt-3">
              The most serious categories in section 3 lead straight to removal and a ban. Where we
              act against your content or account, we tell you why and, where required, how to
              appeal.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">8. Appeals</h2>
            <p>
              If you believe we got a decision wrong, you can appeal — the process and contact are
              set out in our{' '}
              <Link
                href="/copyright"
                className="text-red-400 hover:text-red-300 underline underline-offset-2"
              >
                Copyright &amp; Illegal Content Policy
              </Link>
              . A person not involved in the original decision reviews appeals.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">9. Questions</h2>
            <p>
              If you are unsure whether something is allowed, ask first via the{' '}
              <Link
                href="/contact"
                className="text-red-400 hover:text-red-300 underline underline-offset-2"
              >
                contact page
              </Link>{' '}
              rather than guessing.
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </main>
  );
}
