'use client';
// StoryInteractions.tsx
// Handles likes and comments (with nested replies) on a story page.
// Also includes a report modal so users can flag offensive comments.

import { useState } from 'react';
import CommentReactions from './CommentReactions';
import SpoilerText from './SpoilerText';
import { getCsrfToken } from '@/lib/getCsrfToken';

type CommentUser = { username: string; profile: { avatar: string | null } | null };

type Comment = {
  id: number;
  content: string;
  createdAt: string;
  pinned: boolean;
  user: CommentUser;
  parentId: number | null;
  replies: Comment[];
};

type Props = {
  storyId: number;
  storyAuthorId: number | null; // used to show pin button only to the story author
  initialLiked: boolean;
  initialLikeCount: number;
  initialComments: Comment[];
  currentUserId: number | null;
  currentUsername: string | null;
};

function avatarUrl(user: CommentUser) {
  return (
    user.profile?.avatar ??
    `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=dc2626&color=fff&size=64`
  );
}

// Renders comment text with @mentions turned into clickable profile links.
// Any @word token is wrapped in an anchor tag; everything else is plain text.
function renderContent(text: string) {
  const parts = text.split(/(@\w+)/g);
  return parts.map((part, i) => {
    if (/^@\w+$/.test(part)) {
      const username = part.slice(1);
      return (
        <a
          key={i}
          href={`/user/${username}`}
          className="text-red-400 hover:text-red-300 font-medium transition"
        >
          {part}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Report modal ─────────────────────────────────────────────────
// Shows when a user clicks "Report" on a comment.
// Lets them pick a reason and add an optional note, then submits to /api/reports.
function ReportModal({
  targetId,
  type,
  onClose,
}: {
  targetId: number;
  type: 'COMMENT' | 'STORY' | 'FORUM_POST' | 'FORUM_REPLY';
  onClose: () => void;
}) {
  // The selected reason for reporting
  const [reason, setReason] = useState('');
  // Optional extra context from the reporter
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // Success state — show a thank-you message after submission
  const [done, setDone] = useState(false);

  const reasons = [
    { value: 'HARASSMENT',  label: 'Harassment or bullying' },
    { value: 'HATE_SPEECH', label: 'Hate speech' },
    { value: 'SPAM',        label: 'Spam' },
    { value: 'INAPPROPRIATE', label: 'Inappropriate content' },
    { value: 'THREATS',     label: 'Threats or violence' },
    // Legally-mandated notice routes — see ForumReportButton for the rationale.
    { value: 'COPYRIGHT',       label: 'Copyright infringement' },
    { value: 'ILLEGAL_CONTENT', label: 'Illegal content' },
    { value: 'OTHER',       label: 'Other' },
  ];

  const submit = async () => {
    if (!reason) return;
    setSubmitting(true);
    await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, targetId, reason, note }),
    });
    setSubmitting(false);
    setDone(true); // Show confirmation message
  };

  return (
    // Dark overlay backdrop — clicking it closes the modal
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6"
      onClick={onClose}
    >
      {/* Modal panel — scrollable so it never gets cut off on small screens */}
      <div
        className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {done ? (
          // Thank-you screen after submission
          <div className="text-center py-4">
            <p className="text-white font-semibold mb-1">Report submitted</p>
            <p className="text-sm text-gray-400 mb-4">
              Thank you — our moderators will review it soon.
            </p>
            <button
              onClick={onClose}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <h3 className="text-lg font-bold text-white mb-1">Report content</h3>
            <p className="text-sm text-gray-400 mb-4">
              Why are you reporting this? Our team will review it.
            </p>

            {/* Reason selector — radio-style buttons */}
            <div className="space-y-2 mb-4">
              {reasons.map((r) => (
                <label
                  key={r.value}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border cursor-pointer transition ${
                    reason === r.value
                      ? 'border-red-500 bg-red-500/10 text-white'
                      : 'border-gray-700 text-gray-400 hover:border-gray-500'
                  }`}
                >
                  <input
                    type="radio"
                    name="report-reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                    className="accent-red-500"
                  />
                  <span className="text-sm">{r.label}</span>
                </label>
              ))}
            </div>

            {/* Optional note field */}
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add more details (optional)…"
              rows={2}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:ring-2 focus:ring-red-600 transition mb-4"
            />

            {/* Action buttons */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={!reason || submitting}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
              >
                {submitting ? 'Sending…' : 'Submit report'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Single comment card (recursive for replies) ──────────────────
function CommentCard({
  comment,
  storyId,
  currentUserId,
  currentUsername,
  storyAuthorId,
  onDelete,
  onReplyAdded,
  onPinToggle,
  depth,
}: {
  comment: Comment;
  storyId: number;
  currentUserId: number | null;
  currentUsername: string | null;
  storyAuthorId: number | null;
  onDelete: (id: number) => void;
  onReplyAdded: (parentId: number, reply: Comment) => void;
  onPinToggle: (id: number, pinned: boolean) => void;
  depth: number;
}) {
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // Controls visibility of the report modal for this specific comment
  const [showReport, setShowReport] = useState(false);
  const [pinning, setPinning] = useState(false);

  // Toggle pin state — calls the PATCH /api/comments/[id]/pin endpoint
  const handlePin = async () => {
    setPinning(true);
    const res = await fetch(`/api/comments/${comment.id}/pin`, { method: 'PATCH' });
    if (res.ok) {
      const data = await res.json();
      onPinToggle(data.id, data.pinned);
    }
    setPinning(false);
  };

  const submitReply = async () => {
    if (!replyText.trim()) return;
    setSubmitting(true);
    const csrfToken = await getCsrfToken();
    const res = await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
      body: JSON.stringify({ storyId, content: replyText, parentId: comment.id }),
    });
    if (res.ok) {
      const newReply: Comment = await res.json();
      onReplyAdded(comment.id, newReply);
      setReplyText('');
      setShowReplyBox(false);
    }
    setSubmitting(false);
  };

  const handleDelete = async () => {
    if (!confirm('Delete this comment?')) return;
    const res = await fetch(`/api/comments/${comment.id}`, { method: 'DELETE' });
    if (res.ok) onDelete(comment.id);
  };

  return (
    // haunted-comment triggers a CSS keyframe that fades + drifts the card in like a ghost
    // pinned comments get a subtle amber left border to distinguish them
    <div className={`haunted-comment ${depth > 0 ? 'ml-8 border-l-2 border-gray-700 pl-4' : ''} ${comment.pinned && depth === 0 ? 'border-l-2 border-amber-500 pl-3 -ml-3' : ''}`}>
      <style>{`
        /* Ghost fade-in: slides up from slightly below and fades in with a subtle flicker */
        @keyframes hauntIn {
          0%   { opacity: 0; transform: translateY(12px); filter: blur(2px); }
          40%  { opacity: 0.6; filter: blur(0.5px); }
          70%  { opacity: 0.9; transform: translateY(-2px); }
          100% { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
        .haunted-comment {
          animation: hauntIn 0.6s ease-out both;
        }
      `}</style>
      <div className="flex gap-3 py-4">
        {/* Avatar */}
        <img
          src={avatarUrl(comment.user)}
          alt={comment.user.username}
          className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-0.5"
        />

        <div className="flex-1 min-w-0">
          {/* Header row — pinned badge shows for pinned top-level comments */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-white">{comment.user.username}</span>
            <span className="text-xs text-gray-500" suppressHydrationWarning>{timeAgo(comment.createdAt)}</span>
            {comment.pinned && (
              <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded-full">
 Pinned
              </span>
            )}
          </div>

          {/* Content — @mentions are links, [spoiler]...[/spoiler] tags are blurred until clicked */}
          <p className="text-sm text-gray-300 mt-1 whitespace-pre-wrap break-words">
            <SpoilerText text={comment.content} />
          </p>

          {/* Emoji reactions row — logged-in users can toggle reactions on comments */}
          <CommentReactions
            commentId={comment.id}
            initialCounts={{}}
            initialMine={[]}
            isLoggedIn={!!currentUserId}
          />

          {/* Actions */}
          <div className="flex items-center gap-4 mt-2">
            {currentUserId && depth < 2 && (
              <button
                onClick={() => setShowReplyBox(!showReplyBox)}
                className="text-xs text-gray-500 hover:text-red-400 transition"
              >
                {showReplyBox ? 'Cancel' : 'Reply'}
              </button>
            )}
            {currentUsername && comment.user.username === currentUsername && (
              <button
                onClick={handleDelete}
                className="text-xs text-gray-600 hover:text-red-500 transition"
              >
                Delete
              </button>
            )}
            {/* Report button — shown to any logged-in user who didn't write this comment */}
            {currentUserId && comment.user.username !== currentUsername && (
              <button
                onClick={() => setShowReport(true)}
                className="text-xs text-gray-600 hover:text-yellow-500 transition"
                title="Report this comment"
              >
                Report
              </button>
            )}
            {/* Pin button — only the story author can pin comments; only on top-level (depth 0) */}
            {currentUserId === storyAuthorId && depth === 0 && (
              <button
                onClick={handlePin}
                disabled={pinning}
                className={`text-xs transition disabled:opacity-50 ${
                  comment.pinned
                    ? 'text-amber-400 hover:text-gray-400'
                    : 'text-gray-600 hover:text-amber-400'
                }`}
                title={comment.pinned ? 'Unpin comment' : 'Pin comment'}
              >
                {comment.pinned ? 'Unpin' : 'Pin'}
              </button>
            )}
          </div>

          {/* Report modal — rendered inline but sits above all content via fixed positioning */}
          {showReport && (
            <ReportModal
              targetId={comment.id}
              type="COMMENT"
              onClose={() => setShowReport(false)}
            />
          )}

          {/* Reply box */}
          {showReplyBox && (
            <div className="mt-3 flex gap-2">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`Reply to ${comment.user.username}…`}
                rows={2}
                suppressHydrationWarning
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:ring-2 focus:ring-red-600 transition"
              />
              <button
                onClick={submitReply}
                disabled={submitting || !replyText.trim()}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition self-end"
              >
                {submitting ? '…' : 'Reply'}
              </button>
            </div>
          )}

          {/* Nested replies */}
          {comment.replies.length > 0 && (
            <div className="mt-2 space-y-0">
              {comment.replies.map((reply) => (
                <CommentCard
                  key={reply.id}
                  comment={reply}
                  storyId={storyId}
                  currentUserId={currentUserId}
                  currentUsername={currentUsername}
                  storyAuthorId={storyAuthorId}
                  onDelete={onDelete}
                  onReplyAdded={onReplyAdded}
                  onPinToggle={onPinToggle}
                  depth={depth + 1}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────
export default function StoryInteractions({
  storyId,
  storyAuthorId,
  initialLiked,
  initialLikeCount,
  initialComments,
  currentUserId,
  currentUsername,
}: Props) {
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [liking, setLiking] = useState(false);

  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Toggle like
  const toggleLike = async () => {
    if (!currentUserId) return;
    setLiking(true);
    const res = await fetch('/api/likes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storyId }),
    });
    if (res.ok) {
      const data = await res.json();
      setLiked(data.liked);
      setLikeCount(data.count);
    }
    setLiking(false);
  };

  // Submit top-level comment
  const submitComment = async () => {
    if (!commentText.trim()) return;
    setSubmitting(true);
    const csrfToken = await getCsrfToken();
    const res = await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
      body: JSON.stringify({ storyId, content: commentText }),
    });
    if (res.ok) {
      const newComment: Comment = await res.json();
      setComments((prev) => [newComment, ...prev]);
      setCommentText('');
    }
    setSubmitting(false);
  };

  // Delete a comment (top-level or nested)
  const handleDelete = (deletedId: number) => {
    const removeFromList = (list: Comment[]): Comment[] =>
      list
        .filter((c) => c.id !== deletedId)
        .map((c) => ({ ...c, replies: removeFromList(c.replies) }));
    setComments((prev) => removeFromList(prev));
  };

  // Update pinned state — unpin all others (only one can be pinned at a time), then set the toggled one
  const handlePinToggle = (id: number, pinned: boolean) => {
    setComments((prev) =>
      prev.map((c) => ({
        ...c,
        pinned: pinned ? c.id === id : false, // if pinning: only mark the target; if unpinning: clear all
      }))
    );
  };

  // Add a reply to the correct parent
  const handleReplyAdded = (parentId: number, reply: Comment) => {
    const addReply = (list: Comment[]): Comment[] =>
      list.map((c) =>
        c.id === parentId
          ? { ...c, replies: [...c.replies, reply] }
          : { ...c, replies: addReply(c.replies) }
      );
    setComments((prev) => addReply(prev));
  };

  return (
    <div className="mt-12 space-y-10">

      {/* ── Like button ───────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleLike}
          disabled={liking || !currentUserId}
          title={!currentUserId ? 'Log in to like stories' : undefined}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-medium text-sm transition border ${
            liked
              ? 'bg-red-600 border-red-600 text-white hover:bg-red-700'
              : 'bg-transparent border-gray-600 text-gray-400 hover:border-red-500 hover:text-red-400'
          } disabled:opacity-60`}
        >
          {/* Heart icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-5 h-5"
            fill={liked ? 'currentColor' : 'none'}
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.318 6.318a4.5 4.5 0 0 0 0 6.364L12 20.364l7.682-7.682a4.5 4.5 0 0 0-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 0 0-6.364 0z"
            />
          </svg>
          {liked ? 'Liked' : 'Like'}
        </button>
        <span className="text-sm text-gray-500">
          {likeCount} {likeCount === 1 ? 'like' : 'likes'}
        </span>
      </div>

      {/* ── Comments ──────────────────────────────────────── */}
      <div>
        <h2 className="text-xl font-bold text-white mb-6">
          Comments <span className="text-gray-500 font-normal text-base">({comments.length})</span>
        </h2>

        {/* Comment input */}
        {currentUserId ? (
          <div className="flex gap-3 mb-8">
            <div className="flex-1" suppressHydrationWarning>
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment…"
                rows={3}
                suppressHydrationWarning
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white resize-none focus:outline-none focus:ring-2 focus:ring-red-600 transition"
              />
              <div className="flex justify-end mt-2">
                <button
                  onClick={submitComment}
                  disabled={submitting || !commentText.trim()}
                  suppressHydrationWarning
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
                >
                  {submitting ? 'Posting…' : 'Post Comment'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500 mb-8">
            <a href="/login" className="text-red-400 hover:underline">Log in</a> to leave a comment.
          </p>
        )}

        {/* Comment list — pinned comment floats to the top */}
        {comments.length === 0 ? (
          <p className="text-gray-600 text-sm">No comments yet. Be the first!</p>
        ) : (
          <div className="divide-y divide-gray-800">
            {[...comments]
              .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))
              .map((comment) => (
                <CommentCard
                  key={comment.id}
                  comment={comment}
                  storyId={storyId}
                  currentUserId={currentUserId}
                  currentUsername={currentUsername}
                  storyAuthorId={storyAuthorId}
                  onDelete={handleDelete}
                  onReplyAdded={handleReplyAdded}
                  onPinToggle={handlePinToggle}
                  depth={0}
                />
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
