'use client';
// app/apply-for-verification/page.tsx
// A form page where authors can apply for the verified checkmark.
// Requirements: logged in + at least one published story.
// The application is stored server-side and reviewed by admins.

import { useState } from 'react';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import Link from 'next/link';

export default function ApplyForVerificationPage() {
  const [reason, setReason] = useState('');
  const [links, setLinks]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]       = useState(false);
  const [error, setError]           = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/verification-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, links }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Something went wrong.'); return; }
      setSuccess(true);
    } catch {
      setError('Network error — please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <Header />

      <div className="max-w-2xl mx-auto px-4 py-14">

        {/* Page heading */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-5 h-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <h1 className="text-2xl font-bold text-white">Apply for Verification</h1>
          </div>
          <p className="text-gray-400 text-sm leading-relaxed">
            The blue checkmark shows readers that you are a recognised author on Silent Evidence.
            Verified status is awarded to writers with a track record of quality stories and authentic
            engagement with the community.
          </p>
        </div>

        {/* Requirements box */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 mb-8">
          <p className="text-sm font-semibold text-gray-300 mb-3">Requirements</p>
          <ul className="space-y-2 text-sm text-gray-400">
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              At least one published story on Silent Evidence
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              A complete profile with bio and avatar
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              No recent moderation actions or reported content
            </li>
          </ul>
        </div>

        {success ? (
          /* Success state */
          <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-8 text-center">
            <p className="text-4xl mb-4">✅</p>
            <h2 className="text-lg font-bold text-white mb-2">Application received!</h2>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              Thank you for applying. Our team reviews applications manually and will update your
              profile if approved. You&apos;ll receive a notification when a decision is made.
            </p>
            <Link href="/dashboard" className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-white text-sm font-semibold rounded-xl transition">
              Back to dashboard
            </Link>
          </div>
        ) : (
          /* Application form */
          <form onSubmit={submit} className="space-y-6">

            <div>
              <label htmlFor="reason" className="block text-sm font-semibold text-gray-300 mb-2">
                Why do you deserve verification? <span className="text-red-400">*</span>
              </label>
              <textarea
                id="reason"
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={5}
                maxLength={1000}
                placeholder="Tell us about your writing, your stories, and why verified status would matter to your readers…"
                className="w-full bg-gray-800 border border-gray-700 focus:border-red-600 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm resize-none outline-none transition"
                required
              />
              <p className="text-xs text-gray-600 mt-1 text-right">{reason.length}/1000</p>
            </div>

            <div>
              <label htmlFor="links" className="block text-sm font-semibold text-gray-300 mb-2">
                External links <span className="text-gray-500 font-normal">(optional)</span>
              </label>
              <textarea
                id="links"
                value={links}
                onChange={e => setLinks(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Any external profiles, published works, or social links that support your application…"
                className="w-full bg-gray-800 border border-gray-700 focus:border-red-600 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm resize-none outline-none transition"
              />
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || reason.trim().length < 20}
              className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold rounded-xl transition text-sm"
            >
              {submitting ? 'Submitting…' : 'Submit application'}
            </button>
          </form>
        )}
      </div>

      <Footer />
    </main>
  );
}
