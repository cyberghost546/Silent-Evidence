// app/unsubscribe/page.tsx
// One-click unsubscribe page linked from the footer of every newsletter email.
// Reads ?token= (base64-encoded email), finds the user, sets newsletterSubscribed=false.

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

type Props = { searchParams: Promise<{ token?: string }> };

export default async function UnsubscribePage({ searchParams }: Props) {
  const { token } = await searchParams;

  // Missing or malformed token — show an error
  if (!token) {
    return <Result success={false} message="Invalid unsubscribe link." />;
  }

  let email: string;
  try {
    // Decode the base64url token back to the original email address
    email = Buffer.from(token, 'base64url').toString('utf8');
  } catch {
    return <Result success={false} message="Invalid unsubscribe link." />;
  }

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, newsletterSubscribed: true } });

  if (!user) {
    // Return a generic success so email addresses can't be probed
    return <Result success={true} message="You have been unsubscribed." />;
  }

  if (user.newsletterSubscribed) {
    await prisma.user.update({ where: { id: user.id }, data: { newsletterSubscribed: false } });
  }

  return <Result success={true} message="You've been unsubscribed from the weekly digest." />;
}

// Simple centered result card
function Result({ success, message }: { success: boolean; message: string }) {
  return (
    <main className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-sm w-full bg-gray-800 border border-gray-700 rounded-2xl p-8 text-center">
        <p className="text-4xl mb-4">{success ? '✅' : '❌'}</p>
        <h1 className="text-xl font-bold text-white mb-2">
          {success ? 'Unsubscribed' : 'Something went wrong'}
        </h1>
        <p className="text-gray-400 text-sm mb-6">{message}</p>
        {/* Let users re-subscribe or manage preferences from settings */}
        <Link
          href="/settings"
          className="inline-block px-5 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition"
        >
          Manage preferences
        </Link>
        <div className="mt-3">
          <Link href="/" className="text-xs text-gray-600 hover:text-gray-400 transition">
            ← Back to Silent Evidence
          </Link>
        </div>
      </div>
    </main>
  );
}
