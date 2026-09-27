// app/admin/story-of-week/page.tsx
// Admin page for pinning a Story of the Week.
// The selected story ID is persisted in SiteSetting key "story_of_week_id".

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import AdminSidebar from '@/app/components/ui/AdminSidebar';
import StoryOfWeekAdmin from './StoryOfWeekAdmin';

export default async function StoryOfWeekAdminPage() {
  // Gate to admins only
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0);
  if (!userId) redirect('/login');

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { username: true, role: true },
  });
  if (!user || user.role !== 'ADMIN') redirect('/');

  // Fetch the currently pinned story ID from site settings
  const setting = await prisma.siteSetting.findUnique({ where: { key: 'story_of_week_id' } });
  const currentStoryId = setting?.value ? Number(setting.value) : null;

  return (
    <div className="min-h-screen bg-gray-950 text-white flex">
      <AdminSidebar username={user.username} />

      <main className="flex-1 md:ml-64 p-6 md:p-10 pt-16 md:pt-10">
        <div className="max-w-2xl">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <span className="w-1 h-6 bg-red-600 rounded-full" />
            <h1 className="text-2xl font-bold text-white">Story of the Week</h1>
          </div>
          <p className="text-sm text-gray-400 mb-8">
            Pin one story to feature prominently on the homepage as this week&apos;s spotlight. If
            no story is pinned, the homepage will show the highest-rated recent story automatically.
          </p>

          <StoryOfWeekAdmin currentStoryId={currentStoryId} />
        </div>
      </main>
    </div>
  );
}
