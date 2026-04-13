// app/bundles/page.tsx
// Browse all active story bundles — each bundle is a curated collection of stories.

import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import { Package, BookOpen, Users } from 'lucide-react';

export const metadata = { title: 'Story Bundles — Silent Evidence' };

export default async function BundlesPage() {
  const bundles = await prisma.storyBundle.findMany({
    where: { active: true },
    orderBy: { createdAt: 'desc' },
    include: {
      items: {
        take: 3,
        include: { story: { select: { coverImage: true, title: true } } },
      },
      _count: { select: { items: true, purchases: true } },
    },
  });

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <Header />

      {/* Hero */}
      <div className="relative bg-gray-950 border-b border-gray-800 py-14">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(220,38,38,0.08)_0%,_transparent_60%)]" />
        <div className="max-w-4xl mx-auto px-4 relative text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-red-500 mb-3">Curated Collections</p>
          <h1 className="text-4xl font-black text-white mb-3">Story Bundles</h1>
          <p className="text-gray-400 max-w-lg mx-auto">
            Hand-picked collections of the finest horror stories. Buy a bundle and get everything inside.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-12">
        {bundles.length === 0 ? (
          <div className="text-center py-24 text-gray-600">
            <Package className="w-10 h-10 mx-auto mb-3 text-gray-600" />
            <p>No bundles available yet.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {bundles.map(bundle => (
              <Link
                key={bundle.id}
                href={`/bundle/${bundle.slug}`}
                className="group bg-gray-800 border border-gray-700 hover:border-red-600/50 rounded-2xl overflow-hidden transition-all"
              >
                {/* Cover or story collage */}
                <div className="h-40 relative overflow-hidden bg-gray-900">
                  {bundle.coverImage ? (
                    <img src={bundle.coverImage} alt={bundle.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    // Mini collage of up to 3 story covers
                    <div className="flex h-full">
                      {bundle.items.slice(0, 3).map((item, i) => (
                        <div key={i} className="flex-1 overflow-hidden">
                          {item.story.coverImage ? (
                            <img src={item.story.coverImage} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-800/80 to-transparent" />
                  {/* Price badge */}
                  <span className="absolute top-3 right-3 bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                    {bundle.price === 0 ? 'Free' : `$${(bundle.price / 100).toFixed(2)}`}
                  </span>
                </div>

                <div className="p-5">
                  <h2 className="text-base font-bold text-white group-hover:text-red-300 transition mb-1">{bundle.title}</h2>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1"><BookOpen className="w-3 h-3" /> {bundle._count.items} stories</span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1"><Users className="w-3 h-3" /> {bundle._count.purchases} purchased</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}
