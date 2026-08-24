// app/write/page.tsx
// The "Write a Story" page — entry point for community members to submit new stories.
//
// This is a server component, meaning all the data fetching happens on the server
// before the page is sent to the browser. That keeps the page fast and avoids
// exposing database queries to client-side JavaScript.
//
// Gate: Only logged-in users can access this page. If no userId cookie is found
// the user is redirected to /login immediately.
//
// Optional query parameters:
//   ?prompt=...        — pre-fills the form with a writing prompt text
//   ?promptTitle=...   — shows a labelled banner above the form so the user
//                        knows they're responding to a specific prompt

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import StoryForm from '@/app/components/ui/StoryForm';
import { hasAuthorPro } from '@/lib/authorPro';
import Link from 'next/link';

// searchParams lets us read URL query strings like ?prompt=... on the server
type Props = { searchParams: Promise<{ prompt?: string; promptTitle?: string }> };

export default async function WritePage({ searchParams }: Props) {
  // Read the userId cookie set at login — only logged-in users can write stories.
  // If it's missing or zero, redirect to the login page immediately.
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0);

  if (!userId) redirect('/login');

  // Fetch all categories alphabetically so the story form can show a dropdown.
  // We only select id and name — we don't need the rest of the category fields here.
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });

  // Author Pro decides whether the form offers the monetisation and rich-media
  // fields. Resolved here on the server so a free author never receives those
  // controls; the API enforces the same rule on submit.
  const isAuthorPro = await hasAuthorPro(userId);

  // Read the optional query params — a user might arrive here from a writing prompt
  // page that pre-populates the form with inspiration text.
  const { prompt, promptTitle } = await searchParams;

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />
      <div className="max-w-3xl mx-auto px-4 py-10">

        {/* Page heading */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Write a Story</h1>
          <p className="text-gray-400 text-sm mt-1">
            Share your experience with the Silent Evidence community.
          </p>
          {/* Decorative red divider line below the heading */}
          <div className="mt-4 h-px bg-gradient-to-r from-red-600/60 to-transparent" />
          {/* Quick links to related writing tools */}
          <div className="flex gap-4 mt-3">
            <Link href="/write/sprints" className="text-xs text-gray-500 hover:text-red-400 transition">
 Writing Sprints
            </Link>
            <Link href="/coauthor" className="text-xs text-gray-500 hover:text-red-400 transition">
 Co-author Requests
            </Link>
          </div>
        </div>

        {/* Writing prompt banner — only shown when the user arrived via a prompt link.
            This lets the writer see the inspiration text while they're filling in the form. */}
        {prompt && (
          <div className="mb-6 bg-red-950/30 border border-red-900/40 rounded-xl p-4">
            <p className="text-xs font-bold text-red-400 uppercase tracking-wider mb-1">
 Writing Prompt{promptTitle ? ` — ${promptTitle}` : ''}
            </p>
            <p className="text-sm text-gray-300">{prompt}</p>
          </div>
        )}

        {/* StoryForm is a client component (it uses React state for the rich-text editor
            and form inputs). We pass the category list from the server and optionally
            pre-fill the excerpt field with the writing prompt text. */}
        <StoryForm categories={categories} initialExcerpt={prompt ?? ''} isAuthorPro={isAuthorPro} />
      </div>
      <Footer />
    </main>
  );
}
