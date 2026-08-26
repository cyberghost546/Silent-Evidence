// app/admin/spotlight/page.tsx
//
// Server Component — reads the current spotlight story from SiteSetting,
// loads the story record if one is set, then passes data to SpotlightClient.
//
// PURPOSE:
//   The homepage has a "Story Spotlight" hero section that highlights a single
//   handpicked story. The admin uses this page to change which story appears there.
//   Only one story can be spotlighted at a time.
//
// HOW THE SPOTLIGHT IS STORED:
//   The setting `'spotlight_story_id'` holds a single numeric story ID as a string
//   (e.g. `"42"`). SiteSetting values are always strings, so `Number(setting.value)`
//   is needed to convert it back to an integer before querying Prisma.
//
// TWO-STEP FETCH:
//   Step 1: `findUnique({ key: 'spotlight_story_id' })` → get the stored ID string.
//   Step 2: `story.findUnique({ where: { id: spotlightId } })` → load the story.
//   Step 2 is skipped with a ternary guard if `spotlightId` is null (no spotlight set).
//   Only the fields needed for the preview card are selected (id, title, slug, author).
//
// SpotlightClient handles the search-and-set interaction (live story search + save).

import { prisma } from '@/lib/prisma';
import SpotlightClient from './SpotlightClient';

export default async function AdminSpotlightPage() {
  const setting = await prisma.siteSetting.findUnique({ where: { key: 'spotlight_story_id' } });
  const spotlightId = setting ? Number(setting.value) : null;
  const current = spotlightId
    ? await prisma.story.findUnique({
        where: { id: spotlightId },
        select: { id: true, title: true, slug: true, author: { select: { username: true } } },
      })
    : null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Story Spotlight</h1>
      <p className="text-gray-500 text-sm mb-8">
        Pin a single story to a featured spotlight section on the homepage.
      </p>
      <SpotlightClient current={current} />
    </div>
  );
}
