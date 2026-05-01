// =============================================================================
// app/admin/banned-words/page.tsx — Content Filter Management (Server Component)
// =============================================================================
//
// PURPOSE:
//   Loads the current list of banned words/phrases from the database and passes
//   them to the interactive BannedWordsClient component where the admin can add
//   or remove entries. Banned words are checked server-side whenever a story
//   title, excerpt, or comment is submitted.
//
// ACCESS CONTROL:
//   Protected by the parent /admin layout which enforces ADMIN role. No
//   additional auth check is required in this file.
//
// DATA SOURCES:
//   - prisma.bannedWord — a simple table of { id, word } records, sorted A→Z
//     so the list is easy to scan visually.
//
// SERVER vs CLIENT SPLIT:
//   This server component fetches the initial word list; BannedWordsClient
//   ('use client') handles add/delete mutations via fetch() calls to API routes,
//   updating its own local state optimistically without a full page reload.
// =============================================================================

import { prisma } from '@/lib/prisma';
import BannedWordsClient from './BannedWordsClient';

export default async function AdminBannedWordsPage() {
  // Fetch every banned word, ordered alphabetically.
  // `orderBy: { word: 'asc' }` maps to ORDER BY word ASC in SQL —
  // alphabetical order makes it easy to spot duplicates or find a specific word.
  const wordsRaw = await prisma.bannedWord.findMany({ orderBy: { word: 'asc' } });

  // Why JSON.parse(JSON.stringify(...))?
  // Prisma returns objects with Date fields, class instances, or other
  // non-serialisable values. Next.js cannot safely pass these across the
  // server→client boundary (it would throw a serialisation error). Running the
  // data through JSON ensures every value is a plain string, number, or boolean.
  const words = JSON.parse(JSON.stringify(wordsRaw));

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Content Filter</h1>
      <p className="text-gray-500 text-sm mb-8">
        Words or phrases added here are flagged when found in story titles, excerpts, or comments.
      </p>

      {/*
        Pass the sanitised word list as a prop to the client component.
        The client component will maintain its own copy in React state and update
        it immediately on add/delete so the UI feels instant without a page refresh.
      */}
      <BannedWordsClient words={words} />
    </div>
  );
}
