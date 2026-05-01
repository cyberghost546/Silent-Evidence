// app/admin/warnings/page.tsx
//
// Server Component — fetches all warnings, bans, and suspensions in parallel,
// then passes the data to WarningsClient which handles the interactive controls.
//
// PURPOSE:
//   Central moderation hub for disciplinary actions against users:
//     - Warnings: a logged message sent to the user (soft action, kept for history)
//     - Suspensions: temporary ban (suspendedUntil > now() = user is locked out)
//     - Bans: permanent removal (isBanned = true)
//
//   All actions are logged to the audit trail so there's a permanent record of
//   who did what and when.
//
// THREE PARALLEL QUERIES:
//   1. `userWarning.findMany` — the 50 most recent warning records with the warned
//      user's name and the admin who issued the warning (double join via `include`)
//   2. `user.findMany({ where: { isBanned: true } })` — all permanently banned users
//   3. `user.findMany({ where: { suspendedUntil: { gt: new Date() } } })` — only
//      ACTIVE suspensions (gt: greater than now). Expired suspensions are excluded.
//
// JSON SERIALIZATION:
//   `JSON.parse(JSON.stringify(warnings))` strips Prisma's Date objects (which don't
//   survive the Server → Client Component boundary) into plain ISO strings.
//   Only `warnings` and `suspendedUsers` need this treatment because they contain
//   Date fields (issuedAt, suspendedUntil). `bannedUsers` only has `createdAt`
//   but is included for consistency.

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
