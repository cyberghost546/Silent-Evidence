// app/appeals/page.tsx
//
// The user's Appeals page — the DSA Art. 20 self-service view of every moderation
// decision made about their content or account, each with its statement of
// reasons and a way to request a human review. Server component: fetches the
// decisions for the signed-in user; AppealsClient owns the appeal forms.

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import AppealsClient from './AppealsClient';

export const metadata = { title: 'Appeals — Silent Evidence' };

export default async function AppealsPage() {
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0) || null;
  if (!userId) redirect('/login?from=/appeals');

  const actions = await prisma.moderationAction.findMany({
    where: { affectedUserId: userId },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true, type: true, targetType: true, reason: true, explanation: true,
      legalGround: true, automated: true, status: true, createdAt: true,
      appeals: {
        where: { userId },
        select: { id: true, status: true, message: true, decisionNote: true, createdAt: true, decidedAt: true },
      },
    },
  });

  // Serialise dates for the client component.
  const serialised = actions.map((a) => ({
    ...a,
    createdAt: a.createdAt.toISOString(),
    appeals: a.appeals.map((ap) => ({
      ...ap,
      createdAt: ap.createdAt.toISOString(),
      decidedAt: ap.decidedAt ? ap.decidedAt.toISOString() : null,
    })),
  }));

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Appeals</h1>
          <p className="text-gray-500 text-sm mt-1">
            Decisions we&apos;ve made about your content or account, and how to challenge them.
          </p>
        </div>
        <AppealsClient actions={serialised} />
      </div>
      <Footer />
    </main>
  );
}
