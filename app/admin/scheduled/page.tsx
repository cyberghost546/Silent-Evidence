// app/admin/scheduled/page.tsx — All stories queued for future publication
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export default async function AdminScheduledPage() {
  const stories = await prisma.story.findMany({
    where: { status: 'SCHEDULED' },
    orderBy: { scheduledAt: 'asc' },
    include: { author: { select: { username: true } }, category: { select: { name: true } } },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Scheduled Stories</h1>
      <p className="text-gray-500 text-sm mb-8">{stories.length} stor{stories.length === 1 ? 'y' : 'ies'} queued for future publication.</p>

      {stories.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-10 text-center text-gray-500">No scheduled stories.</div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-800">
              <th className="px-5 py-3">Title</th><th className="px-5 py-3">Author</th>
              <th className="px-5 py-3">Category</th><th className="px-5 py-3">Publishes</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-800">
              {stories.map(s => {
                const timeLeft = s.scheduledAt ? Math.round((s.scheduledAt.getTime() - Date.now()) / 3600000) : null;
                return (
                  <tr key={s.id} className="hover:bg-gray-800/40 transition">
                    <td className="px-5 py-3">
                      <Link href={`/story/${s.slug}/edit`} className="text-white hover:text-red-400 transition font-medium">{s.title}</Link>
                    </td>
                    <td className="px-5 py-3 text-gray-400">{s.author.username}</td>
                    <td className="px-5 py-3 text-gray-500 text-xs">{s.category.name}</td>
                    <td className="px-5 py-3">
                      <p className="text-white text-xs">{s.scheduledAt ? new Date(s.scheduledAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</p>
                      {timeLeft !== null && <p className="text-xs text-gray-600">{timeLeft > 0 ? `in ${timeLeft}h` : 'overdue'}</p>}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link href={`/story/${s.slug}/edit`} className="text-xs text-red-400 hover:text-red-300 transition">Edit</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
