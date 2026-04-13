'use client';
/**
 * app/groups/[slug]/GroupDetailClient.tsx
 *
 * WHAT THIS FILE DOES:
 * This is the main interactive component for a single group page. It renders
 * three tabs — Feed, Members, and Polls — and handles all actions inline
 * without page reloads:
 *   • Join / Leave the group
 *   • Post a new message to the group feed
 *   • Delete your own posts
 *   • Create a poll (via CreatePollModal)
 *
 * TAB SYSTEM:
 * A `tab` state variable holds the active tab name ('feed' | 'members' | 'polls').
 * Each tab section is conditionally rendered with {tab === '...' && <section>}.
 * This is the simplest possible tab pattern — no router changes, no URL params.
 *
 * JOIN/LEAVE PATTERN:
 * joinLeave() sends DELETE (leave) or POST (join) to the API, then updates both:
 *   - userRole  (null = not a member, 'MEMBER' = joined)
 *   - group._count.members  (increment or decrement the displayed count)
 * This "optimistic-like" update keeps the UI snappy without waiting for a refetch.
 *
 * POST CREATION:
 * submitPost() POSTs the text, receives the new post object, and prepends it to
 * group.posts so it appears at the top immediately.
 *
 * HOW TO REUSE:
 * The tab + join/leave + inline post pattern is common in community features.
 * Key ideas:
 *   1. Store the full resource (group) in useState so you can update sub-fields.
 *   2. Use spread to update nested counts: { ...prev._count, members: n }
 *   3. Filter arrays to delete: prev.posts.filter(p => p.id !== postId)
 */
import { useState } from 'react';
import Link from 'next/link';
import PollCard from '@/app/components/ui/PollCard';
import CreatePollModal from '@/app/components/ui/CreatePollModal';

import { useState } from 'react';
import Link from 'next/link';
import PollCard from '@/app/components/ui/PollCard';
import CreatePollModal from '@/app/components/ui/CreatePollModal';

type Member = {
  id: number; role: string; joinedAt: string;
  user: { id: number; username: string; profile: { avatar: string | null } | null };
};
type Post = {
  id: number; content: string; createdAt: string;
  author: { id: number; username: string; profile: { avatar: string | null } | null };
};
type PollOption = { id: number; text: string; _count: { votes: number }; votes: { id: number }[] };
type Poll = {
  id: number; question: string; endsAt: string | null; createdAt: string;
  author: { username: string }; _count: { votes: number }; options: PollOption[];
};
type Group = {
  id: number; name: string; slug: string; description: string | null;
  coverImage: string | null; subgenre: string | null;
  _count: { members: number; posts: number };
  members: Member[]; posts: Post[]; polls: Poll[];
};

type Tab = 'feed' | 'members' | 'polls';

function avatarUrl(user: { username: string; profile: { avatar: string | null } | null }) {
  return user.profile?.avatar ??
    `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=22c55e&color=fff&size=64`;
}

export default function GroupDetailClient({
  group: initial,
  userId,
  userRole: initialRole,
}: {
  group: Group;
  userId: number | null;
  userRole: string | null;
}) {
  // group — the full group data; stored in state so we can update members/posts/polls live
  const [group,     setGroup]     = useState(initial);
  // userRole — null means not a member; 'MEMBER' or 'OWNER' means joined
  const [userRole,  setUserRole]  = useState(initialRole);
  // tab — which panel is currently visible
  const [tab,       setTab]       = useState<Tab>('feed');
  // postText — controlled input for the new post textarea
  const [postText,  setPostText]  = useState('');
  // posting / joining — loading flags to disable buttons while requests are in-flight
  const [posting,   setPosting]   = useState(false);
  const [joining,   setJoining]   = useState(false);
  // showPoll — controls the CreatePollModal visibility
  const [showPoll,  setShowPoll]  = useState(false);

  // Derived boolean — easier to read than `userRole !== null` everywhere
  const isMember = userRole !== null;

  // Toggle membership: POST to join, DELETE to leave
  const joinLeave = async () => {
    if (!userId) return;
    setJoining(true);
    const method = isMember ? 'DELETE' : 'POST';
    const res = await fetch(`/api/groups/${group.slug}/join`, { method });
    setJoining(false);
    if (res.ok) {
      // Update local role and adjust the displayed member count by ±1
      setUserRole(isMember ? null : 'MEMBER');
      setGroup(prev => ({
        ...prev,
        _count: { ...prev._count, members: prev._count.members + (isMember ? -1 : 1) },
      }));
    }
  };

  // Submit a new post to the group feed
  const submitPost = async () => {
    if (!postText.trim()) return;
    setPosting(true);
    const res = await fetch(`/api/groups/${group.slug}/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: postText }),
    });
    setPosting(false);
    if (res.ok) {
      const newPost: Post = await res.json();
      // Prepend to show the new post at the top without a page reload
      setGroup(prev => ({ ...prev, posts: [newPost, ...prev.posts] }));
      setPostText('');
    }
  };

  // Delete a post — shows a browser confirm dialog first for safety
  const deletePost = async (postId: number) => {
    if (!confirm('Delete this post?')) return;
    await fetch(`/api/groups/${group.slug}/posts/${postId}`, { method: 'DELETE' });
    // Remove from local state immediately — optimistic delete
    setGroup(prev => ({ ...prev, posts: prev.posts.filter(p => p.id !== postId) }));
  };

  // Called by CreatePollModal after a poll is created — prepend to the polls list
  const handlePollCreated = (poll: Poll) =>
    setGroup(prev => ({ ...prev, polls: [poll, ...prev.polls] }));

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Group header */}
      <div className="flex flex-col sm:flex-row gap-5 mb-8">
        {group.coverImage && (
          <img src={group.coverImage} alt={group.name}
            className="w-full sm:w-40 h-32 sm:h-28 object-cover rounded-xl flex-shrink-0" />
        )}
        <div className="flex-1">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-white">{group.name}</h1>
              {group.subgenre && <span className="text-xs text-red-400 font-semibold">{group.subgenre}</span>}
            </div>
            {userId && userRole !== 'OWNER' && (
              <button onClick={joinLeave} disabled={joining}
                className={`px-5 py-2 text-sm font-semibold rounded-lg transition ${
                  isMember
                    ? 'bg-gray-800 border border-gray-700 text-gray-300 hover:bg-red-600/10 hover:border-red-600/50 hover:text-red-400'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}>
                {joining ? '…' : isMember ? 'Leave' : 'Join'}
              </button>
            )}
          </div>
          {group.description && <p className="text-sm text-gray-400 mt-2">{group.description}</p>}
          <p className="text-xs text-gray-600 mt-2">{group._count.members} members · {group._count.posts} posts</p>
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 border-b border-gray-800 mb-6">
        {(['feed', 'members', 'polls'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition border-b-2 -mb-px ${
              tab === t ? 'border-red-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {/* Feed tab */}
      {tab === 'feed' && (
        <div className="space-y-5">
          {isMember && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
              <textarea value={postText} onChange={e => setPostText(e.target.value)}
                placeholder="Share something with the group…" rows={3}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:ring-2 focus:ring-red-500" />
              <div className="flex justify-end">
                <button onClick={submitPost} disabled={posting || !postText.trim()}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition">
                  {posting ? 'Posting…' : 'Post'}
                </button>
              </div>
            </div>
          )}

          {group.posts.length === 0 ? (
            <p className="text-center py-10 text-gray-600">No posts yet.{isMember ? ' Be the first!' : ''}</p>
          ) : (
            group.posts.map(post => (
              <div key={post.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <img src={avatarUrl(post.author)} alt={post.author.username}
                    className="w-8 h-8 rounded-full object-cover" />
                  <div>
                    <Link href={`/user/${post.author.username}`}
                      className="text-sm font-semibold text-white hover:text-red-400 transition">
                      {post.author.username}
                    </Link>
                    <p className="text-xs text-gray-600">
                      {new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  {userId === post.author.id && (
                    <button onClick={() => deletePost(post.id)}
                      className="ml-auto text-xs text-gray-600 hover:text-red-400 transition">Delete</button>
                  )}
                </div>
                <p className="text-sm text-gray-300 whitespace-pre-wrap">{post.content}</p>
              </div>
            ))
          )}
        </div>
      )}

      {/* Members tab */}
      {tab === 'members' && (
        <div className="grid sm:grid-cols-2 gap-3">
          {group.members.map(m => (
            <Link key={m.id} href={`/user/${m.user.username}`}
              className="flex items-center gap-3 bg-gray-900 border border-gray-800 hover:border-red-600/50 rounded-xl px-4 py-3 transition">
              <img src={avatarUrl(m.user)} alt={m.user.username} className="w-10 h-10 rounded-full object-cover" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate">{m.user.username}</p>
                <p className="text-xs text-gray-600 capitalize">{m.role.toLowerCase()}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Polls tab */}
      {tab === 'polls' && (
        <div className="space-y-5">
          {isMember && (
            <button onClick={() => setShowPoll(true)}
              className="w-full py-3 border border-dashed border-gray-700 hover:border-red-600/50 text-gray-500 hover:text-red-400 text-sm rounded-xl transition">
              + Create a poll for this group
            </button>
          )}
          {group.polls.length === 0 ? (
            <p className="text-center py-10 text-gray-600">No polls yet.</p>
          ) : (
            group.polls.map(poll => <PollCard key={poll.id} poll={poll} userId={userId} />)
          )}
        </div>
      )}

      {showPoll && (
        <CreatePollModal
          groupId={group.id}
          onClose={() => setShowPoll(false)}
          onCreated={handlePollCreated}
        />
      )}
    </div>
  );
}
