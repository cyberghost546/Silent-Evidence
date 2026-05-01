'use client';
/**
 * app/messages/MessagesClient.tsx
 *
 * WHAT THIS FILE DOES:
 * A simpler, older version of the messages inbox — shows a list of conversation
 * partners as clickable rows. Clicking a row navigates to /messages/[username]
 * which opens the full conversation thread (ConversationClient.tsx).
 *
 * This component is a pure render — no state, no effects. It just maps the
 * `conversations` array to Link rows. All interactivity happens on the
 * individual conversation page.
 *
 * UNREAD BADGE:
 * If c.unread > 0, a small red circle with the count is overlaid on the avatar.
 * The conditional text weight (font-semibold vs normal) also helps draw the eye
 * to unread conversations — a common messaging app pattern.
 *
 * NOTE: This file is the simpler two-page version of messaging.
 * InboxClient.tsx is the newer single-page version with a two-panel layout
 * (conversation list on the left, thread on the right). Both exist because
 * the app supports two different messages URL patterns:
 *   /messages           → InboxClient (two-panel)
 *   /messages/[username] → ConversationClient (dedicated thread page)
 *
 * HOW TO REUSE:
 * This pattern — a list of conversations linking to individual thread pages —
 * is the simplest possible messaging UI. Use it when you don't need a
 * single-page split-panel layout.
 */
import Link from 'next/link';
import Image from 'next/image';

type Conversation = {
  partner: { id: number; username: string; profile: { avatar: string | null } | null };
  lastMessage: string;
  lastAt: string;
  unread: number;
};

function avatarUrl(partner: Conversation['partner']) {
  return partner.profile?.avatar ??
    `https://ui-avatars.com/api/?name=${encodeURIComponent(partner.username)}&background=dc2626&color=fff&size=64`;
}

export default function MessagesClient({
  conversations,
}: {
  conversations: Conversation[];
  userId: number;
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Messages</h1>

      {conversations.length === 0 ? (
        <div className="text-center py-20 text-gray-600">
          <p className="text-4xl mb-3">💬</p>
          <p>No messages yet. Visit a user profile to start a conversation.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map(c => (
            <Link
              key={c.partner.id}
              href={`/messages/${c.partner.username}`}
              className="flex items-center gap-4 bg-gray-900 border border-gray-800 hover:border-red-600/50 rounded-xl px-4 py-3.5 transition group"
            >
              <div className="relative flex-shrink-0">
                <Image src={avatarUrl(c.partner)} alt={c.partner.username}
                  width={44} height={44} className="rounded-full object-cover" />
                {c.unread > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full text-white text-[10px] flex items-center justify-center font-bold">
                    {c.unread > 9 ? '9+' : c.unread}
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className={`font-semibold truncate ${c.unread > 0 ? 'text-white' : 'text-gray-300'} group-hover:text-red-400 transition`}>
                  {c.partner.username}
                </p>
                <p className={`text-xs truncate mt-0.5 ${c.unread > 0 ? 'text-gray-300' : 'text-gray-600'}`}>
                  {c.lastMessage}
                </p>
              </div>

              <span className="text-xs text-gray-700 flex-shrink-0">
                {new Date(c.lastAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
