// app/privacy/page.tsx
// Static Privacy Policy page — contains the site's data collection and usage policy.
// No data fetching needed; content is hard-coded in the JSX below.
// To update the policy text, edit the sections directly in this file.
import Header from '@/app/components/ui/Header';

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
          <p className="text-gray-500 text-sm mt-2">Last updated: March 2026</p>
        </div>

        <div className="prose prose-invert prose-sm max-w-none space-y-8 text-gray-300 leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">1. Information We Collect</h2>
            <p>When you create an account on Silent Evidence, we collect the following information:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-400">
              <li>Your username and email address</li>
              <li>Your password (stored as a one-way encrypted hash — we never see the plain text)</li>
              <li>Any profile information you choose to provide, such as a bio, avatar, or website</li>
              <li>Stories, comments, and likes you post on the platform</li>
            </ul>
            <p className="mt-3">If you sign in with Google or Microsoft, we receive your name, email address, and profile picture from those services. We do not receive or store your social account password.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">2. How We Use Your Information</h2>
            <p>We use the information we collect solely to operate Silent Evidence. Specifically, we use it to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-400">
              <li>Create and manage your account</li>
              <li>Display your stories and comments to other users</li>
              <li>Allow you to log in securely via a session cookie</li>
              <li>Send you important account-related notifications (we do not send marketing emails)</li>
            </ul>
            <p className="mt-3">We do not sell, rent, or share your personal information with third parties for advertising or marketing purposes.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">3. Cookies</h2>
            <p>We use a single session cookie (<code className="text-red-400 bg-gray-800 px-1 rounded text-xs">userId</code>) to keep you logged in. This cookie is:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-400">
              <li>HttpOnly — it cannot be read by JavaScript on the page</li>
              <li>Set to expire after 7 days</li>
              <li>Deleted immediately when you log out</li>
            </ul>
            <p className="mt-3">We do not use tracking cookies, advertising cookies, or third-party analytics.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">4. Data Storage</h2>
            <p>Your data is stored in a secured database. We take reasonable precautions to protect it from unauthorised access, including password hashing and HTTP-only session management. However, no system is completely secure, and we cannot guarantee absolute security.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">5. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-400">
              <li>Access the personal data we hold about you</li>
              <li>Update or correct your information via the Settings page</li>
              <li>Request deletion of your account and all associated data</li>
            </ul>
            <p className="mt-3">To exercise any of these rights, please contact us using the details on our Contact page.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">6. Third-Party Services</h2>
            <p>Silent Evidence uses the following third-party services which may process limited data:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-400">
              <li><strong className="text-white">Google OAuth</strong> — if you choose to sign in with Google</li>
              <li><strong className="text-white">Microsoft OAuth</strong> — if you choose to sign in with Microsoft</li>
              <li><strong className="text-white">ui-avatars.com</strong> — to generate a default avatar from your username if you have not uploaded one</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">7. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. When we do, we will update the date at the top of this page. Continued use of the platform after changes constitutes acceptance of the updated policy.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">8. Contact</h2>
            <p>If you have any questions about this Privacy Policy, please reach out to us via the <a href="/contact" className="text-red-400 hover:underline">Contact</a> page.</p>
          </section>

        </div>
      </div>
    </main>
  );
}
