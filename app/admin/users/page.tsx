// app/admin/users/page.tsx
// Server component — fetches all registered users from the database and passes them
// to AdminUsersClient, which renders the interactive user management table.
// Role changes and deletions are handled via API calls in the client component.

import { prisma } from '@/lib/prisma';
import AdminUsersClient from '@/app/components/ui/AdminUsersClient';

export default async function AdminUsersPage() {
  // Fetch all users, newest first, with story and comment counts.
  // _count avoids loading all related records — it runs a COUNT() query in the DB instead.
  const rawUsers = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count:        { select: { stories: true, comments: true } },
      subscription:  { select: { status: true } },
    },
  });

  const users = rawUsers.map(u => ({
    ...u,
    isPremium: u.role === 'ADMIN' || u.subscription?.status === 'active',
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Users</h1>
      <p className="text-gray-500 text-sm mb-8">{users.length} registered users</p>
      <AdminUsersClient users={users} />
    </div>
  );
}
