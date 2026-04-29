'use client';
// app/components/ui/VillainOfWeek.tsx
// Client component — displays this week's nominated villains, lets users vote,
// and allows nominating a new villain via an inline form.

import { useEffect, useState } from 'react';
import { Droplet, Crown, Check } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

// Shape of a villain returned by GET /api/villains
interface Villain {
  id: number;
  name: string;
  description: string | null;
  storyId: number | null;
  voteCount: number;
  voterIds: number[]; // IDs of users who already voted — used to highlight the button
}

// Props for the component; userId is null when the visitor is not logged in
interface Props {
  userId: number | null;
}

export default function VillainOfWeek({ userId }: Props) {
  // ── State ─────────────────────────────────────────────────────────────────

  // The list of villains fetched from the API
  const [villains, setVillains] = useState<Villain[]>([]);

  // Controls whether the nomination form is visible
  const [showForm, setShowForm] = useState(false);

  // Form field state for nominating a new villain
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formStoryId, setFormStoryId] = useState('');

  // Loading and submission flags to disable buttons while requests are in flight
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Track per-villain loading state so individual vote buttons can spin
  const [votingId, setVotingId] = useState<number | null>(null);

  // ── Data fetching ─────────────────────────────────────────────────────────

  // Fetch current-week villains on first render
  useEffect(() => {
    fetchVillains();
  }, []);

  async function fetchVillains() {
    setLoading(true);
    try {
      const res = await fetch('/api/villains');
      const data = await res.json();
      setVillains(data);
    } catch (err) {
      console.error('Failed to fetch villains', err);
    } finally {
      setLoading(false);
    }
  }

  // ── Vote handler ──────────────────────────────────────────────────────────

  async function handleVote(villainId: number) {
    // Require login to vote
    if (!userId) {
      alert('Please log in to vote.');
      return;
    }

    setVotingId(villainId); // mark this villain as "in progress"

    try {
      const res = await fetch(`/api/villains/${villainId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (!res.ok) throw new Error('Vote failed');

      const { voted, totalVotes } = await res.json();

      // Optimistically update the villain list in local state
      // so the UI reflects the change immediately without a full re-fetch.
      setVillains((prev) =>
        prev.map((v) => {
          if (v.id !== villainId) return v;

          // Add or remove the current userId from the voterIds array
          const voterIds = voted
            ? [...v.voterIds, userId]
            : v.voterIds.filter((id) => id !== userId);

          return { ...v, voteCount: totalVotes, voterIds };
        })
      );
    } catch (err) {
      console.error('Vote error', err);
    } finally {
      setVotingId(null); // clear the per-villain loading state
    }
  }

  // ── Nomination handler ────────────────────────────────────────────────────

  async function handleNominate(e: React.FormEvent) {
    e.preventDefault();

    if (!userId) {
      alert('Please log in to nominate a villain.');
      return;
    }

    if (!formName.trim()) {
      alert('Villain name is required.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/villains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          description: formDesc.trim() || undefined,
          storyId: formStoryId ? Number(formStoryId) : undefined,
          userId,
        }),
      });

      if (!res.ok) throw new Error('Nomination failed');

      // Reset form and hide it, then refresh the list
      setFormName('');
      setFormDesc('');
      setFormStoryId('');
      setShowForm(false);
      await fetchVillains(); // re-fetch so the new villain appears in the list
    } catch (err) {
      console.error('Nomination error', err);
      alert('Failed to nominate villain. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  // The top-ranked villain is the one with the most votes (index 0 since sorted desc)
  const topVillainId = villains.length > 0 ? villains[0].id : null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <section>
      {/* Section heading */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          {/* Red accent bar matching the site's other section headings */}
          <span className="w-1 h-6 bg-red-600 rounded-full" />
          <h2 className="text-2xl font-bold text-white">Villain of the Week</h2>
          <Droplet className="w-6 h-6 text-red-500" />
        </div>

        {/* Nominate button — opens the form below */}
        <button
          onClick={() => setShowForm((prev) => !prev)}
          className="text-sm font-semibold text-red-400 border border-red-700/50 px-4 py-1.5 rounded-full
                     hover:bg-red-900/30 transition shrink-0"
        >
          {showForm ? 'Cancel' : '+ Nominate a Villain'}
        </button>
      </div>

      {/* ── Nomination form (toggled) ──────────────────────────────────────── */}
      {showForm && (
        <form
          onSubmit={handleNominate}
          className="mb-6 bg-gray-900 border border-red-900/40 rounded-xl p-6 space-y-4"
        >
          <h3 className="text-white font-semibold text-lg">Nominate a Villain</h3>

          {/* Villain name — required */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Villain Name *</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. The Pale Man"
              required
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm
                         focus:outline-none focus:border-red-600 placeholder-gray-600"
            />
          </div>

          {/* Description — optional */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Description (optional)</label>
            <textarea
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder="Why is this villain so terrifying?"
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm
                         focus:outline-none focus:border-red-600 placeholder-gray-600 resize-none"
            />
          </div>

          {/* Optional story ID — connects villain to a specific story */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Story ID (optional)</label>
            <input
              type="number"
              value={formStoryId}
              onChange={(e) => setFormStoryId(e.target.value)}
              placeholder="Link to a story by its ID"
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm
                         focus:outline-none focus:border-red-600 placeholder-gray-600"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white font-semibold
                       px-6 py-2 rounded-lg transition text-sm"
          >
            {submitting ? 'Submitting…' : 'Nominate Villain'}
          </button>
        </form>
      )}

      {/* ── Villain cards ───────────────────────────────────────────────────── */}
      {loading ? (
        // Skeleton loading state — three grey placeholder cards
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-48 bg-gray-900/60 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : villains.length === 0 ? (
        // Empty state when no nominations exist yet for this week
        <p className="text-gray-500 text-sm text-center py-12">
          No villains nominated yet this week. Be the first!
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {villains.map((villain) => {
            // Determine if this is the leader (most votes) — they get the crown
            const isTop = villain.id === topVillainId && villain.voteCount > 0;

            // Determine if the current user has already voted for this villain
            const hasVoted = userId !== null && villain.voterIds.includes(userId);

            return (
              <div
                key={villain.id}
                className={[
                  // Base card styles
                  'relative rounded-xl border p-5 flex flex-col gap-3 bg-gray-900 transition',
                  // Leader gets a red glow + brighter border
                  isTop
                    ? 'border-red-600/60 shadow-[0_0_24px_rgba(220,38,38,0.35)]'
                    : 'border-gray-800 hover:border-gray-700',
                ].join(' ')}
              >
                {/* Crown badge — only shown for the leader */}
                {isTop && (
                  <span className="absolute top-3 right-3 inline-flex items-center gap-1 text-xs font-bold text-red-400
                                   bg-red-900/40 border border-red-700/40 px-2 py-0.5 rounded-full">
                    <Crown className="w-3 h-3" /> Leading
                  </span>
                )}

                {/* Villain name */}
                <h3 className="text-white font-bold text-lg leading-tight pr-16">{villain.name}</h3>

                {/* Description (clamped to 3 lines to keep cards uniform) */}
                {villain.description && (
                  <p className="text-gray-400 text-sm leading-relaxed line-clamp-3">
                    {villain.description}
                  </p>
                )}

                {/* Link to the related story if storyId is set */}
                {villain.storyId && (
                  <a
                    href={`/story/${villain.storyId}`}
                    className="text-xs text-red-400 hover:text-red-300 transition underline underline-offset-2"
                  >
                    View story →
                  </a>
                )}

                {/* Footer: vote count + vote button */}
                <div className="mt-auto flex items-center justify-between pt-2 border-t border-gray-800">
                  {/* Total vote count */}
                  <span className="inline-flex items-center gap-1 text-sm text-gray-400">
                    <Droplet className="w-3.5 h-3.5 text-red-500" /> {villain.voteCount} {villain.voteCount === 1 ? 'vote' : 'votes'}
                  </span>

                  {/* Vote / Un-vote toggle button */}
                  <button
                    onClick={() => handleVote(villain.id)}
                    disabled={votingId === villain.id}
                    className={[
                      'text-xs font-semibold px-3 py-1.5 rounded-lg transition disabled:opacity-50',
                      // Highlight button when the user has already voted
                      hasVoted
                        ? 'bg-red-700 text-white hover:bg-red-600'
                        : 'bg-gray-800 text-gray-300 border border-gray-700 hover:border-red-700 hover:text-red-400',
                    ].join(' ')}
                  >
                    {votingId === villain.id
                      ? '…'
                      : hasVoted
                      ? <span className="inline-flex items-center gap-1"><Check className="w-3 h-3" /> Voted</span>
                      : 'Vote'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
