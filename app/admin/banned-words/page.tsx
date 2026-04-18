// app/admin/banned-words/page.tsx
import { prisma } from '@/lib/prisma';
import BannedWordsClient from './BannedWordsClient';

export default async function AdminBannedWordsPage() {
  const wordsRaw = await prisma.bannedWord.findMany({ orderBy: { word: 'asc' } });
  const words = JSON.parse(JSON.stringify(wordsRaw));
  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Content Filter</h1>
      <p className="text-gray-500 text-sm mb-8">
        Words or phrases added here are flagged when found in story titles, excerpts, or comments.
      </p>
      <BannedWordsClient words={words} />
    </div>
  );
}
