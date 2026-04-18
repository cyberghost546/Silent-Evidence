// app/bundle/[slug]/page.tsx
// Detail page for a single story bundle — shows all included stories + buy button.

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import BundlePurchaseButton from '@/app/components/ui/BundlePurchaseButton';
import { BookOpen, Users, Check, Eye, Heart } from 'lucide-react';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const bundle = await prisma.storyBundle.findUnique({ where: { slug }, select: { title: true } });
  return { title: bundle ? `${bundle.title} — Silent Evidence` : 'Bundle Not Found' };
}

export default async function BundleDetailPage({ params }: Props) {
  const { slug } = await params;

  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0) || null;

  const bundle = await prisma.storyBundle.findUnique({
    where: { slug, active: true },
    include: {
      items: {
        include: {
          story: {
            select: {
              id: true, title: true, slug: true, excerpt: true, coverImage: true,
              author:   { select: { username: true } },
              category: { select: { name: true } },
              _count:   { select: { likes: true, comments: true } },
              views: true,
            },
          },
        },
      },
      _count: { select: { purchases: true } },
    },
  });

  if (!bundle) return notFound();

  // Check if this user already bought the bundle
  const alreadyOwned = userId
    ? !!(await prisma.bundlePurchase.findUnique({ where: { userId_bundleId: { userId, bundleId: bundle.id } } }))
    : false;

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <Header />

      {/* Bundle hero */}
      <div className="relative bg-gray-950 border-b border-gray-800 py-14">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(220,38,38,0.08)_0%,_transparent_60%)]" />
        <div className="max-w-3xl mx-auto px-4 relative">
          <Link href="/bundles" className="text-xs text-gray-500 hover:text-red-400 transition">← All bundles</Link>
          <h1 className="text-3xl font-black text-white mt-4 mb-3">{bundle.title}</h1>
          {bundle.description && (
            <p className="text-gray-400 mb-4 max-w-xl">{bundle.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-2xl font-bold text-red-400">
              {bundle.price === 0 ? 'Free' : `$${(bundle.price / 100).toFixed(2)}`}
            </span>
            <span className="inline-flex items-center gap-2 text-xs text-gray-500"><BookOpen className="w-3 h-3" /> {bundle.items.length} stories · <Users className="w-3 h-3" /> {bundle._count.purchases} purchased</span>
          </div>

          {/* Purchase / owned state */}
          <div className="mt-6">
            {alreadyOwned ? (
              <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-500/10 border border-green-500/30 text-green-400 font-semibold rounded-xl text-sm">
                <Check className="w-4 h-4" /> You own this bundle
              </span>
            ) : (
              <BundlePurchaseButton slug={slug} price={bundle.price} isLoggedIn={!!userId} />
            )}
          </div>
        </div>
      </div>

      {/* Story list */}
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="flex items-center gap-3 mb-6">
          <span className="w-1 h-5 bg-red-600 rounded-full" />
          <h2 className="text-lg font-bold text-white">Stories in this bundle</h2>
        </div>

        <div className="space-y-4">
          {bundle.items.map(({ story }) => (
            <Link
              key={story.id}
              href={`/story/${story.slug}`}
              className="group flex gap-4 bg-gray-800 border border-gray-700 hover:border-red-600/50 rounded-xl p-4 transition-all"
            >
              {story.coverImage && (
                <img src={story.coverImage} alt={story.title} className="w-24 h-16 object-cover rounded-lg flex-shrink-0" />
              )}
              <div className="flex flex-col justify-between flex-1 min-w-0">
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest text-red-400">{story.category.name}</span>
                  <h3 className="text-sm font-semibold text-white group-hover:text-red-300 transition mt-0.5 line-clamp-1">{story.title}</h3>
                  {story.excerpt && <p className="text-xs text-gray-500 line-clamp-2 mt-1">{story.excerpt}</p>}
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-600 mt-2">
                  <span>by {story.author.username}</span>
                  <span className="inline-flex items-center gap-1"><Eye className="w-3 h-3" /> {story.views.toLocaleString()}</span>
                  <span className="inline-flex items-center gap-1"><Heart className="w-3 h-3" /> {story._count.likes}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
      <Footer />
    </main>
  );
}
