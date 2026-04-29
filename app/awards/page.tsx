// app/awards/page.tsx
// The Scream Awards voting page — an annual community awards event where users
// vote for the best horror stories, authors, and moments of the year.
// All voting logic and data fetching lives in the ScreamAwards component.
import { Metadata } from 'next';
import ScreamAwards from '@/app/components/ui/ScreamAwards';

export const metadata: Metadata = {
  title: 'Scream Awards | Silent Evidence',
  description: 'Vote for the best horror stories, authors, and moments of the year.',
};

export default function AwardsPage() {
  return (
    <main className="min-h-screen bg-gray-950 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <div className="text-5xl mb-4">🏆</div>
          <h1 className="text-4xl font-bold text-white mb-3">The Scream Awards</h1>
          <p className="text-gray-400 text-lg">
            Voted by the community. The best horror of the year — as chosen by you.
          </p>
        </div>
        <ScreamAwards />
      </div>
    </main>
  );
}
