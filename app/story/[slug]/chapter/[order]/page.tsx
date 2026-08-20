// app/story/[slug]/chapter/[order]/page.tsx
// Reads a single chapter of a multi-part story.
// Shows the chapter content with prev/next navigation and a link back to the story overview.

import { notFound } from 'next/navigation';
import { Lock } from 'lucide-react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { hasPremiumAccess } from '@/lib/premiumCheck';
import { hasRecentView } from '@/lib/cache';
import { headers } from 'next/headers';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import StoryContent from '@/app/components/ui/StoryContent';
import type { Metadata } from 'next';

type Props = { params: Promise<{ slug: string; order: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, order } = await params;
  const chapter = await prisma.storyChapter.findFirst({
    where: { story: { slug }, order: Number(order) },
    select: { title: true, story: { select: { title: true } } },
  });
  if (!chapter) return { title: 'Chapter Not Found' };
  return { title: `${chapter.title} — ${chapter.story.title} — Silent Evidence` };
}

export default async function ChapterPage({ params }: Props) {
  const { slug, order: orderStr } = await params;
  const order = Number(orderStr);

  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0) || null;

  // Fetch the story and all its chapters so we can build prev/next links
  const story = await prisma.story.findUnique({
    where: { slug, status: 'PUBLISHED', isChaptered: true },
    select: { id: true, title: true, slug: true, language: true,
              author: { select: { id: true, username: true } } },
  });
  if (!story) return notFound();

  // Get all chapters ordered so we can find neighbours
  const allChapters = await prisma.storyChapter.findMany({
    where: { storyId: story.id },
    orderBy: { order: 'asc' },
    select: { id: true, title: true, order: true },
  });

  const currentIndex = allChapters.findIndex(c => c.order === order);
  if (currentIndex === -1) return notFound();

  // Fetch full content only for the current chapter
  const chapter = await prisma.storyChapter.findFirst({
    where: { storyId: story.id, order },
  });
  if (!chapter) return notFound();

  // Admins + premium subscribers can read all chapters; everyone else is limited to chapter 1
  const isAuthor   = userId === story.author.id;
  const hasPremium = await hasPremiumAccess(userId);
  const isLockedChapter = currentIndex > 0 && !hasPremium && !isAuthor;

  // Deduplicated chapter view counter
  const reqHeaders = await headers();
  const viewerIp = reqHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() ?? reqHeaders.get('x-real-ip') ?? 'unknown';
  if (!await hasRecentView(chapter.id * -1, viewerIp)) {
    prisma.storyChapter.update({ where: { id: chapter.id }, data: { views: { increment: 1 } } }).catch(() => {});
  }

  const prev = allChapters[currentIndex - 1] ?? null;
  const next = allChapters[currentIndex + 1] ?? null;

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <Header />

      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Breadcrumb */}
        <Link href={`/story/${slug}`} className="text-xs text-gray-500 hover:text-red-400 transition">
          ← Back to {story.title}
        </Link>

        {/* Chapter header */}
        <div className="mt-4 mb-8">
          <p className="text-xs font-bold uppercase tracking-widest text-red-500 mb-2">
            Chapter {currentIndex + 1} of {allChapters.length}
          </p>
          <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">{chapter.title}</h1>
          <p className="text-sm text-gray-500 mt-2">by {story.author.username}</p>
        </div>

        {/* Chapter content — chapters beyond chapter 1 require a premium subscription */}
        {isLockedChapter ? (
          <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-10 text-center mt-4">
            <h3 className="text-xl font-bold text-white mb-2">Premium Members Only</h3>
            <p className="text-sm text-gray-400 mb-2">
              Chapter 1 is free for everyone. Continue the story by upgrading to premium.
            </p>
            <p className="text-xs text-gray-600 mb-6">Unlock all chapters on every story, plus every other premium perk.</p>
            <a
              href="/premium"
              className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-xl transition text-sm"
            >
 Unlock All Chapters
            </a>
            <div className="mt-4">
              <Link href={`/story/${slug}/chapter/${allChapters[0].order}`} className="text-xs text-gray-500 hover:text-gray-400 transition underline">
                ← Re-read Chapter 1 for free
              </Link>
            </div>
          </div>
        ) : (
          <StoryContent content={chapter.content} storyLang={story.language ?? 'en'} />
        )}

        {/* ── Chapter navigation ── */}
        <div className="mt-12 flex items-center justify-between gap-4 border-t border-gray-800 pt-8">
          {prev ? (
            <Link
              href={`/story/${slug}/chapter/${prev.order}`}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-sm text-white transition"
            >
              <span>←</span>
              <span className="truncate max-w-40">{prev.title}</span>
            </Link>
          ) : <span />}

          {/* Chapter list dropdown - shows all chapters inline */}
          <Link
            href={`/story/${slug}`}
            className="text-xs text-gray-500 hover:text-red-400 transition"
          >
            All chapters
          </Link>

          {next ? (
            <Link
              href={`/story/${slug}/chapter/${next.order}`}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 border border-red-600 rounded-xl text-sm text-white font-semibold transition"
            >
              <span className="truncate max-w-40">{next.title}</span>
              <span>→</span>
            </Link>
          ) : (
            // Last chapter — link back to the story overview
            <Link
              href={`/story/${slug}`}
              className="flex items-center gap-2 px-4 py-2.5 bg-green-600/20 border border-green-500/40 rounded-xl text-sm text-green-400 font-semibold transition"
            >
              ✓ Finished
            </Link>
          )}
        </div>

        {/* Table of contents — compact list of all chapters */}
        <div className="mt-10 bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Table of Contents</p>
          <div className="space-y-1">
            {allChapters.map((c, i) => {
              const locked = i > 0 && !hasPremium && !isAuthor;
              return (
                <Link
                  key={c.id}
                  href={`/story/${slug}/chapter/${c.order}`}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                    c.order === order
                      ? 'bg-red-600/15 text-red-400 font-semibold'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  <span className="text-xs text-gray-600 w-5 shrink-0">{i + 1}</span>
                  <span className="truncate">{c.title}</span>
                  {locked && <Lock className="ml-auto w-3 h-3 text-yellow-600 shrink-0" strokeWidth={2} aria-label="Locked" />}
                  {!locked && c.order === order && <span className="ml-auto text-xs">← here</span>}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
