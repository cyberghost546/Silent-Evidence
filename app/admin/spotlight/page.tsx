// app/admin/spotlight/page.tsx — Pick a story for the homepage spotlight
import { prisma } from '@/lib/prisma';
import SpotlightClient from './SpotlightClient';

export default async function AdminSpotlightPage() {
  const setting = await prisma.siteSetting.findUnique({ where: { key: 'spotlight_story_id' } });
  const spotlightId = setting ? Number(setting.value) : null;
  const current = spotlightId ? await prisma.story.findUnique({ where: { id: spotlightId }, select: { id: true, title: true, slug: true, author: { select: { username: true } } } }) : null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Story Spotlight</h1>
      <p className="text-gray-500 text-sm mb-8">Pin a single story to a featured spotlight section on the homepage.</p>
      <SpotlightClient current={current} />
    </div>
  );
}
