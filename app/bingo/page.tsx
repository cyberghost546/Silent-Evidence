import { Metadata } from 'next';
import HorrorBingo from '@/app/components/ui/HorrorBingo';

export const metadata: Metadata = {
  title: 'Horror Bingo | Silent Evidence',
  description: 'Check off horror tropes as you read. Can you get a BINGO?',
};

export default function BingoPage() {
  return (
    <main className="min-h-screen bg-gray-950 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <div className="text-5xl mb-4">🎃</div>
          <h1 className="text-4xl font-bold text-white mb-3">Horror Bingo</h1>
          <p className="text-gray-400 text-lg">
            Check off tropes as you spot them while reading.<br />
            Get five in a row for a <span className="text-red-500 font-bold">BINGO</span>!
          </p>
        </div>
        <HorrorBingo />
      </div>
    </main>
  );
}
