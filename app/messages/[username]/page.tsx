// app/messages/[username]/page.tsx — chat thread with one user
import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import Header from '@/app/components/ui/Header';
import ConversationClient from './ConversationClient';

type Props = { params: Promise<{ username: string }> };

export default async function ConversationPage({ params }: Props) {
  const { username } = await params;
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0);
  if (!userId) redirect('/login');

  const partner = await prisma.user.findUnique({
    where: { username },
    select: { id: true, username: true, profile: { select: { avatar: true } } },
  });
  if (!partner) return notFound();
  if (partner.id === userId) redirect('/messages');

  // Preload message thread
  const messages = await prisma.directMessage.findMany({
    where: {
      OR: [
        { senderId: userId, receiverId: partner.id },
        { senderId: partner.id, receiverId: userId },
      ],
    },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true, content: true, read: true, createdAt: true,
      senderId: true, receiverId: true,
      sender: { select: { username: true, profile: { select: { avatar: true } } } },
    },
  });

  // Mark incoming messages as read
  await prisma.directMessage.updateMany({
    where: { senderId: partner.id, receiverId: userId, read: false },
    data: { read: true },
  });

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col">
      <Header />
      <ConversationClient
        partner={partner}
        userId={userId}
        initialMessages={JSON.parse(JSON.stringify(messages))}
      />
    </main>
  );
}
