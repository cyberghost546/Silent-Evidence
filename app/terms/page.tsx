// app/terms/page.tsx
// Static Terms of Service page — hard-coded legal content, no data fetching.
//
// ⚠ ACCURACY IS THE POINT. These Terms describe how the Platform actually works
// — paid content, mature-content age gating, moderation, the DMCA/DSA process.
// If a feature changes, update the matching clause in the same commit, or the
// Terms become a misstatement. Related surfaces:
//   - Payments / refunds      → lib/stripe.ts, app/api/stripe/*, app/premium, app/author-pro
//   - Age gating / ratings    → lib/ageGate.ts, app/api/user/age (under-13 block)
//   - Copyright & illegal      → app/copyright/page.tsx
//   - Privacy                  → app/privacy/page.tsx
//   - Acceptable use           → app/acceptable-use/page.tsx
//
// TODO before publishing: fill every [bracketed] value (legal entity, governing
// law, jurisdiction, contact addresses) and have a lawyer review. Written to be
// accurate, not to be legal advice.

import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service — Silent Evidence',
  description: 'The terms governing your use of Silent Evidence.',
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />
      <div className="max-w-3xl mx-auto px-4 py-14">
        <div className="mb-10">
          <p className="text-xs font-bold uppercase tracking-widest text-red-500 mb-2">Legal</p>
          <h1 className="text-4xl font-bold text-white">Terms of Service</h1>
          <p className="text-gray-500 text-sm mt-2">Last updated: 25 August 2026</p>
        </div>

        <div className="prose prose-invert prose-sm max-w-none space-y-8 text-gray-300 leading-relaxed">
          <section className="border border-amber-900/40 bg-amber-950/20 rounded-xl p-4">
            <p className="text-amber-300/90 text-xs">
              <strong>Operator details required.</strong> The bracketed values below (legal entity,
              governing law, jurisdiction, contact addresses) must be completed before these Terms
              are relied upon.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">
              1. Who We Are &amp; Acceptance
            </h2>
            <p>
              Silent Evidence (the &quot;Platform&quot;) is a horror fiction publishing community
              operated by <strong>[legal entity name]</strong> (&quot;we&quot;, &quot;us&quot;). By
              creating an account or otherwise using the Platform, you agree to these Terms of
              Service. If you do not agree, do not use the Platform.
            </p>
            <p className="mt-3">
              These Terms incorporate our{' '}
              <Link
                href="/acceptable-use"
                className="text-red-400 hover:text-red-300 underline underline-offset-2"
              >
                Acceptable Use Policy
              </Link>
              ,{' '}
              <Link
                href="/privacy"
                className="text-red-400 hover:text-red-300 underline underline-offset-2"
              >
                Privacy Policy
              </Link>
              , and{' '}
              <Link
                href="/copyright"
                className="text-red-400 hover:text-red-300 underline underline-offset-2"
              >
                Copyright &amp; Illegal Content Policy
              </Link>
              . Where they conflict, the more specific policy governs its subject.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">2. Eligibility &amp; Age</h2>
            <p>
              You must be at least 13 years old to use the Platform. If we learn that an account
              belongs to a child under 13, we delete it. Providing a date of birth under 13 during
              sign-up results in the account being removed automatically.
            </p>
            <p className="mt-3">
              Much of the fiction here is horror and is not suitable for all ages. We ask your date
              of birth and use it to restrict access to content we rate as TEEN or MATURE (see
              section 6). Some jurisdictions require you to be 18 to view certain content; by
              accessing content marked MATURE you confirm you are old enough to do so where you
              live.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">3. Your Account</h2>
            <p>
              You are responsible for keeping your account credentials secure and for all activity
              under your account. We offer optional two-factor authentication and backup recovery
              codes; we strongly recommend enabling them. Tell us promptly if you believe your
              account has been compromised.
            </p>
            <p className="mt-3">
              Provide accurate registration information and keep it current. Accounts created with
              false information, or used to evade a prior suspension, may be suspended or
              terminated.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">
              4. Your Content &amp; the Licence You Grant
            </h2>
            <p>
              You keep ownership of the stories, comments, artwork, and other material you post
              (&quot;Your Content&quot;). By posting, you grant us a worldwide, non-exclusive,
              royalty-free licence to host, store, reproduce, display, adapt for formatting, and
              distribute Your Content on and through the Platform, for as long as it remains posted,
              solely to operate and promote the Platform.
            </p>
            <p className="mt-3">
              You represent that you own or have the rights to Your Content and that it does not
              infringe anyone else&apos;s rights or break the law. When you delete Your Content or
              your account, this licence ends, except for copies retained transiently in backups or
              where we must keep records to comply with law.
            </p>
            <p className="mt-3">
              You may grant other users limited rights to your work through Platform features (for
              example collaborations, chain stories, or beta-reader sharing). Those interactions are
              between you and the other users; use them deliberately.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">5. Acceptable Use</h2>
            <p>
              Your use of the Platform is governed by our{' '}
              <Link
                href="/acceptable-use"
                className="text-red-400 hover:text-red-300 underline underline-offset-2"
              >
                Acceptable Use Policy
              </Link>
              , which prohibits, among other things, illegal content, harassment, hate speech,
              sexual content involving minors, doxxing, spam, and attempts to break or abuse the
              Platform. Breaching it can lead to content removal, suspension, or a permanent ban.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">
              6. Mature Content &amp; Ratings
            </h2>
            <p>
              Content is rated ALL, TEEN, or MATURE. Authors are responsible for rating their work
              honestly and for adding content warnings where appropriate. Mis-rating content to
              reach an audience that should not see it is a breach of these Terms. We may re-rate,
              restrict, or remove content, and readers are shown only content their age band
              permits.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">
              7. Payments, Paid Content &amp; Subscriptions
            </h2>
            <p>
              Some features involve payment: purchasing individual stories, chapters, or bundles;
              sending tips to authors; premium reader subscriptions; and the Author Pro plan.
              Payments are processed by <strong>Stripe</strong>; we do not store your card details.
              By making a payment you also agree to Stripe&apos;s terms.
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-400">
              <li>Prices are shown before purchase and are charged in the currency displayed.</li>
              <li>
                Subscriptions renew automatically each period until cancelled. You can cancel at any
                time; cancellation stops future renewals and takes effect at the end of the current
                period.
              </li>
              <li>Tips to authors are voluntary and non-refundable.</li>
              <li>
                Digital content is delivered immediately, so, except where the law of your country
                grants a non-waivable refund or withdrawal right, purchases of digital content are
                final. Our discretionary refund approach is described at
                <strong> [refund policy / contact]</strong>.
              </li>
              <li>
                Chargebacks made without first contacting us may result in account suspension.
              </li>
            </ul>
            <p className="mt-3">
              <strong>Authors receiving money:</strong> if you sell content or receive tips, you are
              responsible for any taxes on your earnings and for the accuracy of what you sell.
              Payouts, fees, and any revenue share are described at
              <strong> [author payout terms]</strong>. We may withhold or reverse amounts connected
              to fraud, chargebacks, or breaches of these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">
              8. AI Features &amp; Automated Moderation
            </h2>
            <p>
              The Platform offers AI-assisted features (such as writing suggestions, translation,
              and scare-scoring) and screens new stories and comments with an automated moderation
              check before they are published. Content the check flags may be blocked automatically.
              If your content is blocked and you believe that is wrong, you can ask for human review
              — see our{' '}
              <Link
                href="/copyright"
                className="text-red-400 hover:text-red-300 underline underline-offset-2"
              >
                Copyright &amp; Illegal Content Policy
              </Link>{' '}
              for the appeal route. AI output can be inaccurate; you are responsible for what you
              choose to publish.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">
              9. Copyright &amp; Illegal Content
            </h2>
            <p>
              If you believe content infringes your copyright, or is otherwise unlawful, use the
              reporting tools or the contacts in our{' '}
              <Link
                href="/copyright"
                className="text-red-400 hover:text-red-300 underline underline-offset-2"
              >
                Copyright &amp; Illegal Content Policy
              </Link>
              . That policy sets out our notice-and-takedown process, counter-notice rights, and our
              policy of terminating repeat infringers.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">
              10. Moderation &amp; Enforcement
            </h2>
            <p>
              We may review, edit for formatting, hide, or remove content, and suspend or terminate
              accounts, where we reasonably believe these Terms or our policies have been breached,
              or to comply with law or protect users. Where we remove your content or restrict your
              account, we will give you a reason and, where required, a way to appeal, as described
              in our policies. We are not obligated to monitor content but may do so.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">
              11. Third-Party Services &amp; Links
            </h2>
            <p>
              The Platform relies on third parties (including Stripe for payments, and services for
              images, email, and real-time features) and may link to external sites. We are not
              responsible for third-party services or content. Your use of them is governed by their
              own terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">12. Disclaimers</h2>
            <p>
              Stories on the Platform are works of fiction unless clearly marked otherwise. We do
              not verify user content and are not responsible for it. The Platform is provided
              &quot;as is&quot; and &quot;as available&quot; without warranties of any kind to the
              fullest extent permitted by law. We do not guarantee uninterrupted or error-free
              service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">13. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, we are not liable for indirect, incidental,
              special, or consequential damages, or for loss of data, profits, or account access,
              arising from your use of the Platform. Nothing in these Terms excludes liability that
              cannot lawfully be excluded — for example, for death or personal injury caused by
              negligence, or for fraud. Where liability cannot be excluded but can be limited, our
              total liability is limited to
              <strong>
                {' '}
                [cap — e.g. the greater of amounts you paid us in the prior 12 months or a fixed
                sum]
              </strong>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">14. Indemnity</h2>
            <p>
              To the extent permitted by law, you agree to indemnify us against claims, losses, and
              reasonable costs arising from Your Content or from your breach of these Terms, except
              to the extent caused by us. This does not apply where you are a consumer and the law
              of your country does not permit it.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">15. Termination</h2>
            <p>
              You may stop using the Platform and delete your account at any time from the Settings
              page. We may suspend or terminate your access for breach of these Terms, or where
              required by law, giving notice where reasonable. Sections that by their nature should
              survive termination (ownership, licences already granted, payment obligations,
              disclaimers, liability limits, and governing law) survive.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">
              16. Governing Law &amp; Disputes
            </h2>
            <p>
              These Terms are governed by the laws of <strong>[governing law jurisdiction]</strong>,
              and the courts of <strong>[jurisdiction]</strong> have jurisdiction, except that if
              you are a consumer you keep the benefit of any mandatory protections and the right to
              bring proceedings in your country of residence where the law allows.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">17. Changes to These Terms</h2>
            <p>
              We may revise these Terms. When we make material changes we will update the date above
              and, where the change significantly affects you, tell you directly. Continuing to use
              the Platform after changes take effect means you accept the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">18. Contact</h2>
            <p>
              Questions about these Terms: <strong>[legal@yourdomain]</strong>, or via the{' '}
              <Link
                href="/contact"
                className="text-red-400 hover:text-red-300 underline underline-offset-2"
              >
                contact page
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </main>
  );
}
