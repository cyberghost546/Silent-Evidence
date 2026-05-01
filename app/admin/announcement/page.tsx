// app/admin/announcement/page.tsx
//
// This is a Next.js Server Component — it runs on the server at request time
// and can query the database directly without going through an API route.
// Its only job is to read the current announcement from the database and hand
// it to the Client Component (AnnouncementAdmin) that renders the actual form.
//
// WHY split into two files?
//   - This file (page.tsx) is a Server Component: it can do async DB work but
//     cannot use React state or handle button clicks.
//   - AnnouncementAdmin.tsx is a Client Component: it can use useState and
//     respond to user interaction but cannot query the DB directly.
//   Splitting them lets each file do what it's good at.

import { prisma } from '@/lib/prisma';
import AnnouncementAdmin from './AnnouncementAdmin';

// Sets the browser tab title and <head> metadata for this admin page.
export const metadata = { title: 'Announcement — Admin' };

export default async function AdminAnnouncementPage() {
  // Look up the single row in the `siteSetting` table whose `key` is
  // "announcement". The site settings table is a generic key-value store —
  // each row has a `key` string and a `value` string, so new settings can
  // be added without creating a new database column each time.
  //
  // `findUnique` returns the matching row, or `null` if no announcement has
  // been saved yet (e.g. a fresh install).
  //
  // `.catch(() => null)` is a safety net: if the database is unreachable or
  // the table doesn't exist yet, the page still renders (with an empty form)
  // instead of crashing with a 500 error.
  const row = await prisma.siteSetting.findUnique({ where: { key: 'announcement' } }).catch(() => null);

  // Pass the saved message text down to the Client Component as a prop.
  // The `??` (nullish coalescing) operator covers two cases:
  //   • `row` is null  → no announcement row exists yet → pass ''
  //   • `row.value` is null/undefined → row exists but value is empty → pass ''
  // Either way the Client Component receives a plain string — never null —
  // which keeps its type simple and avoids null checks inside the form.
  return <AnnouncementAdmin current={row?.value ?? ''} />;
}
