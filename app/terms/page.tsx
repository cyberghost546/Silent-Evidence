import Header from '@/app/components/ui/Header';

export const metadata = { title: 'Terms of Service — Silent Evidence' };

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />
      <div className="max-w-3xl mx-auto px-4 py-14">

        {/* Heading */}
        <div className="mb-10">
          <p className="text-xs font-bold uppercase tracking-widest text-red-500 mb-2">Legal</p>
          <h1 className="text-4xl font-bold text-white">Terms of Service</h1>
          <p className="text-gray-500 text-sm mt-2">Last updated: March 2026</p>
        </div>

        <div className="prose prose-invert prose-sm max-w-none space-y-8 text-gray-300 leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">1. Acceptance of Terms</h2>
            <p>By accessing or using Silent Evidence (the "Platform"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Platform.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">2. Eligibility</h2>
            <p>You must be at least 13 years of age to use Silent Evidence. By creating an account, you confirm that you meet this requirement. Users under 18 should have parental consent before participating.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">3. Your Account</h2>
            <p>You are responsible for maintaining the security of your account and password. You must not share your login credentials with others. Silent Evidence cannot and will not be liable for any loss or damage resulting from your failure to keep your account secure.</p>
            <p className="mt-3">You agree to provide accurate information when registering and to keep it up to date. Accounts created with false information may be suspended.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">4. Content Rules</h2>
            <p>Silent Evidence is a creative writing community focused on horror story readers and writers. When posting stories or comments, you agree <strong className="text-white">not</strong> to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-400">
              <li>Post content that is hateful, discriminatory, or harasses other users</li>
              <li>Share personal information of others without their consent</li>
              <li>Post spam, advertisements, or promotional content</li>
              <li>Publish content that infringes the copyright of a third party</li>
              <li>Post content that is illegal in your country of residence</li>
              <li>Impersonate another person or misrepresent your identity</li>
            </ul>
            <p className="mt-3">We reserve the right to remove any content that violates these rules and to suspend or permanently ban accounts that repeatedly breach them.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">5. Ownership of Content</h2>
            <p>You retain full ownership of the stories and content you publish on Silent Evidence. By posting content, you grant Silent Evidence a non-exclusive, royalty-free licence to display and distribute your content on the Platform for as long as it remains published.</p>
            <p className="mt-3">You may delete your stories at any time. Upon deletion, the licence granted to us for that content ends.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">6. Content Moderation</h2>
            <p>Silent Evidence administrators may review, edit, hide, or delete any content that violates these Terms of Service or the spirit of the community, without prior notice. Moderation decisions are final.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">7. Disclaimers</h2>
            <p>The stories published on Silent Evidence are works of fiction unless explicitly marked otherwise. Silent Evidence does not verify the accuracy of user-submitted content and is not responsible for any harm arising from reliance on it.</p>
            <p className="mt-3">The Platform is provided "as is" without warranties of any kind. We do not guarantee uninterrupted or error-free service.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">8. Limitation of Liability</h2>
            <p>To the maximum extent permitted by applicable law, Silent Evidence shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Platform, including but not limited to loss of data or loss of access to your account.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">9. Termination</h2>
            <p>We reserve the right to suspend or terminate your account at any time, with or without notice, for conduct that we determine violates these Terms or is harmful to other users, the Platform, or third parties.</p>
            <p className="mt-3">You may delete your account at any time from the Settings page.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">10. Changes to These Terms</h2>
            <p>We may revise these Terms of Service at any time. When we make material changes, we will update the date at the top of this page. Your continued use of Silent Evidence after changes are posted constitutes acceptance of the revised Terms.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">11. Contact</h2>
            <p>If you have questions about these Terms, please contact us via the <a href="/contact" className="text-red-400 hover:underline">Contact</a> page.</p>
          </section>

        </div>
      </div>
    </main>
  );
}
