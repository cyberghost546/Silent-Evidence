// app/admin/layout.tsx
// Wraps all /admin pages. Checks that the logged-in user has the ADMIN role.
// If not, redirects them away immediately.

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import AdminSidebar from '@/app/components/ui/AdminSidebar';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0);

  if (!userId) redirect('/login');

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { username: true, role: true },
  });

  // Only ADMIN users can access any page under /admin
  if (!user || user.role !== 'ADMIN') redirect('/');

  return (
    <div className="min-h-screen bg-gray-950 text-white flex">
      <AdminSidebar username={user.username} />
      {/* Main content area — sits next to the sidebar */}
      <main className="flex-1 ml-0 md:ml-64 p-4 md:p-8 pt-16 md:pt-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
