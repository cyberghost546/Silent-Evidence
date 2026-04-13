'use client';
// PollCard — renders a single poll with vote bars and click-to-vote interaction.
// Votes are togglable: clicking the same option removes your vote.
// Bars animate in via inline style width transitions once the user has voted.

import { useState } from 'react';

type PollOption = {
  id: number;
  text: string;
  _count: { votes: number };
  votes: { id: number }[]; // non-empty if the current user voted for this option
};

type Poll = {
  id: number;
  question: string;
  endsAt: string | null;
  createdAt: string;
  author: { username: string };
  _count: { votes: number };
  options: PollOption[];
};

export default function PollCard({ poll: initial, userId }: { poll: Poll; userId: number | null }) {
  const [poll, setPoll] = useState(initial);

  const isClosed = poll.endsAt ? new Date(poll.endsAt) < new Date() : false;
  const totalVotes = poll._count.votes;

  // The option ID the current user voted for (null = no vote)
  const myVoteOptionId = poll.options.find(o => o.votes.length > 0)?.id ?? null;

  const vote = async (optionId: number) => {
    if (!userId || isClosed) return;
    const res = await fetch(`/api/polls/${poll.id}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ optionId }),
    });
    if (!res.ok) return;
    const updated = await res.json();
    // Merge the fresh vote counts back into local state
    setPoll(prev => ({
      ...prev,
      _count: updated._count,
      options: prev.options.map(o => {
        const fresh = updated.options.find((u: { id: number; _count: { votes: number }; votes: { id: number }[] }) => u.id === o.id);
        return fresh ? { ...o, _count: fresh._count, votes: fresh.votes } : o;
      }),
    }));
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold text-white leading-snug">{poll.question}</p>
        {isClosed && (
          <span className="flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-800 border border-gray-700 text-gray-500">
            Closed
          </span>
        )}
      </div>

      {/* Options */}
      <div className="space-y-2">
        {poll.options.map(option => {
          const pct = totalVotes > 0 ? Math.round((option._count.votes / totalVotes) * 100) : 0;
          const isMyVote = myVoteOptionId === option.id;
          const hasVoted = myVoteOptionId !== null;

          return (
            <button
              key={option.id}
              onClick={() => vote(option.id)}
              disabled={!userId || isClosed}
              className={`relative w-full text-left rounded-lg border px-4 py-2.5 overflow-hidden transition ${
                isMyVote
                  ? 'border-red-500 bg-red-600/10'
                  : 'border-gray-700 hover:border-gray-500 bg-gray-800/50'
              } disabled:cursor-default`}
            >
              {/* Vote percentage fill bar — only shown after voting */}
              {hasVoted && (
                <div
                  className="absolute inset-y-0 left-0 bg-red-600/15 transition-all duration-500 rounded-lg"
                  style={{ width: `${pct}%` }}
                />
              )}
              <div className="relative flex items-center justify-between gap-2">
                <span className="text-sm text-gray-200">{option.text}</span>
                {hasVoted && (
                  <span className="text-xs font-semibold text-gray-400 flex-shrink-0">{pct}%</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-600">
        <span>by {poll.author.username}</span>
        <span>{totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}</span>
      </div>
    </div>
  );
}
