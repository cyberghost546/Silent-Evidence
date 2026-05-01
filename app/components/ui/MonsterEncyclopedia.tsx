'use client';
// app/components/ui/MonsterEncyclopedia.tsx
// Browsable encyclopedia of horror monsters fetched from GET /api/monsters.
// Supports filtering by type (Supernatural, Creature, Psychological, Paranormal)
// and a text search input — both filter client-side after the initial fetch.
// Each monster card shows a scare-factor rating displayed as skull icons.
// To reuse: drop <MonsterEncyclopedia /> on any page — it fetches its own data.

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface Monster {
  id: number;
  name: string;
  slug: string;
  description: string;
  origin: string | null;
  image: string | null;
  type: string;
  scareFactor: number;
  _count: { storyLinks: number };
}

const TYPES = ['All', 'Supernatural', 'Creature', 'Psychological', 'Paranormal'];

const TYPE_COLORS: Record<string, string> = {
  Supernatural: 'text-purple-400 bg-purple-900/30 border-purple-800',
  Creature:     'text-green-400 bg-green-900/30 border-green-800',
  Psychological:'text-yellow-400 bg-yellow-900/30 border-yellow-800',
  Paranormal:   'text-blue-400 bg-blue-900/30 border-blue-800',
};

function ScullsRating({ score }: { score: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 10 }).map((_, i) => (
        <span key={i} className={`text-xs ${i < score ? 'text-red-500' : 'text-gray-700'}`}>💀</span>
      ))}
    </div>
  );
}

export default function MonsterEncyclopedia() {
  const [monsters, setMonsters] = useState<Monster[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState('All');
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeType !== 'All') params.set('type', activeType);
      if (query.trim()) params.set('q', query.trim());
      const res = await fetch(`/api/monsters?${params}`);
      setMonsters(await res.json());
    } finally {
      setLoading(false);
    }
  }, [activeType, query]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="space-y-6">
      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search monsters…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-gray-200
                     placeholder-gray-600 text-sm focus:outline-none focus:border-red-800"
        />
        <div className="flex gap-2 flex-wrap">
          {TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setActiveType(t)}
              className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                activeType === t
                  ? 'bg-red-900 border-red-700 text-red-200'
                  : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="text-center py-20 text-gray-600">Searching the dark…</div>}

      {!loading && monsters.length === 0 && (
        <div className="text-center py-20 text-gray-600">
          <div className="text-4xl mb-3">🔦</div>
          <p>No monsters found. They must be hiding.</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {monsters.map((m) => (
          <Link
            key={m.id}
            href={`/monsters/${m.slug}`}
            className="group bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden
                       hover:border-red-900/60 transition-colors"
          >
            {/* Cover image or placeholder */}
            <div className="h-36 bg-gray-800 relative overflow-hidden">
              {m.image ? (
                <Image src={m.image} alt={m.name} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover group-hover:scale-105 transition-transform duration-300" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-5xl text-gray-700">
                  👹
                </div>
              )}
              {/* Type badge */}
              <span className={`absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full border font-medium ${TYPE_COLORS[m.type] ?? 'text-gray-400 bg-gray-800 border-gray-700'}`}>
                {m.type}
              </span>
            </div>

            <div className="p-4">
              <h3 className="text-white font-bold mb-1 group-hover:text-red-400 transition-colors">{m.name}</h3>
              {m.origin && <p className="text-gray-600 text-xs mb-2">{m.origin}</p>}
              <p className="text-gray-400 text-sm line-clamp-2 mb-3">{m.description}</p>

              <ScullsRating score={m.scareFactor} />

              {m._count.storyLinks > 0 && (
                <p className="text-gray-600 text-xs mt-2">
                  Featured in {m._count.storyLinks} {m._count.storyLinks === 1 ? 'story' : 'stories'}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
