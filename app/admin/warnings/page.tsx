// app/admin/warnings/page.tsx — User warnings, suspensions, and bans
import { prisma } from '@/lib/prisma';
import WarningsClient from './WarningsClient';

export default async function AdminWarningsPage() {
  const [warnings, bannedUsers, suspendedUsers] = await Promise.all([
    prisma.userWarning.findMany({
      orderBy: { issuedAt: 'desc' },
      take: 50,
      include: {
        user:  { select: { id: true, username: true } },
        admin: { select: { username: true } },
      },
    }),
    prisma.user.findMany({
      where: { isBanned: true },
      select: { id: true, username: true, createdAt: true },
    }),
    prisma.user.findMany({
      where: { suspendedUntil: { gt: new Date() } },
      select: { id: true, username: true, suspendedUntil: true },
    }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Warnings &amp; Bans</h1>
      <p className="text-gray-500 text-sm mb-8">Issue warnings, suspend or ban users. All actions are logged in the audit trail.</p>
      <WarningsClient warnings={JSON.parse(JSON.stringify(warnings))} bannedUsers={bannedUsers} suspendedUsers={JSON.parse(JSON.stringify(suspendedUsers))} />
    </div>
  );
}
