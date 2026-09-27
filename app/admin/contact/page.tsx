import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import ContactInbox from './ContactInbox';

export const metadata = { title: 'Contact Messages — Admin' };

export default async function AdminContactPage() {
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0);
  if (!userId) redirect('/login');

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!user || user.role !== 'ADMIN') redirect('/');

  const messages = await prisma.contactMessage.findMany({ orderBy: { createdAt: 'desc' } });
  const unread = messages.filter((m) => !m.read).length;

  return (
    <>
      <div className="flex items-center gap-3 mb-6">
        <span className="w-1 h-6 bg-red-600 rounded-full" />
        <h1 className="text-2xl font-bold text-white">Contact Messages</h1>
        {unread > 0 && (
          <span className="text-xs font-bold bg-red-600 text-white px-2 py-0.5 rounded-full">
            {unread} unread
          </span>
        )}
      </div>

      <ContactInbox initialMessages={JSON.parse(JSON.stringify(messages))} />
    </>
  );
}
