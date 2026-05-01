import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import UserSupportClient from './UserSupportClient';

export const metadata = { title: 'User Support — Admin' };

export default async function UserSupportPage() {
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0);
  if (!userId) redirect('/login');

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!user || user.role !== 'ADMIN') redirect('/');

  return (
    <>
      <div className="flex items-center gap-3 mb-2">
        <span className="w-1 h-6 bg-red-600 rounded-full" />
        <h1 className="text-2xl font-bold text-white">User Support</h1>
      </div>
      <p className="text-sm text-gray-500 mb-8">
        Search for a user to reset their password, send them advice, or lift bans and suspensions.
      </p>
      <UserSupportClient />
    </>
  );
}
