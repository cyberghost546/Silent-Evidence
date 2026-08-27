// app/admin/users/page.tsx
//
// Server Component — loads all registered users for the admin user management table.
//
// PURPOSE:
//   Gives the admin a full list of users with the ability to:
//     - Search and filter by username, email, or role
//     - Change a user's role (USER → ADMIN or vice versa)
//     - Ban, warn, or delete accounts
//     - See per-user story and comment counts at a glance
//
// DATA STRATEGY:
//   All users are fetched in one query because the admin needs to be able to
//   filter/search the full list. `_count` gives story/comment counts without
//   loading every story or comment. `subscription` is included to determine
//   whether a user has an active premium subscription.
//
// isPremium LOGIC:
//   A user is considered "premium" if they are an ADMIN (free premium perk)
//   OR if their Stripe subscription status is 'active'. This boolean is computed
//   here on the server and passed as a prop so AdminUsersClient doesn't need to
//   understand the subscription data structure.

import { prisma } from '@/lib/prisma';
import AdminUsersClient from '@/app/components/ui/AdminUsersClient';

export default async function AdminUsersPage() {
  // Fetch all users, newest first.
  // `_count` avoids loading every related record — runs COUNT() queries instead.
  // `subscription` only needs the status field to determine premium tier.
  const rawUsers = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { stories: true, comments: true } },
      subscription: { select: { status: true } },
    },
  });

  // Compute isPremium server-side and add it to each user object.
  // AdminUsersClient shows a "Premium" badge based on this flag.
  const users = rawUsers.map((u) => ({
    ...u,
    isPremium: u.role === 'ADMIN' || u.subscription?.status === 'active',
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Users</h1>
      {/* Live count from the query result — no extra DB call needed */}
      <p className="text-gray-500 text-sm mb-8">{users.length} registered users</p>
      {/*
        AdminUsersClient handles the interactive table: search, role dropdowns,
        ban/delete modals. It keeps a local copy of the users array and updates
        it after each mutation so the table stays in sync without a page reload.
      */}
      <AdminUsersClient users={users} />
    </div>
  );
}
