'use client';
// PollsClient — handles the polls list, create button, and optimistic poll prepending.

import { useState } from 'react';
import PollCard from '@/app/components/ui/PollCard';
import CreatePollModal from '@/app/components/ui/CreatePollModal';

type PollOption = {
  id: number;
  text: string;
  _count: { votes: number };
  votes: { id: number }[];
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

export default function PollsClient({ polls: initial, userId }: { polls: Poll[]; userId: number | null }) {
  const [polls, setPolls]           = useState(initial);
  const [showCreate, setShowCreate] = useState(false);

  // Prepend the newly created poll to the list without a page reload
  const handleCreated = (poll: Poll) => setPolls(prev => [poll, ...prev]);

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Community Polls</h1>
          <p className="text-sm text-gray-500 mt-1">Vote on horror topics and story outcomes.</p>
        </div>
        {userId && (
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition"
          >
            + Create Poll
          </button>
        )}
      </div>

      {/* Poll list */}
      {polls.length === 0 ? (
        <div className="text-center py-20 text-gray-600">
          <p>No open polls yet.{userId ? ' Be the first to create one!' : ''}</p>
        </div>
      ) : (
        <div className="space-y-5">
          {polls.map(poll => (
            <PollCard key={poll.id} poll={poll} userId={userId} />
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <CreatePollModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
