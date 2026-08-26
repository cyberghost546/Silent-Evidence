// app/admin/mood/page.tsx
//
// Server Component — fetches the current mood and recent history, then delegates
// the interactive mood-picker to MoodClient.
//
// PURPOSE:
//   The "Mood of the Day" is a horror-themed atmosphere indicator displayed on the
//   homepage banner (e.g. "Tonight's mood: DREAD"). The admin sets this manually
//   to match the site's current editorial tone — it's purely cosmetic but helps
//   set the right atmosphere for readers.
//
// DATA:
//   `current` — the most recently set mood (findFirst + orderBy setAt desc).
//               Only one mood is "active" at a time — always the newest record.
//   `history` — last 10 mood records so the admin can see what was set before.
//
// SERVER/CLIENT SPLIT:
//   This Server Component does both DB reads (two sequential queries — history
//   doesn't depend on current so they could be parallelised, but the volume is
//   tiny). MoodClient receives serialised JSON props and handles the form/submit.
//
// JSON SERIALIZATION:
//   `JSON.parse(JSON.stringify(current))` converts Prisma Date objects to ISO
//   strings so they can safely cross the Server → Client Component boundary.

import { prisma } from '@/lib/prisma';
import MoodClient from './MoodClient';

export default async function AdminMoodPage() {
  const current = await prisma.moodOfDay.findFirst({ orderBy: { setAt: 'desc' } });
  const history = await prisma.moodOfDay.findMany({ orderBy: { setAt: 'desc' }, take: 10 });
  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Mood of the Day</h1>
      <p className="text-gray-500 text-sm mb-8">
        Set the horror mood shown on the homepage banner. Changes take effect immediately.
      </p>
      <MoodClient
        current={current ? JSON.parse(JSON.stringify(current)) : null}
        history={JSON.parse(JSON.stringify(history))}
      />
    </div>
  );
}
