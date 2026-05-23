// app/draft/[token]/page.tsx
// Public draft preview page — accessible via a share link token.
// No login required. Shows story content with a "draft preview" banner.

import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

// Fetch the draft server-side using the token
async function getDraft(token: string) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/draft/${token}`, {
    // Don't cache draft preview pages — always fresh
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return res.json() as Promise<{
    story: {
      id: number;
      title: string;
      content: string;
      coverImage: string | null;
      mood: string | null;
      tags: { name: string }[];
      createdAt: string;
      author: { username: string; avatar: string | null };
    };
    expiresAt: string | null;
  }>;
}

export default async function DraftPreviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await getDraft(token);

  if (!data) notFound();

  const { story, expiresAt } = data;

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      {/* Draft banner */}
      <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3 mb-8">
        <span className="text-yellow-400 text-lg">📝</span>
        <div>
          <p className="text-sm font-semibold text-yellow-300">Draft Preview</p>
          <p className="text-xs text-yellow-500/80">
            This is an unpublished draft shared privately.
            {expiresAt && ` Link expires ${new Date(expiresAt).toLocaleDateString()}.`}
          </p>
        </div>
      </div>

      {/* Cover image */}
      {story.coverImage && (
        <div className="relative w-full aspect-video rounded-xl overflow-hidden mb-8">
          <Image
            src={story.coverImage}
            alt={story.title}
            fill
            className="object-cover"
          />
        </div>
      )}

      {/* Story header */}
      <header className="mb-8">
        {story.mood && (
          <span className="inline-block text-xs px-2.5 py-1 rounded-full bg-red-600/20 text-red-400 mb-3">
            {story.mood.replace('_', ' ')}
          </span>
        )}
        <h1 className="text-3xl font-bold text-white leading-tight mb-4">{story.title}</h1>

        {/* Author row */}
        <div className="flex items-center gap-3">
          {story.author.avatar ? (
            <Image
              src={story.author.avatar}
              alt={story.author.username}
              width={36}
              height={36}
              className="rounded-full object-cover"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center">
              <span className="text-sm font-bold text-gray-400">
                {story.author.username[0].toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <Link href={`/user/${story.author.username}`} className="text-sm font-semibold text-white hover:text-red-400 transition">
              {story.author.username}
            </Link>
            <p className="text-xs text-gray-500">
              Draft · {new Date(story.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </header>

      {/* Story content — rendered as HTML from TipTap */}
      <article
        className="prose prose-invert prose-red max-w-none text-gray-300 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: story.content }}
      />

      {/* Footer */}
      <div className="mt-12 border-t border-gray-800 pt-8 text-center">
        <p className="text-sm text-gray-500 mb-4">
          This is a draft preview. The story hasn&apos;t been published yet.
        </p>
        <Link href="/" className="text-sm text-red-400 hover:text-red-300 transition">
          Explore Silent Evidence →
        </Link>
      </div>
    </main>
  );
}
