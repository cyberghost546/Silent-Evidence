// app/admin/mood/page.tsx — Set the daily horror mood shown on the homepage
import { prisma } from '@/lib/prisma';
import MoodClient from './MoodClient';

export default async function AdminMoodPage() {
  const current = await prisma.moodOfDay.findFirst({ orderBy: { setAt: 'desc' } });
  const history = await prisma.moodOfDay.findMany({ orderBy: { setAt: 'desc' }, take: 10 });
  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Mood of the Day</h1>
      <p className="text-gray-500 text-sm mb-8">Set the horror mood shown on the homepage banner. Changes take effect immediately.</p>
      <MoodClient current={current ? JSON.parse(JSON.stringify(current)) : null} history={JSON.parse(JSON.stringify(history))} />
    </div>
  );
}
