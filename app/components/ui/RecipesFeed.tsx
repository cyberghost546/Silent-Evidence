'use client';
// app/components/ui/RecipesFeed.tsx
// Browsable feed of horror-themed recipes (food, drinks, rituals).
// Fetches from GET /api/recipes?type=<food|drink|ritual> on mount and whenever the
// type filter tab changes. Reactions (emoji) are sent via POST /api/recipes/[id]/react.
// Each card shows difficulty, prep time, servings, and the author's username.
// To reuse: drop <RecipesFeed /> on any page — it manages its own state and data fetching.

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Utensils } from 'lucide-react';
import { RECIPE_TYPES, RECIPE_REACTIONS } from '@/lib/reactions';

interface Recipe {
  id: number;
  title: string;
  slug: string;
  description: string;
  image: string | null;
  type: string;
  difficulty: string;
  prepMins: number | null;
  servings: number | null;
  author: { username: string };
  reactionCounts: Record<string, number>;
}

// Filter tabs and reaction set both come from lib/reactions.
const TYPES = RECIPE_TYPES;

const DIFFICULTY_COLOR: Record<string, string> = {
  easy: 'text-green-400 bg-green-900/30',
  medium: 'text-yellow-400 bg-yellow-900/30',
  hard: 'text-red-400 bg-red-900/30',
};

export default function RecipesFeed() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = activeType ? `?type=${activeType}` : '';
      const res = await fetch(`/api/recipes${params}`);
      setRecipes(await res.json());
    } finally {
      setLoading(false);
    }
  }, [activeType]);

  useEffect(() => {
    load();
  }, [load]);

  async function react(recipeId: number, emoji: string) {
    await fetch('/api/recipes/react', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipeId, emoji }),
    });
    load();
  }

  return (
    <div className="space-y-6">
      {/* Type filter */}
      <div className="flex gap-2 flex-wrap">
        {TYPES.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveType(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
              activeType === t.key
                ? 'bg-red-900 border-red-700 text-red-200'
                : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500'
            }`}
          >
            <t.icon className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {loading && <div className="text-center py-20 text-gray-600">Summoning recipes…</div>}

      {!loading && recipes.length === 0 && (
        <div className="text-center py-20 text-gray-600">
          <p>No recipes yet. Be the first to share a cursed creation.</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {recipes.map((r) => (
          <div
            key={r.id}
            className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-gray-700 transition-colors"
          >
            {/* Cover */}
            {r.image ? (
              <div className="relative h-44 overflow-hidden">
                <Image
                  src={r.image}
                  alt={r.title}
                  fill
                  sizes="(max-width: 640px) 100vw, 50vw"
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-full h-32 bg-gray-800 flex items-center justify-center text-5xl text-gray-700">
                {(() => {
                  const TypeIcon = RECIPE_TYPES.find((t) => t.key === r.type)?.icon ?? Utensils;
                  return (
                    <TypeIcon
                      className="w-4 h-4 inline-block"
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                  );
                })()}
              </div>
            )}

            <div className="p-5">
              {/* Badges */}
              <div className="flex gap-2 mb-3 flex-wrap">
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 border border-gray-700 text-gray-400 capitalize">
                  {(() => {
                    const TypeIcon = RECIPE_TYPES.find((t) => t.key === r.type)?.icon ?? Utensils;
                    return (
                      <TypeIcon
                        className="w-4 h-4 inline-block"
                        strokeWidth={1.75}
                        aria-hidden="true"
                      />
                    );
                  })()}{' '}
                  {r.type}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${DIFFICULTY_COLOR[r.difficulty] ?? ''}`}
                >
                  {r.difficulty}
                </span>
                {r.prepMins && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 border border-gray-700 text-gray-500">
                    {r.prepMins} min
                  </span>
                )}
              </div>

              <Link href={`/recipes/${r.slug}`} className="block">
                <h3 className="text-white font-bold mb-2 hover:text-red-400 transition-colors">
                  {r.title}
                </h3>
              </Link>
              <p className="text-gray-400 text-sm line-clamp-2 mb-4">{r.description}</p>

              <div className="flex items-center justify-between">
                <span className="text-gray-600 text-xs">by {r.author.username}</span>
                <div className="flex gap-1">
                  {RECIPE_REACTIONS.map(({ id, icon: Icon, label }) => (
                    <button
                      key={id}
                      onClick={() => react(r.id, id)}
                      title={label}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs transition-colors"
                    >
                      <Icon className="w-3.5 h-3.5" strokeWidth={1.75} aria-hidden="true" />
                      <span className="sr-only">{label}</span>
                      {(r.reactionCounts[id] ?? 0) > 0 && (
                        <span className="text-gray-400">{r.reactionCounts[id]}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
