// app/monsters/[slug]/page.tsx
// Detail page for a single monster from the encyclopedia.
// Fetches the monster by slug, including linked stories.
// generateMetadata uses the same DB query pattern to set the <title> and
// description for SEO. Returns notFound() if the slug doesn't exist.
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import Image from 'next/image';

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const monster = await prisma.monster.findUnique({ where: { slug } });
  if (!monster) return { title: 'Not Found' };
  return { title: `${monster.name} | Monster Encyclopedia | Silent Evidence`, description: monster.description };
}

export default async function MonsterDetailPage({ params }: Props) {
  const { slug } = await params;
  const monster = await prisma.monster.findUnique({
    where: { slug },
    include: { storyLinks: true },
  });
  if (!monster) notFound();

  // Load linked stories
  const linkedStories = monster.storyLinks.length > 0
    ? await prisma.story.findMany({
        where: { id: { in: monster.storyLinks.map((l) => l.storyId) }, status: 'PUBLISHED' },
        select: { id: true, title: true, slug: true, coverImage: true, author: { select: { username: true } } },
      })
    : [];

  return (
    <main className="min-h-screen bg-gray-950 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Link href="/monsters" className="text-gray-500 hover:text-gray-300 text-sm mb-8 inline-block transition-colors">
          ← Back to Encyclopedia
        </Link>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          {/* Hero image */}
          {monster.image && (
            <div className="relative w-full h-64 overflow-hidden">
              <Image src={monster.image} alt={monster.name} fill sizes="(max-width: 768px) 100vw, 768px" className="object-cover" />
            </div>
          )}
          {!monster.image && (
            <div className="w-full h-40 bg-gray-800 flex items-center justify-center text-7xl text-gray-700">👹</div>
          )}

          <div className="p-8">
            <div className="flex items-start justify-between flex-wrap gap-4 mb-4">
              <h1 className="text-3xl font-black text-white">{monster.name}</h1>
              <span className="px-3 py-1 bg-red-900/40 border border-red-800 rounded-full text-red-400 text-sm font-medium">
                {monster.type}
              </span>
            </div>

            {monster.origin && (
              <p className="text-gray-500 text-sm mb-4">Origin: <span className="text-gray-400">{monster.origin}</span></p>
            )}

            {/* Scare factor */}
            <div className="flex items-center gap-2 mb-6">
              <span className="text-gray-500 text-sm">Scare Factor:</span>
              <div className="flex gap-0.5">
                {Array.from({ length: 10 }).map((_, i) => (
                  <span key={i} className={`text-sm ${i < monster.scareFactor ? 'text-red-500' : 'text-gray-700'}`}>💀</span>
                ))}
              </div>
              <span className="text-gray-500 text-sm ml-1">{monster.scareFactor}/10</span>
            </div>

            <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{monster.description}</p>

            {/* Linked stories */}
            {linkedStories.length > 0 && (
              <div className="mt-8">
                <h2 className="text-white font-bold mb-4">Featured in Stories</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {linkedStories.map((s) => (
                    <Link
                      key={s.id}
                      href={`/story/${s.slug}`}
                      className="flex items-center gap-3 p-3 bg-gray-800 rounded-xl hover:bg-gray-750 border border-gray-700 hover:border-gray-600 transition-colors"
                    >
                      {s.coverImage && (
                        <Image src={s.coverImage} alt={s.title} width={48} height={48} className="rounded-lg object-cover shrink-0" />
                      )}
                      <div>
                        <p className="text-white text-sm font-medium line-clamp-1">{s.title}</p>
                        <p className="text-gray-500 text-xs">by {s.author.username}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
