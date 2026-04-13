'use client';
// InboxClient.tsx
// Instagram-style two-panel messages page.
//   Left panel  — search bar to find users + conversation list
//   Right panel — selected chat thread with real-time polling (or empty state)
//
// All data loading after initial render is done client-side so the panel
// switches feel instant without full page navigations.

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePusherChannel } from '@/lib/pusher-client';

// ── Types ─────────────────────────────────────────────────────────────────────

type Profile = { avatar: string | null } | null;

type Conversation = {
  partner: { id: number; username: string; profile: Profile };
  lastMessage: string;
  lastAt: string;
  unread: number;
};

type Message = {
  id: number;
  content: string;
  read: boolean;
  createdAt: string;
  senderId: number;
  receiverId: number;
  sender: { username: string; profile: Profile };
};

type SearchUser = {
  id: number;
  username: string;
  profile: Profile;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function avatarUrl(username: string, avatar: string | null | undefined) {
  return (
    avatar ??
    `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=22c55e&color=fff&size=64`
  );
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  // Same calendar day → just show time
  if (d.toDateString() === now.toDateString()) return formatTime(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Main component ────────────────────────────────────────────────────────────

export default function InboxClient({
  userId,
  initialConversations,
}: {
  userId: number;
  initialConversations: Conversation[];
}) {
  // Left panel state
  const [conversations, setConversations] = useState(initialConversations);
  const [searchQuery, setSearchQuery]     = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searching, setSearching]         = useState(false);

  // Right panel state — the currently open conversation
  const [activePartner, setActivePartner] = useState<SearchUser | null>(null);
  const [messages, setMessages]           = useState<Message[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [text, setText]                   = useState('');
  const [sending, setSending]             = useState(false);

  // Ref to auto-scroll to the bottom of the thread
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Search users ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearching(false);
      if (res.ok) setSearchResults(await res.json());
    }, 300); // debounce 300 ms so we don't hit the API on every keystroke
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ── Load conversation thread ────────────────────────────────────────────────

  const loadThread = useCallback(async (partnerId: number) => {
    const res = await fetch(`/api/messages?with=${partnerId}`);
    if (res.ok) {
      const fresh: Message[] = await res.json();
      setMessages(fresh);
    }
  }, []);

  const openConversation = async (user: SearchUser) => {
    // Clear search UI when opening a conversation
    setSearchQuery('');
    setSearchResults([]);
    setActivePartner(user);
    setMessages([]);
    setLoadingThread(true);
    await loadThread(user.id);
    setLoadingThread(false);

    // Mark this partner as read in the conversation list
    setConversations(prev =>
      prev.map(c => (c.partner.id === user.id ? { ...c, unread: 0 } : c))
    );
  };

  // ── Auto-scroll to bottom when messages change ──────────────────────────────

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Real-time messages via Pusher (falls back to polling if not configured) ─

  // Subscribe to this user's private Pusher channel for instant message delivery
  const channel = usePusherChannel(`private-user-${userId}`);

  useEffect(() => {
    if (!channel) return;

    // When a new message arrives via WebSocket, add it to the thread immediately
    const handler = (data: { id: number; content: string; senderId: number; senderUsername: string; createdAt: string }) => {
      // Only add to thread if we're viewing this sender's conversation
      if (activePartner && data.senderId === activePartner.id) {
        setMessages(prev => {
          // Prevent duplicates (message might arrive via both Pusher and next poll)
          if (prev.some(m => m.id === data.id)) return prev;
          return [...prev, {
            id: data.id,
            content: data.content,
            read: true,
            createdAt: data.createdAt,
            senderId: data.senderId,
            receiverId: userId,
            sender: { username: data.senderUsername, profile: null },
          }];
        });
      }

      // Update the conversation list sidebar with the new message preview
      setConversations(prev => {
        const updated = prev.map(c =>
          c.partner.id === data.senderId
            ? { ...c, lastMessage: data.content.slice(0, 60), lastAt: data.createdAt, unread: activePartner?.id === data.senderId ? 0 : c.unread + 1 }
            : c
        );
        return updated;
      });
    };

    channel.bind('new-message', handler);
    return () => { channel.unbind('new-message', handler); };
  }, [channel, activePartner, userId]);

  // Fallback polling every 10s — only used when Pusher isn't configured
  // If Pusher is active, this still runs as a safety net for missed events
  useEffect(() => {
    if (!activePartner) return;
    const interval = setInterval(() => loadThread(activePartner.id), channel ? 30_000 : 10_000);
    return () => clearInterval(interval);
  }, [activePartner, loadThread, channel]);

  // ── Send a message ──────────────────────────────────────────────────────────

  const send = async () => {
    if (!text.trim() || !activePartner || sending) return;
    setSending(true);
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiverId: activePartner.id, content: text.trim() }),
    });
    setSending(false);
    if (res.ok) {
      const msg: Message = await res.json();
      setMessages(prev => [...prev, msg]);
      setText('');

      // Update the conversation list preview
      setConversations(prev => {
        const existing = prev.find(c => c.partner.id === activePartner.id);
        const updated: Conversation = {
          partner: activePartner,
          lastMessage: msg.content.length > 60 ? msg.content.slice(0, 60) + '…' : msg.content,
          lastAt: msg.createdAt,
          unread: 0,
        };
        if (existing) {
          return [updated, ...prev.filter(c => c.partner.id !== activePartner.id)];
        }
        return [updated, ...prev];
      });
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends; Shift+Enter inserts a newline
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  // ── Total unread count for the page title ───────────────────────────────────
  const totalUnread = conversations.reduce((s, c) => s + c.unread, 0);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-57px)] bg-gray-950 overflow-hidden">

      {/* ════════════════════════════════════════════════════════════
          LEFT PANEL — conversation list + search
      ════════════════════════════════════════════════════════════ */}
      <aside className={`
        flex flex-col border-r border-gray-800 bg-gray-900
        w-full md:w-80 lg:w-96 flex-shrink-0
        ${activePartner ? 'hidden md:flex' : 'flex'}
      `}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h1 className="text-lg font-bold text-white">
            Messages
            {totalUnread > 0 && (
              <span className="ml-2 text-xs font-bold bg-red-600 text-white px-1.5 py-0.5 rounded-full">
                {totalUnread}
              </span>
            )}
          </h1>
        </div>

        {/* Search bar */}
        <div className="px-4 py-3 border-b border-gray-800">
          <div className="relative">
            {/* Search icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search people…"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-600 transition"
            />
            {/* Clear button */}
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Search results OR conversation list */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Search results ── */}
          {searchQuery.trim() ? (
            <div>
              {searching && (
                <p className="text-xs text-gray-600 text-center py-6">Searching…</p>
              )}
              {!searching && searchResults.length === 0 && (
                <p className="text-xs text-gray-600 text-center py-6">No users found.</p>
              )}
              {searchResults.map(u => (
                <button
                  key={u.id}
                  onClick={() => openConversation(u)}
                  className="flex items-center gap-3 w-full px-4 py-3 hover:bg-gray-800 transition text-left"
                >
                  <img
                    src={avatarUrl(u.username, u.profile?.avatar)}
                    alt={u.username}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                  />
                  <span className="text-sm font-medium text-white">{u.username}</span>
                </button>
              ))}
            </div>

          ) : (
            /* ── Conversation list ── */
            <>
              {conversations.length === 0 ? (
                <div className="text-center py-16 px-6">
                  <p className="text-4xl mb-3">💬</p>
                  <p className="text-sm text-gray-500">No conversations yet.</p>
                  <p className="text-xs text-gray-600 mt-1">Search for someone above to start chatting.</p>
                </div>
              ) : (
                conversations.map(c => {
                  const isActive = activePartner?.id === c.partner.id;
                  return (
                    <button
                      key={c.partner.id}
                      onClick={() => openConversation(c.partner)}
                      className={`flex items-center gap-3 w-full px-4 py-3.5 transition text-left border-l-2 ${
                        isActive
                          ? 'bg-gray-800 border-red-600'
                          : 'border-transparent hover:bg-gray-800/60'
                      }`}
                    >
                      {/* Avatar with unread dot */}
                      <div className="relative flex-shrink-0">
                        <img
                          src={avatarUrl(c.partner.username, c.partner.profile?.avatar)}
                          alt={c.partner.username}
                          className="w-11 h-11 rounded-full object-cover"
                        />
                        {c.unread > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-600 rounded-full text-white text-[9px] flex items-center justify-center font-bold">
                            {c.unread > 9 ? '9+' : c.unread}
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-1">
                          <p className={`text-sm font-semibold truncate ${c.unread > 0 ? 'text-white' : 'text-gray-300'}`}>
                            {c.partner.username}
                          </p>
                          <span className="text-[10px] text-gray-600 flex-shrink-0">{formatDate(c.lastAt)}</span>
                        </div>
                        <p className={`text-xs truncate mt-0.5 ${c.unread > 0 ? 'text-gray-300' : 'text-gray-600'}`}>
                          {c.lastMessage}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </>
          )}
        </div>
      </aside>

      {/* ════════════════════════════════════════════════════════════
          RIGHT PANEL — chat thread or empty state
      ════════════════════════════════════════════════════════════ */}
      <main className={`
        flex flex-col flex-1 min-w-0
        ${activePartner ? 'flex' : 'hidden md:flex'}
      `}>

        {!activePartner ? (
          /* Empty state — shown on desktop when no conversation is selected */
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="w-20 h-20 rounded-full bg-gray-800 border-2 border-gray-700 flex items-center justify-center mb-5">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-9 h-9 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Your Messages</h2>
            <p className="text-sm text-gray-500 max-w-xs">
              Search for a user on the left to start a private conversation.
            </p>
          </div>

        ) : (
          <>
            {/* ── Thread header ── */}
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-800 bg-gray-900 flex-shrink-0">
              {/* Back button — mobile only, returns to conversation list */}
              <button
                onClick={() => setActivePartner(null)}
                className="md:hidden p-1.5 -ml-1 text-gray-400 hover:text-white transition"
                aria-label="Back to inbox"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <img
                src={avatarUrl(activePartner.username, activePartner.profile?.avatar)}
                alt={activePartner.username}
                className="w-9 h-9 rounded-full object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{activePartner.username}</p>
              </div>

              {/* Link to profile */}
              <a
                href={`/user/${activePartner.username}`}
                className="text-xs text-gray-500 hover:text-red-400 transition flex-shrink-0"
              >
                View profile →
              </a>
            </div>

            {/* ── Message thread (scrollable) ── */}
            <div className="flex-1 overflow-y-auto px-4 py-5 space-y-3">
              {loadingThread ? (
                <p className="text-center text-gray-600 text-sm py-10">Loading…</p>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-16">
                  <img
                    src={avatarUrl(activePartner.username, activePartner.profile?.avatar)}
                    alt={activePartner.username}
                    className="w-16 h-16 rounded-full object-cover border-2 border-gray-700 mb-4"
                  />
                  <p className="text-sm text-gray-400 font-medium">{activePartner.username}</p>
                  <p className="text-xs text-gray-600 mt-1">No messages yet. Say hello! 👋</p>
                </div>
              ) : (
                messages.map(msg => {
                  const isOwn = msg.senderId === userId;
                  return (
                    <div
                      key={msg.id}
                      className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}
                    >
                      {/* Partner avatar — only show on their messages */}
                      {!isOwn && (
                        <img
                          src={avatarUrl(activePartner.username, activePartner.profile?.avatar)}
                          alt={activePartner.username}
                          className="w-7 h-7 rounded-full object-cover flex-shrink-0 mb-1"
                        />
                      )}

                      {/* Bubble */}
                      <div className={`max-w-[68%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        isOwn
                          ? 'bg-red-600 text-white rounded-br-sm'
                          : 'bg-gray-800 border border-gray-700 text-gray-200 rounded-bl-sm'
                      }`}>
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        <p
                          className={`text-[10px] mt-1 ${isOwn ? 'text-red-200/70 text-right' : 'text-gray-600'}`}
                          suppressHydrationWarning
                        >
                          {formatTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              {/* Scroll anchor */}
              <div ref={bottomRef} />
            </div>

            {/* ── Message input bar ── */}
            <div className="flex items-end gap-3 px-4 py-4 border-t border-gray-800 bg-gray-900 flex-shrink-0">
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={handleKey}
                placeholder={`Message ${activePartner.username}…`}
                rows={1}
                suppressHydrationWarning
                className="flex-1 bg-gray-800 border border-gray-700 rounded-2xl px-4 py-2.5 text-sm text-white resize-none focus:outline-none focus:ring-2 focus:ring-red-500 transition"
                style={{ maxHeight: '120px', overflowY: 'auto' }}
              />
              {/* Send button */}
              <button
                onClick={send}
                disabled={sending || !text.trim()}
                suppressHydrationWarning
                aria-label="Send message"
                className="w-10 h-10 flex items-center justify-center rounded-full bg-red-600 hover:bg-red-700 disabled:opacity-40 transition flex-shrink-0"
              >
                {sending ? (
                  /* Spinning ring while sending */
                  <svg className="w-4 h-4 text-white animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                ) : (
                  /* Paper-plane send icon */
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
