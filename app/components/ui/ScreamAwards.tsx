'use client';
// app/components/ui/ScreamAwards.tsx
// Annual community awards widget — shows award categories with their nominations and vote counts.
// Fetches the current open award from GET /api/awards/current.
// Each nomination can be voted on via POST /api/awards/vote (one vote per nomination per user).
// Already-voted nomination IDs are tracked in myVotes state to prevent double voting.
// To reuse: drop <ScreamAwards /> on any page — it fetches the active award automatically.

import { useState, useEffect, useCallback } from 'react';

interface Nomination {
  id: number;
  label: string;
  _count: { votes: number };
}

interface Category {
  id: number;
  name: string;
  nominations: Nomination[];
}

interface Award {
  id: number;
  year: number;
  isOpen: boolean;
  categories: Category[];
}

export default function ScreamAwards() {
  const [award, setAward] = useState<Award | null>(null);
  const [myVotes, setMyVotes] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [awardRes, votesRes] = await Promise.all([
        fetch('/api/awards'),
        fetch('/api/awards/vote'),
      ]);
      const { award: a } = await awardRes.json();
      const { votes } = await votesRes.json();
      setAward(a);
      setMyVotes(votes ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function vote(nominationId: number) {
    setVoting(nominationId);
    try {
      await fetch('/api/awards/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nominationId }),
      });
      load();
    } finally {
      setVoting(null);
    }
  }

  if (loading) return <div className="text-center py-20 text-gray-600">Loading awards…</div>;

  if (!award) return (
    <div className="text-center py-20 text-gray-600">
      <div className="text-4xl mb-3">🏆</div>
      <p>No awards ceremony running right now. Check back soon!</p>
    </div>
  );

  const totalVotesCast = award.categories.reduce(
    (sum, cat) => sum + cat.nominations.reduce((s, n) => s + n._count.votes, 0), 0
  );

  return (
    <div className="space-y-8">
      {/* Award header */}
      <div className="bg-gray-900 border border-yellow-900/40 rounded-2xl p-6 text-center">
        <div className="text-4xl mb-2">🏆</div>
        <h2 className="text-2xl font-black text-yellow-400">{award.year} Scream Awards</h2>
        <p className="text-gray-500 text-sm mt-1">{totalVotesCast.toLocaleString()} votes cast</p>
        {!award.isOpen && (
          <span className="inline-block mt-2 px-3 py-1 bg-gray-800 border border-gray-700 rounded-full text-gray-500 text-xs">
            Voting Closed
          </span>
        )}
        {award.isOpen && (
          <span className="inline-block mt-2 px-3 py-1 bg-green-900/40 border border-green-800 rounded-full text-green-400 text-xs">
            Voting Open
          </span>
        )}
      </div>

      {/* Categories */}
      {award.categories.map((cat) => {
        const totalCatVotes = cat.nominations.reduce((s, n) => s + n._count.votes, 0);
        const myVoteInCat = cat.nominations.find((n) => myVotes.includes(n.id));

        return (
          <div key={cat.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
              <span className="text-yellow-500">🏆</span>
              {cat.name}
              {myVoteInCat && (
                <span className="ml-auto text-green-400 text-xs font-normal">✓ You voted</span>
              )}
            </h3>

            <div className="space-y-3">
              {cat.nominations.map((nom) => {
                const pct = totalCatVotes > 0 ? Math.round((nom._count.votes / totalCatVotes) * 100) : 0;
                const isMyVote = myVotes.includes(nom.id);

                return (
                  <div key={nom.id} className="relative">
                    {/* Progress bar background */}
                    <div
                      className="absolute inset-0 rounded-xl bg-red-900/20 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                    <div className={`relative flex items-center justify-between p-3 rounded-xl border transition-colors ${
                      isMyVote ? 'border-red-700 bg-red-900/10' : 'border-gray-800 bg-gray-800/40'
                    }`}>
                      <div className="flex items-center gap-3">
                        {isMyVote && <span className="text-red-400 text-sm">✓</span>}
                        <span className="text-gray-200 text-sm font-medium">{nom.label}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-500 text-xs">{nom._count.votes} votes · {pct}%</span>
                        {award.isOpen && (
                          <button
                            onClick={() => vote(nom.id)}
                            disabled={voting === nom.id || isMyVote}
                            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                              isMyVote
                                ? 'bg-red-900/30 text-red-400 cursor-default'
                                : 'bg-gray-700 hover:bg-red-900 text-gray-300 hover:text-white'
                            }`}
                          >
                            {voting === nom.id ? '…' : isMyVote ? 'Voted' : 'Vote'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
