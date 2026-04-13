// app/admin/contact/page.tsx — admin inbox for contact form messages

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import AdminSidebar from '@/app/components/ui/AdminSidebar';
import ContactInbox from './ContactInbox';

export const metadata = { title: 'Contact Messages — Admin' };

export default async function AdminContactPage() {
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0);
  if (!userId) redirect('/login');

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { username: true, role: true } });
  if (!user || user.role !== 'ADMIN') redirect('/');

  // Preload all messages newest first
  const messages = await prisma.contactMessage.findMany({
    orderBy: { createdAt: 'desc' },
  });

  const unread = messages.filter(m => !m.read).length;

  return (
    // h-screen + flex keeps everything inside the viewport with no scroll gap below the panels
    <div className="h-screen bg-gray-950 text-white flex overflow-hidden">
      <AdminSidebar username={user.username} />

      {/* flex-col so the header + inbox stack vertically and inbox can grow to fill remaining space */}
      <main className="flex-1 md:ml-64 flex flex-col overflow-hidden pt-16 md:pt-0">
        {/* Page header — fixed height so inbox below can flex-1 to fill the rest */}
        <div className="flex items-center gap-3 px-6 md:px-10 py-6 flex-shrink-0">
          <span className="w-1 h-6 bg-red-600 rounded-full" />
          <h1 className="text-2xl font-bold text-white">Contact Messages</h1>
          {unread > 0 && (
            <span className="text-xs font-bold bg-red-600 text-white px-2 py-0.5 rounded-full">
              {unread} unread
            </span>
          )}
        </div>

        {/* Inbox fills all remaining vertical space — px/pb for spacing */}
        <div className="flex-1 min-h-0 px-6 md:px-10 pb-6 md:pb-10">
          <ContactInbox initialMessages={JSON.parse(JSON.stringify(messages))} />
        </div>
      </main>
    </div>
  );
}
