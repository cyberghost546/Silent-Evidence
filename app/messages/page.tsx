// app/messages/page.tsx
//
// Server Component — auth-gated inbox page.
//
// PURPOSE:
//   Instagram-style full-screen DM inbox. Shows one row per unique conversation
//   partner, with the most recent message preview and an unread count badge.
//   Clicking a conversation navigates to /messages/[username] for the full thread.
//
// DATA PATTERN:
//   One query loads ALL direct messages involving this user (sent or received),
//   ordered newest first. We then deduplicate them client-side into one conversation
//   entry per partner.
//
//   WHY LOAD ALL MESSAGES INSTEAD OF QUERYING CONVERSATIONS DIRECTLY?
//   There is no separate "Conversation" table — each DM row is independent.
//   To build the inbox, we need the most recent message per partner. The most
//   efficient approach at this scale is to load all messages and do the grouping
//   in JS (see the `seen` Set below). For very high-volume apps you'd use a SQL
//   subquery or a separate conversations table.
//
// DEDUPLICATION ALGORITHM:
//   `seen` is a Set<number> of partner IDs we've already processed.
//   We iterate messages newest-first (already sorted by Prisma).
//   For each message, the "partner" is whoever is NOT the current user.
//   The first time we see a partner ID, we add their conversation entry.
//   Subsequent messages from the same partner are skipped (`continue`).
//   Result: one entry per partner, with the newest message as the preview.
//
// UNREAD COUNT:
//   Computed by scanning the loaded messages array — no extra DB query.
//   `m.senderId === partner.id && m.receiverId === userId && !m.read`
//   This counts messages the partner sent to us that we haven't read yet.
//
// LAYOUT:
//   `h-screen overflow-hidden` — the inbox takes the full viewport height.
//   InboxClient manages its own internal scroll regions (conversation list + chat pane).

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import Header from '@/app/components/ui/Header';
import InboxClient from './InboxClient';

export const metadata = { title: 'Messages — Silent Evidence' };

export default async function MessagesPage() {
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0);
  if (!userId) redirect('/login');

  // Fetch all messages involving this user, newest first
  const messages = await prisma.directMessage.findMany({
    where: { OR: [{ senderId: userId }, { receiverId: userId }] },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, content: true, createdAt: true, read: true,
      senderId: true, receiverId: true,
      sender:   { select: { id: true, username: true, profile: { select: { avatar: true } } } },
      receiver: { select: { id: true, username: true, profile: { select: { avatar: true } } } },
    },
  });

  // Deduplicate into one entry per conversation partner, preserving newest-first order
  const seen = new Set<number>();
  const conversations: {
    partner: { id: number; username: string; profile: { avatar: string | null } | null };
    lastMessage: string;
    lastAt: string;
    unread: number;
  }[] = [];

  for (const msg of messages) {
    const partner = msg.senderId === userId ? msg.receiver : msg.sender;
    if (seen.has(partner.id)) continue;
    seen.add(partner.id);

    // Count all unread messages from this partner to the current user
    const unread = messages.filter(
      m => m.senderId === partner.id && m.receiverId === userId && !m.read
    ).length;

    conversations.push({
      partner,
      lastMessage: msg.content.length > 60 ? msg.content.slice(0, 60) + '…' : msg.content,
      lastAt: msg.createdAt.toISOString(),
      unread,
    });
  }

  return (
    // Full-screen layout — no extra padding so the panel fills the viewport
    <div className="flex flex-col h-screen bg-gray-950 text-white overflow-hidden">
      <Header />
      <InboxClient
        userId={userId}
        initialConversations={JSON.parse(JSON.stringify(conversations))}
      />
    </div>
  );
}
