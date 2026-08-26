// app/copyright/page.tsx
//
// Copyright (DMCA) and illegal-content (EU DSA) notice policy.
//
// ⚠ THIS PAGE IS NOT LIVE-READY UNTIL THE PLACEHOLDERS ARE FILLED IN.
//
// Two of the obligations described here cannot be satisfied by code, and this
// page only documents them — it does not create them:
//
//   1. DMCA safe harbour (17 U.S.C. §512) is only available to a service that
//      has REGISTERED a designated agent with the U.S. Copyright Office
//      (dmca.copyright.gov, ~$6, renewable every 3 years) AND published that
//      agent's contact details. Publishing the details here without registering
//      does not confer safe harbour — both steps are required.
//
//   2. The EU DSA requires a single point of contact and, for providers without
//      an EU establishment, a designated legal representative in a member state
//      (Art. 11–13). That is a legal appointment, not a config value.
//
// Until both are done, the wording below describes a process the site cannot
// fully honour. Fill in every [bracketed] value, or take the page down.

import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import Link from 'next/link';

export const metadata = {
  title: 'Copyright & Illegal Content Policy — Silent Evidence',
  description:
    'How to report copyright infringement or illegal content on Silent Evidence, and how we handle those reports.',
};

export default function CopyrightPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />
      <div className="max-w-3xl mx-auto px-4 py-14">

        <div className="mb-10">
          <p className="text-xs font-bold uppercase tracking-widest text-red-500 mb-2">Legal</p>
          <h1 className="text-4xl font-bold text-white">Copyright &amp; Illegal Content</h1>
          <p className="text-gray-500 text-sm mt-2">Last updated: 25 August 2026</p>
        </div>

        <div className="prose prose-invert prose-sm max-w-none space-y-8 text-gray-300 leading-relaxed">

          <section className="border border-amber-900/40 bg-amber-950/20 rounded-xl p-4">
            <p className="text-amber-300/90 text-xs">
              <strong>Setup required before publication.</strong> The bracketed
              values below must be completed, and the designated agent must be
              registered with the U.S. Copyright Office, before this policy is
              accurate.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">1. Our Position</h2>
            <p>
              Silent Evidence hosts fiction written by its users. We do not review
              every submission before it appears. Authors keep the rights to what
              they write, and by posting they confirm the work is theirs.
            </p>
            <p className="mt-3">
              If something here infringes your copyright, or you believe content on
              this site is unlawful, use the routes below and we will act on it.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">2. Reporting Copyright Infringement (DMCA)</h2>
            <p>
              The quickest route is the <strong>Report</strong> button on any story,
              comment or forum post, choosing <strong>Copyright infringement</strong>.
              For a formal notice under 17 U.S.C. §512(c), send the following to our
              designated agent.
            </p>
            <p className="mt-3">
              A valid notice must include all six elements. An incomplete notice may
              not be actionable:
            </p>
            <ol className="list-decimal pl-5 mt-2 space-y-1 text-gray-400">
              <li>Your physical or electronic signature.</li>
              <li>Identification of the copyrighted work you say has been infringed.</li>
              <li>Identification of the material you want removed, including its URL on this site.</li>
              <li>Your contact details — address, telephone number and email.</li>
              <li>
                A statement that you believe in good faith that the use is not
                authorised by the copyright owner, its agent, or the law.
              </li>
              <li>
                A statement that the information in the notice is accurate, and — under
                penalty of perjury — that you are the owner or authorised to act for them.
              </li>
            </ol>
            <div className="mt-4 border border-gray-800 bg-gray-900/60 rounded-lg p-4 text-sm">
              <p className="text-gray-400 mb-1"><strong className="text-gray-200">Designated Agent</strong></p>
              <p className="text-gray-400">[Agent name]</p>
              <p className="text-gray-400">[Postal address]</p>
              <p className="text-gray-400">[dmca@yourdomain]</p>
              <p className="text-gray-400">[Telephone]</p>
            </div>
            <p className="mt-3 text-gray-400 text-xs">
              Misrepresenting that material is infringing can make you liable for
              damages, including costs and legal fees, under §512(f).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">3. What Happens Next</h2>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-400">
              <li>We acknowledge receipt of your report.</li>
              <li>Where a notice appears valid, we remove or disable access to the material.</li>
              <li>
                We notify the author whose content was removed, tell them why, and give
                them a copy of the notice.
              </li>
              <li>The author may submit a counter-notice (section 4).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">4. Counter-Notice</h2>
            <p>
              If your work was removed and you believe that was a mistake or a
              misidentification, you may send a counter-notice containing your
              signature, identification of the removed material and where it appeared,
              a statement under penalty of perjury that you have a good-faith belief it
              was removed in error, your contact details, and your consent to the
              jurisdiction of the federal court for your district (or, if outside the
              United States, [judicial district]).
            </p>
            <p className="mt-3">
              We will forward it to the person who filed the original notice. If they do
              not tell us within 10 business days that they have filed a court action,
              we may restore the material.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">5. Repeat Infringers</h2>
            <p>
              We terminate, in appropriate circumstances, the accounts of users who
              repeatedly infringe copyright. Maintaining such a policy is a condition of
              safe harbour under §512(i), and we apply it.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">6. Reporting Illegal Content (EU Digital Services Act)</h2>
            <p>
              If you are in the European Union and believe content here is illegal, use
              the <strong>Report</strong> button and choose <strong>Illegal content</strong>,
              or write to <strong>[legal@yourdomain]</strong>. Please explain why you
              consider it illegal and include the exact URL, so we can assess it
              properly.
            </p>
            <p className="mt-3">Under Articles 16 and 17 of the DSA, we will:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-400">
              <li>Confirm receipt of your notice without undue delay.</li>
              <li>Decide on it in a timely, diligent, non-arbitrary and objective way.</li>
              <li>Tell you what we decided, and explain how to challenge it.</li>
              <li>
                Give the author a statement of reasons whenever we remove or restrict
                their content, including the legal or contractual ground we relied on.
              </li>
            </ul>
            <p className="mt-3">
              We do not currently use automated decision-making to remove reported
              content — reports are reviewed by a person. Note that new stories and
              comments are separately screened by an automated moderation check before
              publication, described in our{' '}
              <Link href="/privacy" className="text-red-400 hover:text-red-300 underline underline-offset-2">Privacy Policy</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">7. Appeals</h2>
            <p>
              If we remove your content or restrict your account and you disagree,
              contact <strong>[appeals@yourdomain]</strong> within six months. A person
              who was not involved in the original decision will review it. EU users
              also retain the right to use an out-of-court dispute settlement body, and
              to go to court.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">8. Contact</h2>
            <p>
              Copyright: <strong>[dmca@yourdomain]</strong> · Illegal content and other
              legal matters: <strong>[legal@yourdomain]</strong>. General enquiries go
              through the{' '}
              <Link href="/contact" className="text-red-400 hover:text-red-300 underline underline-offset-2">contact page</Link>.
            </p>
          </section>

        </div>
      </div>
      <Footer />
    </main>
  );
}
