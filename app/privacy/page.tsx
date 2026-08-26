// app/privacy/page.tsx
// Static Privacy Policy page — the site's data collection and usage disclosure.
// No data fetching needed; content is hard-coded in the JSX below.
//
// ⚠ IMPORTANT — READ BEFORE EDITING
// This policy is a factual description of what the code actually does. Every
// claim below was checked against the source. If you change how data is handled,
// update this page in the same commit, or the policy becomes a false statement —
// which under GDPR Art. 13/14 is itself the violation, separate from whatever
// the code does.
//
// Known couplings, so they are easy to keep in step:
//   - Cookies section      → lib/sessionCookie.ts, lib/csrf.ts, CookieBanner.tsx
//   - Third parties        → lib/stripe.ts, lib/cloudinary.ts, lib/pusher.ts,
//                            lib/mailer.ts, lib/toxicityCheck.ts, lib/geoip.ts
//   - Your rights section  → app/api/user/export, app/api/user/delete-account
//   - Retention section    → nothing enforces these periods yet; see TODO below
//
// TODO (needs a decision, not just code):
//   1. Fill in the operator identity + contact placeholders marked [ ] below.
//   2. If you enable GEOIP_PROVIDER_URL, name the provider you chose in the
//      processor table in section 5 — it currently says "Geolocation provider".
//   3. Have a lawyer review this. It is written to be accurate, not to be legal
//      advice, and jurisdiction-specific duties are not covered.
//
// Retention (section 9) is now enforced by app/api/cron/data-retention, which
// runs daily. Keep the periods stated there and here identical.

import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import Link from 'next/link';

export const metadata = { title: 'Privacy Policy — Silent Evidence' };

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />
      <div className="max-w-3xl mx-auto px-4 py-14">

        {/* Heading */}
        <div className="mb-10">
          <p className="text-xs font-bold uppercase tracking-widest text-red-500 mb-2">Legal</p>
          <h1 className="text-4xl font-bold text-white">Privacy Policy</h1>
          <p className="text-gray-500 text-sm mt-2">Last updated: 25 August 2026</p>
        </div>

        <div className="prose prose-invert prose-sm max-w-none space-y-8 text-gray-300 leading-relaxed">

          <section className="border border-amber-900/40 bg-amber-950/20 rounded-xl p-4">
            <p className="text-amber-300/90 text-xs">
              <strong>Operator details required.</strong> The sections below marked
              [square brackets] must be completed with the legal entity that runs this
              site before publication. A privacy policy that does not identify its data
              controller does not satisfy GDPR Art. 13(1)(a).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">1. Who We Are</h2>
            <p>
              Silent Evidence is a horror fiction publishing platform. The data controller
              responsible for your personal data is <strong>[legal entity name]</strong>,
              registered at <strong>[registered address]</strong>.
            </p>
            <p className="mt-3">
              For any privacy question, or to exercise the rights described in section 8,
              contact <strong>[privacy@yourdomain]</strong>. We aim to respond within 30 days,
              which is the deadline set by GDPR Art. 12(3).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">2. Information We Collect</h2>

            <p className="font-semibold text-gray-200 mt-3">Information you give us</p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-400">
              <li>Your username and email address</li>
              <li>Your password, stored only as a one-way bcrypt hash — we never see the plain text</li>
              <li>Your date of birth, which we convert into an age band used to restrict mature content</li>
              <li>Optional profile details: avatar, bio, website, preferred themes and moods</li>
              <li>Stories, chapters, comments, forum posts, direct messages and group posts you write</li>
            </ul>

            <p className="font-semibold text-gray-200 mt-4">Information generated as you use the site</p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-400">
              <li>Likes, bookmarks, reactions, scare ratings, poll votes and follows</li>
              <li>Reading history, including which stories you opened and how far you scrolled</li>
              <li>Reading and writing streaks, goals and badges</li>
              <li>Purchases, tips and subscription status</li>
            </ul>

            <p className="font-semibold text-gray-200 mt-4">Information collected automatically</p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-400">
              <li>
                Your IP address and browser user-agent. These are used for security
                (rate limiting, detecting suspicious logins) and are recorded in a login
                log alongside an approximate location — see section 5.
              </li>
              <li>
                A record of your cookie choice, stored with a <em>truncated</em> IP address
                (the last octet is removed) rather than the full one.
              </li>
              <li>Basic usage events used to understand which parts of the site people reach.</li>
            </ul>

            <p className="mt-3">
              If you sign in with Google or Microsoft, we receive your name, email address
              and profile picture from that provider. We never receive your password for
              those accounts.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">3. Why We Use It, and Our Legal Basis</h2>
            <p>
              Under GDPR Art. 6 we must have a lawful basis for each use. Ours are:
            </p>
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-xs text-left text-gray-400 border border-gray-800 rounded-lg">
                <thead className="bg-gray-900 text-gray-300">
                  <tr>
                    <th className="px-3 py-2 border-b border-gray-800">What we do</th>
                    <th className="px-3 py-2 border-b border-gray-800">Legal basis</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Create and run your account; publish what you post', 'Performance of a contract'],
                    ['Keep you logged in via a session cookie', 'Strictly necessary — contract'],
                    ['Take payment for stories, bundles, tips and subscriptions', 'Performance of a contract'],
                    ['Send account and security emails', 'Performance of a contract'],
                    ['Restrict mature content by age band', 'Legal obligation / legitimate interest'],
                    ['Rate limiting, abuse detection, login logging', 'Legitimate interest in site security'],
                    ['Moderate content for hate speech and abuse', 'Legitimate interest / legal obligation'],
                    ['Newsletter and digest emails', 'Consent — withdraw at any time'],
                    ['Optional analytics cookies', 'Consent — withdraw at any time'],
                  ].map(([what, basis]) => (
                    <tr key={what} className="border-b border-gray-800/60 last:border-0">
                      <td className="px-3 py-2">{what}</td>
                      <td className="px-3 py-2 text-gray-500">{basis}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3">
              We do not sell, rent or share your personal information with third parties for
              advertising or marketing purposes. We do not engage in behavioural advertising.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">4. Cookies and Local Storage</h2>
            <p>We use the following strictly necessary cookies. These cannot be switched off, because the site cannot function without them:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-400">
              <li><code>userId</code> and <code>userId_sig</code> — identify your session and prove it has not been tampered with. HttpOnly, SameSite=Lax, 7-day expiry.</li>
              <li><code>csrf_token</code> — protects forms against cross-site request forgery.</li>
            </ul>
            <p className="mt-3">We also store a small amount of data in your browser&apos;s local storage, which never leaves your device:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-400">
              <li>Your cookie choice, so we do not ask again on every page</li>
              <li>Display preferences, such as whether you prefer the grid or list layout</li>
            </ul>
            <p className="mt-3">
              You can change or withdraw your cookie choice at any time using the{' '}
              <strong>Cookie settings</strong> link in the footer of every page. Withdrawing
              is as easy as giving consent, as required by GDPR Art. 7(3).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">5. Who We Share Data With</h2>
            <p>
              We use the following processors. Each receives only what it needs to do its job,
              and none of them are permitted to use your data for their own purposes.
            </p>
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-xs text-left text-gray-400 border border-gray-800 rounded-lg">
                <thead className="bg-gray-900 text-gray-300">
                  <tr>
                    <th className="px-3 py-2 border-b border-gray-800">Processor</th>
                    <th className="px-3 py-2 border-b border-gray-800">What it receives</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Stripe', 'Payment and subscription details. Card numbers go directly to Stripe and are never stored on our servers.'],
                    ['Anthropic (Claude)', 'Story and comment text, for automated moderation, scare-scoring, translation and writing assistance.'],
                    ['Cloudinary', 'Images you upload, such as avatars and story covers.'],
                    ['Pusher', 'Real-time presence and chat events, including your username.'],
                    ['Email provider (SMTP)', 'Your email address and message content, to deliver account and notification emails.'],
                    ['Geolocation provider', 'Your IP address, to derive an approximate login location for security alerts. Only used if this optional feature is enabled, and only over an encrypted connection.'],
                  ].map(([name, what]) => (
                    <tr key={name} className="border-b border-gray-800/60 last:border-0">
                      <td className="px-3 py-2 text-gray-300 whitespace-nowrap">{name}</td>
                      <td className="px-3 py-2">{what}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3">
              Several of these providers are based in the United States, so using this site
              involves transferring your data outside the UK and EEA. Those transfers rely on
              the providers&apos; standard contractual clauses and, where applicable, their
              certification under the EU–US Data Privacy Framework.
            </p>
            <p className="mt-3">
              We may also disclose data where we are legally required to, or where it is
              necessary to investigate abuse or protect the safety of our users.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">6. Automated Content Moderation</h2>
            <p>
              When you publish a story or post a comment, its text is sent to an AI service to
              check for hate speech, harassment and threats. Content flagged by that check is
              refused at the point of posting.
            </p>
            <p className="mt-3">
              This is an automated decision that affects whether your content appears. If your
              post is blocked and you believe that is wrong, contact us using the details in
              section 1 and a human will review it — GDPR Art. 22 gives you the right to that
              human review.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">7. Children</h2>
            <p>
              This site publishes horror fiction, much of which is not suitable for children.
              We ask for your date of birth and use it to restrict access to mature content.
            </p>
            <p className="mt-3">
              We do not knowingly collect personal data from children under 13. If you believe
              a child under 13 has created an account, contact us and we will delete it.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">8. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-400">
              <li>
                <strong className="text-gray-200">Access and portability</strong> — download a
                complete copy of your data as a machine-readable file, from{' '}
                <Link href="/settings" className="text-red-400 hover:text-red-300 underline underline-offset-2">Settings → Download Your Data</Link>.
              </li>
              <li><strong className="text-gray-200">Rectification</strong> — correct your details from the Settings page.</li>
              <li>
                <strong className="text-gray-200">Erasure</strong> — delete your account and its
                content from Settings. This is immediate and cannot be undone.
              </li>
              <li><strong className="text-gray-200">Withdraw consent</strong> — for cookies via the footer link, and for emails via the unsubscribe link in any email or your notification settings.</li>
              <li><strong className="text-gray-200">Object or restrict</strong> — ask us to stop or limit a use that relies on legitimate interest.</li>
              <li><strong className="text-gray-200">Complain</strong> — to your local data protection authority. In the UK that is the Information Commissioner&apos;s Office (ico.org.uk).</li>
            </ul>
            <p className="mt-3">
              If you are in California, you additionally have the right to know what we collect,
              to delete it, and to opt out of sale or sharing. We do not sell or share personal
              information as those terms are defined by the CCPA/CPRA, so there is nothing to
              opt out of — but the access and deletion controls above serve those requests.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">9. How Long We Keep Data</h2>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-400">
              <li>Account data and content: until you delete your account.</li>
              <li>Security and login logs: 12 months.</li>
              <li>Usage analytics events: 12 months.</li>
              <li>Cookie consent records: 12 months, kept as proof of your choice.</li>
              <li>Email delivery logs: 6 months.</li>
              <li>Payment records: retained as long as tax and accounting law requires, typically 6–7 years.</li>
            </ul>
            <p className="mt-3">
              These periods are enforced automatically: a scheduled job runs daily and
              permanently deletes records that have passed their retention window.
            </p>
            <p className="mt-3">
              When you delete your account, your profile, stories, comments and reading history
              are removed from our database immediately.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">10. Security</h2>
            <p>
              Passwords are hashed with bcrypt. Sessions are signed so they cannot be forged,
              and optional two-factor authentication is available. Requests are rate limited,
              and you can end every active session from Settings if you think your account has
              been compromised. No system is perfectly secure, but if a breach affects your
              rights we will notify you and the relevant regulator as the law requires.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">11. Changes to This Policy</h2>
            <p>
              If we make a material change we will update the date at the top of this page and,
              where the change significantly affects you, tell you directly.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">12. Contact</h2>
            <p>
              Privacy questions and rights requests: <strong>[privacy@yourdomain]</strong>.
              You can also reach us through the{' '}
              <Link href="/contact" className="text-red-400 hover:text-red-300 underline underline-offset-2">contact page</Link>.
            </p>
          </section>

        </div>
      </div>
      <Footer />
    </main>
  );
}
