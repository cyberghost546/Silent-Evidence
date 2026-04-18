'use client';
// app/admin/seo/page.tsx
// SEO dashboard: top stories by views, category traffic, top tags, 404 log.

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Story  = { id: number; title: string; slug: string; views: number; createdAt: string; author: { username: string }; category: { name: string }; _count: { likes: number; comments: number } };
type Cat    = { name: string; slug: string; count: number; views: number };
type Tag    = { name: string; slug: string; _count: { stories: number } };
type NotFound = { path: string; count: number; lastSeen: string };

export default function AdminSeoPage() {
  const [stories, setStories]   = useState<Story[]>([]);
  const [cats, setCats]         = useState<Cat[]>([]);
  const [tags, setTags]         = useState<Tag[]>([]);
  const [nf, setNf]             = useState<NotFound[]>([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState<'stories' | 'categories' | 'tags' | '404'>('stories');

  useEffect(() => {
    fetch('/api/admin/seo')
      .then(r => r.json())
      .then(d => {
        setStories(d.topStories ?? []);
        setCats(d.categories ?? []);
        setTags(d.topTags ?? []);
        setNf(d.notFounds ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  const maxViews = stories[0]?.views ?? 1;

  const tabs = [
    { id: 'stories' as const,    label: 'Top Stories',  count: stories.length },
    { id: 'categories' as const, label: 'Categories',   count: cats.length },
    { id: 'tags' as const,       label: 'Top Tags',     count: tags.length },
    { id: '404' as const,        label: '404 Errors',   count: nf.length },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">SEO Dashboard</h1>
      <p className="text-gray-500 text-sm mb-6">Traffic performance, top content, and broken links</p>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map(t => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-semibold rounded-xl border transition ${tab === t.id ? 'bg-red-600 border-red-600 text-white' : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white'}`}>
            {t.label} <span className="ml-1 text-xs opacity-70">{t.count}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({length:5}).map((_,i)=><div key={i} className="h-12 bg-gray-800 rounded-xl animate-pulse"/>)}</div>
      ) : (
        <>
          {/* Top Stories */}
          {tab === 'stories' && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">#</th>
                  <th className="px-4 py-3 text-left">Story</th>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-right">Views</th>
                  <th className="px-4 py-3 text-right">Likes</th>
                  <th className="px-4 py-3 text-right">Comments</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-800/60">
                  {stories.map((s, i) => (
                    <tr key={s.id} className="hover:bg-gray-800/30 transition">
                      <td className="px-4 py-3 text-gray-600 text-xs">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div>
                          <Link href={`/story/${s.slug}`} target="_blank" className="font-semibold text-white hover:text-red-400 transition text-sm">{s.title}</Link>
                          <p className="text-xs text-gray-500 mt-0.5">by {s.author.username}</p>
                        </div>
                        {/* View bar */}
                        <div className="mt-1.5 h-1 bg-gray-800 rounded-full overflow-hidden w-full max-w-xs">
                          <div className="h-full bg-red-500 rounded-full" style={{ width: `${(s.views / maxViews) * 100}%` }} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{s.category.name}</td>
                      <td className="px-4 py-3 text-right font-semibold text-white">{s.views.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-gray-400">{s._count.likes}</td>
                      <td className="px-4 py-3 text-right text-gray-400">{s._count.comments}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Categories */}
          {tab === 'categories' && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {cats.map(c => (
                <div key={c.slug} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <p className="font-semibold text-white">{c.name}</p>
                  <p className="text-2xl font-bold text-red-400 mt-1">{c.views.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">views · {c.count} stories</p>
                </div>
              ))}
            </div>
          )}

          {/* Tags */}
          {tab === 'tags' && (
            <div className="flex flex-wrap gap-2">
              {tags.map(t => (
                <Link key={t.slug} href={`/tag/${t.slug}`} target="_blank"
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 border border-gray-700 hover:border-red-600/50 rounded-xl text-sm text-gray-300 hover:text-white transition">
                  #{t.name}
                  <span className="text-xs text-gray-600">{t._count.stories}</span>
                </Link>
              ))}
            </div>
          )}

          {/* 404 log */}
          {tab === '404' && (
            nf.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <p className="text-3xl mb-3">✅</p>
                <p>No 404 errors logged yet.</p>
                <p className="text-xs mt-2">The not-found page will log hits automatically once the tracker is active.</p>
              </div>
            ) : (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-3 text-left">Path</th>
                    <th className="px-4 py-3 text-right">Hits</th>
                    <th className="px-4 py-3 text-right">Last seen</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-800/60">
                    {nf.sort((a,b) => b.count - a.count).map((r, i) => (
                      <tr key={i} className="hover:bg-gray-800/30 transition">
                        <td className="px-4 py-3 font-mono text-red-400 text-xs">{r.path}</td>
                        <td className="px-4 py-3 text-right font-bold text-white">{r.count}</td>
                        <td className="px-4 py-3 text-right text-gray-500 text-xs">{new Date(r.lastSeen).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
