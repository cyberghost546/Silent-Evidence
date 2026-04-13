// app/messages/page.tsx
// Instagram-style full-screen DM page.
// Server component — preloads conversation list, then hands off to InboxClient.

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
