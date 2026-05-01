'use client';
/**
 * app/messages/[username]/ConversationClient.tsx
 *
 * WHAT THIS FILE DOES:
 * Renders a single private conversation between the logged-in user and one
 * partner. It shows the full message thread and a text input to send new messages.
 *
 * REAL-TIME STRATEGY — POLLING:
 * Every 10 seconds, setInterval fetches the full thread from /api/messages?with=id.
 * This is simpler than WebSockets but adds a small delay. For a better experience,
 * InboxClient.tsx uses Pusher (WebSockets) instead. This component is the simpler
 * fallback used on the dedicated /messages/[username] page.
 *
 * AUTO-SCROLL:
 * bottomRef is a ref attached to an invisible <div> at the very bottom of the
 * message list. After messages update, useEffect calls scrollIntoView({ behavior: 'smooth' })
 * so the view always shows the latest message — the same trick every chat app uses.
 *
 * MESSAGE ALIGNMENT:
 * isOwn = msg.senderId === userId
 *   true  → right-aligned red bubble (your message)
 *   false → left-aligned grey bubble (partner's message)
 * flex-row-reverse on the outer div flips the avatar+bubble order for own messages.
 *
 * ENTER TO SEND:
 * handleKey checks e.key === 'Enter' && !e.shiftKey. This lets users press
 * Shift+Enter for a newline without accidentally sending. Standard chat behaviour.
 *
 * HOW TO REUSE:
 * Copy this component for any chat feature. Key pieces:
 *   1. useRef + scrollIntoView for auto-scroll
 *   2. setInterval for polling, cleared by returning clearInterval in useEffect
 *   3. isOwn check for message alignment
 *   4. Enter-to-send keyboard handler
 */
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';

type Message = {
  id: number;
  content: string;
  read: boolean;
  createdAt: string;
  senderId: number;
  receiverId: number;
  sender: { username: string; profile: { avatar: string | null } | null };
};

type Partner = {
  id: number;
  username: string;
  profile: { avatar: string | null } | null;
};

function avatarUrl(username: string, avatar: string | null) {
  return avatar ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=dc2626&color=fff&size=64`;
}

export default function ConversationClient({
  partner,
  userId,
  initialMessages,
}: {
  partner: Partner;
  userId: number;
  initialMessages: Message[];
}) {
  // messages — starts from server-fetched data; updated on send and on each poll
  const [messages, setMessages] = useState(initialMessages);
  // text — controlled value for the message input textarea
  const [text, setText]         = useState('');
  // sending — true while the POST is in-flight; disables the Send button
  const [sending, setSending]   = useState(false);
  // bottomRef — points to an invisible div at the end of the message list
  // used to auto-scroll to the latest message
  const bottomRef = useRef<HTMLDivElement>(null);

  // Whenever messages array changes, scroll the bottomRef div into view
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Poll for new messages every 10 seconds
  // setInterval returns a timer ID; returning clearInterval(interval) from useEffect
  // ensures the timer is cancelled when the component unmounts (prevents memory leaks)
  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await fetch(`/api/messages?with=${partner.id}`);
      if (res.ok) {
        const fresh: Message[] = await res.json();
        setMessages(fresh); // replace entire list so deleted/edited messages sync too
      }
    }, 10_000); // 10 000 ms = 10 seconds
    return () => clearInterval(interval);
  }, [partner.id]);

  // Send a new message to the partner
  const send = async () => {
    if (!text.trim()) return; // ignore empty or whitespace-only messages
    setSending(true);
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiverId: partner.id, content: text.trim() }),
    });
    setSending(false);
    if (res.ok) {
      const msg: Message = await res.json();
      // Append the new message immediately without waiting for the next poll
      setMessages(prev => [...prev, msg]);
      setText(''); // clear the input
    }
  };

  // Keyboard shortcut: Enter sends, Shift+Enter inserts a newline
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const partnerAvatar = avatarUrl(partner.username, partner.profile?.avatar ?? null);

  return (
    <div className="flex flex-col flex-1 max-w-2xl w-full mx-auto px-4 py-6" style={{ height: 'calc(100vh - 68px)' }}>
      {/* Partner header */}
      <div className="flex items-center gap-3 pb-4 mb-4 border-b border-gray-800">
        <Link href={`/user/${partner.username}`}>
          <Image src={partnerAvatar} alt={partner.username} width={40} height={40} className="rounded-full object-cover" />
        </Link>
        <Link href={`/user/${partner.username}`} className="font-semibold text-white hover:text-red-400 transition">
          {partner.username}
        </Link>
        <Link href="/messages" className="ml-auto text-xs text-gray-500 hover:text-gray-300 transition">
          ← Inbox
        </Link>
      </div>

      {/* Message thread — scrollable */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.length === 0 && (
          <p className="text-center text-gray-600 text-sm py-10">No messages yet. Say hello!</p>
        )}
        {messages.map(msg => {
          const isOwn = msg.senderId === userId;
          return (
            <div key={msg.id} className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
              {!isOwn && (
                <Image src={partnerAvatar} alt={partner.username} width={28} height={28} className="rounded-full object-cover shrink-0 mb-1" />
              )}
              <div className={`max-w-[72%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                isOwn
                  ? 'bg-red-600/20 border border-red-600/30 text-white rounded-br-sm'
                  : 'bg-gray-800 border border-gray-700 text-gray-200 rounded-bl-sm'
              }`}>
                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                <p className={`text-[10px] mt-1 ${isOwn ? 'text-red-400/60 text-right' : 'text-gray-600'}`} suppressHydrationWarning>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="flex gap-3 pt-4 border-t border-gray-800 mt-4">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder={`Message ${partner.username}…`}
          rows={1}
          suppressHydrationWarning
          className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white resize-none focus:outline-none focus:ring-2 focus:ring-red-500 transition"
          style={{ maxHeight: '120px', overflowY: 'auto' }}
        />
        <button
          onClick={send}
          disabled={sending || !text.trim()}
          suppressHydrationWarning
          className="px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition flex-shrink-0"
        >
          {sending ? '…' : 'Send'}
        </button>
      </div>
    </div>
  );
}
